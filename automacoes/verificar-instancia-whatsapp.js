/**
 * Verificar se a instância do WhatsApp está ativa
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

async function verificarInstancia() {
  console.log('🔍 VERIFICANDO INSTÂNCIA DO WHATSAPP\n');

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const instance = process.env.WHATSAPP_INSTANCE;

  console.log('📋 Configurações:');
  console.log(`   - API URL: ${apiUrl}`);
  console.log(`   - API Key: ${apiKey ? '***' + apiKey.slice(-10) : 'NÃO DEFINIDA'}`);
  console.log(`   - Instance: ${instance || 'NÃO DEFINIDA'}\n`);

  if (!instance) {
    console.log('❌ WHATSAPP_INSTANCE não está definida no .env!');
    return;
  }

  try {
    // 1. Testar conexão com a API
    console.log('📡 1. Testando conexão com Evolution API...\n');

    const url = `${apiUrl}/instance/fetchInstances`;
    console.log(`   GET ${url}\n`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ Conexão estabelecida com sucesso!\n');
    console.log('📱 Instâncias disponíveis:\n');

    if (data && Array.isArray(data)) {
      data.forEach((inst, index) => {
        const nome = inst.instance?.instanceName || inst.instanceName || 'N/A';
        const status = inst.instance?.state || inst.state || 'N/A';
        const conectado = status === 'open' ? '✅' : '❌';

        console.log(`   ${index + 1}. ${conectado} ${nome} - Status: ${status}`);

        if (nome === instance) {
          console.log('      👆 ESTA É A INSTÂNCIA CONFIGURADA NO .env');
        }
      });
    } else {
      console.log('   ⚠️  Nenhuma instância encontrada ou formato inesperado');
      console.log('   Resposta:', JSON.stringify(data, null, 2));
    }

    // 2. Testar envio de mensagem
    console.log('\n📱 2. Testando envio de mensagem de teste...\n');

    const numeroTeste = '556199660063'; // Bruna (55 + DDD 61 + número)
    const mensagemUrl = `${apiUrl}/message/sendText/${instance}`;

    const mensagemBody = {
      number: numeroTeste,
      text: '🧪 Teste de conexão - Evolution API'
    };

    console.log(`   POST ${mensagemUrl}`);
    console.log(`   Body:`, JSON.stringify(mensagemBody, null, 2));

    const mensagemResponse = await fetch(mensagemUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(mensagemBody)
    });

    console.log(`\n   Status: ${mensagemResponse.status} ${mensagemResponse.statusText}`);

    const mensagemText = await mensagemResponse.text();
    console.log(`   Resposta (raw):\n${mensagemText}\n`);

    if (!mensagemResponse.ok) {
      console.log('❌ Erro ao enviar mensagem');
      try {
        const errorJson = JSON.parse(mensagemText);
        console.log('   Erro (JSON):', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('   Resposta não é JSON válido');
      }
    } else {
      console.log('✅ Mensagem enviada com sucesso!');
      try {
        const successJson = JSON.parse(mensagemText);
        console.log('   Resposta (JSON):', JSON.stringify(successJson, null, 2));
      } catch (e) {
        // Já exibimos o raw acima
      }
    }

  } catch (error) {
    console.error('\n❌ ERRO ao conectar com Evolution API:');
    console.error(`   Mensagem: ${error.message}`);
    console.error(error);
  }
}

verificarInstancia();
