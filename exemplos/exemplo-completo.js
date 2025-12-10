/**
 * Exemplo Completo - Operações avançadas com a API Sankhya
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const SankhyaAPI = require('../SankhyaAPI');

// Configurar ambiente (sandbox ou production)
const AMBIENTE = process.env.AMBIENTE || 'production';

const config = {
  sandbox: {
    xToken: process.env.SANDBOX_X_TOKEN,
    clientId: process.env.SANDBOX_CLIENT_ID,
    clientSecret: process.env.SANDBOX_CLIENT_SECRET
  },
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

const api = new SankhyaAPI(config[AMBIENTE]);

async function exemploCompleto() {
  console.log('🚀 Exemplo Completo - SankhyaAPI');
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}\n`);

  try {
    // 1. Autenticação automática
    console.log('1️⃣ Autenticando automaticamente...');
    await api.garantirToken();
    console.log('✅ Token obtido!\n');

    // 2. Verificar status do token
    console.log('2️⃣ Status do token:');
    console.log(api.infoToken());
    console.log('');

    // 3. Exemplo de GET
    console.log('3️⃣ Exemplo de requisição GET:');
    console.log('   Endpoint: /gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords');
    console.log('   (Substitua pelo endpoint real que você precisa)\n');

    /*
    const resultado = await api.get('/gateway/v1/mge/service.sbr', {
      params: {
        serviceName: 'CRUDServiceProvider.loadRecords',
        outputType: 'json'
      }
    });
    console.log('Resultado:', resultado);
    */

    // 4. Exemplo de POST
    console.log('4️⃣ Exemplo de requisição POST:');
    console.log('   (Descomente e ajuste para seu caso de uso)\n');

    /*
    const novoRegistro = await api.post('/gateway/v1/mge/service.sbr', {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        dataSet: {
          // seus dados aqui
        }
      }
    });
    console.log('Novo registro:', novoRegistro);
    */

    // 5. Renovação automática de token
    console.log('5️⃣ Renovação automática de token:');
    console.log('   A classe renova automaticamente quando o token expira!');
    console.log('   Você não precisa se preocupar com isso.\n');

    // 6. Múltiplas requisições
    console.log('6️⃣ Fazendo múltiplas requisições:');
    console.log('   A classe gerencia o token automaticamente para você!\n');

    /*
    for (let i = 0; i < 3; i++) {
      console.log(`   Requisição ${i + 1}...`);
      const resultado = await api.get('/seu-endpoint');
      console.log(`   ✅ Sucesso`);
    }
    */

    console.log('✨ Exemplo completo finalizado!\n');

    // Mostrar informações finais do token
    console.log('📊 Status final do token:');
    console.log(api.infoToken());

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

exemploCompleto();
