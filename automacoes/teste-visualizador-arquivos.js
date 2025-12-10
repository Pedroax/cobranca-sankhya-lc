/**
 * Teste - Visualizador de Arquivos Sankhya
 *
 * Endpoint descoberto: /mge/visualizadorArquivos.mge
 * Parâmetro: chaveArquivo=boleto_{hash}
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

async function testarVisualizadorArquivos() {
  console.log('\n🔍 TESTE - VISUALIZADOR DE ARQUIVOS SANKHYA\n');
  console.log('='.repeat(80));
  console.log(`NUFIN: ${NUFIN}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const sankhyaApi = new SankhyaAPI(config.production);

    // 1. Autenticar
    console.log('1️⃣ Autenticando...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Buscar título para pegar informações
    console.log('2️⃣ Buscando título...\n');

    const requestTitulo = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
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

    const responseTitulo = await sankhyaApi.post(
      '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      requestTitulo
    );

    const entities = responseTitulo.responseBody?.entities;
    if (!entities || !entities.entity) {
      console.log('❌ Título não encontrado');
      return;
    }

    const tituloRaw = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;
    const metadata = entities.metadata?.fields?.field || [];

    const titulo = {};
    metadata.forEach((field, index) => {
      const fieldKey = `f${index}`;
      if (tituloRaw[fieldKey]) {
        titulo[field.name] = tituloRaw[fieldKey].$ || tituloRaw[fieldKey];
      }
    });

    console.log('✅ Título encontrado\n');
    console.log('📋 Dados:');
    console.log(`   NUFIN: ${titulo.NUFIN}`);
    console.log(`   NOSSONUM: ${titulo.NOSSONUM}`);
    console.log(`   NUNOTA: ${titulo.NUNOTA}`);
    console.log(`   CODBCO: ${titulo.CODBCO}`);
    console.log('');

    // 3. Procurar campo que possa conter a chaveArquivo
    console.log('3️⃣ Procurando campos que possam conter chave do arquivo...\n');

    const camposSuspeitos = Object.keys(titulo).filter(campo => {
      const valor = String(titulo[campo]).toLowerCase();
      return valor.includes('boleto') ||
             valor.includes('arquivo') ||
             valor.includes('chave') ||
             valor.length === 32 || // MD5
             valor.length === 40 || // SHA1
             valor.length === 64;   // SHA256
    });

    if (camposSuspeitos.length > 0) {
      console.log('🔍 Campos suspeitos encontrados:');
      camposSuspeitos.forEach(campo => {
        console.log(`   ${campo}: ${titulo[campo]}`);
      });
      console.log('');
    } else {
      console.log('⚠️  Nenhum campo suspeito encontrado nos dados do título\n');
    }

    // 4. Tentar algumas variações da chave
    console.log('4️⃣ Tentando gerar possíveis chaves de arquivo...\n');

    const possiveisChaves = [
      `boleto_${titulo.NUFIN}`,
      `boleto_${titulo.NOSSONUM}`,
      `boleto_${titulo.NUNOTA}`,
      `${titulo.NUFIN}_${titulo.NOSSONUM}`,
      // Exemplo real que você forneceu
      'boleto_82063088409968C26C31FFCE2A058030'
    ];

    console.log('📝 Possíveis chaves que serão testadas:');
    possiveisChaves.forEach((chave, i) => {
      console.log(`   ${i + 1}. ${chave}`);
    });
    console.log('');

    // 5. Testar endpoint /mge/visualizadorArquivos.mge
    console.log('5️⃣ Testando endpoint visualizadorArquivos.mge...\n');

    for (const chave of possiveisChaves) {
      console.log(`⏳ Testando chave: ${chave}...`);

      try {
        // Tentar via API Gateway
        const url = `/gateway/v1/mge/visualizadorArquivos.mge?chaveArquivo=${chave}`;

        const response = await sankhyaApi.get(url, {
          responseType: 'arraybuffer'
        });

        if (response && response.length > 0) {
          console.log(`✅ ARQUIVO ENCONTRADO!`);
          console.log(`   Chave: ${chave}`);
          console.log(`   Tamanho: ${response.length} bytes`);

          // Salvar arquivo
          const fs = require('fs');
          const caminhoSalvar = path.join(__dirname, '..', 'temp', `boleto_${titulo.NUFIN}_teste.pdf`);

          if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'temp'));
          }

          fs.writeFileSync(caminhoSalvar, response);
          console.log(`   Salvo em: ${caminhoSalvar}`);
          console.log('');

          console.log('🎉🎉🎉 PDF DO BOLETO ENCONTRADO! 🎉🎉🎉\n');
          return;
        }
      } catch (error) {
        console.log(`   ❌ Não encontrado: ${error.message}\n`);
      }
    }

    console.log('⚠️  Nenhuma das chaves testadas retornou o arquivo\n');
    console.log('💡 PRÓXIMOS PASSOS:');
    console.log('   1. Verificar se existe um campo no título que contém a chave');
    console.log('   2. Buscar na tabela de anexos/documentos');
    console.log('   3. Consultar API específica de boletos');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarVisualizadorArquivos();
