/**
 * TESTE DE COBRANÇA - Envio para Bruna
 *
 * Testa o sistema completo de cobrança enviando para o WhatsApp da Bruna
 * como se fosse um cliente real
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const WhatsAppService = require('./WhatsAppService');
const BoletoItauPDFGenerator = require('./BoletoItauPDFGenerator');
const { MensagensCobranca } = require('./envio-cobranca-producao');

// Configuração
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
  instanceName: process.env.WHATSAPP_INSTANCE,
  provider: 'evolution'
};

// TESTE - WhatsApp da Bruna
const WHATSAPP_BRUNA = '556199660063'; // Formato: 55 + DDD 61 + número
const NUFIN_TESTE = 19107; // Usar título real para gerar boleto correto

async function testarCobrancaBruna() {
  console.log('🧪 TESTE DE COBRANÇA - Enviando para Bruna\n');
  console.log('='.repeat(80));
  console.log(`WhatsApp Destino: ${WHATSAPP_BRUNA}`);
  console.log(`NUFIN Teste: ${NUFIN_TESTE}`);
  console.log('='.repeat(80));

  try {
    // 1. Autenticar
    console.log('\n📡 1. Autenticando na API Sankhya...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar serviços
    const cobranca = new CobrancaBoletos(api);
    const whatsapp = new WhatsAppService(whatsappConfig);
    const geradorBoleto = new BoletoItauPDFGenerator();

    // 3. Buscar dados do título
    console.log(`📄 2. Buscando dados do título NUFIN ${NUFIN_TESTE}...`);
    const titulo = await cobranca.buscarDadosCompletosTitulo(NUFIN_TESTE);
    console.log('✅ Título encontrado:');
    console.log(`   - NF: ${titulo.NUMNOTA}`);
    console.log(`   - Vencimento: ${titulo.DTVENC}`);
    console.log(`   - Valor: R$ ${titulo.VLRDESDOB}\n`);

    // 4. Buscar dados do parceiro (cliente real)
    console.log(`👤 3. Buscando dados do parceiro ${titulo.CODPARC}...`);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);
    console.log('✅ Parceiro encontrado:');
    console.log(`   - Nome: ${parceiro.NOMEPARC}\n`);

    // 5. Calcular dias de vencimento
    const calcularDiasVencimento = (dataVencimento) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const venc = new Date(dataVencimento);
      venc.setHours(0, 0, 0, 0);

      const diff = venc - hoje;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const parsearData = (dataStr) => {
      const [dia, mes, ano] = dataStr.split('/');
      return new Date(ano, mes - 1, dia);
    };

    const diasParaVencimento = calcularDiasVencimento(parsearData(titulo.DTVENC));

    console.log(`📊 4. Status do título:`);
    console.log(`   - Dias para vencimento: ${diasParaVencimento}`);

    // Determinar tipo de mensagem baseado nos dias
    let tipoMensagem;
    let mensagem;

    if (diasParaVencimento <= -5) {
      tipoMensagem = 'cartorio';
      mensagem = MensagensCobranca.cartorio(titulo, parceiro);
    } else if (diasParaVencimento >= 1 && diasParaVencimento <= 5) {
      tipoMensagem = 'vencido';
      mensagem = MensagensCobranca.vencido(titulo, parceiro);
    } else if (diasParaVencimento === 0) {
      tipoMensagem = 'vencimento';
      mensagem = MensagensCobranca.vencimentoHoje(titulo, parceiro);
    } else {
      tipoMensagem = 'lembrete';
      mensagem = MensagensCobranca.lembrete(titulo, parceiro);
    }

    console.log(`   - Tipo de mensagem: ${tipoMensagem}\n`);

    // 6. Mostrar preview da mensagem
    console.log('💬 5. Preview da mensagem:\n');
    console.log('─'.repeat(60));
    console.log(mensagem);
    console.log('─'.repeat(60));
    console.log('');

    // 7. Gerar PDF do boleto
    console.log('📑 6. Gerando PDF do boleto...');
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const caminhoBoletoPDF = path.join(tempDir, `boleto_teste_bruna_${titulo.NUFIN}.pdf`);
    await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoBoletoPDF);
    console.log('✅ PDF gerado');
    console.log(`   - Arquivo: ${caminhoBoletoPDF}\n`);

    // 8. Enviar mensagem de texto
    console.log(`📱 7. Enviando mensagem para WhatsApp da Bruna...`);
    console.log(`   - Número: ${WHATSAPP_BRUNA}\n`);

    const resultadoTexto = await whatsapp.enviarMensagem(WHATSAPP_BRUNA, mensagem);

    if (resultadoTexto.status) {
      console.log('✅ Mensagem de texto enviada');
      console.log(`   - Status: ${resultadoTexto.status}`);
    } else {
      console.log('❌ Erro ao enviar mensagem de texto');
    }

    // Aguardar 2 segundos
    console.log('\n⏳ Aguardando 2 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 9. Enviar PDF do boleto
    console.log('📎 8. Enviando PDF do boleto...');
    const captionBoleto = `Boleto - NF ${titulo.NUMNOTA}`;
    const resultadoPDF = await whatsapp.enviarArquivo(
      WHATSAPP_BRUNA,
      caminhoBoletoPDF,
      captionBoleto,
      `boleto_${titulo.NUFIN}.pdf`
    );

    if (resultadoPDF.status) {
      console.log('✅ PDF do boleto enviado');
      console.log(`   - Status: ${resultadoPDF.status}`);
    } else {
      console.log('❌ Erro ao enviar PDF');
    }

    // Limpar arquivo temporário
    await fs.unlink(caminhoBoletoPDF);

    // 10. Resumo
    console.log('\n' + '='.repeat(80));
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(80));
    console.log('\n📊 Resumo:');
    console.log(`   - Destinatária: Bruna (TESTE)`);
    console.log(`   - WhatsApp: ${WHATSAPP_BRUNA}`);
    console.log(`   - Tipo: ${tipoMensagem}`);
    console.log(`   - Mensagem: ${resultadoTexto.status ? '✅' : '❌'}`);
    console.log(`   - PDF: ${resultadoPDF.status ? '✅' : '❌'}`);
    console.log('\n🎯 Verifique o WhatsApp da Bruna para confirmar o recebimento!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n🔍 Detalhes:');
    console.error(error);
  }
}

// Executar
testarCobrancaBruna()
  .then(() => {
    console.log('✅ Execução finalizada!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
