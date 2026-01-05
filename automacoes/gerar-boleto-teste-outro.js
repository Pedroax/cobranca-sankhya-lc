/**
 * Gera boleto com dados de outro título para teste
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

async function gerarBoletoTeste() {
  console.log('🚀 GERANDO BOLETO COM DADOS DIFERENTES\n');

  try {
    // 1. Autenticar
    console.log('📡 Autenticando...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // Tentar diferentes NUFINs (além do 19106)
    const nufinsTeste = [19107, 19108, 19105, 19104, 19100, 19110, 19120];

    for (const nufin of nufinsTeste) {
      console.log(`📄 Tentando NUFIN ${nufin}...`);
      try {
        await gerarComNufin(nufin, api);
        return; // Se conseguiu gerar, termina
      } catch (error) {
        console.log(`   ⚠️  NUFIN ${nufin} não disponível, tentando próximo...\n`);
      }
    }

    console.log('⚠️  Nenhum título alternativo encontrado. Usando NUFIN 19106 mesmo.\n');
    await gerarComNufin(19106, api);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  }
}

async function gerarComNufin(nufin, api) {
  const cobranca = new CobrancaBoletos(api);
  const geradorBoleto = new BoletoItauPDFGenerator();

  console.log(`📄 Buscando dados completos do título NUFIN ${nufin}...`);
  const titulo = await cobranca.buscarDadosCompletosTitulo(nufin);

  console.log('✅ Título carregado:');
  console.log(`   - Linha Digitável: ${titulo.LINHADIGITAVEL || 'N/A'}`);
  console.log(`   - PIX: ${titulo.EMVPIX ? 'Disponível' : 'N/A'}\n`);

  console.log(`👤 Buscando dados do parceiro ${titulo.CODPARC}...`);
  const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);
  console.log(`✅ Parceiro: ${parceiro.NOMEPARC}\n`);

  console.log('📑 Gerando PDF...');
  const tempDir = path.join(__dirname, '..', 'temp');
  const fs = require('fs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const caminhoSaida = path.join(tempDir, `boleto_teste_${nufin}.pdf`);
  await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoSaida);

  console.log('✅ PDF gerado com sucesso!');
  console.log(`   📁 ${caminhoSaida}\n`);

  const stats = fs.statSync(caminhoSaida);
  const tamanhoKB = (stats.size / 1024).toFixed(2);
  console.log(`📊 Tamanho: ${tamanhoKB} KB\n`);

  console.log('✅ CONCLUÍDO! Agora teste escanear o código de barras e QR Code PIX.\n');
}

gerarBoletoTeste();
