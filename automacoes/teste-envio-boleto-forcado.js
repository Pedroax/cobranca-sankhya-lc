/**
 * Teste - Envio de Boleto FORÇADO (usa número de teste)
 *
 * Parceiro: QUIXABA AUTO PECAS LTDA (2878)
 * Força envio para número de teste: 5561999660063
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

// NÚMERO DE TESTE - FORÇADO
const NUMERO_TESTE = '5561999660063';

async function enviarBoletoForcado() {
  console.log('\n💰 ENVIO DE BOLETO REAL - TESTE FORÇADO\n');
  console.log('='.repeat(80));
  console.log(`📍 Parceiro: QUIXABA AUTO PECAS LTDA (2878)`);
  console.log(`📱 Número de teste: ${NUMERO_TESTE}`);
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const sankhyaApi = new SankhyaAPI(configSankhya[AMBIENTE]);
    const cobranca = new CobrancaBoletos(sankhyaApi);
    const cadencia = new CadenciaCobranca();
    const whatsapp = new WhatsAppService(configWhatsApp);

    // 1. Autenticar
    console.log('1️⃣ Autenticando...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Buscar parceiro
    console.log('2️⃣ Buscando parceiro 2878...\n');
    const parceiro = await cobranca.buscarDadosParceiro(2878);

    console.log('📋 PARCEIRO:');
    console.log('─'.repeat(80));
    console.log(`   Código: ${parceiro.CODPARC}`);
    console.log(`   Nome: ${parceiro.NOMEPARC}`);
    console.log(`   Telefone (Sankhya): ${parceiro.TELEFONE || 'Não cadastrado'}`);
    console.log(`   Telefone (TESTE): ${NUMERO_TESTE} ✅`);
    console.log('─'.repeat(80));
    console.log('');

    // 3. Buscar títulos em aberto
    console.log('3️⃣ Buscando títulos em aberto...\n');

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPARC = ? AND this.RECDESP = ? AND this.DHBAIXA IS NULL'
            },
            parameter: [
              { $: '2878', type: 'I' },
              { $: '1', type: 'I' }
            ]
          },
          entity: {
            fieldset: {
              list: 'NUFIN,CODPARC,DTVENC,VLRDESDOB,NOSSONUM,NUMNOTA'
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

    console.log(`✅ Encontrados ${titulos.length} título(s) em aberto\n`);

    if (titulos.length === 0) {
      console.log('❌ Nenhum título em aberto para este parceiro.\n');
      return;
    }

    // Pegar primeiro título
    const titulo = titulos[0];

    console.log('📋 TÍTULO SELECIONADO:');
    console.log('─'.repeat(80));
    console.log(`   NUFIN: ${titulo.NUFIN}`);
    console.log(`   NF: ${titulo.NUMNOTA || 'N/A'}`);
    console.log(`   Vencimento: ${titulo.DTVENC}`);
    console.log(`   Valor: R$ ${titulo.VLRDESDOB}`);
    console.log(`   Nosso Número: ${titulo.NOSSONUM || 'Sem boleto'}`);
    console.log('─'.repeat(80));
    console.log('');

    // 4. Calcular dias para vencimento
    const diasVencimento = cobranca.calcularDiasVencimento(titulo.DTVENC);
    console.log(`📅 Dias para vencimento: ${diasVencimento}`);
    console.log(`   ${diasVencimento < 0 ? '(VENCIDO)' : diasVencimento === 0 ? '(VENCE HOJE)' : '(A VENCER)'}\n`);

    // 5. Criar objeto título enriquecido com número de teste
    const tituloEnriquecido = {
      ...titulo,
      parceiro: {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        whatsapp: NUMERO_TESTE, // FORÇADO
        telefone: NUMERO_TESTE,
        email: parceiro.EMAIL
      }
    };

    // 6. Gerar mensagem da cadência
    console.log('4️⃣ Gerando mensagem da cadência...\n');

    const mensagemObj = cadencia.gerarMensagem(tituloEnriquecido, diasVencimento);

    if (!mensagemObj) {
      console.log('⚠️  Este título não está em nenhuma etapa da cadência.\n');
      console.log(`   Dias para vencimento: ${diasVencimento}`);
      console.log('   Cadência: D-3, D-0, D+3, D+5\n');

      // Usar mensagem genérica
      const mensagemGenerica = `Olá! Tudo bem? 😊 Aqui é a Alice da LC Baterias.

📋 *Título em Aberto*

• NF: ${titulo.NUMNOTA || 'N/A'}
• Vencimento: ${titulo.DTVENC}
• Valor: R$ ${titulo.VLRDESDOB}

${diasVencimento < 0 ?
  `⚠️ Este título está vencido há ${Math.abs(diasVencimento)} dia(s).` :
  diasVencimento === 0 ?
  `⚠️ Este título vence HOJE.` :
  `Este título vence em ${diasVencimento} dia(s).`}

Por favor, regularize sua situação o quanto antes.`;

      console.log('📨 MENSAGEM GENÉRICA:\n');
      console.log('─'.repeat(80));
      console.log(mensagemGenerica);
      console.log('─'.repeat(80));
      console.log('');

      console.log('5️⃣ Enviando via WhatsApp...\n');

      const resultado = await whatsapp.enviarMensagem(NUMERO_TESTE, mensagemGenerica);

      console.log('📊 RESULTADO:\n');
      console.log(JSON.stringify(resultado, null, 2));
      console.log('');

      if (resultado.key && resultado.key.id) {
        console.log('🎉 MENSAGEM ENVIADA COM SUCESSO!\n');
      }

      return;
    }

    console.log('✅ MENSAGEM DA CADÊNCIA GERADA!\n');
    console.log('─'.repeat(80));
    console.log(mensagemObj.mensagem);
    console.log('─'.repeat(80));
    console.log('');
    console.log(`📊 Tipo: ${mensagemObj.tipo}`);
    console.log(`⚠️  Prioridade: ${mensagemObj.prioridade}`);
    console.log('');

    // 7. Enviar via WhatsApp
    console.log('5️⃣ Enviando via WhatsApp...\n');

    const resultado = await whatsapp.enviarMensagem(
      NUMERO_TESTE,
      mensagemObj.mensagem
    );

    console.log('📊 RESULTADO DA API:\n');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('');

    if (resultado.key && resultado.key.id) {
      console.log('🎉🎉🎉 BOLETO ENVIADO COM SUCESSO! 🎉🎉🎉\n');
      console.log('='.repeat(80));
      console.log(`📱 Destinatário: ${NUMERO_TESTE}`);
      console.log(`👤 Parceiro: ${parceiro.NOMEPARC} (${parceiro.CODPARC})`);
      console.log(`💰 Título: NUFIN ${titulo.NUFIN}`);
      console.log(`📄 NF: ${titulo.NUMNOTA}`);
      console.log(`💵 Valor: R$ ${titulo.VLRDESDOB}`);
      console.log(`📅 Vencimento: ${titulo.DTVENC}`);
      console.log(`📨 Tipo: ${mensagemObj.tipo}`);
      console.log(`🆔 Message ID: ${resultado.key.id}`);
      console.log('='.repeat(80));
      console.log('');
      console.log('✅ VERIFIQUE SEU WHATSAPP!\n');
      console.log('🚀 Sistema 100% operacional!\n');
    } else {
      console.log('⚠️  Resposta inesperada da API.\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

enviarBoletoForcado();
