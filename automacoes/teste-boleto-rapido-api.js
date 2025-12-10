/**
 * Teste - Boleto Rápido API
 *
 * Script para testar a geração de PDF via Boleto Rápido API
 *
 * INSTRUÇÕES:
 * 1. Configure os endpoints corretos na classe BoletoRapidoAPI
 * 2. Execute este script para testar
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const BoletoRapidoAPI = require('./BoletoRapidoAPI');

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

// DADOS DE TESTE
const NUFIN = 19106;
const NOSSONUM = '109001350901';

async function testarBoletoRapidoAPI() {
  console.log('\n🧪 TESTE - BOLETO RÁPIDO API\n');
  console.log('='.repeat(80));
  console.log(`NUFIN: ${NUFIN}`);
  console.log(`NOSSONUM: ${NOSSONUM}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Autenticar
    console.log('1️⃣ Autenticando na API Sankhya...\n');
    const sankhyaApi = new SankhyaAPI(config.production);
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar instância da API de Boleto Rápido
    console.log('2️⃣ Configurando Boleto Rápido API...\n');
    const boletoRapidoApi = new BoletoRapidoAPI(sankhyaApi);

    // CONFIGURAR ENDPOINTS AQUI - QUANDO OBTIDOS DA DOCUMENTAÇÃO
    boletoRapidoApi.configurarEndpoints({
      // Exemplo de endpoints (ajustar conforme documentação real):
      consultarBoletos: '/gateway/v1/boletos',
      gerarPDF: '/gateway/v1/boletos/{id}/pdf',
      buscarPorNufin: '/gateway/v1/boletos/buscar?nufin={nufin}'
    });

    console.log('✅ Endpoints configurados\n');
    console.log('📋 Endpoints em uso:');
    console.log(`   Consultar: ${boletoRapidoApi.endpoints.consultarBoletos || 'NÃO CONFIGURADO'}`);
    console.log(`   Gerar PDF: ${boletoRapidoApi.endpoints.gerarPDF || 'NÃO CONFIGURADO'}`);
    console.log(`   Buscar: ${boletoRapidoApi.endpoints.buscarPorNufin || 'NÃO CONFIGURADO'}`);
    console.log('');

    // 3. Testar busca de ID do boleto
    console.log('3️⃣ Buscando ID do boleto na API...\n');

    let idBoleto;
    try {
      // Tentar primeiro por NUFIN
      idBoleto = await boletoRapidoApi.buscarIdBoletoPorNufin(NUFIN);
      console.log(`✅ Boleto encontrado por NUFIN!`);
      console.log(`   ID do boleto: ${idBoleto}\n`);
    } catch (error1) {
      console.log(`⚠️  Erro ao buscar por NUFIN: ${error1.message}`);
      console.log('   Tentando buscar por NOSSONUM...\n');

      try {
        idBoleto = await boletoRapidoApi.buscarIdBoletoPorNossoNum(NOSSONUM);
        console.log(`✅ Boleto encontrado por NOSSONUM!`);
        console.log(`   ID do boleto: ${idBoleto}\n`);
      } catch (error2) {
        throw new Error(`Não foi possível encontrar o boleto: ${error2.message}`);
      }
    }

    // 4. Testar geração de PDF
    console.log('4️⃣ Gerando PDF do boleto...\n');

    const caminhoSalvar = path.join(__dirname, '..', 'temp', `boleto_${NUFIN}.pdf`);

    const resultado = await boletoRapidoApi.obterPDFPorNufin(NUFIN, caminhoSalvar);

    console.log('✅ PDF GERADO COM SUCESSO!\n');
    console.log('='.repeat(80));
    console.log(`📄 ID do Boleto: ${resultado.idBoleto}`);
    console.log(`💾 Arquivo salvo: ${resultado.caminhoArquivo}`);
    console.log(`📊 Tamanho: ${resultado.pdf.length} bytes`);
    console.log('='.repeat(80));
    console.log('');

    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!\n');
    console.log('✅ A integração com Boleto Rápido API está funcionando!');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error(error);
    console.log('');
    console.log('💡 POSSÍVEIS CAUSAS:');
    console.log('   1. Endpoints não configurados corretamente');
    console.log('   2. Boleto não existe no Boleto Rápido API');
    console.log('   3. Credenciais inválidas');
    console.log('   4. Serviço Boleto Rápido não ativado na conta');
    console.log('');
    process.exit(1);
  }
}

testarBoletoRapidoAPI();
