/**
 * Verificar o conteúdo do campo EMVPIX
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

async function verificarEMVPIX() {
  console.log('🔍 VERIFICANDO CAMPO EMVPIX\n');

  try {
    const api = new SankhyaAPI(config.production);
    await api.autenticar();

    const cobranca = new CobrancaBoletos(api);

    // Testar com o NUFIN 19107
    console.log('📄 Buscando título NUFIN 19107...\n');
    const titulo = await cobranca.buscarDadosCompletosTitulo(19107);

    console.log('=== DADOS DO TÍTULO ===\n');
    console.log('NUFIN:', titulo.NUFIN);
    console.log('VALOR:', titulo.VLRDESDOB);
    console.log('VENCIMENTO:', titulo.DTVENC);
    console.log('NOSSO NÚMERO:', titulo.NOSSONUM);
    console.log('\n=== CAMPO EMVPIX ===\n');

    if (titulo.EMVPIX) {
      console.log('✅ EMVPIX está presente');
      console.log('Tamanho:', titulo.EMVPIX.length, 'caracteres');
      console.log('\nConteúdo completo:');
      console.log(titulo.EMVPIX);
      console.log('\n');

      // Verificar se começa com o padrão correto
      if (titulo.EMVPIX.startsWith('00020126')) {
        console.log('✅ Começa com padrão EMV correto (00020126)');
      } else {
        console.log('❌ NÃO começa com padrão EMV esperado');
        console.log('   Primeiros 20 caracteres:', titulo.EMVPIX.substring(0, 20));
      }

      // Verificar se termina com CRC
      if (titulo.EMVPIX.includes('6304')) {
        console.log('✅ Contém campo CRC (6304)');
      } else {
        console.log('⚠️  Pode estar sem CRC de validação');
      }

    } else {
      console.log('❌ EMVPIX está VAZIO ou NULO');
    }

    console.log('\n=== OUTROS CAMPOS IMPORTANTES ===\n');
    console.log('LINHA DIGITÁVEL:', titulo.LINHADIGITAVEL || 'N/A');
    console.log('CÓDIGO DE BARRAS:', titulo.CODBARRA || 'N/A');

    // Buscar no título original também
    console.log('\n📄 Buscando título NUFIN 19106 (original)...\n');
    const tituloOriginal = await cobranca.buscarDadosCompletosTitulo(19106);

    console.log('EMVPIX do 19106:');
    if (tituloOriginal.EMVPIX) {
      console.log('✅ Presente -', tituloOriginal.EMVPIX.length, 'caracteres');
      console.log('Primeiros 50 chars:', tituloOriginal.EMVPIX.substring(0, 50));
    } else {
      console.log('❌ VAZIO');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  }
}

verificarEMVPIX();
