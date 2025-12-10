/**
 * Procurar campo que contém a chave do arquivo do boleto
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

async function procurarChaveArquivo() {
  console.log('\n🔍 PROCURANDO CHAVE DO ARQUIVO DO BOLETO\n');
  console.log('='.repeat(80));

  try {
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // Buscar TODOS os títulos em aberto do parceiro 2878
    console.log('1️⃣ Buscando títulos do parceiro 2878...\n');

    const request = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPARC = ? AND this.RECDESP = ?'
            },
            parameter: [
              { $: '2878', type: 'I' },
              { $: '1', type: 'I' }
            ]
          },
          entity: {
            fieldset: { list: '*' }
          }
        }
      }
    };

    const response = await api.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      request
    );

    const entities = response.responseBody?.entities;
    if (!entities || !entities.entity) {
      console.log('❌ Nenhum título encontrado');
      return;
    }

    const metadata = entities.metadata?.fields?.field || [];
    const items = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

    console.log(`✅ Encontrados ${items.length} título(s)\n`);

    // Processar cada título
    for (const item of items) {
      const titulo = {};

      metadata.forEach((field, index) => {
        const fieldKey = `f${index}`;
        if (item[fieldKey]) {
          titulo[field.name] = item[fieldKey].$ || item[fieldKey];
        }
      });

      console.log('─'.repeat(80));
      console.log(`📄 NUFIN ${titulo.NUFIN} - NF ${titulo.NUMNOTA}`);
      console.log('─'.repeat(80));

      // Procurar campos que possam conter hash/chave
      const camposComHash = [];

      Object.keys(titulo).forEach(campo => {
        const valor = String(titulo[campo]);

        // Verificar se parece com hash (32+ caracteres alfanuméricos)
        if (valor.length >= 32 && /^[A-F0-9]+$/i.test(valor)) {
          camposComHash.push({ campo, valor });
        }

        // Verificar se contém palavras-chave
        const palavrasChave = ['chave', 'key', 'hash', 'arquivo', 'file', 'boleto'];
        const campoLower = campo.toLowerCase();
        const valorLower = valor.toLowerCase();

        if (palavrasChave.some(p => campoLower.includes(p) || valorLower.includes(p))) {
          if (!camposComHash.find(c => c.campo === campo)) {
            camposComHash.push({ campo, valor });
          }
        }
      });

      if (camposComHash.length > 0) {
        console.log('🔑 Campos suspeitos:');
        camposComHash.forEach(({ campo, valor }) => {
          console.log(`   ${campo}: ${valor}`);
        });
      } else {
        console.log('⚠️  Nenhum campo suspeito encontrado');
      }

      console.log('');
    }

    // Agora vamos procurar em tabelas relacionadas
    console.log('='.repeat(80));
    console.log('2️⃣ Procurando em tabelas relacionadas...\n');

    // Tentar tabela de Boletos (se existir)
    const tabelasTeste = [
      'Boleto',
      'BoletoRegistrado',
      'FinanceiroBoleto',
      'ArquivoBoleto',
      'DocumentoBoleto'
    ];

    for (const tabela of tabelasTeste) {
      console.log(`🔍 Testando entidade: ${tabela}...`);

      try {
        const requestTabela = {
          serviceName: 'CRUDServiceProvider.loadRecords',
          requestBody: {
            dataSet: {
              rootEntity: tabela,
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

        const responseTabela = await api.post(
          '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
          requestTabela
        );

        if (responseTabela.responseBody?.entities?.entity) {
          console.log(`✅ Entidade ${tabela} EXISTE e tem dados!\n`);

          const entitiesTabela = responseTabela.responseBody.entities;
          const metadataTabela = entitiesTabela.metadata?.fields?.field || [];
          const itemTabela = Array.isArray(entitiesTabela.entity) ?
            entitiesTabela.entity[0] : entitiesTabela.entity;

          console.log('📋 Campos disponíveis:');
          metadataTabela.forEach((field, index) => {
            const fieldKey = `f${index}`;
            const valor = itemTabela[fieldKey];
            if (valor) {
              const valorStr = typeof valor === 'object' ? valor.$ : valor;
              console.log(`   ${field.name}: ${valorStr}`);
            }
          });
          console.log('');
        }
      } catch (error) {
        console.log(`   ❌ ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
  }
}

procurarChaveArquivo();
