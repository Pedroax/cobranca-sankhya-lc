/**
 * Teste - Descobrir Campos Disponíveis em Parceiro
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');

const AMBIENTE = process.env.AMBIENTE || 'production';

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

async function testarCamposParceiro() {
  console.log('\n🔍 TESTE - DESCOBRIR CAMPOS DE PARCEIRO\n');
  console.log('='.repeat(80));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const api = new SankhyaAPI(config[AMBIENTE]);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // Teste 1: Apenas campos básicos
    console.log('1️⃣ Testando campos básicos (CODPARC, NOMEPARC)...\n');

    let requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          entity: {
            fieldset: {
              list: 'CODPARC,NOMEPARC'
            }
          }
        }
      }
    };

    let response = await api.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    console.log('📦 RESPOSTA (campos básicos):');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Teste 2: Adicionar TELEFONE
    console.log('2️⃣ Testando com TELEFONE...\n');

    requestBody.requestBody.dataSet.entity.fieldset.list = 'CODPARC,NOMEPARC,TELEFONE';

    response = await api.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    console.log('📦 RESPOSTA (com TELEFONE):');
    console.log(JSON.stringify(response, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Teste 3: Tentar CELULAR
    console.log('3️⃣ Testando com CELULAR...\n');

    requestBody.requestBody.dataSet.entity.fieldset.list = 'CODPARC,NOMEPARC,CELULAR';

    try {
      response = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestBody
      );

      console.log('📦 RESPOSTA (com CELULAR):');
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('❌ ERRO ao buscar CELULAR:');
      console.log(error.message);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Teste 4: Tentar EMAIL
    console.log('4️⃣ Testando com EMAIL...\n');

    requestBody.requestBody.dataSet.entity.fieldset.list = 'CODPARC,NOMEPARC,EMAIL';

    try {
      response = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestBody
      );

      console.log('📦 RESPOSTA (com EMAIL):');
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.log('❌ ERRO ao buscar EMAIL:');
      console.log(error.message);
    }

    console.log('\n✨ Teste finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarCamposParceiro();
