/**
 * Teste - Gerar boleto via API Gateway (OAuth)
 * Tentativa de usar o BoletoSP.buildPreVisualizacao via gateway
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

async function testarBoletoGateway() {
  console.log('\n🧪 TESTE - BOLETO VIA GATEWAY\n');
  console.log('='.repeat(80));
  console.log(`NUFIN: ${NUFIN}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const api = new SankhyaAPI(config.production);

    console.log('1️⃣ Autenticando...\n');
    await api.autenticar();
    console.log('✅ Autenticado\n');

    console.log('2️⃣ Tentando gerar boleto via gateway...\n');

    const requestBody = {
      serviceName: 'BoletoSP.buildPreVisualizacao',
      requestBody: {
        configBoleto: {
          agrupamentoBoleto: '4',
          ordenacaoParceiro: 1,
          dupRenegociadas: false,
          gerarNumeroBoleto: false,
          multiTransacional: true,
          reimprimir: true,
          telaImpressaoBoleto: true,
          tipoReimpressao: 'T',
          tipoTitulo: -1,
          codigoRelatorio: 202,
          titulo: [{ $: NUFIN }]
        }
      }
    };

    try {
      const response = await api.post(
        '/gateway/v1/mge/service.sbr?serviceName=BoletoSP.buildPreVisualizacao&outputType=json',
        requestBody
      );

      console.log('📊 RESPOSTA:\n');
      console.log(JSON.stringify(response, null, 2));
      console.log('');

      if (response.status === '1' && response.responseBody?.boleto?.valor) {
        const chaveArquivo = response.responseBody.boleto.valor;
        console.log('🎉 CHAVE DO ARQUIVO ENCONTRADA!');
        console.log(`   ${chaveArquivo}\n`);

        console.log('⚠️  Agora precisamos baixar o PDF usando essa chave...');
        console.log('   Mas o visualizadorArquivos.mge não está no gateway.\n');
      }

    } catch (error) {
      console.log('❌ Erro ao chamar serviço via gateway:\n');
      console.log(`   ${error.message}\n`);

      console.log('💡 O serviço BoletoSP.buildPreVisualizacao pode não estar');
      console.log('   disponível via API Gateway (OAuth).\n');
      console.log('   Ele pode ser exclusivo do MGE (autenticação por sessão).\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
  }
}

testarBoletoGateway();
