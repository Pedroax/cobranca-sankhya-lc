/**
 * Automação Completa de Cobrança Automatex com Geração de PDF
 *
 * Versão melhorada que gera PDFs dos boletos ao invés de depender da API MGE.
 *
 * Cadência Automatex:
 * - D-3: Lembrete amigável
 * - D-0: Vencimento hoje
 * - D+3: Título vencido
 * - D+5: Aviso de protesto em cartório
 *
 * Com lógica de fim de semana e controle de duplicatas.
 *
 * @author Automatex
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const WhatsAppService = require('./WhatsAppService');
const CadenciaCobranca = require('./CadenciaCobranca');
const ControleEnvios = require('./ControleEnvios');
const BoletoItauPDFGenerator = require('./BoletoItauPDFGenerator');

// Configurações
const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL,
  apiKey: process.env.WHATSAPP_API_KEY,
  instance: process.env.WHATSAPP_INSTANCE
};

// Cadência Automatex (dias em relação ao vencimento)
const DIAS_CADENCIA = [-3, 0, 3, 5];

// Modo simulação
const MODO_SIMULACAO = true;

async function executarCobrancaAutomatex() {
  console.log('🚀 AUTOMAÇÃO DE COBRANÇA AUTOMATEX COM PDF\n');
  console.log('='.repeat(80));
  console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`Modo: ${MODO_SIMULACAO ? '🧪 SIMULAÇÃO' : '🔴 PRODUÇÃO'}\n`);

  try {
    // 1. Autenticar
    console.log('📡 1. Autenticando na API Sankhya...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar serviços
    const cobranca = new CobrancaBoletos(api);
    const whatsapp = new WhatsAppService(whatsappConfig, 'evolution');
    const cadencia = new CadenciaCobranca();
    const controleEnvios = new ControleEnvios();
    const geradorBoleto = new BoletoItauPDFGenerator();

    // Criar diretório temporário para PDFs
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // 3. Verificar se é dia útil
    const hoje = new Date();
    if (!controleEnvios.isDiaUtil(hoje)) {
      console.log('📅 Hoje não é dia útil (fim de semana). Encerrando.\n');
      return;
    }

    console.log('📅 Hoje é dia útil. Prosseguindo com a cobrança...\n');

    // 4. Limpar envios antigos (>60 dias)
    console.log('🧹 2. Limpando histórico de envios antigos...');
    await controleEnvios.limparEnviosAntigos();
    console.log('✅ Histórico limpo\n');

    // 5. Processar cada etapa da cadência
    let estatisticas = {
      totalTitulos: 0,
      totalEnviados: 0,
      totalErros: 0,
      totalPulados: 0,
      porEtapa: {}
    };

    for (const diasCadencia of DIAS_CADENCIA) {
      const tipoMensagem = cadencia.obterTipoPorDias(diasCadencia);

      console.log('─'.repeat(80));
      console.log(`\n📊 3. Processando cadência: ${tipoMensagem.toUpperCase()} (D${diasCadencia >= 0 ? '+' : ''}${diasCadencia})`);
      console.log('─'.repeat(80));

      // Buscar títulos para enviar HOJE (considerando lógica de fim de semana)
      const titulos = await cobranca.buscarTitulosParaEnviarHoje(diasCadencia, controleEnvios);

      console.log(`\n📋 Títulos encontrados: ${titulos.length}\n`);

      if (titulos.length === 0) {
        console.log('✅ Nenhum título para processar nesta etapa.\n');
        continue;
      }

      // Enriquecer com dados dos parceiros
      const titulosEnriquecidos = await cobranca.enriquecerTitulosComParceiros(titulos);

      estatisticas.porEtapa[tipoMensagem] = {
        total: titulosEnriquecidos.length,
        enviados: 0,
        erros: 0,
        pulados: 0
      };

      // Processar cada título
      for (const [index, titulo] of titulosEnriquecidos.entries()) {
        console.log(`\n[${index + 1}/${titulosEnriquecidos.length}] Título NUFIN ${titulo.NUFIN}`);
        console.log(`   - NF: ${titulo.NUMNOTA}`);
        console.log(`   - Vencimento: ${titulo.DTVENC}`);
        console.log(`   - Valor: R$ ${titulo.VLRDESDOB}`);
        console.log(`   - Cliente: ${titulo.parceiro?.nome || 'N/A'}`);

        estatisticas.totalTitulos++;

        try {
          // Verificar se já foi enviado
          if (await controleEnvios.jaFoiEnviado(titulo.NUFIN, tipoMensagem)) {
            console.log('   ⏭️  Já foi enviado. Pulando...');
            estatisticas.totalPulados++;
            estatisticas.porEtapa[tipoMensagem].pulados++;
            continue;
          }

          // Validar WhatsApp
          if (!titulo.parceiro?.whatsapp) {
            console.log('   ⚠️  WhatsApp não cadastrado. Pulando...');
            estatisticas.totalPulados++;
            estatisticas.porEtapa[tipoMensagem].pulados++;
            continue;
          }

          const numeroFormatado = whatsapp.formatarNumero(titulo.parceiro.whatsapp);

          // Gerar mensagem
          const mensagem = cadencia.gerarMensagem(titulo, tipoMensagem);

          if (MODO_SIMULACAO) {
            console.log('\n   📧 SIMULAÇÃO - Mensagem que seria enviada:');
            console.log('   ' + '─'.repeat(70));
            console.log(mensagem.split('\n').map(l => '   ' + l).join('\n'));
            console.log('   ' + '─'.repeat(70));
            console.log(`   📱 Destino: ${numeroFormatado}`);
            console.log(`   📄 PDF: Seria gerado boleto_${titulo.NUFIN}.pdf\n`);

            // Simular sucesso
            estatisticas.totalEnviados++;
            estatisticas.porEtapa[tipoMensagem].enviados++;

          } else {
            // ENVIO REAL

            // 1. Buscar dados completos do título para gerar PDF
            console.log('   📄 Buscando dados completos...');
            const tituloCompleto = await cobranca.buscarDadosCompletosTitulo(titulo.NUFIN);
            const parceiroCompleto = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

            // 2. Gerar PDF do boleto
            console.log('   📑 Gerando PDF do boleto...');
            const caminhoBoletoPDF = path.join(tempDir, `boleto_${titulo.NUFIN}.pdf`);
            await geradorBoleto.gerarBoleto(tituloCompleto, parceiroCompleto, caminhoBoletoPDF);
            console.log('   ✅ PDF gerado');

            // 3. Enviar mensagem de texto
            console.log('   📤 Enviando mensagem de texto...');
            const resultadoTexto = await whatsapp.enviarMensagem(numeroFormatado, mensagem);

            if (!resultadoTexto.sucesso) {
              throw new Error(`Erro ao enviar texto: ${resultadoTexto.erro}`);
            }

            console.log('   ✅ Mensagem enviada');

            // 4. Aguardar 2 segundos
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 5. Enviar PDF do boleto
            console.log('   📤 Enviando PDF do boleto...');
            const resultadoPDF = await whatsapp.enviarArquivo(
              numeroFormatado,
              caminhoBoletoPDF,
              {
                caption: `Boleto - NF ${titulo.NUMNOTA}`,
                mimetype: 'application/pdf',
                fileName: `boleto_${titulo.NUFIN}.pdf`
              }
            );

            if (!resultadoPDF.sucesso) {
              throw new Error(`Erro ao enviar PDF: ${resultadoPDF.erro}`);
            }

            console.log('   ✅ PDF enviado');

            // 6. Registrar envio
            await controleEnvios.registrarEnvio({
              nufin: titulo.NUFIN,
              tipoMensagem,
              destinatario: numeroFormatado,
              parceiro: titulo.parceiro.nome
            });

            estatisticas.totalEnviados++;
            estatisticas.porEtapa[tipoMensagem].enviados++;

            // 7. Aguardar entre envios
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

        } catch (error) {
          console.log(`   ❌ Erro: ${error.message}`);
          estatisticas.totalErros++;
          estatisticas.porEtapa[tipoMensagem].erros++;
        }
      }
    }

    // 6. Exibir estatísticas finais
    console.log('\n' + '='.repeat(80));
    console.log('📊 ESTATÍSTICAS FINAIS');
    console.log('='.repeat(80));
    console.log(`\nModo: ${MODO_SIMULACAO ? '🧪 SIMULAÇÃO' : '🔴 PRODUÇÃO'}`);
    console.log(`\nResumo Geral:`);
    console.log(`   - Total de títulos processados: ${estatisticas.totalTitulos}`);
    console.log(`   - Enviados com sucesso: ${estatisticas.totalEnviados}`);
    console.log(`   - Pulados (já enviados/sem WhatsApp): ${estatisticas.totalPulados}`);
    console.log(`   - Erros: ${estatisticas.totalErros}`);

    const taxaSucesso = estatisticas.totalTitulos > 0
      ? ((estatisticas.totalEnviados / estatisticas.totalTitulos) * 100).toFixed(2)
      : 0;
    console.log(`   - Taxa de sucesso: ${taxaSucesso}%`);

    console.log(`\nPor Etapa da Cadência:`);
    for (const [tipo, stats] of Object.entries(estatisticas.porEtapa)) {
      console.log(`\n   ${tipo.toUpperCase()}:`);
      console.log(`      - Total: ${stats.total}`);
      console.log(`      - Enviados: ${stats.enviados}`);
      console.log(`      - Pulados: ${stats.pulados}`);
      console.log(`      - Erros: ${stats.erros}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ AUTOMAÇÃO CONCLUÍDA!');
    console.log('='.repeat(80));

    if (MODO_SIMULACAO) {
      console.log('\n⚠️  Este foi um teste em MODO SIMULAÇÃO');
      console.log('   Para ativar envios reais, configure MODO_SIMULACAO = false\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error(error);
  }
}

// Executar
if (require.main === module) {
  executarCobrancaAutomatex();
}

module.exports = { executarCobrancaAutomatex };
