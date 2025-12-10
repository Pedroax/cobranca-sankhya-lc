/**
 * Teste - Buscar Títulos SEM filtros restritivos
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

async function testarTitulosSemFiltro() {
  console.log('\n💰 TESTE - BUSCAR TÍTULOS SEM FILTROS\n');
  console.log('='.repeat(80));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const api = new SankhyaAPI(config[AMBIENTE]);

    console.log('1️⃣ Autenticando...\n');
    await api.autenticar();
    console.log('✅ Autenticado\n');

    console.log('2️⃣ Buscando primeiros 10 títulos (SEM FILTROS)...\n');

    // Busca MÍNIMA - apenas primeiros registros sem filtro nenhum
    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          entity: {
            fieldset: {
              list: 'NUFIN,CODPARC,DTVENC,VLRDESDOB,RECDESP,DHBAIXA,PROVISAO,NOSSONUM,NUMNOTA'
            }
          }
        }
      }
    };

    const response = await api.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestBody
    );

    console.log('📦 RESPOSTA DA API:\n');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n✨ Teste finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarTitulosSemFiltro();
