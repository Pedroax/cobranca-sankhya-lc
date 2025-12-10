/**
 * Teste - Buscar Boleto na API
 * Busca título e todos os campos para encontrar o PDF do boleto
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

async function buscarBoleto() {
  console.log('\n🔍 BUSCANDO BOLETO NA API\n');
  console.log('='.repeat(80));
  console.log('Parceiro: QUIXABA AUTO PECAS LTDA (2878)');
  console.log('Data hoje: 19/11/2024');
  console.log('Data amanhã: 20/11/2024');
  console.log('='.repeat(80));
  console.log('');

  try {
    const api = new SankhyaAPI(config[AMBIENTE]);

    console.log('1️⃣ Autenticando...\n');
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // Buscar títulos que vencem em 20/11/2024 (amanhã)
    console.log('2️⃣ Buscando títulos que vencem em 20/11/2024...\n');

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'S', // IMPORTANTE: Incluir campos de apresentação
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPARC = ? AND this.DTVENC = ? AND this.RECDESP = ? AND this.DHBAIXA IS NULL'
            },
            parameter: [
              { $: '2878', type: 'I' },
              { $: '20/11/2024', type: 'D' },
              { $: '1', type: 'I' }
            ]
          },
          entity: {
            fieldset: {
              list: '*' // BUSCAR TODOS OS CAMPOS
            }
          }
        }
      }
    };

    const response = await api.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    console.log('📦 RESPOSTA COMPLETA DA API:\n');
    console.log(JSON.stringify(response, null, 2));
    console.log('');

    if (response.status !== '1') {
      console.log('❌ Erro:', response.statusMessage);
      return;
    }

    const entities = response.responseBody?.entities;
    if (!entities || !entities.entity) {
      console.log('⚠️  Nenhum título encontrado para 20/11/2024\n');

      // Tentar buscar qualquer título em aberto do parceiro
      console.log('3️⃣ Buscando qualquer título em aberto do parceiro 2878...\n');

      const requestTodos = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Financeiro',
            includePresentationFields: 'S',
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
                list: '*'
              }
            }
          }
        }
      };

      const responseTodos = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestTodos
      );

      console.log('📦 RESPOSTA TODOS OS TÍTULOS:\n');
      console.log(JSON.stringify(responseTodos, null, 2));
      console.log('');

      return;
    }

    console.log('✅ Título(s) encontrado(s)!\n');

    // Processar resposta
    const items = Array.isArray(entities.entity) ? entities.entity : [entities.entity];
    const metadata = entities.metadata?.fields?.field || [];

    console.log('📋 CAMPOS DISPONÍVEIS:\n');
    metadata.forEach((field, index) => {
      console.log(`   f${index}: ${field.name}`);
    });
    console.log('');

    // Mostrar primeiro título com todos os dados
    console.log('📄 DADOS DO PRIMEIRO TÍTULO:\n');
    const primeiroTitulo = items[0];

    metadata.forEach((field, index) => {
      const fieldKey = `f${index}`;
      const valor = primeiroTitulo[fieldKey];
      if (valor) {
        const valorStr = typeof valor === 'object' ? valor.$ : valor;
        console.log(`   ${field.name}: ${valorStr}`);
      }
    });

    console.log('\n✨ Verifique os campos acima para encontrar o boleto (PDF, URL, base64, etc)\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

buscarBoleto();
