/**
 * Teste - Envio WhatsApp para Parceiro 1510 (Telefone de Teste)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
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

async function testarEnvioParceiro1510() {
  console.log('\n📱 TESTE - ENVIO PARA PARCEIRO 1510\n');
  console.log('='.repeat(80));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log(`📍 Evolution API: ${configWhatsApp.apiUrl}`);
  console.log(`📍 Instância: ${configWhatsApp.instanceName}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const sankhyaApi = new SankhyaAPI(configSankhya[AMBIENTE]);
    const whatsapp = new WhatsAppService(configWhatsApp);

    console.log('1️⃣ Autenticando...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');

    // Buscar parceiro 1510 DIRETAMENTE
    console.log('2️⃣ Buscando parceiro 1510...\n');

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPARC = ?'
            },
            parameter: [
              { $: '1510', type: 'I' }
            ]
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NOMEPARC,TELEFONE,EMAIL,CGC_CPF'
            }
          }
        }
      }
    };

    const response = await sankhyaApi.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    console.log('📦 RESPOSTA DA API:\n');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    if (response.status !== '1') {
      console.log('❌ Erro ao buscar parceiro:', response.statusMessage);
      return;
    }

    const entities = response.responseBody?.entities;
    if (!entities || !entities.entity) {
      console.log('❌ Parceiro 1510 não encontrado!\n');
      return;
    }

    // Processar parceiro
    const parceiro = {};
    const metadata = entities.metadata?.fields?.field || [];

    // A API retorna objeto único quando é 1 resultado, array quando é múltiplo
    const item = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;

    metadata.forEach((field, index) => {
      const fieldKey = `f${index}`;
      if (item[fieldKey]) {
        parceiro[field.name] = item[fieldKey].$ || item[fieldKey];
      }
    });

    console.log('✅ Parceiro encontrado!\n');
    console.log('📋 DADOS DO PARCEIRO:');
    console.log('─'.repeat(80));
    console.log(`   Código: ${parceiro.CODPARC}`);
    console.log(`   Nome: ${parceiro.NOMEPARC}`);
    console.log(`   Telefone: ${parceiro.TELEFONE || 'Não cadastrado'}`);
    console.log(`   Email: ${parceiro.EMAIL || 'Não cadastrado'}`);
    console.log('─'.repeat(80));
    console.log('');

    // Usar TELEFONE (campo que contém o WhatsApp)
    const numeroContato = parceiro.TELEFONE;

    if (!numeroContato) {
      console.log('❌ Parceiro não tem telefone/celular cadastrado!\n');
      return;
    }

    // Formatar número
    const numeroLimpo = String(numeroContato).replace(/\D/g, '');
    const numeroWhatsApp = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;

    console.log(`📱 Número para envio: ${numeroWhatsApp}\n`);

    // Criar mensagem de teste
    const mensagemTeste = `🧪 *TESTE - SISTEMA DE COBRANÇA LC BATERIAS*

Olá! Tudo bem? 😊

Este é um teste do sistema automatizado de envio de boletos.

📋 *Informações do teste:*
• Parceiro: ${parceiro.NOMEPARC}
• Código: ${parceiro.CODPARC}
• Data/Hora: ${new Date().toLocaleString('pt-BR')}

✅ Se você recebeu esta mensagem, o sistema está funcionando perfeitamente!

📌 *Próximos passos:*
• Configurar cadência de envios (D-3, D-0, D+3, D+5)
• Testar com títulos reais
• Agendar execução automática

🤖 Mensagem automática - Sistema Automatex`;

    console.log('3️⃣ Mensagem preparada:\n');
    console.log('─'.repeat(80));
    console.log(mensagemTeste);
    console.log('─'.repeat(80));
    console.log('');

    console.log('4️⃣ Enviando via WhatsApp...\n');

    const resultado = await whatsapp.enviar(numeroWhatsApp, mensagemTeste);

    console.log('📊 RESULTADO:\n');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('');

    if (resultado.sucesso) {
      console.log('✅ ✅ ✅ SUCESSO! MENSAGEM ENVIADA! ✅ ✅ ✅\n');
      console.log(`📱 Destinatário: ${numeroWhatsApp}`);
      console.log(`📋 Parceiro: ${parceiro.NOMEPARC} (${parceiro.CODPARC})`);
      console.log('');
      console.log('🎉 O sistema está funcionando perfeitamente!\n');
    } else {
      console.log('❌ ERRO NO ENVIO:\n');
      console.log(`   ${resultado.erro}\n`);
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarEnvioParceiro1510();
