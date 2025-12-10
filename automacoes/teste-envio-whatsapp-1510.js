/**
 * Teste - Envio de WhatsApp para Parceiro 1510
 *
 * Envia mensagem de teste para o telefone cadastrado no parceiro 1510
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const CadenciaCobranca = require('./CadenciaCobranca');
const WhatsAppService = require('./WhatsAppService');

const AMBIENTE = process.env.AMBIENTE || 'production';

const configSankhya = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

const configWhatsApp = {
  provider: 'evolution',
  apiUrl: process.env.WHATSAPP_API_URL,
  apiKey: process.env.WHATSAPP_API_KEY,
  instanceName: process.env.WHATSAPP_INSTANCE
};

async function testarEnvioWhatsApp() {
  console.log('\n📱 TESTE - ENVIO DE WHATSAPP PARA PARCEIRO 1510\n');
  console.log('='.repeat(80));
  console.log(`📍 Ambiente Sankhya: ${AMBIENTE.toUpperCase()}`);
  console.log(`📍 Evolution API: ${configWhatsApp.apiUrl}`);
  console.log(`📍 Instância: ${configWhatsApp.instanceName}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Inicializar serviços
    console.log('1️⃣ Inicializando serviços...\n');
    const sankhyaApi = new SankhyaAPI(configSankhya[AMBIENTE]);
    const cobranca = new CobrancaBoletos(sankhyaApi);
    const cadencia = new CadenciaCobranca();
    const whatsapp = new WhatsAppService(configWhatsApp);

    // 2. Autenticar Sankhya
    console.log('2️⃣ Autenticando na API Sankhya...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado na Sankhya\n');

    // 3. Buscar dados do parceiro 1510
    console.log('3️⃣ Buscando dados do parceiro 1510...\n');
    const parceiro = await cobranca.buscarDadosParceiro(1510);

    console.log('📋 DADOS DO PARCEIRO:');
    console.log('─'.repeat(80));
    console.log(`   Código: ${parceiro.CODPARC}`);
    console.log(`   Nome: ${parceiro.NOMEPARC}`);
    console.log(`   Telefone: ${parceiro.TELEFONE || 'Não cadastrado'}`);
    console.log(`   Email: ${parceiro.EMAIL || 'Não cadastrado'}`);
    console.log('─'.repeat(80));
    console.log('');

    if (!parceiro.TELEFONE) {
      console.log('❌ ERRO: Parceiro não tem telefone cadastrado!\n');
      console.log('Por favor, cadastre um telefone de teste no Sankhya para o parceiro 1510.\n');
      return;
    }

    // Formatar número para WhatsApp
    const numeroLimpo = parceiro.TELEFONE.replace(/\D/g, '');
    const numeroWhatsApp = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;

    console.log(`📱 Número formatado para WhatsApp: ${numeroWhatsApp}\n`);

    // 4. Buscar título NUFIN 3279
    console.log('4️⃣ Buscando título NUFIN 3279...\n');

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'N',
          criteria: {
            expression: {
              $: 'this.NUFIN = ?'
            },
            parameter: [
              { $: '3279', type: 'I' }
            ]
          },
          entity: {
            fieldset: {
              list: 'NUFIN,CODPARC,DTVENC,VLRDESDOB,NOSSONUM,NUMNOTA,RECDESP'
            }
          }
        }
      }
    };

    const response = await sankhyaApi.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    const titulos = cobranca.processarRespostaFinanceiro(response);

    if (titulos.length === 0) {
      console.log('❌ Título NUFIN 3279 não encontrado!\n');
      return;
    }

    const titulo = titulos[0];

    console.log('📋 DADOS DO TÍTULO:');
    console.log('─'.repeat(80));
    console.log(`   NUFIN: ${titulo.NUFIN}`);
    console.log(`   NF: ${titulo.NUMNOTA || 'N/A'}`);
    console.log(`   Vencimento: ${titulo.DTVENC}`);
    console.log(`   Valor: R$ ${titulo.VLRDESDOB}`);
    console.log(`   Nosso Número: ${titulo.NOSSONUM || 'Sem boleto'}`);
    console.log('─'.repeat(80));
    console.log('');

    // 5. Calcular dias para vencimento
    const diasVencimento = cobranca.calcularDiasVencimento(titulo.DTVENC);
    console.log(`📅 Dias para vencimento: ${diasVencimento}\n`);

    // 6. Gerar mensagem
    console.log('5️⃣ Gerando mensagem...\n');

    const mensagemObj = cadencia.gerarMensagem({
      ...titulo,
      parceiro: {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        whatsapp: numeroWhatsApp,
        email: parceiro.EMAIL
      }
    }, diasVencimento);

    if (!mensagemObj) {
      console.log('❌ Não foi possível gerar mensagem para este título.\n');
      return;
    }

    console.log('📨 MENSAGEM QUE SERÁ ENVIADA:');
    console.log('─'.repeat(80));
    console.log(mensagemObj.mensagem);
    console.log('─'.repeat(80));
    console.log('');
    console.log(`📊 Tipo: ${mensagemObj.tipo}`);
    console.log(`⚠️  Prioridade: ${mensagemObj.prioridade}`);
    console.log('');

    // 7. Enviar WhatsApp
    console.log('6️⃣ Enviando via WhatsApp...\n');

    const resultado = await whatsapp.enviar(
      numeroWhatsApp,
      mensagemObj.mensagem
    );

    console.log('📊 RESULTADO DO ENVIO:\n');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('');

    if (resultado.sucesso) {
      console.log('✅ MENSAGEM ENVIADA COM SUCESSO!\n');
      console.log(`📱 Destinatário: ${numeroWhatsApp}`);
      console.log(`📋 Parceiro: ${parceiro.NOMEPARC}`);
      console.log(`💰 Título: ${titulo.NUFIN}`);
      console.log('');
    } else {
      console.log('❌ ERRO NO ENVIO:\n');
      console.log(`   ${resultado.erro}\n`);
    }

    console.log('✨ Teste finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarEnvioWhatsApp();
