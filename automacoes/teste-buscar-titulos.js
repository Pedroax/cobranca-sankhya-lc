/**
 * Teste - Buscar Títulos Financeiros
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');

const AMBIENTE = process.env.AMBIENTE || 'production';

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

async function testarBuscarTitulos() {
  console.log('\n💰 TESTE - BUSCAR TÍTULOS FINANCEIROS\n');
  console.log('='.repeat(80));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const api = new SankhyaAPI(config[AMBIENTE]);
    const cobranca = new CobrancaBoletos(api);

    console.log('1️⃣ Autenticando...\n');
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // Testar diferentes períodos
    const hoje = new Date();

    console.log('2️⃣ Buscando títulos em diferentes períodos...\n');

    // Últimos 30 dias
    console.log('📅 Últimos 30 dias:');
    let dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);

    let titulos = await cobranca.buscarTitulosVencimento(dataInicio, hoje);
    console.log(`   Encontrados: ${titulos.length} título(s)\n`);

    // Últimos 90 dias
    console.log('📅 Últimos 90 dias:');
    dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 90);

    titulos = await cobranca.buscarTitulosVencimento(dataInicio, hoje);
    console.log(`   Encontrados: ${titulos.length} título(s)\n`);

    // Últimos 180 dias
    console.log('📅 Últimos 180 dias:');
    dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 180);

    titulos = await cobranca.buscarTitulosVencimento(dataInicio, hoje);
    console.log(`   Encontrados: ${titulos.length} título(s)\n`);

    // Próximos 30 dias
    console.log('📅 Próximos 30 dias:');
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 30);

    titulos = await cobranca.buscarTitulosVencimento(hoje, dataFim);
    console.log(`   Encontrados: ${titulos.length} título(s)\n`);

    if (titulos.length > 0) {
      console.log('📋 EXEMPLO DE TÍTULO:\n');
      console.log(JSON.stringify(titulos[0], null, 2));
      console.log('');
    }

    // Ano completo (passado + futuro)
    console.log('📅 Último ano completo (365 dias atrás até hoje):');
    dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 365);

    titulos = await cobranca.buscarTitulosVencimento(dataInicio, hoje);
    console.log(`   Encontrados: ${titulos.length} título(s)\n`);

    if (titulos.length > 0) {
      console.log('✅ TÍTULOS ENCONTRADOS!\n');
      console.log('📊 Primeiros 5 títulos:\n');

      titulos.slice(0, 5).forEach((titulo, index) => {
        console.log(`${index + 1}. NUFIN: ${titulo.NUFIN} | CODPARC: ${titulo.CODPARC} | Venc: ${titulo.DTVENC} | Valor: R$ ${titulo.VLRDESDOB}`);
      });
      console.log('');
    }

    console.log('✨ Teste finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarBuscarTitulos();
