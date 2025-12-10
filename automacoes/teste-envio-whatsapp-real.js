/**
 * Teste - Envio de WhatsApp REAL
 *
 * Envia mensagem de teste para um parceiro existente
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
  console.log('\n📱 TESTE - ENVIO DE WHATSAPP REAL\n');
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

    // 3. Buscar parceiros com WhatsApp
    console.log('3️⃣ Buscando parceiros com WhatsApp...\n');

    const requestParceiros = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          entity: {
            fieldset: {
              list: 'CODPARC,NOMEPARC,TELEFONE,EMAIL'
            }
          }
        }
      }
    };

    const responseParceiros = await sankhyaApi.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestParceiros
    );

    const parceiros = cobranca.processarRespostaParceiro(responseParceiros);

    // Filtrar apenas parceiros com telefone
    const parceirosComTelefone = parceiros.filter(p => {
      const telefone = typeof p.TELEFONE === 'object' ? p.TELEFONE.$ : p.TELEFONE;
      return telefone && String(telefone).trim() !== '';
    });

    console.log(`✅ Encontrados ${parceirosComTelefone.length} parceiro(s) com telefone\n`);

    if (parceirosComTelefone.length === 0) {
      console.log('❌ Nenhum parceiro com telefone encontrado!\n');
      return;
    }

    // Pegar o primeiro parceiro com telefone
    const parceiro = parceirosComTelefone[0];

    console.log('📋 PARCEIRO SELECIONADO:');
    console.log('─'.repeat(80));
    console.log(`   Código: ${parceiro.CODPARC}`);
    console.log(`   Nome: ${parceiro.NOMEPARC}`);
    console.log(`   Telefone: ${parceiro.TELEFONE}`);
    console.log(`   Email: ${parceiro.EMAIL || 'Não cadastrado'}`);
    console.log('─'.repeat(80));
    console.log('');

    // Formatar número para WhatsApp
    const numeroLimpo = parceiro.TELEFONE.replace(/\D/g, '');
    const numeroWhatsApp = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;

    console.log(`📱 Número formatado para WhatsApp: ${numeroWhatsApp}\n`);

    // 4. Criar título de TESTE
    console.log('4️⃣ Criando título de TESTE...\n');

    const tituloTeste = {
      NUFIN: 99999,
      CODPARC: parceiro.CODPARC,
      DTVENC: '25/11/2024', // Exemplo de vencimento
      VLRDESDOB: '1500.00',
      NUMNOTA: 'TESTE-001',
      NOSSONUM: '123456789',
      parceiro: {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        whatsapp: numeroWhatsApp,
        telefone: parceiro.TELEFONE,
        email: parceiro.EMAIL
      }
    };

    console.log('📋 TÍTULO DE TESTE:');
    console.log('─'.repeat(80));
    console.log(`   NUFIN: ${tituloTeste.NUFIN} (FICTÍCIO)`);
    console.log(`   NF: ${tituloTeste.NUMNOTA}`);
    console.log(`   Vencimento: ${tituloTeste.DTVENC}`);
    console.log(`   Valor: R$ ${tituloTeste.VLRDESDOB}`);
    console.log('─'.repeat(80));
    console.log('');

    // 5. Calcular dias para vencimento
    const diasVencimento = cobranca.calcularDiasVencimento(tituloTeste.DTVENC);
    console.log(`📅 Dias para vencimento: ${diasVencimento}\n`);

    // 6. Gerar mensagem
    console.log('5️⃣ Gerando mensagem...\n');

    const mensagemObj = cadencia.gerarMensagem(tituloTeste, diasVencimento);

    if (!mensagemObj) {
      console.log('⚠️  Título não está em nenhuma cadência (muito longe do vencimento).\n');
      console.log('Enviando mensagem de TESTE genérica...\n');

      // Mensagem genérica de teste
      const mensagemTeste = `🧪 *TESTE DE AUTOMAÇÃO - LC BATERIAS*\n\n` +
        `Olá! Este é um teste de envio automático do sistema de cobrança.\n\n` +
        `📋 Dados do teste:\n` +
        `• Parceiro: ${parceiro.NOMEPARC}\n` +
        `• Telefone: ${parceiro.TELEFONE}\n` +
        `• Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\n` +
        `Se você recebeu esta mensagem, o sistema está funcionando corretamente! ✅\n\n` +
        `🤖 Mensagem automática - Não responder`;

      console.log('📨 MENSAGEM DE TESTE:');
      console.log('─'.repeat(80));
      console.log(mensagemTeste);
      console.log('─'.repeat(80));
      console.log('');

      // Enviar mensagem de teste
      console.log('6️⃣ Enviando via WhatsApp...\n');

      const resultado = await whatsapp.enviar(numeroWhatsApp, mensagemTeste);

      console.log('📊 RESULTADO DO ENVIO:\n');
      console.log(JSON.stringify(resultado, null, 2));
      console.log('');

      if (resultado.sucesso) {
        console.log('✅ MENSAGEM DE TESTE ENVIADA COM SUCESSO!\n');
        console.log(`📱 Destinatário: ${numeroWhatsApp}`);
        console.log(`📋 Parceiro: ${parceiro.NOMEPARC}`);
        console.log('');
      } else {
        console.log('❌ ERRO NO ENVIO:\n');
        console.log(`   ${resultado.erro}\n`);
      }

    } else {
      // Usar mensagem da cadência
      console.log('📨 MENSAGEM DA CADÊNCIA:');
      console.log('─'.repeat(80));
      console.log(mensagemObj.mensagem);
      console.log('─'.repeat(80));
      console.log('');
      console.log(`📊 Tipo: ${mensagemObj.tipo}`);
      console.log(`⚠️  Prioridade: ${mensagemObj.prioridade}`);
      console.log('');

      console.log('6️⃣ Enviando via WhatsApp...\n');

      const resultado = await whatsapp.enviar(numeroWhatsApp, mensagemObj.mensagem);

      console.log('📊 RESULTADO DO ENVIO:\n');
      console.log(JSON.stringify(resultado, null, 2));
      console.log('');

      if (resultado.sucesso) {
        console.log('✅ MENSAGEM ENVIADA COM SUCESSO!\n');
        console.log(`📱 Destinatário: ${numeroWhatsApp}`);
        console.log(`📋 Parceiro: ${parceiro.NOMEPARC}`);
        console.log(`💰 Tipo: ${mensagemObj.tipo}`);
        console.log('');
      } else {
        console.log('❌ ERRO NO ENVIO:\n');
        console.log(`   ${resultado.erro}\n`);
      }
    }

    console.log('✨ Teste finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarEnvioWhatsApp();
