/**
 * Teste - Buscar Parceiro Real
 *
 * Busca dados reais de um parceiro na API Sankhya
 * para verificar se o WhatsApp está sendo retornado corretamente
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

async function testarBuscaParceiro() {
  console.log('\n🔍 TESTE - BUSCAR PARCEIRO REAL\n');
  console.log('='.repeat(80));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Inicializar API
    console.log('1️⃣ Inicializando API Sankhya...\n');
    const api = new SankhyaAPI(config[AMBIENTE]);
    const cobranca = new CobrancaBoletos(api);

    // 2. Autenticar
    console.log('2️⃣ Autenticando...\n');
    await api.autenticar();
    console.log('✅ Autenticado com sucesso!\n');

    // 3. Buscar um parceiro qualquer (vamos pegar alguns para ver qual tem dados)
    console.log('3️⃣ Buscando parceiros para teste...\n');

    // Buscar títulos recentes para pegar CODPARCs reais
    console.log('   Buscando títulos recentes para obter códigos de parceiros...\n');

    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 365); // Último ano completo

    const titulos = await cobranca.buscarTitulosVencimento(dataInicio, hoje);

    console.log(`   ✅ Encontrados ${titulos.length} título(s) nos últimos 30 dias\n`);

    if (titulos.length === 0) {
      console.log('   ⚠️  Nenhum título encontrado nos últimos 30 dias.');
      console.log('   Vou buscar parceiros diretamente...\n');

      // Buscar parceiros diretamente
      await buscarParceirosGeral();
      return;
    }

    // Pegar alguns CODPARCs únicos
    const codparcs = [...new Set(titulos.map(t => t.CODPARC))].slice(0, 5);

    console.log('4️⃣ Buscando dados dos parceiros:\n');
    console.log('─'.repeat(80));

    for (const codparc of codparcs) {
      try {
        console.log(`\n🔎 Buscando parceiro CODPARC: ${codparc}\n`);

        const parceiro = await cobranca.buscarDadosParceiro(codparc);

        // Mostrar resposta formatada
        console.log('📋 DADOS DO PARCEIRO:');
        console.log('┌' + '─'.repeat(78) + '┐');
        console.log(`│ Código (CODPARC):     ${String(parceiro.CODPARC).padEnd(55)} │`);
        console.log(`│ Nome (NOMEPARC):      ${String(parceiro.NOMEPARC || '').substring(0, 55).padEnd(55)} │`);
        console.log('├' + '─'.repeat(78) + '┤');
        console.log(`│ Telefone/WhatsApp:    ${String(parceiro.TELEFONE || 'Não cadastrado').padEnd(55)} │`);
        console.log(`│ Email (EMAIL):        ${String(parceiro.EMAIL || 'Não cadastrado').substring(0, 55).padEnd(55)} │`);
        console.log('├' + '─'.repeat(78) + '┤');
        console.log(`│ CPF/CNPJ:             ${String(parceiro.CGC_CPF || 'Não cadastrado').padEnd(55)} │`);
        console.log(`│ Insc. Estadual:       ${String(parceiro.IDENTINSCESTAD || 'Não cadastrado').padEnd(55)} │`);
        console.log('└' + '─'.repeat(78) + '┘');

        // Verificar WhatsApp (campo TELEFONE é usado para WhatsApp)
        const temWhatsApp = parceiro.TELEFONE && parceiro.TELEFONE.trim() !== '';

        if (temWhatsApp) {
          console.log('\n✅ STATUS: Parceiro TEM WhatsApp cadastrado!');
          console.log(`   📱 Telefone/WhatsApp: ${parceiro.TELEFONE}`);

          // Formatar número
          const numeroFormatado = parceiro.TELEFONE.replace(/\D/g, '');
          const numeroComDDI = numeroFormatado.startsWith('55') ? numeroFormatado : '55' + numeroFormatado;

          console.log(`   🌐 Número formatado para WhatsApp: ${numeroComDDI}`);
        } else {
          console.log('\n⚠️  STATUS: Parceiro NÃO tem WhatsApp cadastrado');
          console.log('   Campo TELEFONE está vazio ou nulo');
        }

        console.log('\n' + '─'.repeat(80));

      } catch (error) {
        console.log(`\n❌ Erro ao buscar parceiro ${codparc}: ${error.message}\n`);
        console.log('─'.repeat(80));
      }
    }

    console.log('\n✨ Teste finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

async function buscarParceirosGeral() {
  console.log('Buscando parceiros diretamente da API...\n');

  const api = new SankhyaAPI(config[AMBIENTE]);
  await api.autenticar();

  // Buscar primeiros 5 parceiros
  const requestBody = {
    serviceName: 'CRUDServiceProvider.loadRecords',
    requestBody: {
      dataSet: {
        rootEntity: 'Parceiro',
        includePresentationFields: 'N',
        offsetPage: '0',
        entity: {
          fieldset: {
            list: 'CODPARC,NOMEPARC,TELEFONE,EMAIL,CGC_CPF'
          }
        }
      }
    }
  };

  const response = await api.post(
    '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
    requestBody
  );

  console.log('📦 RESPOSTA BRUTA DA API:\n');
  console.log(JSON.stringify(response, null, 2));
}

testarBuscaParceiro();
