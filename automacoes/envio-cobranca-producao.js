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

const { createClient } = require('@supabase/supabase-js');
const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const WhatsAppService = require('./WhatsAppService');
const BoletoItauPDFGenerator = require('./BoletoItauPDFGenerator');
const ControleEnvios = require('./ControleEnvios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

// Feriados nacionais fixos (MM-DD)
const FERIADOS_FIXOS = new Set([
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Consciência Negra
  '12-25', // Natal
]);

function isFeriadoNacional(data) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return FERIADOS_FIXOS.has(`${mes}-${dia}`);
}

function isDiaUtil(data) {
  const dow = data.getDay(); // 0=dom, 6=sab
  return dow !== 0 && dow !== 6 && !isFeriadoNacional(data);
}

/**
 * Ajusta o vencimento para o próximo dia útil se cair em fim de semana ou feriado.
 * Ex: vence sábado → considera segunda como vencimento efetivo.
 */
function vencimentoEfetivo(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  while (!isDiaUtil(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Calcula dias de atraso em dias úteis a partir do vencimento efetivo.
 * Retorna número negativo para títulos vencidos.
 * Ex: vencimento efetivo ontem (1 dia útil atrás) → -1
 */
function calcularDiasUteisAtraso(dataVencStr) {
  const [dia, mes, ano] = dataVencStr.split('/');
  const venc = new Date(ano, mes - 1, dia);
  venc.setHours(0, 0, 0, 0);

  const vencEfetivo = vencimentoEfetivo(venc);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Se vencimento efetivo ainda não chegou ou é hoje, não está atrasado
  if (vencEfetivo >= hoje) return 0;

  // Contar dias úteis entre vencimento efetivo e hoje (exclusive hoje)
  let diasUteis = 0;
  const cursor = new Date(vencEfetivo);
  cursor.setDate(cursor.getDate() + 1); // começa no dia seguinte ao vencimento efetivo

  while (cursor < hoje) {
    if (isDiaUtil(cursor)) diasUteis++;
    cursor.setDate(cursor.getDate() + 1);
  }

  // Conta hoje também se for dia útil
  if (isDiaUtil(hoje)) diasUteis++;

  return -diasUteis; // negativo = atrasado
}

async function salvarMensagemEnviada(telefone, nomeCliente, codparc, templateNome, nfNumero, wamid) {
  // Upsert contato
  await supabase.from('cobranca_contatos').upsert({
    telefone,
    nome: nomeCliente,
    codparc,
    ultima_mensagem: `📄 ${templateNome} — NF ${nfNumero}`,
    ultima_mensagem_at: new Date().toISOString(),
    nao_lidas: 0
  }, { onConflict: 'telefone', ignoreDuplicates: false });

  // Salvar mensagem
  await supabase.from('cobranca_mensagens').insert({
    telefone,
    wamid,
    direcao: 'enviada',
    tipo: 'template',
    template_nome: templateNome,
    nf_numero: nfNumero,
    status: 'enviada'
  });
}

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
  D0: process.env.META_TEMPLATE_D0 || 'no_vencimento', // no dia do vencimento (com PDF)
  D1: process.env.META_TEMPLATE_D1 || '1_apos_3dias',  // 1-2 dias de atraso (com PDF)
  D3: process.env.META_TEMPLATE_D3 || '2_apos_3dias',  // 3-4 dias de atraso (com PDF)
  D5: process.env.META_TEMPLATE_D5 || '2_apos_5dias'   // 5 dias de atraso
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
 * Retorna o nome do template baseado nos dias de atraso (sem precisar de titulo/parceiro).
 * Usado para checar duplicata no Supabase antes de buscar dados completos.
 */
function obterTemplateNome(diasParaVencimento) {
  if (diasParaVencimento === 0) return TEMPLATES.D0;
  if (diasParaVencimento === -1 || diasParaVencimento === -2) return TEMPLATES.D1;
  if (diasParaVencimento === -3 || diasParaVencimento === -4) return TEMPLATES.D3;
  if (diasParaVencimento === -5) return TEMPLATES.D5;
  return null;
}

/**
 * Verifica no Supabase se este NF + template já foi enviado.
 * Usa Supabase porque o arquivo local não persiste no Railway entre execuções.
 */
async function jaFoiEnviadoSupabase(nfNumero, templateNome) {
  const { data } = await supabase
    .from('cobranca_mensagens')
    .select('id')
    .eq('nf_numero', String(nfNumero))
    .eq('template_nome', templateNome)
    .eq('direcao', 'enviada')
    .limit(1);
  return !!(data && data.length > 0);
}

/**
 * Retorna a configuração do template baseada nos dias úteis de atraso:
 *   D+1, D+2 → template 1 (com PDF)
 *   D+3, D+4 → template 3 (com PDF)
 *   D+5      → template 5
 */
function obterConfigTemplate(diasParaVencimento, titulo, parceiro, mediaId = null) {
  const nfNumero = String(titulo.NUMNOTA || titulo.NUFIN);
  const dataVencimento = titulo.DTVENC;
  const primeiroNome = (parceiro.NOMEPARC || 'Cliente').split(' ')[0];
  const valorBoleto = formatarValorTemplate(titulo.VLRDESDOB);

  const componenteHeader = (mediaId) => ({
    type: 'header',
    parameters: [
      { type: 'document', document: { id: mediaId, filename: `boleto_${titulo.NUFIN}.pdf` } }
    ]
  });

  const componenteBody12 = {
    type: 'body',
    parameters: [
      { type: 'text', parameter_name: 'nf_numero', text: nfNumero },
      { type: 'text', parameter_name: 'data_vencimento', text: dataVencimento }
    ]
  };

  const componenteBody5 = {
    type: 'body',
    parameters: [
      { type: 'text', parameter_name: 'nome_cliente', text: primeiroNome },
      { type: 'text', parameter_name: 'nf_numero', text: nfNumero },
      { type: 'text', parameter_name: 'data_vencimento', text: dataVencimento },
      { type: 'text', parameter_name: 'valor_boleto', text: valorBoleto }
    ]
  };

  // D0 → no_vencimento (com PDF)
  if (diasParaVencimento === 0) {
    return {
      nome: TEMPLATES.D0,
      tipo: 'D+0',
      precisaDocumento: true,
      components: [
        componenteHeader(mediaId),
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'nf_numero', text: nfNumero },
            { type: 'text', parameter_name: 'data_vencimento', text: dataVencimento },
            { type: 'text', parameter_name: 'valor_boleto', text: valorBoleto }
          ]
        }
      ]
    };
  }

  // D+1 e D+2 → template 1
  if (diasParaVencimento === -1 || diasParaVencimento === -2) {
    return {
      nome: TEMPLATES.D1,
      tipo: `D+${Math.abs(diasParaVencimento)}`,
      precisaDocumento: true,
      components: [componenteHeader(mediaId), componenteBody12]
    };
  }

  // D+3 e D+4 → template 3
  if (diasParaVencimento === -3 || diasParaVencimento === -4) {
    return {
      nome: TEMPLATES.D3,
      tipo: `D+${Math.abs(diasParaVencimento)}`,
      precisaDocumento: true,
      components: [componenteHeader(mediaId), componenteBody12]
    };
  }

  // D+5 → template 5
  if (diasParaVencimento === -5) {
    return {
      nome: TEMPLATES.D5,
      tipo: 'D+5',
      precisaDocumento: false,
      components: [componenteBody5]
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

  // Não enviar em fins de semana
  const diaSemana = new Date().getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    console.log('\n📅 Fim de semana — execução ignorada.');
    return;
  }

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

    const dataFim = new Date(hoje);  // até hoje (inclui D+0)

    // Busca 10 dias corridos atrás para cobrir feriados e fins de semana prolongados
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 10);

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
        // Calcular dias úteis de atraso (negativo = vencido)
        const diasParaVencimento = calcularDiasUteisAtraso(titulo.DTVENC);

        // D+0 até D+5 (0 = vence hoje, negativo = atrasado)
        if (diasParaVencimento < -5 || diasParaVencimento > 0) {
          ignorados++;
          continue;
        }

        // Verificar no Supabase se este template já foi enviado para este NF
        const templateNome = obterTemplateNome(diasParaVencimento);
        if (!templateNome) { ignorados++; continue; }

        const nfNumeroCheck = String(titulo.NUMNOTA || titulo.NUFIN);
        const jaEnviado = await jaFoiEnviadoSupabase(nfNumeroCheck, templateNome);
        if (jaEnviado) {
          console.log(`   ⏭️  NF ${nfNumeroCheck} (${templateNome}) - Já enviado anteriormente`);
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
        const resultado = await whatsapp.enviarTemplate(numeroWhatsApp, config.nome, config.components);

        // Salvar no Supabase (inbox)
        const wamid = resultado?.messages?.[0]?.id || null;
        await salvarMensagemEnviada(
          numeroWhatsApp,
          parceiro.NOMEPARC,
          titulo.CODPARC,
          config.nome,
          String(tituloCompleto.NUMNOTA || titulo.NUFIN),
          wamid
        ).catch(e => console.warn('Supabase log error:', e.message));

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
