const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

async function testarDadosParceiro() {
  try {
    const api = new SankhyaAPI(config.production);
    await api.autenticar();

    const cobranca = new CobrancaBoletos(api);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(2878);

    console.log('\n=== TODOS OS CAMPOS DO PARCEIRO 2878 ===\n');
    console.log(JSON.stringify(parceiro, null, 2));

    console.log('\n=== CAMPOS DE ENDEREÇO ===\n');
    console.log('ENDERECOPARC:', parceiro.ENDERECOPARC);
    console.log('NOMEND:', parceiro.NOMEND);
    console.log('NUMEND:', parceiro.NUMEND);
    console.log('COMPLEMENTO:', parceiro.COMPLEMENTO);
    console.log('CEP:', parceiro.CEP);
    console.log('CIDPAR:', parceiro.CIDPAR);
    console.log('NOMECID:', parceiro.NOMECID);
    console.log('UFPAR:', parceiro.UFPAR);
    console.log('BAIRRO:', parceiro.BAIRRO);

  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testarDadosParceiro();
