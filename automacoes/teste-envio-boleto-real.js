/**
 * Teste - Envio de Boleto REAL
 *
 * Parceiro: QUIXABA AUTO PECAS LTDA (2878)
 * Envia boleto com vencimento para amanhã
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

async function enviarBoletoReal() {
  console.log('\n💰 ENVIO DE BOLETO REAL - TESTE\n');
  console.log('='.repeat(80));
  console.log(`📍 Parceiro: QUIXABA AUTO PECAS LTDA (2878)`);
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const sankhyaApi = new SankhyaAPI(configSankhya[AMBIENTE]);
    const cobranca = new CobrancaBoletos(sankhyaApi);
    const cadencia = new CadenciaCobranca();
    const whatsapp = new WhatsAppService(configWhatsApp);

    // 1. Autenticar
    console.log('1️⃣ Autenticando na API Sankhya...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Buscar parceiro 2878
    console.log('2️⃣ Buscando dados do parceiro 2878...\n');
    const parceiro = await cobranca.buscarDadosParceiro(2878);

    console.log('📋 PARCEIRO:');
    console.log('─'.repeat(80));
    console.log(`   Código: ${parceiro.CODPARC}`);
    console.log(`   Nome: ${parceiro.NOMEPARC}`);
    console.log(`   Telefone: ${parceiro.TELEFONE || 'Não cadastrado'}`);
    console.log(`   Email: ${parceiro.EMAIL || 'Não cadastrado'}`);
    console.log('─'.repeat(80));
    console.log('');

    if (!parceiro.TELEFONE) {
      console.log('❌ Parceiro não tem telefone cadastrado!\n');
      return;
    }

    // Formatar número
    const numeroLimpo = String(parceiro.TELEFONE).replace(/\D/g, '');
    const numeroWhatsApp = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;

    console.log(`📱 WhatsApp: ${numeroWhatsApp}\n`);

    // 3. Buscar títulos do parceiro que vencem amanhã
    console.log('3️⃣ Buscando títulos que vencem amanhã...\n');

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(0, 0, 0, 0);

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

    console.log(`✅ Encontrados ${titulos.length} título(s) em aberto\n`);

    if (titulos.length === 0) {
      console.log('⚠️  Nenhum título em aberto encontrado para este parceiro.\n');
      console.log('Vou mostrar todos os títulos (incluindo pagos)...\n');

      const requestTodos = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Financeiro',
            includePresentationFields: 'N',
            offsetPage: '0',
            criteria: {
              expression: {
                $: 'this.CODPARC = ? AND this.RECDESP = ?'
              },
              parameter: [
                { $: '2878', type: 'I' },
                { $: '1', type: 'I' }
              ]
            },
            entity: {
              fieldset: {
                list: 'NUFIN,CODPARC,DTVENC,VLRDESDOB,NOSSONUM,NUMNOTA,DHBAIXA'
              }
            }
          }
        }
      };

      const responseTodos = await sankhyaApi.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestTodos
      );

      const todosTitulos = cobranca.processarRespostaFinanceiro(responseTodos);

      console.log(`📋 Total de títulos do parceiro: ${todosTitulos.length}\n`);

      if (todosTitulos.length > 0) {
        console.log('Primeiros 5 títulos:\n');
        todosTitulos.slice(0, 5).forEach((t, i) => {
          console.log(`${i + 1}. NUFIN: ${t.NUFIN} | Venc: ${t.DTVENC} | Valor: R$ ${t.VLRDESDOB} | ${t.DHBAIXA ? 'PAGO' : 'EM ABERTO'}`);
        });
        console.log('');
      }

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
    console.log(`📅 Dias para vencimento: ${diasVencimento}\n`);

    // 5. Criar objeto título enriquecido
    const tituloEnriquecido = {
      ...titulo,
      parceiro: {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        whatsapp: numeroWhatsApp,
        telefone: parceiro.TELEFONE,
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
      return;
    }

    console.log('✅ MENSAGEM GERADA!\n');
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
      numeroWhatsApp,
      mensagemObj.mensagem
    );

    console.log('📊 RESULTADO DA API:\n');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('');

    if (resultado.key && resultado.key.id) {
      console.log('🎉🎉🎉 BOLETO ENVIADO COM SUCESSO! 🎉🎉🎉\n');
      console.log('─'.repeat(80));
      console.log(`📱 Destinatário: ${numeroWhatsApp}`);
      console.log(`👤 Parceiro: ${parceiro.NOMEPARC}`);
      console.log(`💰 Título: NUFIN ${titulo.NUFIN}`);
      console.log(`💵 Valor: R$ ${titulo.VLRDESDOB}`);
      console.log(`📅 Vencimento: ${titulo.DTVENC}`);
      console.log(`📨 Tipo: ${mensagemObj.tipo}`);
      console.log(`🆔 Message ID: ${resultado.key.id}`);
      console.log('─'.repeat(80));
      console.log('');
      console.log('✅ Verifique seu WhatsApp!\n');
    } else {
      console.log('⚠️  Resposta da API inesperada. Verifique o resultado acima.\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

enviarBoletoReal();
