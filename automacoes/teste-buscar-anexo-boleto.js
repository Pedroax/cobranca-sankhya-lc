/**
 * Buscar anexo/documento do boleto
 * Procurar por tabelas/entidades que armazenam documentos/arquivos
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

const NUFIN = 19106;

async function buscarAnexo() {
  console.log('\n🔍 BUSCANDO ANEXO/DOCUMENTO DO BOLETO\n');
  console.log('='.repeat(80));
  console.log(`NUFIN: ${NUFIN}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 1. Tentar buscar na entidade DocumentoRelacionado
    console.log('1️⃣ Buscando em DocumentoRelacionado...\n');

    try {
      const requestDoc = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'DocumentoRelacionado',
            includePresentationFields: 'S',
            offsetPage: '0',
            criteria: {
              expression: { $: 'this.NUFIN = ?' },
              parameter: [{ $: String(NUFIN), type: 'I' }]
            },
            entity: {
              fieldset: { list: '*' }
            }
          }
        }
      };

      const responseDoc = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestDoc
      );

      if (responseDoc.responseBody?.entities?.entity) {
        console.log('✅ Documentos encontrados!\n');
        console.log(JSON.stringify(responseDoc.responseBody.entities, null, 2));
      } else {
        console.log('⚠️  Nenhum documento na entidade DocumentoRelacionado\n');
      }
    } catch (error) {
      console.log(`⚠️  Erro ao buscar DocumentoRelacionado: ${error.message}\n`);
    }

    // 2. Tentar buscar na entidade Anexo
    console.log('2️⃣ Buscando em Anexo...\n');

    try {
      const requestAnexo = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Anexo',
            includePresentationFields: 'S',
            offsetPage: '0',
            criteria: {
              expression: { $: 'this.NUFIN = ?' },
              parameter: [{ $: String(NUFIN), type: 'I' }]
            },
            entity: {
              fieldset: { list: '*' }
            }
          }
        }
      };

      const responseAnexo = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestAnexo
      );

      if (responseAnexo.responseBody?.entities?.entity) {
        console.log('✅ Anexos encontrados!\n');
        console.log(JSON.stringify(responseAnexo.responseBody.entities, null, 2));
      } else {
        console.log('⚠️  Nenhum anexo na entidade Anexo\n');
      }
    } catch (error) {
      console.log(`⚠️  Erro ao buscar Anexo: ${error.message}\n`);
    }

    // 3. Tentar buscar na entidade Arquivo
    console.log('3️⃣ Buscando em Arquivo...\n');

    try {
      const requestArquivo = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Arquivo',
            includePresentationFields: 'S',
            offsetPage: '0',
            entity: {
              fieldset: { list: '*' }
            }
          }
        }
      };

      const responseArquivo = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestArquivo
      );

      if (responseArquivo.responseBody?.entities?.metadata) {
        console.log('✅ Entidade Arquivo existe!\n');
        console.log('📋 Campos disponíveis:\n');
        const fields = responseArquivo.responseBody.entities.metadata.fields?.field || [];
        fields.forEach(f => console.log(`   - ${f.name}`));
        console.log('');
      }
    } catch (error) {
      console.log(`⚠️  Erro ao buscar Arquivo: ${error.message}\n`);
    }

    // 4. Tentar buscar repositório de arquivos pela NUNOTA
    console.log('4️⃣ Buscando arquivos pela NUNOTA 1380...\n');

    try {
      const requestNotaDoc = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Anexo',
            includePresentationFields: 'S',
            offsetPage: '0',
            criteria: {
              expression: { $: 'this.NUNOTA = ?' },
              parameter: [{ $: '1380', type: 'I' }]
            },
            entity: {
              fieldset: { list: '*' }
            }
          }
        }
      };

      const responseNotaDoc = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestNotaDoc
      );

      if (responseNotaDoc.responseBody?.entities?.entity) {
        console.log('✅ Anexos da nota encontrados!\n');
        console.log(JSON.stringify(responseNotaDoc.responseBody.entities, null, 2));
      } else {
        console.log('⚠️  Nenhum anexo vinculado à NUNOTA 1380\n');
      }
    } catch (error) {
      console.log(`⚠️  Erro ao buscar anexos da nota: ${error.message}\n`);
    }

    console.log('='.repeat(80));
    console.log('\n💡 CONCLUSÃO:\n');
    console.log('Se nenhuma entidade retornou documentos, o boleto PDF provavelmente:');
    console.log('1. É gerado sob demanda (não armazenado)');
    console.log('2. Está em repositório externo do banco');
    console.log('3. Precisa ser recuperado via API do banco (Itaú - código 341)');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

buscarAnexo();
