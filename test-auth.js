/**
 * Script de Teste - Autenticação API Sankhya (OAuth 2.0)
 *
 * Este script testa a autenticação usando o método OAuth 2.0 Client Credentials
 * com X-Token conforme documentação oficial da Sankhya.
 */

require('dotenv').config();

const AMBIENTE = process.env.AMBIENTE || 'sandbox';

// Configurações por ambiente
const config = {
  sandbox: {
    xToken: process.env.SANDBOX_X_TOKEN,
    clientId: process.env.SANDBOX_CLIENT_ID,
    clientSecret: process.env.SANDBOX_CLIENT_SECRET,
    baseUrl: 'https://api.sankhya.com.br'
  },
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET,
    baseUrl: 'https://api.sankhya.com.br'
  }
};

const { xToken, clientId, clientSecret, baseUrl } = config[AMBIENTE];

console.log('\n🔐 TESTE DE AUTENTICAÇÃO - API SANKHYA');
console.log('=====================================\n');
console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
console.log(`🌐 URL Base: ${baseUrl}`);
console.log(`🔑 X-Token: ${xToken.substring(0, 8)}...`);
console.log(`🆔 Client ID: ${clientId.substring(0, 8)}...`);
console.log('\n');

async function testarAutenticacao() {
  try {
    console.log('⏳ Enviando requisição de autenticação...\n');

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    const response = await fetch(`${baseUrl}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Token': xToken
      },
      body: params
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.ok) {
      console.log('✅ AUTENTICAÇÃO BEM-SUCEDIDA!\n');
      console.log('📦 Resposta:');
      console.log(JSON.stringify(data, null, 2));

      if (data.access_token) {
        console.log('\n🎉 Access Token JWT obtido com sucesso!');
        console.log(`🔑 Token: ${data.access_token.substring(0, 50)}...`);

        if (data.expires_in) {
          console.log(`⏱️  Expira em: ${data.expires_in} segundos`);
        }
      }
    } else {
      console.log('❌ FALHA NA AUTENTICAÇÃO!\n');
      console.log('📦 Resposta de erro:');
      console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    }

    return data;

  } catch (error) {
    console.log('❌ ERRO NA REQUISIÇÃO!\n');
    console.error('Detalhes do erro:', error.message);

    if (error.cause) {
      console.error('Causa:', error.cause);
    }
  }
}

// Executar teste
testarAutenticacao()
  .then(() => {
    console.log('\n✨ Teste finalizado!\n');
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
