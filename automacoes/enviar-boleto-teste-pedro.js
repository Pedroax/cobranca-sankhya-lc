/**
 * Teste: Enviar boleto para o WhatsApp do Pedro
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const WhatsAppService = require('./WhatsAppService');
const CadenciaCobranca = require('./CadenciaCobranca');
const BoletoItauPDFGenerator = require('./BoletoItauPDFGenerator');

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

// Configuração do teste
const NUFIN_TESTE = 19107; // Usar o que geramos
const WHATSAPP_PEDRO = '556182563956';

async function enviarBoletoPedro() {
  console.log('🚀 ENVIANDO BOLETO PARA O WHATSAPP DO PEDRO\n');
  console.log('='.repeat(80));

  try {
    // 1. Autenticar
    console.log('📡 1. Autenticando na API Sankhya...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar serviços
    const cobranca = new CobrancaBoletos(api);
    const whatsapp = new WhatsAppService(whatsappConfig);
    const cadencia = new CadenciaCobranca();
    const geradorBoleto = new BoletoItauPDFGenerator();

    // 3. Buscar dados do título
    console.log(`📄 2. Buscando dados do título NUFIN ${NUFIN_TESTE}...`);
    const titulo = await cobranca.buscarDadosCompletosTitulo(NUFIN_TESTE);
    console.log('✅ Título encontrado');
    console.log(`   - NF: ${titulo.NUMNOTA}`);
    console.log(`   - Vencimento: ${titulo.DTVENC}`);
    console.log(`   - Valor: R$ ${titulo.VLRDESDOB}\n`);

    // 4. Buscar dados do parceiro
    console.log(`👤 3. Buscando dados do parceiro ${titulo.CODPARC}...`);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);
    console.log('✅ Parceiro: ' + parceiro.NOMEPARC + '\n');

    // 5. Gerar mensagem de cobrança
    console.log('💬 4. Gerando mensagem de teste...');
    const mensagem = `🔔 *TESTE DE ENVIO DE BOLETO*

Olá! Este é um teste do sistema de envio automático de boletos.

📄 *Nota Fiscal:* ${titulo.NUMNOTA}
💰 *Valor:* R$ ${titulo.VLRDESDOB}
📅 *Vencimento:* ${titulo.DTVENC}

O boleto em PDF será enviado logo abaixo! ⬇️`;
    console.log('✅ Mensagem gerada\n');

    // 6. Gerar PDF do boleto
    console.log('📑 5. Gerando PDF do boleto...');
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const caminhoBoletoPDF = path.join(tempDir, `boleto_teste_pedro_${titulo.NUFIN}.pdf`);
    await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoBoletoPDF);
    console.log('✅ PDF gerado');
    console.log(`   - Arquivo: ${caminhoBoletoPDF}\n`);

    // 7. Enviar mensagem de texto
    console.log(`📱 6. Enviando para WhatsApp: ${WHATSAPP_PEDRO}...\n`);
    console.log('📤 Enviando mensagem de texto...');

    let resultadoTexto;
    try {
      resultadoTexto = await whatsapp.enviarMensagem(WHATSAPP_PEDRO, mensagem);
      console.log('✅ Mensagem de texto enviada');
      console.log('   Resposta:', JSON.stringify(resultadoTexto, null, 2));
    } catch (error) {
      console.log('❌ Erro ao enviar mensagem de texto');
      console.log(`   - Erro: ${error.message}`);
      resultadoTexto = { sucesso: false, erro: error.message };
    }

    // Aguardar 2 segundos
    console.log('\n⏳ Aguardando 2 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 8. Enviar PDF do boleto
    console.log('📤 Enviando PDF do boleto...');
    const captionBoleto = `Boleto - NF ${titulo.NUMNOTA}`;
    const nomeArquivo = `boleto_${titulo.NUFIN}.pdf`;

    let resultadoPDF;
    try {
      resultadoPDF = await whatsapp.enviarArquivo(
        WHATSAPP_PEDRO,
        caminhoBoletoPDF,
        captionBoleto,
        nomeArquivo
      );
      console.log('✅ PDF do boleto enviado');
      console.log('   Resposta:', JSON.stringify(resultadoPDF, null, 2));
    } catch (error) {
      console.log('❌ Erro ao enviar PDF');
      console.log(`   - Erro: ${error.message}`);
      resultadoPDF = { sucesso: false, erro: error.message };
    }

    // 9. Resumo
    console.log('\n' + '='.repeat(80));
    console.log('✅ ENVIO CONCLUÍDO!');
    console.log('='.repeat(80));
    console.log('\n📊 Resumo:');
    console.log(`   - Título: NUFIN ${titulo.NUFIN}`);
    console.log(`   - WhatsApp: ${WHATSAPP_PEDRO}`);
    console.log(`   - Mensagem texto: ${resultadoTexto.sucesso ? '✅' : '❌'}`);
    console.log(`   - PDF boleto: ${resultadoPDF.sucesso ? '✅' : '❌'}`);
    console.log('\n✅ Verifique seu WhatsApp!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n🔍 Detalhes:');
    console.error(error);
  }
}

enviarBoletoPedro();
