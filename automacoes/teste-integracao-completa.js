/**
 * Teste - Integração Completa: Títulos + Parceiros
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

async function testarIntegracaoCompleta() {
  console.log('\n🚀 TESTE - INTEGRAÇÃO COMPLETA (TÍTULOS + PARCEIROS)\n');
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

    console.log('2️⃣ Buscando títulos em aberto (outubro 2025)...\n');

    // Buscar títulos de outubro de 2025
    const dataInicio = new Date(2025, 9, 1); // 01/10/2025 (mês 9 = outubro, base 0)
    const dataFim = new Date(2025, 9, 31); // 31/10/2025

    // Buscar sem filtro de NOSSONUM para pegar todos
    const titulos = await cobranca.buscarTitulosVencimento(dataInicio, dataFim, {
      apenasEmAberto: true,
      apenasComBoleto: false, // Não exigir boleto
      apenasReceita: true
    });

    console.log(`✅ Encontrados: ${titulos.length} título(s)\n`);

    if (titulos.length === 0) {
      console.log('⚠️  Nenhum título em aberto em outubro/2025.\n');
      console.log('Testando TODOS os títulos (com ou sem baixa)...\n');

      const todosTitulos = await cobranca.buscarTitulosVencimento(dataInicio, dataFim, {
        apenasEmAberto: false, // Incluir todos
        apenasComBoleto: false,
        apenasReceita: true
      });

      console.log(`✅ Encontrados: ${todosTitulos.length} título(s)\n`);

      if (todosTitulos.length === 0) {
        console.log('❌ Nenhum título encontrado.');
        return;
      }

      // Usar todos os títulos
      titulos.push(...todosTitulos);
    }

    console.log('3️⃣ Enriquecendo com dados dos parceiros...\n');

    const titulosEnriquecidos = await cobranca.enriquecerTitulosComParceiros(titulos.slice(0, 5));

    console.log(`✅ ${titulosEnriquecidos.length} título(s) enriquecido(s)\n`);

    console.log('4️⃣ RESULTADO:\n');
    console.log('='.repeat(80));

    titulosEnriquecidos.forEach((titulo, index) => {
      console.log(`\n📋 TÍTULO ${index + 1}:`);
      console.log('─'.repeat(80));
      console.log(`   NUFIN: ${titulo.NUFIN}`);
      console.log(`   NF: ${titulo.NUMNOTA || 'N/A'}`);
      console.log(`   Vencimento: ${titulo.DTVENC}`);
      console.log(`   Valor: R$ ${titulo.VLRDESDOB}`);
      console.log(`   Nosso Número: ${titulo.NOSSONUM || 'Sem boleto'}`);

      if (titulo.parceiro) {
        console.log('');
        console.log(`   👤 PARCEIRO:`);
        console.log(`      Código: ${titulo.parceiro.codigo}`);
        console.log(`      Nome: ${titulo.parceiro.nome}`);
        console.log(`      WhatsApp: ${titulo.parceiro.whatsapp || 'Não cadastrado'}`);
        console.log(`      Email: ${titulo.parceiro.email || 'Não cadastrado'}`);

        const temWhatsApp = titulo.parceiro.whatsapp && titulo.parceiro.whatsapp.trim() !== '';

        if (temWhatsApp) {
          const numeroLimpo = titulo.parceiro.whatsapp.replace(/\D/g, '');
          const numeroComDDI = numeroLimpo.startsWith('55') ? numeroLimpo : '55' + numeroLimpo;
          console.log(`      📱 Formatado: ${numeroComDDI}`);
          console.log(`      ✅ PODE ENVIAR WHATSAPP`);
        } else {
          console.log(`      ❌ SEM WHATSAPP - Não pode enviar`);
        }
      } else {
        console.log(`\n   ⚠️  Erro ao buscar parceiro: ${titulo.erro}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('');

    // Estatísticas
    const comWhatsApp = titulosEnriquecidos.filter(t => t.parceiro?.whatsapp);
    const semWhatsApp = titulosEnriquecidos.filter(t => !t.parceiro?.whatsapp);

    console.log('📊 ESTATÍSTICAS:\n');
    console.log(`   Total de títulos: ${titulosEnriquecidos.length}`);
    console.log(`   ✅ Com WhatsApp: ${comWhatsApp.length}`);
    console.log(`   ❌ Sem WhatsApp: ${semWhatsApp.length}`);
    console.log('');

    console.log('✨ Teste finalizado com sucesso!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarIntegracaoCompleta();
