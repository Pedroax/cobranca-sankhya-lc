/**
 * Buscar NUFIN 19106 específico
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

async function buscar() {
  try {
    const api = new SankhyaAPI(config.production);
    await api.autenticar();

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.NUFIN = ?' },
            parameter: [{ $: '19106', type: 'I' }]
          },
          entity: {
            fieldset: { list: '*' }
          }
        }
      }
    };

    const response = await api.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    const entities = response.responseBody?.entities;
    if (!entities || !entities.entity) {
      console.log('❌ Título não encontrado');
      return;
    }

    const titulo = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;
    const metadata = entities.metadata?.fields?.field || [];

    console.log('\n📄 TÍTULO NUFIN 19106 - CAMPOS PREENCHIDOS:\n');
    console.log('='.repeat(80));

    metadata.forEach((field, index) => {
      const fieldKey = `f${index}`;
      const valor = titulo[fieldKey];
      if (valor && (typeof valor === 'object' ? valor.$ : valor)) {
        const valorStr = typeof valor === 'object' ? valor.$ : valor;
        console.log(`${field.name}: ${valorStr}`);
      }
    });

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ ERRO:', error.message);
  }
}

buscar();
