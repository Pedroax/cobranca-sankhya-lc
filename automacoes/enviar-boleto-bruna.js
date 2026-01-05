/**
 * Teste especial: Enviar boleto para a Bruna ❤️
 */

const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');
const WhatsAppService = require('./WhatsAppService');
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

// Configuração
const NUFIN_TESTE = 19107;
const WHATSAPP_BRUNA = '556199660063';

async function enviarBoletoBruna() {
  console.log('💕 ENVIANDO BOLETO PARA A BRUNA\n');
  console.log('='.repeat(80));

  try {
    // 1. Autenticar
    console.log('📡 Autenticando na API Sankhya...');
    const api = new SankhyaAPI(config.production);
    await api.autenticar();
    console.log('✅ Autenticado\n');

    // 2. Criar serviços
    const cobranca = new CobrancaBoletos(api);
    const whatsapp = new WhatsAppService(whatsappConfig);
    const geradorBoleto = new BoletoItauPDFGenerator();

    // 3. Buscar dados do título
    console.log(`📄 Buscando dados do título NUFIN ${NUFIN_TESTE}...`);
    const titulo = await cobranca.buscarDadosCompletosTitulo(NUFIN_TESTE);
    console.log('✅ Título encontrado\n');

    // 4. Buscar dados do parceiro
    console.log(`👤 Buscando dados do parceiro ${titulo.CODPARC}...`);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);
    console.log('✅ Parceiro carregado\n');

    // 5. Mensagem especial para a Bruna
    console.log('💬 Gerando mensagem especial...');
    const mensagem = `Oi Bruna! 💕

Este é um teste do sistema de envio automático de boletos.

📄 *Nota Fiscal:* ${titulo.NUMNOTA}
💰 *Valor:* R$ ${titulo.VLRDESDOB}
📅 *Vencimento:* ${titulo.DTVENC}

Te amo, meu amor! ❤️

O boleto em PDF será enviado logo abaixo! ⬇️`;
    console.log('✅ Mensagem gerada\n');

    // 6. Gerar PDF do boleto
    console.log('📑 Gerando PDF do boleto...');
    const tempDir = path.join(__dirname, '..', 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const caminhoBoletoPDF = path.join(tempDir, `boleto_teste_pedro_${titulo.NUFIN}.pdf`);

    // Verificar se já existe, se não gerar novo
    const fsSync = require('fs');
    if (!fsSync.existsSync(caminhoBoletoPDF)) {
      await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoBoletoPDF);
      console.log('✅ PDF gerado');
    } else {
      console.log('✅ Usando PDF existente');
    }
    console.log(`   - Arquivo: ${caminhoBoletoPDF}\n`);

    // 7. Enviar mensagem de texto
    console.log(`📱 Enviando para WhatsApp da Bruna: ${WHATSAPP_BRUNA}...\n`);
    console.log('📤 Enviando mensagem de texto...');

    let resultadoTexto;
    try {
      resultadoTexto = await whatsapp.enviarMensagem(WHATSAPP_BRUNA, mensagem);
      console.log('✅ Mensagem de texto enviada');
      console.log(`   - Status: ${resultadoTexto.status}`);
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
        WHATSAPP_BRUNA,
        caminhoBoletoPDF,
        captionBoleto,
        nomeArquivo
      );
      console.log('✅ PDF do boleto enviado');
      console.log(`   - Status: ${resultadoPDF.status}`);
    } catch (error) {
      console.log('❌ Erro ao enviar PDF');
      console.log(`   - Erro: ${error.message}`);
      resultadoPDF = { sucesso: false, erro: error.message };
    }

    // 9. Resumo
    console.log('\n' + '='.repeat(80));
    console.log('💕 ENVIO CONCLUÍDO!');
    console.log('='.repeat(80));
    console.log('\n📊 Resumo:');
    console.log(`   - Destinatária: Bruna ❤️`);
    console.log(`   - WhatsApp: ${WHATSAPP_BRUNA}`);
    console.log(`   - Mensagem: ${resultadoTexto.status ? '✅' : '❌'}`);
    console.log(`   - PDF: ${resultadoPDF.status ? '✅' : '❌'}`);
    console.log('\n💕 Mensagem especial enviada com sucesso!\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n🔍 Detalhes:');
    console.error(error);
  }
}

enviarBoletoBruna();
