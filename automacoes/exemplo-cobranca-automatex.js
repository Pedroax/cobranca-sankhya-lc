/**
 * Exemplo Completo - Automação Automatex
 *
 * Sistema com controle de dias úteis e envios duplicados:
 * - Contagem de dias: CALENDÁRIO (todos os dias)
 * - Envio: Apenas SEGUNDA a SEXTA
 * - Se cair em fim de semana: envia na SEGUNDA
 * - Nunca envia a mesma mensagem 2x para o mesmo boleto
 *
 * @author Automatex
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const CadenciaCobranca = require('./CadenciaCobranca');
const WhatsAppService = require('./WhatsAppService');
const ControleEnvios = require('./ControleEnvios');

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
  provider: 'evolution',
  apiUrl: process.env.WHATSAPP_API_URL || 'http://localhost:8080',
  apiKey: process.env.WHATSAPP_API_KEY || 'sua-api-key',
  instanceName: process.env.WHATSAPP_INSTANCE || 'instance1'
};

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function executarCobrancaAutomatica() {
  const hoje = new Date();

  console.log('\n🤖 AUTOMAÇÃO DE COBRANÇA AUTOMATEX\n');
  console.log('='.repeat(70));
  console.log(`📍 Ambiente: ${AMBIENTE.toUpperCase()}`);
  console.log(`📅 Data: ${hoje.toLocaleDateString('pt-BR')}`);
  console.log(`📆 Dia: ${obterDiaSemana(hoje)}`);
  console.log('='.repeat(70));
  console.log('');

  try {
    // 1. Inicializar serviços
    console.log('1️⃣ Inicializando serviços...\n');

    const sankhyaApi = new SankhyaAPI(configSankhya[AMBIENTE]);
    const cobranca = new CobrancaBoletos(sankhyaApi);
    const cadencia = new CadenciaCobranca();
    const whatsapp = new WhatsAppService(configWhatsApp);
    const controleEnvios = new ControleEnvios();

    console.log('✅ Serviços inicializados\n');

    // 2. Verificar se é dia útil
    console.log('2️⃣ Verificando dia útil...\n');

    if (!controleEnvios.isDiaUtil(hoje)) {
      console.log(`⚠️  Hoje é ${obterDiaSemana(hoje)} (FIM DE SEMANA)`);
      console.log('   Envios só ocorrem de segunda a sexta.');
      console.log('   Encerrando automação.\n');
      return;
    }

    console.log(`✅ Hoje é ${obterDiaSemana(hoje)} (DIA ÚTIL)\n`);

    // 3. Limpar envios antigos (manutenção)
    console.log('3️⃣ Realizando manutenção do histórico...\n');
    controleEnvios.limparEnviosAntigos(60);

    const stats = controleEnvios.obterEstatisticas();
    console.log(`📊 Histórico: ${stats.totalEnvios} envio(s) registrado(s)`);
    console.log('');

    // 4. Autenticar na API Sankhya
    console.log('4️⃣ Autenticando na API Sankhya...\n');
    await sankhyaApi.autenticar();
    console.log('✅ Autenticado com sucesso\n');

    // 5. Buscar títulos considerando fim de semana
    console.log('5️⃣ Buscando títulos para enviar HOJE...\n');
    console.log('   (Considerando lógica de fim de semana)\n');

    // Cadência Automatex: D-3, D-0, D+3, D+5
    const diasCadencia = [-3, 0, 3, 5];
    let todosTitulos = [];

    for (const dias of diasCadencia) {
      const titulos = await cobranca.buscarTitulosParaEnviarHoje(dias, controleEnvios);

      console.log(`   D${dias >= 0 ? '+' : ''}${dias}: ${titulos.length} título(s) para enviar`);

      todosTitulos = todosTitulos.concat(titulos);
    }

    console.log(`\n✅ Total: ${todosTitulos.length} título(s) encontrado(s)\n`);

    if (todosTitulos.length === 0) {
      console.log('ℹ️  Nenhum título para enviar hoje. Finalizando.\n');
      return;
    }

    // 6. Enriquecer com dados dos parceiros
    console.log('6️⃣ Buscando dados dos parceiros...\n');

    const titulosEnriquecidos = await cobranca.enriquecerTitulosComParceiros(todosTitulos);

    const comWhatsApp = titulosEnriquecidos.filter(t => t.parceiro?.whatsapp);
    const semWhatsApp = titulosEnriquecidos.filter(t => !t.parceiro?.whatsapp);

    console.log(`✅ ${comWhatsApp.length} título(s) com WhatsApp`);
    console.log(`⚠️  ${semWhatsApp.length} título(s) SEM WhatsApp\n`);

    // 7. Gerar mensagens e filtrar duplicados
    console.log('7️⃣ Gerando mensagens e verificando duplicados...\n');

    const mensagensParaEnviar = [];
    let jaEnviados = 0;

    for (const titulo of comWhatsApp) {
      const diasParaVencimento = cobranca.calcularDiasVencimento(titulo.DTVENC);
      const mensagemObj = cadencia.gerarMensagem(titulo, diasParaVencimento);

      if (mensagemObj) {
        // Verificar se já foi enviado
        const jaFoi = controleEnvios.jaFoiEnviado(titulo.NUFIN, mensagemObj.tipo);

        if (jaFoi) {
          jaEnviados++;
          console.log(`   ⏭️  Pulando: ${titulo.parceiro.nome} (${mensagemObj.tipo}) - já enviado`);
        } else {
          mensagensParaEnviar.push({
            ...mensagemObj,
            nufin: titulo.NUFIN
          });
        }
      }
    }

    console.log(`\n✅ ${mensagensParaEnviar.length} mensagem(s) nova(s) para enviar`);
    console.log(`⏭️  ${jaEnviados} mensagem(s) já enviada(s) anteriormente\n`);

    if (mensagensParaEnviar.length === 0) {
      console.log('ℹ️  Todas as mensagens já foram enviadas. Finalizando.\n');
      return;
    }

    // 8. Agrupar por prioridade
    const porPrioridade = cadencia.agruparPorPrioridade(mensagensParaEnviar);

    console.log('📊 Distribuição por prioridade:');
    Object.entries(porPrioridade).forEach(([prioridade, msgs]) => {
      console.log(`   ${prioridade}: ${msgs.length} mensagem(s)`);
    });
    console.log('');

    // 9. Mostrar exemplo
    console.log('8️⃣ Exemplo de mensagem:\n');

    if (mensagensParaEnviar.length > 0) {
      const exemplo = mensagensParaEnviar[0];
      console.log('─'.repeat(70));
      console.log(`📱 Para: ${exemplo.destinatario.nome}`);
      console.log(`📞 WhatsApp: ${exemplo.destinatario.whatsapp}`);
      console.log(`🏷️  Tipo: ${exemplo.tipo} | Prioridade: ${exemplo.prioridade}`);
      console.log('─'.repeat(70));
      console.log(exemplo.mensagem);
      console.log('─'.repeat(70));
      console.log('');
    }

    // 10. Enviar mensagens (DESCOMENTE PARA ATIVAR)
    console.log('9️⃣ Enviando mensagens...\n');

    /*
    // ⚠️ ATENÇÃO: Descomente este bloco para ENVIO REAL!

    const mensagensFormatadas = mensagensParaEnviar.map(msg => ({
      numero: msg.destinatario.whatsapp,
      mensagem: msg.mensagem,
      nufin: msg.nufin,
      tipo: msg.tipo,
      opcoes: { delay: 1000 }
    }));

    const resultados = await whatsapp.enviarEmLote(mensagensFormatadas, 3000);

    // Registrar envios bem-sucedidos
    resultados.forEach(resultado => {
      if (resultado.sucesso) {
        const msg = mensagensFormatadas[resultado.index];
        controleEnvios.registrarEnvio(msg.nufin, msg.tipo, {
          destinatario: resultado.numero,
          dataEnvio: new Date().toISOString()
        });
      }
    });

    console.log('\n🔟 Relatório de envios:\n');

    const relatorio = whatsapp.gerarRelatorio(resultados);

    console.log('📊 RELATÓRIO:');
    console.log('='.repeat(70));
    console.log(`Total: ${relatorio.total}`);
    console.log(`✅ Sucessos: ${relatorio.sucessos}`);
    console.log(`❌ Falhas: ${relatorio.falhas}`);
    console.log(`📈 Taxa de sucesso: ${relatorio.taxaSucesso}`);
    console.log('='.repeat(70));
    console.log('');
    */

    // MODO SIMULAÇÃO
    console.log('ℹ️  MODO SIMULAÇÃO ATIVO');
    console.log('   As mensagens NÃO foram enviadas.');
    console.log('   Para ativar envio real, descomente o bloco acima.\n');

    console.log('✨ Automação finalizada com sucesso!\n');

  } catch (error) {
    console.error('\n❌ ERRO NA EXECUÇÃO:\n');
    console.error(error);
    console.error('\n');
    process.exit(1);
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function obterDiaSemana(data) {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return dias[data.getDay()];
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
