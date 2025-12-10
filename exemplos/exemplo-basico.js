/**
 * Exemplo Básico - Como usar a classe SankhyaAPI
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const SankhyaAPI = require('../SankhyaAPI');

// Configurar a API (usando credenciais de produção)
const api = new SankhyaAPI({
  xToken: process.env.PROD_X_TOKEN,
  clientId: process.env.PROD_CLIENT_ID,
  clientSecret: process.env.PROD_CLIENT_SECRET
});

async function exemploBasico() {
  console.log('🚀 Exemplo Básico - SankhyaAPI\n');

  try {
    // 1. Autenticar
    console.log('1️⃣ Autenticando...');
    await api.autenticar();
    console.log('✅ Autenticado com sucesso!\n');

    // 2. Mostrar informações do token
    console.log('2️⃣ Informações do token:');
    console.log(api.infoToken());
    console.log('');

    // 3. Fazer uma requisição de exemplo
    // Nota: Substitua pelo endpoint real que você quer testar
    console.log('3️⃣ Fazendo requisição de teste...');
    console.log('   (Você pode adicionar seu endpoint aqui)\n');

    // Exemplo de como fazer uma requisição GET:
    // const clientes = await api.get('/gateway/v1/mge/clientes');
    // console.log('Clientes:', clientes);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

exemploBasico();
