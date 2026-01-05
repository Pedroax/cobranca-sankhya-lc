/**
 * Sistema de Envio de Cobrança - PRODUÇÃO
 *
 * Envia mensagens de cobrança automática com boleto em PDF
 * para os clientes da LC Baterias
 *
 * Funcionalidades:
 * - Busca títulos que vencem hoje ou estão vencidos
 * - Gera mensagem profissional baseada na cadência
 * - Gera PDF do boleto
 * - Envia mensagem + boleto via WhatsApp
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

// Configuração
const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL,
  apiKey: process.env.WHATSAPP_API_KEY,
  instanceName: process.env.WHATSAPP_INSTANCE,
  provider: 'evolution'
};

/**
 * Templates de Mensagens Profissionais
 */
class MensagensCobranca {

  /**
   * Lembrete: 3 dias antes do vencimento
   */
  static lembrete(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const primeiroNome = nomeCliente.split(' ')[0];
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Olá ${primeiroNome}! 😊

Tudo bem? Aqui é da *LC Baterias*.

Passando para lembrar que o boleto da *NF ${nfNumero}* vence em *${vencimento}* (daqui a 3 dias).

💰 *Valor:* ${valor}

O boleto em PDF será enviado logo abaixo para facilitar o pagamento! ⬇️

Qualquer dúvida, estamos à disposição!`;
  }

  /**
   * Aviso: Vence hoje
   */
  static vencimentoHoje(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const primeiroNome = nomeCliente.split(' ')[0];
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Olá ${primeiroNome}! 😊

Passando para avisar que o boleto da *NF ${nfNumero}* vence *hoje*.

💰 *Valor:* ${valor}

📄 Segue o boleto em PDF logo abaixo para facilitar o pagamento.

_Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem._

Tenha um ótimo dia!`;
  }

  /**
   * Cobrança: 3 dias vencido
   */
  static vencido(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const primeiroNome = nomeCliente.split(' ')[0];
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Olá ${primeiroNome},

Identificamos que o boleto da *NF ${nfNumero}*, com vencimento em *${vencimento}*, ainda consta como pendente em nosso sistema.

💰 *Valor:* ${valor}

Por gentileza, solicitamos a regularização o mais breve possível.

📄 Segue o boleto atualizado em PDF logo abaixo.

_Caso já tenha efetuado o pagamento, por favor nos envie o comprovante._

Estamos à disposição para qualquer esclarecimento!`;
  }

  /**
   * Urgente: 5 dias vencido - Aviso de cartório
   */
  static cartorio(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Prezado(a) ${nomeCliente},

⚠️ *AVISO IMPORTANTE*

O boleto referente à *NF ${nfNumero}*, vencido em *${vencimento}*, permanece em aberto há 5 dias.

💰 *Valor:* ${valor}

⚠️ Informamos que, conforme nossa política comercial, o título será encaminhado para *protesto em cartório* caso o pagamento não seja identificado até o final do dia de hoje.

📄 Segue o boleto em PDF logo abaixo.

🔹 *Caso já tenha efetuado o pagamento:*
Por favor, nos envie o comprovante com urgência.

Aguardamos retorno urgente.

Atenciosamente,
*LC Baterias*`;
  }

  /**
   * Formata valor em reais
   */
  static formatarValor(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}

/**
 * Função principal de envio de cobrança
 */
async function executarCobranca() {
  console.log('🚀 SISTEMA DE COBRANÇA AUTOMÁTICA - LC BATERIAS\n');
  console.log('='.repeat(80));
  console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log('='.repeat(80));

  try {
    // 1. Autenticar
    console.log('\n📡 1. Autenticando na API Sankhya...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar serviços
    const cobranca = new CobrancaBoletos(api);
    const whatsapp = new WhatsAppService(whatsappConfig);
    const geradorBoleto = new BoletoItauPDFGenerator();
    const controleEnvios = new ControleEnvios();

    // 3. Buscar títulos para envio
    console.log('📋 2. Buscando títulos para cobrança...\n');

    const hoje = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 30); // Próximos 30 dias

    const titulos = await cobranca.buscarTitulosVencimento(
      hoje,
      dataFim,
      { apenasBoletos: true }
    );

    console.log(`   📊 Total de títulos encontrados: ${titulos.length}\n`);

    // 4. Processar cada título
    let enviados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const titulo of titulos) {
      try {
        // Calcular dias para vencimento
        const diasParaVencimento = cobranca.calcularDiasParaVencimento(
          cobranca.parsearDataSankhya(titulo.DTVENC)
        );

        // Verificar se deve enviar hoje (D-3, D-0, D+3, D+5)
        const deveEnviar = [-3, 0, 3, 5].includes(diasParaVencimento);

        if (!deveEnviar) {
          ignorados++;
          continue;
        }

        // Verificar se já foi enviado hoje
        if (controleEnvios.jaFoiEnviado(titulo.NUFIN)) {
          console.log(`   ⏭️  NUFIN ${titulo.NUFIN} - Já enviado hoje`);
          ignorados++;
          continue;
        }

        console.log(`\n   📄 Processando NUFIN ${titulo.NUFIN}...`);
        console.log(`      - NF: ${titulo.NUMNOTA}`);
        console.log(`      - Cliente: ${titulo.CODPARC}`);
        console.log(`      - Vencimento: ${titulo.DTVENC} (${diasParaVencimento} dias)`);

        // Buscar dados completos
        const tituloCompleto = await cobranca.buscarDadosCompletosTitulo(titulo.NUFIN);
        const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

        // Verificar WhatsApp
        if (!parceiro.TELEFONE) {
          console.log(`      ⚠️  Cliente sem WhatsApp cadastrado - pulando`);
          ignorados++;
          continue;
        }

        const numeroWhatsApp = whatsapp.formatarNumero(parceiro.TELEFONE);

        // Gerar mensagem apropriada
        let mensagem;
        if (diasParaVencimento === -3) {
          mensagem = MensagensCobranca.lembrete(tituloCompleto, parceiro);
        } else if (diasParaVencimento === 0) {
          mensagem = MensagensCobranca.vencimentoHoje(tituloCompleto, parceiro);
        } else if (diasParaVencimento === 3) {
          mensagem = MensagensCobranca.vencido(tituloCompleto, parceiro);
        } else if (diasParaVencimento === 5) {
          mensagem = MensagensCobranca.cartorio(tituloCompleto, parceiro);
        }

        console.log(`      📝 Tipo: ${diasParaVencimento === -3 ? 'Lembrete' : diasParaVencimento === 0 ? 'Vencimento' : diasParaVencimento === 3 ? 'Cobrança' : 'Cartório'}`);

        // Gerar PDF do boleto
        console.log(`      🔨 Gerando PDF do boleto...`);
        const tempDir = path.join(__dirname, '..', 'temp');
        await fs.mkdir(tempDir, { recursive: true });

        const caminhoBoletoPDF = path.join(tempDir, `boleto_${titulo.NUFIN}.pdf`);
        await geradorBoleto.gerarBoleto(tituloCompleto, parceiro, caminhoBoletoPDF);

        // Enviar mensagem
        console.log(`      📤 Enviando mensagem...`);
        const resultadoTexto = await whatsapp.enviarMensagem(numeroWhatsApp, mensagem);

        // Aguardar 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Enviar PDF
        console.log(`      📎 Enviando boleto PDF...`);
        const captionBoleto = `Boleto - NF ${titulo.NUMNOTA}`;
        const resultadoPDF = await whatsapp.enviarArquivo(
          numeroWhatsApp,
          caminhoBoletoPDF,
          captionBoleto,
          `boleto_${titulo.NUFIN}.pdf`
        );

        // Limpar arquivo temporário
        await fs.unlink(caminhoBoletoPDF);

        // Registrar envio
        controleEnvios.registrarEnvio(titulo.NUFIN, {
          codparc: titulo.CODPARC,
          numnota: titulo.NUMNOTA,
          whatsapp: numeroWhatsApp,
          tipo: diasParaVencimento === -3 ? 'lembrete' : diasParaVencimento === 0 ? 'vencimento' : diasParaVencimento === 3 ? 'vencido' : 'cartorio'
        });

        console.log(`      ✅ Enviado com sucesso!`);
        enviados++;

        // Aguardar 3 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`      ❌ Erro: ${error.message}`);
        erros++;
      }
    }

    // 5. Resumo
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO DA EXECUÇÃO');
    console.log('='.repeat(80));
    console.log(`   ✅ Enviados com sucesso: ${enviados}`);
    console.log(`   ⏭️  Ignorados (já enviados ou fora da cadência): ${ignorados}`);
    console.log(`   ❌ Erros: ${erros}`);
    console.log(`   📋 Total processado: ${titulos.length}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    console.error(error);
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

module.exports = { executarCobranca, MensagensCobranca };
