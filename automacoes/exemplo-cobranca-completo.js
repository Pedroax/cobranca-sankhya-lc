/**
 * Exemplo Completo - Automação de Cobrança de Boletos
 *
 * Este script demonstra como usar todos os módulos juntos
 * para automatizar o envio de cobranças via WhatsApp.
 *
 * Fluxo:
 * 1. Conecta na API Sankhya
 * 2. Busca títulos que devem receber mensagem hoje
 * 3. Enriquece com dados dos parceiros
 * 4. Gera mensagens baseadas na cadência
 * 5. Envia via WhatsApp
 * 6. Gera relatório
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const CadenciaCobranca = require('./CadenciaCobranca');
const WhatsAppService = require('./WhatsAppService');

// ============================================
// CONFIGURAÇÃO
// ============================================

const AMBIENTE = process.env.AMBIENTE || 'production';

const configSankhya = {
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

const configWhatsApp = {
  provider: 'evolution', // ou 'webhook', 'baileys', 'business'
  apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:8080',
  apiKey: process.env.WHATSAPP_API_KEY || 'sua-api-key',
  instanceName: process.env.WHATSAPP_INSTANCE || 'instance1'
};

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function executarCobrancaAutomatica() {
  console.log('🚀 AUTOMAÇÃO DE COBRANÇA DE BOLETOS\n');
  console.log('='.repeat(50));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log(`📅 Data: ${new Date().toLocaleDateString('pt-BR')}`);
  console.log('='.repeat(50));
  console.log('');

  try {
    // 1. Inicializar serviços
    console.log('1️⃣ Inicializando serviços...\n');

    const sankhyaApi = new SankhyaAPI(configSankhya[AMBIENTE]);
    const cobranca = new CobrancaBoletos(sankhyaApi);
    const cadencia = new CadenciaCobranca();
    const whatsapp = new WhatsAppService(configWhatsApp);

    console.log('✅ Serviços inicializados\n');

    // 2. Autenticar na API Sankhya
    console.log('2️⃣ Autenticando na API Sankhya...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado com sucesso\n');

    // 3. Buscar títulos de acordo com a cadência
    console.log('3️⃣ Buscando títulos para cobrança...\n');

    // Cadência Automatex: D-3, D-0, D+3, D+5
    const diasParaBuscar = [-3, 0, 3, 5];
    let todosTitulos = [];

    for (const dias of diasParaBuscar) {
      try {
        const titulos = await cobranca.buscarTitulosPorDiasVencimento(dias);
        console.log(`   D${dias >= 0 ? '+' : ''}${dias}: ${titulos.length} título(s)`);
        todosTitulos = todosTitulos.concat(titulos);
      } catch (error) {
        console.warn(`   Aviso ao buscar D${dias}: ${error.message}`);
      }
    }

    console.log(`\n✅ Total: ${todosTitulos.length} título(s) encontrado(s)\n`);

    if (todosTitulos.length === 0) {
      console.log('ℹ️  Nenhum título para cobrar hoje. Finalizando.\n');
      return;
    }

    // 4. Enriquecer com dados dos parceiros
    console.log('4️⃣ Buscando dados dos parceiros...\n');

    const titulosEnriquecidos = await cobranca.enriquecerTitulosComParceiros(todosTitulos);

    const comWhatsApp = titulosEnriquecidos.filter(t => t.parceiro?.whatsapp);
    const semWhatsApp = titulosEnriquecidos.filter(t => !t.parceiro?.whatsapp);

    console.log(`✅ ${comWhatsApp.length} título(s) com WhatsApp`);
    console.log(`⚠️  ${semWhatsApp.length} título(s) SEM WhatsApp\n`);

    if (semWhatsApp.length > 0) {
      console.log('📋 Títulos sem WhatsApp:');
      semWhatsApp.forEach(t => {
        console.log(`   - ${t.parceiro?.nome || 'Nome não disponível'} (CODPARC: ${t.CODPARC})`);
      });
      console.log('');
    }

    // 5. Gerar mensagens baseadas na cadência
    console.log('5️⃣ Gerando mensagens...\n');

    const mensagensParaEnviar = [];

    for (const titulo of comWhatsApp) {
      const diasParaVencimento = cobranca.calcularDiasVencimento(titulo.DTVENC);
      const mensagemObj = cadencia.gerarMensagem(titulo, diasParaVencimento);

      if (mensagemObj) {
        mensagensParaEnviar.push(mensagemObj);
      }
    }

    console.log(`✅ ${mensagensParaEnviar.length} mensagem(s) gerada(s)\n`);

    // Agrupar por prioridade
    const porPrioridade = cadencia.agruparPorPrioridade(mensagensParaEnviar);

    console.log('📊 Distribuição por prioridade:');
    Object.entries(porPrioridade).forEach(([prioridade, msgs]) => {
      console.log(`   ${prioridade}: ${msgs.length} mensagem(s)`);
    });
    console.log('');

    // 6. Visualizar exemplos de mensagens
    console.log('6️⃣ Exemplos de mensagens:\n');

    if (mensagensParaEnviar.length > 0) {
      const exemplo = mensagensParaEnviar[0];
      console.log('─'.repeat(50));
      console.log(`📱 Para: ${exemplo.destinatario.nome}`);
      console.log(`📞 WhatsApp: ${exemplo.destinatario.whatsapp}`);
      console.log(`🏷️  Tipo: ${exemplo.tipo} | Prioridade: ${exemplo.prioridade}`);
      console.log('─'.repeat(50));
      console.log(exemplo.mensagem);
      console.log('─'.repeat(50));
      console.log('');
    }

    // 7. Enviar mensagens (DESCOMENTE PARA ATIVAR O ENVIO REAL)
    console.log('7️⃣ Enviando mensagens...\n');

    /*
    // ATENÇÃO: Descomente este bloco para enviar mensagens REAIS!

    const mensagensFormatadas = mensagensParaEnviar.map(msg => ({
      numero: msg.destinatario.whatsapp,
      mensagem: msg.mensagem,
      opcoes: {
        delay: 1000 // 1 segundo de delay antes de enviar
      }
    }));

    const resultados = await whatsapp.enviarEmLote(mensagensFormatadas, 3000);

    console.log('\n8️⃣ Gerando relatório de envios...\n');

    const relatorio = whatsapp.gerarRelatorio(resultados);

    console.log('📊 RELATÓRIO DE ENVIOS:');
    console.log('='.repeat(50));
    console.log(`Total de mensagens: ${relatorio.total}`);
    console.log(`✅ Sucessos: ${relatorio.sucessos}`);
    console.log(`❌ Falhas: ${relatorio.falhas}`);
    console.log(`📈 Taxa de sucesso: ${relatorio.taxaSucesso}`);
    console.log('='.repeat(50));
    console.log('');

    // Mostrar falhas se houver
    const falhas = relatorio.detalhes.filter(r => !r.sucesso);
    if (falhas.length > 0) {
      console.log('\n❌ Detalhes das falhas:\n');
      falhas.forEach((falha, i) => {
        console.log(`${i + 1}. ${falha.numero}: ${falha.erro}`);
      });
      console.log('');
    }
    */

    // MODO SIMULAÇÃO (mensagens NÃO são enviadas)
    console.log('ℹ️  MODO SIMULAÇÃO ATIVO');
    console.log('   As mensagens NÃO foram enviadas.');
    console.log('   Para ativar o envio real, edite o arquivo e descomente o bloco de envio.\n');

    console.log('✨ Automação finalizada com sucesso!\n');

  } catch (error) {
    console.error('\n❌ ERRO NA EXECUÇÃO:\n');
    console.error(error);
    console.error('\n');
    process.exit(1);
  }
}

// ============================================
// EXECUTAR
// ============================================

executarCobrancaAutomatica()
  .then(() => {
    console.log('🏁 Processo concluído\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
