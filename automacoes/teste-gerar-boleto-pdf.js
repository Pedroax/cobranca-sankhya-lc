/**
 * Teste de Geração de Boleto PDF usando BoletoItauPDFGenerator
 *
 * Este teste:
 * 1. Busca dados completos de um título (NUFIN 19106)
 * 2. Busca dados completos do parceiro
 * 3. Gera PDF do boleto
 * 4. Salva na pasta temp/
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const BoletoItauPDFGenerator = require('./BoletoItauPDFGenerator');

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

// NUFIN de teste (altere conforme necessário)
const NUFIN_TESTE = 19106;

async function testarGeracaoBoleto() {
  console.log('🚀 TESTE DE GERAÇÃO DE BOLETO PDF\n');
  console.log('='.repeat(80));

  try {
    // 1. Autenticar na API Sankhya
    console.log('\n📡 1. Autenticando na API Sankhya...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado com sucesso\n');

    // 2. Criar instâncias
    const cobranca = new CobrancaBoletos(api);
    const geradorBoleto = new BoletoItauPDFGenerator();

    // 3. Buscar dados completos do título
    console.log(`📄 2. Buscando dados completos do título NUFIN ${NUFIN_TESTE}...`);
    const titulo = await cobranca.buscarDadosCompletosTitulo(NUFIN_TESTE);
    console.log('✅ Título encontrado:');
    console.log(`   - NUFIN: ${titulo.NUFIN}`);
    console.log(`   - Nota Fiscal: ${titulo.NUMNOTA}`);
    console.log(`   - Vencimento: ${titulo.DTVENC}`);
    console.log(`   - Valor: R$ ${titulo.VLRDESDOB}`);
    console.log(`   - Nosso Número: ${titulo.NOSSONUM || 'N/A'}`);
    console.log(`   - Linha Digitável: ${titulo.LINHADIGITAVEL || 'N/A'}`);
    console.log(`   - Código de Barras: ${titulo.CODBARRA || 'N/A'}`);
    console.log(`   - PIX: ${titulo.EMVPIX ? 'Disponível' : 'N/A'}\n`);

    // 4. Buscar dados completos do parceiro
    console.log(`👤 3. Buscando dados completos do parceiro ${titulo.CODPARC}...`);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);
    console.log('✅ Parceiro encontrado:');
    console.log(`   - Código: ${parceiro.CODPARC}`);
    console.log(`   - Nome: ${parceiro.NOMEPARC}`);
    console.log(`   - CPF/CNPJ: ${parceiro.CGC_CPF || 'N/A'}`);
    console.log(`   - Telefone: ${parceiro.TELEFONE || 'N/A'}`);
    console.log(`   - Email: ${parceiro.EMAIL || 'N/A'}\n`);

    // 5. Verificar campos essenciais
    console.log('🔍 4. Verificando campos essenciais para o boleto...');
    const camposObrigatorios = {
      'Linha Digitável': titulo.LINHADIGITAVEL,
      'Código de Barras': titulo.CODBARRA,
      'Nosso Número': titulo.NOSSONUM,
      'Vencimento': titulo.DTVENC,
      'Valor': titulo.VLRDESDOB
    };

    let todosCamposPresentes = true;
    for (const [campo, valor] of Object.entries(camposObrigatorios)) {
      const presente = valor !== null && valor !== undefined && valor !== '';
      const status = presente ? '✅' : '❌';
      console.log(`   ${status} ${campo}: ${presente ? 'OK' : 'AUSENTE'}`);
      if (!presente) todosCamposPresentes = false;
    }

    if (!todosCamposPresentes) {
      console.log('\n⚠️  AVISO: Alguns campos obrigatórios estão ausentes.');
      console.log('   O boleto será gerado mesmo assim, mas pode ter informações incompletas.\n');
    } else {
      console.log('\n✅ Todos os campos obrigatórios estão presentes!\n');
    }

    // 6. Gerar PDF do boleto
    console.log('📑 5. Gerando PDF do boleto...');
    const tempDir = path.join(__dirname, '..', 'temp');
    const fs = require('fs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const caminhoSaida = path.join(tempDir, `boleto_${NUFIN_TESTE}.pdf`);

    await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoSaida);

    console.log('✅ PDF gerado com sucesso!');
    console.log(`   📁 Arquivo: ${caminhoSaida}\n`);

    // 7. Verificar tamanho do arquivo
    const stats = fs.statSync(caminhoSaida);
    const tamanhoKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 Informações do arquivo:`);
    console.log(`   - Tamanho: ${tamanhoKB} KB`);
    console.log(`   - Caminho: ${caminhoSaida}\n`);

    // 8. Resumo
    console.log('='.repeat(80));
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(80));
    console.log('\n💡 Próximos passos:');
    console.log('   1. Abra o arquivo PDF gerado para visualizar o boleto');
    console.log('   2. Verifique se todos os dados estão corretos');
    console.log('   3. Teste o envio via WhatsApp com o PDF gerado');
    console.log('   4. Integre com o fluxo de automação de cobrança\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n🔍 Detalhes do erro:');
    console.error(error);

    if (error.message.includes('não encontrado')) {
      console.log('\n💡 Dica: Verifique se o NUFIN existe no sistema.');
      console.log('   Altere a constante NUFIN_TESTE no início do arquivo.\n');
    }
  }
}

// Executar teste
testarGeracaoBoleto();
