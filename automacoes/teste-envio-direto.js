/**
 * Teste - Envio Direto para Número Específico
 *
 * Envia mensagem de teste diretamente para o número fornecido
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const WhatsAppService = require('./WhatsAppService');

const configWhatsApp = {
  provider: 'evolution',
  apiUrl: process.env.WHATSAPP_API_URL,
  apiKey: process.env.WHATSAPP_API_KEY,
  instanceName: process.env.WHATSAPP_INSTANCE
};

async function testarEnvioDireto() {
  console.log('\n📱 TESTE - ENVIO DIRETO WHATSAPP\n');
  console.log('='.repeat(80));
  console.log(`📍 Evolution API: ${configWhatsApp.apiUrl}`);
  console.log(`📍 Instância: ${configWhatsApp.instanceName}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    const whatsapp = new WhatsAppService(configWhatsApp);

    // NÚMERO DE TESTE - SEU WHATSAPP
    const numeroTeste = '5561999660063';

    console.log(`📱 Número de destino: ${numeroTeste}\n`);

    const mensagemTeste = `🧪 *TESTE - SISTEMA DE COBRANÇA LC BATERIAS*

Olá! Tudo bem? 😊

Este é um *teste do sistema automatizado* de envio de boletos.

📋 *Informações do teste:*
• Número destino: ${numeroTeste}
• Parceiro: FIAIS BATERIAS (1510)
• Título: NUFIN 3279
• Data/Hora: ${new Date().toLocaleString('pt-BR')}

✅ *Se você recebeu esta mensagem, o sistema está 100% funcional!*

📌 *Próximos passos:*
✓ Sistema de integração Sankhya funcionando
✓ Evolution API conectada
✓ Pronto para envios automáticos

🎯 *Cadência configurada:*
• D-3: Lembrete 3 dias antes
• D-0: Aviso no dia do vencimento
• D+3: Cobrança após 3 dias vencido
• D+5: Aviso de cartório

🤖 Mensagem automática - Sistema Automatex
Desenvolvido para LC Baterias`;

    console.log('📨 MENSAGEM QUE SERÁ ENVIADA:\n');
    console.log('─'.repeat(80));
    console.log(mensagemTeste);
    console.log('─'.repeat(80));
    console.log('');

    console.log('⏳ Enviando...\n');

    const resultado = await whatsapp.enviarMensagem(numeroTeste, mensagemTeste);

    console.log('📊 RESULTADO:\n');
    console.log(JSON.stringify(resultado, null, 2));
    console.log('');

    if (resultado.sucesso) {
      console.log('🎉🎉🎉 SUCESSO! MENSAGEM ENVIADA! 🎉🎉🎉\n');
      console.log(`📱 Destinatário: ${numeroTeste}`);
      console.log(`✅ Status: Enviado com sucesso`);
      console.log('');
      console.log('🚀 O sistema está 100% operacional!');
      console.log('');
    } else {
      console.log('❌ ERRO NO ENVIO:\n');
      console.log(`   ${resultado.erro}\n`);
      console.log('💡 Verifique:');
      console.log('   1. Se a Evolution API está rodando');
      console.log('   2. Se a instância "lc" está conectada');
      console.log('   3. Se a API Key está correta');
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testarEnvioDireto();
