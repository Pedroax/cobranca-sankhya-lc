/**
 * Exemplo Simples - Buscar Títulos
 *
 * Este script apenas busca e exibe os títulos
 * sem enviar mensagens. Útil para testar a integração.
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
  },
  sandbox: {
    xToken: process.env.SANDBOX_X_TOKEN,
    clientId: process.env.SANDBOX_CLIENT_ID,
    clientSecret: process.env.SANDBOX_CLIENT_SECRET
  }
};

async function buscarTitulos() {
  console.log('\n🔍 BUSCA DE TÍTULOS FINANCEIROS\n');

  try {
    // Inicializar API
    const api = new SankhyaAPI(config[AMBIENTE]);
    const cobranca = new CobrancaBoletos(api);

    // Autenticar
    console.log('🔐 Autenticando...');
    await api.autenticar();
    console.log('✅ Autenticado!\n');

    // Exemplo 1: Títulos que vencem em 3 dias
    console.log('📅 Buscando títulos que vencem em 3 dias...');
    const titulos3Dias = await cobranca.buscarTitulosPorDiasVencimento(3);
    console.log(`   Encontrados: ${titulos3Dias.length} título(s)\n`);

    if (titulos3Dias.length > 0) {
      console.log('   Detalhes:');
      titulos3Dias.forEach((t, i) => {
        console.log(`   ${i + 1}. NUFIN: ${t.NUFIN} | Parceiro: ${t.CODPARC} | Valor: R$ ${t.VLRDESDOB} | Venc: ${t.DTVENC}`);
      });
      console.log('');
    }

    // Exemplo 2: Títulos que vencem hoje
    console.log('⏰ Buscando títulos que vencem HOJE...');
    const titulosHoje = await cobranca.buscarTitulosPorDiasVencimento(0);
    console.log(`   Encontrados: ${titulosHoje.length} título(s)\n`);

    // Exemplo 3: Títulos vencidos (últimos 30 dias)
    console.log('🔴 Buscando títulos vencidos (últimos 30 dias)...');
    const titulosVencidos = await cobranca.buscarTitulosVencidos(30);
    console.log(`   Encontrados: ${titulosVencidos.length} título(s)\n`);

    // Exemplo 4: Buscar dados de um parceiro específico
    if (titulos3Dias.length > 0) {
      const primeiroTitulo = titulos3Dias[0];
      console.log(`👤 Buscando dados do parceiro ${primeiroTitulo.CODPARC}...`);

      const parceiro = await cobranca.buscarDadosParceiro(primeiroTitulo.CODPARC);

      console.log('   Dados:');
      console.log(`   Nome: ${parceiro.NOMEPARC}`);
      console.log(`   Telefone: ${parceiro.TELEFONE || 'Não cadastrado'}`);
      console.log(`   Celular: ${parceiro.CELULAR || 'Não cadastrado'}`);
      console.log(`   Email: ${parceiro.EMAIL || 'Não cadastrado'}`);
      console.log('');
    }

    // Exemplo 5: Enriquecer títulos com dados dos parceiros
    if (titulosHoje.length > 0) {
      console.log('📝 Enriquecendo títulos de hoje com dados dos parceiros...');
      const titulosEnriquecidos = await cobranca.enriquecerTitulosComParceiros(titulosHoje);

      console.log('   Resultado:');
      titulosEnriquecidos.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.parceiro?.nome || 'Nome não disponível'}`);
        console.log(`      WhatsApp: ${t.parceiro?.whatsapp || 'Não cadastrado'}`);
        console.log(`      Valor: R$ ${t.VLRDESDOB}`);
      });
      console.log('');
    }

    console.log('✨ Busca finalizada!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

buscarTitulos();
