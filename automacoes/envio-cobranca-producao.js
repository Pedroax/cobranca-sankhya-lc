/**
 * Sistema de Envio de Cobrança - PRODUÇÃO
 *
 * Busca títulos VENCIDOS no Sankhya e envia templates WhatsApp
 * via Meta Cloud API (API Oficial).
 *
 * Cadência:
 * - D+1: 1 dia de atraso  → template 1_apos_3dias (com boleto PDF)
 * - D+3: 3 dias de atraso → template 2_apos_3dias (com boleto PDF)
 * - D+5: 5 dias de atraso → template 3_apo_5dias  (sem boleto)
 *
 * @author Automatex
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const WhatsAppService = require('./WhatsAppService');
const BoletoItauPDFGenerator = require('./BoletoItauPDFGenerator');
const ControleEnvios = require('./ControleEnvios');

// Configuração Sankhya
const sankhyaConfig = {
  xToken: process.env.PROD_X_TOKEN,
  clientId: process.env.PROD_CLIENT_ID,
  clientSecret: process.env.PROD_CLIENT_SECRET
};

// Configuração Meta Cloud API
const whatsappConfig = {
  provider: 'business',
  phoneNumberId: process.env.META_PHONE_NUMBER_ID,
  accessToken: process.env.META_ACCESS_TOKEN
};

// Templates aprovados
const TEMPLATES = {
  D1: process.env.META_TEMPLATE_D1 || '1_apos_3dias',  // 1 dia de atraso (com PDF)
  D3: process.env.META_TEMPLATE_D3 || '2_apos_3dias',  // 3 dias de atraso (com PDF)
  D5: process.env.META_TEMPLATE_D5 || '3_apo_5dias'    // 5 dias de atraso (sem PDF)
};

/**
 * Formata valor para os parâmetros do template (ex: "1.234,56" sem "R$")
 */
function formatarValorTemplate(valor) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
}

/**
 * Retorna a configuração do template baseada nos dias de atraso
 * diasParaVencimento é negativo para títulos vencidos:
 *   -1 = vencido há 1 dia (D+1)
 *   -3 = vencido há 3 dias (D+3)
 *   -5 = vencido há 5 dias (D+5)
 */
function obterConfigTemplate(diasParaVencimento, titulo, parceiro, mediaId = null) {
  const nfNumero = String(titulo.NUMNOTA || titulo.NUFIN);
  const dataVencimento = titulo.DTVENC;
  const primeiroNome = (parceiro.NOMEPARC || 'Cliente').split(' ')[0];
  const valorBoleto = formatarValorTemplate(titulo.VLRDESDOB);

  if (diasParaVencimento === -1) {
    return {
      nome: TEMPLATES.D1,
      tipo: 'D+1',
      precisaDocumento: true,
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                id: mediaId,
                filename: `boleto_${titulo.NUFIN}.pdf`
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'nf_numero', text: nfNumero },
            { type: 'text', parameter_name: 'data_vencimento', text: dataVencimento }
          ]
        }
      ]
    };
  }

  if (diasParaVencimento === -3) {
    return {
      nome: TEMPLATES.D3,
      tipo: 'D+3',
      precisaDocumento: true,
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                id: mediaId,
                filename: `boleto_${titulo.NUFIN}.pdf`
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'nf_numero', text: nfNumero },
            { type: 'text', parameter_name: 'data_vencimento', text: dataVencimento }
          ]
        }
      ]
    };
  }

  if (diasParaVencimento === -5) {
    return {
      nome: TEMPLATES.D5,
      tipo: 'D+5',
      precisaDocumento: false,
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'nome_cliente', text: primeiroNome },
            { type: 'text', parameter_name: 'nf_numero', text: nfNumero },
            { type: 'text', parameter_name: 'data_vencimento', text: dataVencimento },
            { type: 'text', parameter_name: 'valor_boleto', text: valorBoleto }
          ]
        }
      ]
    };
  }

  return null;
}

/**
 * Função principal de envio de cobrança
 */
async function executarCobranca() {
  console.log('🚀 SISTEMA DE COBRANÇA AUTOMÁTICA - LC BATERIAS');
  console.log('='.repeat(60));
  console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log('Provider: Meta WhatsApp Cloud API (Oficial)');
  console.log('='.repeat(60));

  // Validar credenciais Meta
  if (!whatsappConfig.phoneNumberId || !whatsappConfig.accessToken) {
    console.error('❌ ERRO: META_PHONE_NUMBER_ID ou META_ACCESS_TOKEN não configurados no .env');
    process.exit(1);
  }

  try {
    // 1. Autenticar no Sankhya
    console.log('\n📡 1. Autenticando na API Sankhya...');
    const api = new SankhyaAPI(sankhyaConfig);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar serviços
    const cobranca = new CobrancaBoletos(api);
    const whatsapp = new WhatsAppService(whatsappConfig);
    const geradorBoleto = new BoletoItauPDFGenerator();
    const controleEnvios = new ControleEnvios();

    // 3. Buscar títulos vencidos (D+1, D+3, D+5)
    // Busca títulos com vencimento entre hoje-5 e hoje-1
    console.log('📋 2. Buscando títulos vencidos...\n');

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() - 1);  // até ontem

    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 5);  // desde 5 dias atrás

    const titulos = await cobranca.buscarTitulosVencimento(
      dataInicio,
      dataFim,
      { apenasEmAberto: true, apenasComBoleto: true, apenasReceita: true }
    );

    console.log(`   📊 Títulos vencidos encontrados: ${titulos.length}\n`);

    // 4. Processar cada título
    let enviados = 0;
    let ignorados = 0;
    let erros = 0;

    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    for (const titulo of titulos) {
      let caminhoBoletoPDF = null;

      try {
        // Calcular dias de atraso (negativo = vencido)
        const diasParaVencimento = cobranca.calcularDiasParaVencimento(
          cobranca.parsearDataSankhya(titulo.DTVENC)
        );

        // Apenas D+1, D+3, D+5
        if (![-1, -3, -5].includes(diasParaVencimento)) {
          ignorados++;
          continue;
        }

        // Verificar se já foi enviado hoje
        const chaveEnvio = `${titulo.NUFIN}_D${Math.abs(diasParaVencimento)}`;
        if (controleEnvios.jaFoiEnviado(chaveEnvio)) {
          console.log(`   ⏭️  NUFIN ${titulo.NUFIN} (D+${Math.abs(diasParaVencimento)}) - Já enviado hoje`);
          ignorados++;
          continue;
        }

        console.log(`\n   📄 NUFIN ${titulo.NUFIN} | NF ${titulo.NUMNOTA} | Venc: ${titulo.DTVENC} (D+${Math.abs(diasParaVencimento)})`);

        // Buscar dados completos
        const tituloCompleto = await cobranca.buscarDadosCompletosTitulo(titulo.NUFIN);
        const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

        // Usar FAX como WhatsApp (campo que contém o celular no Sankhya)
        if (!parceiro.FAX) {
          console.log(`      ⚠️  Sem WhatsApp cadastrado (FAX vazio) — pulando`);
          ignorados++;
          continue;
        }

        const numeroWhatsApp = whatsapp.formatarNumero(parceiro.FAX);

        // Verificar se o template precisa de documento (D+1 e D+3)
        const configInicial = obterConfigTemplate(diasParaVencimento, tituloCompleto, parceiro, null);
        if (!configInicial) {
          ignorados++;
          continue;
        }

        let mediaId = null;

        if (configInicial.precisaDocumento) {
          // Gerar PDF do boleto
          console.log(`      🔨 Gerando boleto PDF...`);
          caminhoBoletoPDF = path.join(tempDir, `boleto_${titulo.NUFIN}.pdf`);
          await geradorBoleto.gerarBoleto(tituloCompleto, parceiro, caminhoBoletoPDF);

          // Upload para Meta
          console.log(`      ☁️  Enviando PDF para Meta...`);
          mediaId = await whatsapp.uploadMedia(caminhoBoletoPDF);
          console.log(`      ✅ Media ID: ${mediaId}`);
        }

        // Montar componentes finais com mediaId
        const config = obterConfigTemplate(diasParaVencimento, tituloCompleto, parceiro, mediaId);

        // Enviar template
        console.log(`      📤 Enviando template "${config.nome}" (${config.tipo}) para ${numeroWhatsApp}...`);
        await whatsapp.enviarTemplate(numeroWhatsApp, config.nome, config.components);

        // Registrar envio
        controleEnvios.registrarEnvio(chaveEnvio, {
          nufin: titulo.NUFIN,
          codparc: titulo.CODPARC,
          numnota: titulo.NUMNOTA,
          whatsapp: numeroWhatsApp,
          tipo: config.tipo,
          template: config.nome
        });

        console.log(`      ✅ Enviado com sucesso!`);
        enviados++;

        // Intervalo entre envios (evitar rate limit)
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`      ❌ Erro: ${error.message}`);
        erros++;
      } finally {
        // Limpar PDF temporário
        if (caminhoBoletoPDF) {
          await fs.unlink(caminhoBoletoPDF).catch(() => {});
        }
      }
    }

    // 5. Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO');
    console.log('='.repeat(60));
    console.log(`   ✅ Enviados:  ${enviados}`);
    console.log(`   ⏭️  Ignorados: ${ignorados}`);
    console.log(`   ❌ Erros:     ${erros}`);
    console.log(`   📋 Total:     ${titulos.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarCobranca()
    .then(() => {
      console.log('\n✅ Execução concluída!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { executarCobranca };
