/**
 * Teste - BoletoService
 * Gera e baixa PDF real do boleto usando o endpoint descoberto
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaMGEAuth = require('./SankhyaMGEAuth');
const BoletoService = require('./BoletoService');

const NUFIN = 19106;

async function testarBoletoService() {
  console.log('\n🧪 TESTE - BOLETO SERVICE\n');
  console.log('='.repeat(80));
  console.log(`NUFIN: ${NUFIN}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Autenticar no MGE
    console.log('1️⃣ Autenticando no MGE...\n');

    const mgeAuth = new SankhyaMGEAuth(
      process.env.MGE_SERVER_URL,
      process.env.MGE_USERNAME,
      process.env.MGE_PASSWORD
    );

    await mgeAuth.autenticar();
    console.log('');

    // 2. Criar serviço de boleto
    const boletoService = new BoletoService(mgeAuth);

    // 3. Gerar e baixar boleto
    console.log('2️⃣ Gerando boleto PDF...\n');

    const caminhoSalvar = path.join(__dirname, '..', 'temp', `boleto_${NUFIN}.pdf`);

    const resultado = await boletoService.obterBoletoPDF(NUFIN, caminhoSalvar);

    console.log('\n🎉🎉🎉 SUCESSO! 🎉🎉🎉\n');
    console.log('='.repeat(80));
    console.log(`📄 Chave do arquivo: ${resultado.chaveArquivo}`);
    console.log(`💾 Arquivo salvo: ${resultado.caminhoArquivo}`);
    console.log(`📊 Tamanho: ${(resultado.pdf.length / 1024).toFixed(2)} KB`);
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ PDF DO BOLETO GERADO COM SUCESSO!');
    console.log('');
    console.log('🔍 Abra o arquivo para verificar:');
    console.log(`   ${resultado.caminhoArquivo}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarBoletoService();
