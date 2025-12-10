/**
 * Teste - Acesso Direto ao Visualizador
 * Tentando acessar sem o /gateway/v1
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

async function testarVisualizadorDireto() {
  console.log('\n🔍 TESTE - VISUALIZADOR DIRETO\n');
  console.log('='.repeat(80));

  try {
    const sankhyaApi = new SankhyaAPI(config.production);

    console.log('1️⃣ Autenticando...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');
    console.log(`🔑 JSESSIONID: ${sankhyaApi.jsessionid}\n`);

    // Exemplo de chave do boleto que você forneceu
    const chaveExemplo = 'boleto_82063088409968C26C31FFCE2A058030';

    console.log('2️⃣ Tentando acessar visualizadorArquivos diretamente...\n');
    console.log(`📝 Chave de teste: ${chaveExemplo}\n`);

    // Construir URL completa
    const baseUrl = sankhyaApi.baseURL.replace('/gateway/v1', '');
    const urlCompleta = `${baseUrl}/mge/visualizadorArquivos.mge?chaveArquivo=${chaveExemplo}`;

    console.log(`🌐 URL completa: ${urlCompleta}\n`);

    // Fazer requisição com fetch incluindo cookie de sessão
    const response = await fetch(urlCompleta, {
      method: 'GET',
      headers: {
        'Cookie': `JSESSIONID=${sankhyaApi.jsessionid}`,
        'Accept': 'application/pdf,*/*'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📦 Content-Type: ${response.headers.get('content-type')}\n`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('pdf')) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`✅ PDF ENCONTRADO!`);
        console.log(`   Tamanho: ${buffer.length} bytes\n`);

        // Salvar
        const fs = require('fs');
        const caminhoSalvar = path.join(__dirname, '..', 'temp', 'boleto_teste.pdf');

        if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
          fs.mkdirSync(path.join(__dirname, '..', 'temp'));
        }

        fs.writeFileSync(caminhoSalvar, buffer);
        console.log(`💾 Salvo em: ${caminhoSalvar}\n`);

        console.log('🎉 SUCESSO! O endpoint funciona!\n');
      } else {
        const texto = await response.text();
        console.log('⚠️  Resposta não é PDF:\n');
        console.log(texto.substring(0, 500));
        console.log('');
      }
    } else {
      const texto = await response.text();
      console.log('❌ Erro na requisição:\n');
      console.log(texto.substring(0, 500));
      console.log('');
    }

    console.log('💡 INFORMAÇÕES IMPORTANTES:');
    console.log('   - Este endpoint requer autenticação via JSESSIONID (cookie)');
    console.log('   - A chave do arquivo precisa ser obtida de algum lugar');
    console.log('   - Pode estar em um campo do título ou em outra tabela');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
  }
}

testarVisualizadorDireto();
