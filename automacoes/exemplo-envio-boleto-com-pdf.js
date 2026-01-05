/**
 * Exemplo: Envio de Boleto Completo com PDF Gerado
 *
 * Este exemplo demonstra o fluxo completo:
 * 1. Buscar título do Sankhya
 * 2. Buscar dados do parceiro
 * 3. Gerar PDF do boleto
 * 4. Enviar mensagem + PDF via WhatsApp
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

// TESTE - Altere conforme necessário
const NUFIN_TESTE = 19106;
const NUMERO_WHATSAPP_TESTE = '5561999660063'; // Seu número para teste
const MODO_TESTE = true; // true = envia para NUMERO_WHATSAPP_TESTE, false = envia para o cliente real

async function enviarBoletoCompleto() {
  console.log('🚀 ENVIO DE BOLETO COMPLETO COM PDF\n');
  console.log('='.repeat(80));

  if (MODO_TESTE) {
    console.log('⚠️  MODO TESTE ATIVO');
    console.log(`   Todas as mensagens serão enviadas para: ${NUMERO_WHATSAPP_TESTE}\n`);
  }

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
    const geradorBoleto = new BoletoItauPDFGenerator();

    // 3. Buscar dados completos do título
    console.log(`📄 2. Buscando dados do título NUFIN ${NUFIN_TESTE}...`);
    const titulo = await cobranca.buscarDadosCompletosTitulo(NUFIN_TESTE);
    console.log('✅ Título encontrado');
    console.log(`   - NF: ${titulo.NUMNOTA}`);
    console.log(`   - Vencimento: ${titulo.DTVENC}`);
    console.log(`   - Valor: R$ ${titulo.VLRDESDOB}\n`);

    // 4. Buscar dados do parceiro
    console.log(`👤 3. Buscando dados do parceiro ${titulo.CODPARC}...`);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);
    console.log('✅ Parceiro encontrado');
    console.log(`   - Nome: ${parceiro.NOMEPARC}`);
    console.log(`   - WhatsApp: ${parceiro.TELEFONE || 'N/A'}\n`);

    // 5. Calcular dias para vencimento
    const diasParaVencimento = cobranca.calcularDiasParaVencimento(
      cobranca.parsearDataSankhya(titulo.DTVENC)
    );

    console.log(`📊 4. Status do título:`);
    console.log(`   - Dias para vencimento: ${diasParaVencimento}`);

    let tipoMensagem;
    if (diasParaVencimento === -3) tipoMensagem = 'lembrete';
    else if (diasParaVencimento === 0) tipoMensagem = 'vencimento';
    else if (diasParaVencimento === 3) tipoMensagem = 'vencido';
    else if (diasParaVencimento >= 5) tipoMensagem = 'cartorio';
    else tipoMensagem = 'vencimento'; // default

    console.log(`   - Tipo de mensagem: ${tipoMensagem}\n`);

    // 6. Gerar mensagem
    console.log('💬 5. Gerando mensagem de cobrança...');
    const mensagem = cadencia.gerarMensagem(titulo, tipoMensagem);
    console.log('✅ Mensagem gerada\n');

    // 7. Gerar PDF do boleto
    console.log('📑 6. Gerando PDF do boleto...');
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const caminhoBoletoPDF = path.join(tempDir, `boleto_${titulo.NUFIN}.pdf`);
    await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoBoletoPDF);
    console.log('✅ PDF gerado');
    console.log(`   - Arquivo: ${caminhoBoletoPDF}\n`);

    // 8. Determinar número de destino
    let numeroDestino = NUMERO_WHATSAPP_TESTE;

    if (!MODO_TESTE) {
      if (!parceiro.TELEFONE) {
        throw new Error('Parceiro não possui WhatsApp cadastrado');
      }
      numeroDestino = whatsapp.formatarNumero(parceiro.TELEFONE);
    }

    console.log(`📱 7. Preparando envio via WhatsApp...`);
    console.log(`   - Destino: ${numeroDestino}`);
    console.log(`   - Modo: ${MODO_TESTE ? 'TESTE' : 'PRODUÇÃO'}\n`);

    // 9. Enviar mensagem de texto
    console.log('📤 8. Enviando mensagem de texto...');
    const resultadoTexto = await whatsapp.enviarMensagem(numeroDestino, mensagem);

    if (resultadoTexto.sucesso) {
      console.log('✅ Mensagem de texto enviada');
      if (resultadoTexto.messageId) {
        console.log(`   - ID da mensagem: ${resultadoTexto.messageId}`);
      }
    } else {
      console.log('❌ Erro ao enviar mensagem de texto');
      console.log(`   - Erro: ${resultadoTexto.erro}`);
    }

    // Aguardar 2 segundos entre mensagens
    console.log('\n⏳ Aguardando 2 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 10. Enviar PDF do boleto
    console.log('📤 9. Enviando PDF do boleto...');
    const resultadoPDF = await whatsapp.enviarArquivo(
      numeroDestino,
      caminhoBoletoPDF,
      {
        caption: `Boleto - NF ${titulo.NUMNOTA}`,
        mimetype: 'application/pdf',
        fileName: `boleto_${titulo.NUFIN}.pdf`
      }
    );

    if (resultadoPDF.sucesso) {
      console.log('✅ PDF do boleto enviado');
      if (resultadoPDF.messageId) {
        console.log(`   - ID da mensagem: ${resultadoPDF.messageId}`);
      }
    } else {
      console.log('❌ Erro ao enviar PDF');
      console.log(`   - Erro: ${resultadoPDF.erro}`);
    }

    // 11. Resumo
    console.log('\n' + '='.repeat(80));
    console.log('✅ ENVIO CONCLUÍDO!');
    console.log('='.repeat(80));
    console.log('\n📊 Resumo:');
    console.log(`   - Título: NUFIN ${titulo.NUFIN}`);
    console.log(`   - Cliente: ${parceiro.NOMEPARC}`);
    console.log(`   - WhatsApp: ${numeroDestino}`);
    console.log(`   - Mensagem: ${resultadoTexto.sucesso ? '✅' : '❌'}`);
    console.log(`   - PDF: ${resultadoPDF.sucesso ? '✅' : '❌'}`);

    if (MODO_TESTE) {
      console.log('\n⚠️  Lembre-se: Este foi um envio de teste!');
      console.log('   Para enviar ao cliente real, configure MODO_TESTE = false\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n🔍 Detalhes:');
    console.error(error);
  }
}

// Executar
if (require.main === module) {
  enviarBoletoCompleto();
}

module.exports = { enviarBoletoCompleto };
