/**
 * Teste da Nova Cadência Automatex
 *
 * Este script mostra como as mensagens ficam em cada etapa da cadência
 */

const CadenciaCobranca = require('./CadenciaCobranca');

console.log('\n📋 TESTE DA CADÊNCIA AUTOMATEX\n');
console.log('='.repeat(70));
console.log('');

// Criar instância da cadência
const cadencia = new CadenciaCobranca();

// Dados de exemplo de um título
const tituloExemplo = {
  NUFIN: 12345,
  CODPARC: 123,
  DTVENC: '22/11/2024',
  VLRDESDOB: 1250.00,
  NOSSONUM: '123456789',
  parceiro: {
    nome: 'LC BATERIAS',
    whatsapp: '5511999999999',
    telefone: '1133334444',
    email: 'contato@lcbaterias.com.br'
  }
};

// Testar cada etapa da cadência
const etapas = [
  { dias: -3, titulo: '3 DIAS ANTES DO VENCIMENTO' },
  { dias: 0, titulo: 'NO DIA DO VENCIMENTO' },
  { dias: 3, titulo: '3 DIAS APÓS VENCIDO' },
  { dias: 5, titulo: '5 DIAS APÓS VENCIDO - AVISO DE CARTÓRIO' }
];

etapas.forEach((etapa, index) => {
  console.log(`${index + 1}. ${etapa.titulo}`);
  console.log('─'.repeat(70));

  const mensagemObj = cadencia.gerarMensagem(tituloExemplo, etapa.dias);

  if (mensagemObj) {
    console.log(`\n📱 Destinatário: ${mensagemObj.destinatario.nome}`);
    console.log(`📞 WhatsApp: ${mensagemObj.destinatario.whatsapp}`);
    console.log(`🏷️  Tipo: ${mensagemObj.tipo} | Prioridade: ${mensagemObj.prioridade}`);
    console.log(`📊 Dias para vencimento: ${etapa.dias}`);
    console.log('');
    console.log('💬 MENSAGEM:');
    console.log('┌' + '─'.repeat(68) + '┐');

    // Dividir mensagem em linhas e formatar
    const linhas = mensagemObj.mensagem.split('\n');
    linhas.forEach(linha => {
      console.log('│ ' + linha.padEnd(67) + '│');
    });

    console.log('└' + '─'.repeat(68) + '┘');
  } else {
    console.log('\n⚠️  Nenhuma mensagem para este dia\n');
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('');
});

// Mostrar resumo da cadência
console.log('📊 RESUMO DA CADÊNCIA:\n');

console.log('┌────────────┬─────────────────────────┬────────────┐');
console.log('│    Dia     │         Momento         │ Prioridade │');
console.log('├────────────┼─────────────────────────┼────────────┤');

cadencia.cadenciaPadrao.forEach(c => {
  const dia = `D${c.dias >= 0 ? '+' : ''}${c.dias}`.padEnd(10);
  const momento = c.tipo.padEnd(23);
  const prioridade = c.prioridade.padEnd(10);
  console.log(`│ ${dia} │ ${momento} │ ${prioridade} │`);
});

console.log('└────────────┴─────────────────────────┴────────────┘');
console.log('');

// Informações adicionais
console.log('ℹ️  INFORMAÇÕES:\n');
console.log('• Total de etapas na cadência: ' + cadencia.cadenciaPadrao.length);
console.log('• Templates disponíveis: ' + Object.keys(cadencia.templates).join(', '));
console.log('• Formato de data esperado: DD/MM/YYYY');
console.log('• Valor formatado em: R$ (BRL)');
console.log('');

console.log('✨ Teste concluído!\n');
