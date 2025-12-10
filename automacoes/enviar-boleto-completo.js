/**
 * Envio COMPLETO de Boleto
 * - Mensagem da cadência
 * - Linha digitável
 * - QR Code PIX
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const CadenciaCobranca = require('./CadenciaCobranca');
const WhatsAppService = require('./WhatsAppService');
const GeradorBoletoPDF = require('./GeradorBoletoPDF');

const config = {
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

const NUMERO_TESTE = '5561999660063';
const CODPARC = 2878; // QUIXABA AUTO PECAS
const NUFIN = 19106;

async function enviarBoletoCompleto() {
  console.log('\n💰 ENVIO COMPLETO DE BOLETO\n');
  console.log('='.repeat(80));
  console.log(`Parceiro: QUIXABA AUTO PECAS LTDA (${CODPARC})`);
  console.log(`Título: NUFIN ${NUFIN}`);
  console.log(`WhatsApp: ${NUMERO_TESTE}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const sankhyaApi = new SankhyaAPI(config.production);
    const cobranca = new CobrancaBoletos(sankhyaApi);
    const cadencia = new CadenciaCobranca();
    const whatsapp = new WhatsAppService(configWhatsApp);
    const geradorBoleto = new GeradorBoletoPDF();

    // 1. Autenticar
    console.log('1️⃣ Autenticando...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Buscar parceiro
    console.log('2️⃣ Buscando parceiro...\n');
    const parceiro = await cobranca.buscarDadosParceiro(CODPARC);
    console.log(`✅ ${parceiro.NOMEPARC}\n`);

    // 3. Buscar título COM TODOS OS CAMPOS
    console.log('3️⃣ Buscando título completo...\n');

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.NUFIN = ?' },
            parameter: [{ $: String(NUFIN), type: 'I' }]
          },
          entity: {
            fieldset: { list: '*' }
          }
        }
      }
    };

    const response = await sankhyaApi.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    const entities = response.responseBody?.entities;
    if (!entities || !entities.entity) {
      console.log('❌ Título não encontrado');
      return;
    }

    const tituloRaw = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;
    const metadata = entities.metadata?.fields?.field || [];

    // Processar título
    const titulo = {};
    metadata.forEach((field, index) => {
      const fieldKey = `f${index}`;
      if (tituloRaw[fieldKey]) {
        titulo[field.name] = tituloRaw[fieldKey].$ || tituloRaw[fieldKey];
      }
    });

    console.log('✅ Título encontrado!\n');
    console.log('📋 DADOS DO TÍTULO:');
    console.log('─'.repeat(80));
    console.log(`   NUFIN: ${titulo.NUFIN}`);
    console.log(`   NF: ${titulo.NUMNOTA}`);
    console.log(`   Vencimento: ${titulo.DTVENC}`);
    console.log(`   Valor: R$ ${titulo.VLRDESDOB}`);
    console.log(`   Nosso Número: ${titulo.NOSSONUM}`);
    console.log(`   Linha Digit: ${titulo.LINHADIGITAVEL}`);
    console.log(`   Cód Barras: ${titulo.CODIGOBARRA}`);
    console.log(`   PIX: ${titulo.EMVPIX ? 'SIM' : 'NÃO'}`);
    console.log('─'.repeat(80));
    console.log('');

    // 4. Calcular dias para vencimento
    const diasVencimento = cobranca.calcularDiasVencimento(titulo.DTVENC);
    console.log(`📅 Dias para vencimento: ${diasVencimento}\n`);

    // 5. Criar título enriquecido
    const tituloEnriquecido = {
      ...titulo,
      parceiro: {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        whatsapp: NUMERO_TESTE,
        email: parceiro.EMAIL
      }
    };

    // 6. Gerar mensagem da cadência
    console.log('4️⃣ Gerando mensagem...\n');
    const mensagemObj = cadencia.gerarMensagem(tituloEnriquecido, diasVencimento);

    let mensagemFinal = '';

    if (mensagemObj) {
      // Usar mensagem da cadência
      mensagemFinal = mensagemObj.mensagem;
      console.log(`✅ Mensagem: ${mensagemObj.tipo}\n`);
    } else {
      // Mensagem genérica (quando fora da cadência)
      mensagemFinal = `Olá! Tudo bem? 😊 Aqui é a Alice da LC Baterias.

Segue o boleto referente à NF ${titulo.NUMNOTA}:`;
    }

    // Adicionar informações de pagamento formatadas profissionalmente
    mensagemFinal += `

═══════════════════════════
🏦 *DADOS DO BOLETO BANCÁRIO*
═══════════════════════════

📄 *Nota Fiscal:* ${titulo.NUMNOTA}
💰 *Valor:* R$ ${titulo.VLRDESDOB}
📅 *Vencimento:* ${titulo.DTVENC}
🏦 *Banco:* ${titulo.Banco_NOMEBCO || 'Itaú'}

═══════════════════════════
📱 *PAGAR COM PIX (INSTANTÂNEO)*
═══════════════════════════`;

    if (titulo.EMVPIX) {
      mensagemFinal += `

Copie o código abaixo e cole no seu app bancário:

\`${titulo.EMVPIX}\`

✅ Pagamento aprovado na hora!

═══════════════════════════`;
    }

    mensagemFinal += `
🔢 *PAGAR COM LINHA DIGITÁVEL*
═══════════════════════════

Use esta linha digitável no app do seu banco:

\`${titulo.LINHADIGITAVEL}\`

═══════════════════════════

Dúvidas? Respondemos em minutos!
📞 (61) 3372-0036`;

    console.log('📨 MENSAGEM COMPLETA:\n');
    console.log('─'.repeat(80));
    console.log(mensagemFinal);
    console.log('─'.repeat(80));
    console.log('');

    // 5. Enviar via WhatsApp
    console.log('5️⃣ Enviando via WhatsApp...\n');

    const resultado = await whatsapp.enviarMensagem(NUMERO_TESTE, mensagemFinal);

    if (resultado.key && resultado.key.id) {
      console.log('🎉🎉🎉 BOLETO ENVIADO COM SUCESSO! 🎉🎉🎉\n');
      console.log('='.repeat(80));
      console.log(`📱 Destinatário: ${NUMERO_TESTE}`);
      console.log(`👤 Parceiro: ${parceiro.NOMEPARC}`);
      console.log(`💰 Título: NUFIN ${titulo.NUFIN}`);
      console.log(`📄 NF: ${titulo.NUMNOTA}`);
      console.log(`💵 Valor: R$ ${titulo.VLRDESDOB}`);
      console.log(`📅 Vencimento: ${titulo.DTVENC}`);
      console.log(`🆔 Message ID: ${resultado.key.id}`);
      console.log('='.repeat(80));
      console.log('');
      console.log('✅ MENSAGEM ENVIADA!');
      console.log('📦 Inclui:');
      console.log('   ✓ Mensagem da cadência');
      console.log('   ✓ Dados do boleto bancário');
      console.log('   ✓ PIX Copia e Cola (instantâneo)');
      console.log('   ✓ Linha Digitável');
      console.log('   ✓ Telefone para dúvidas');
      console.log('');
      console.log('🔍 VERIFIQUE SEU WHATSAPP!');
      console.log('');
    } else {
      console.log('📊 RESULTADO:\n');
      console.log(JSON.stringify(resultado, null, 2));
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

enviarBoletoCompleto();
