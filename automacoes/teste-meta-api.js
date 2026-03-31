/**
 * Teste rápido da Meta WhatsApp Cloud API
 * Envia o template 3_apo_5dias (sem documento) para validar a integração
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const WhatsAppService = require('./WhatsAppService');

async function testar() {
  const whatsapp = new WhatsAppService({
    provider: 'business',
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    accessToken: process.env.META_ACCESS_TOKEN
  });

  const numero = '5561982563956';
  const template = process.env.META_TEMPLATE_D5 || '3_apo_5dias';

  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', parameter_name: 'nome_cliente', text: 'Pedro' },
        { type: 'text', parameter_name: 'nf_numero',    text: '999999' },
        { type: 'text', parameter_name: 'data_vencimento', text: '26/03/2026' },
        { type: 'text', parameter_name: 'valor_boleto', text: '1.500,00' }
      ]
    }
  ];

  console.log(`\nEnviando template "${template}" para ${numero}...`);
  console.log(`Phone Number ID: ${process.env.META_PHONE_NUMBER_ID}`);

  try {
    const resultado = await whatsapp.enviarTemplate(numero, template, components);
    console.log('\n✅ Enviado com sucesso!');
    console.log('Resposta:', JSON.stringify(resultado, null, 2));
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  }
}

testar();
