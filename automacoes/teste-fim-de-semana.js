/**
 * Teste - Lógica de Fim de Semana
 *
 * Demonstra como funciona a contagem e envio considerando fins de semana
 */

const ControleEnvios = require('./ControleEnvios');

console.log('\n📅 TESTE - LÓGICA DE FIM DE SEMANA\n');
console.log('='.repeat(80));
console.log('');

const controle = new ControleEnvios();

// ============================================
// Teste 1: Verificar dias da semana
// ============================================

console.log('1️⃣ VERIFICAÇÃO DE DIAS DA SEMANA\n');

const diasTeste = [
  new Date('2024-11-18'), // Segunda
  new Date('2024-11-19'), // Terça
  new Date('2024-11-20'), // Quarta
  new Date('2024-11-21'), // Quinta
  new Date('2024-11-22'), // Sexta
  new Date('2024-11-23'), // Sábado
  new Date('2024-11-24')  // Domingo
];

diasTeste.forEach(dia => {
  const diaSemana = controle.obterDiaSemana(dia);
  const ehUtil = controle.isDiaUtil(dia);
  const icone = ehUtil ? '✅' : '❌';

  console.log(`${icone} ${dia.toLocaleDateString('pt-BR')} - ${diaSemana.padEnd(15)} ${ehUtil ? '(Dia útil)' : '(Fim de semana)'}`);
});

console.log('');
console.log('='.repeat(80));
console.log('');

// ============================================
// Teste 2: Simulação de cadência
// ============================================

console.log('2️⃣ SIMULAÇÃO DE CADÊNCIA COM FIM DE SEMANA\n');

// Cenário: Boleto vence na quarta-feira (20/11/2024)
const dataVencimento = new Date('2024-11-20'); // Quarta

console.log(`📋 Boleto vence em: ${controle.formatarData(dataVencimento)}`);
console.log('');

const cadencia = [
  { dias: -3, nome: 'D-3 (Lembrete)' },
  { dias: 0, nome: 'D-0 (Vencimento)' },
  { dias: 3, nome: 'D+3 (Vencido 3 dias)' },
  { dias: 5, nome: 'D+5 (Cartório)' }
];

cadencia.forEach(etapa => {
  console.log(`\n📌 ${etapa.nome}`);
  console.log('─'.repeat(80));

  const info = controle.calcularDiaEnvio(dataVencimento, etapa.dias);

  console.log(`   Data ideal (contagem calendário): ${controle.formatarData(info.dataEnvioIdeal)}`);

  if (info.ehFimDeSemana) {
    console.log(`   ⚠️  Cai em FIM DE SEMANA!`);
    console.log(`   📅 Data real de envio: ${controle.formatarData(info.dataEnvioReal)}`);
    console.log(`   📊 Dias postergados: ${info.diasPostergados}`);
  } else {
    console.log(`   ✅ Cai em dia útil - envia neste dia`);
  }
});

console.log('');
console.log('='.repeat(80));
console.log('');

// ============================================
// Teste 3: Cenários práticos
// ============================================

console.log('3️⃣ CENÁRIOS PRÁTICOS\n');

const cenarios = [
  {
    descricao: 'Boleto vence na segunda',
    vencimento: new Date('2024-11-25'), // Segunda
    diasCadencia: -3 // D-3 = sexta anterior
  },
  {
    descricao: 'Boleto vence no sábado',
    vencimento: new Date('2024-11-23'), // Sábado
    diasCadencia: 0 // D-0 = sábado (envia segunda)
  },
  {
    descricao: 'Boleto vence no domingo',
    vencimento: new Date('2024-11-24'), // Domingo
    diasCadencia: 3 // D+3 = quarta
  }
];

cenarios.forEach((cenario, index) => {
  console.log(`\nCenário ${index + 1}: ${cenario.descricao}`);
  console.log('─'.repeat(80));

  const venc = cenario.vencimento;
  console.log(`Vencimento: ${controle.formatarData(venc)}`);

  const info = controle.calcularDiaEnvio(venc, cenario.diasCadencia);

  console.log(`\nD${cenario.diasCadencia >= 0 ? '+' : ''}${cenario.diasCadencia}:`);
  console.log(`  → Data ideal: ${controle.formatarData(info.dataEnvioIdeal)}`);

  if (info.ehFimDeSemana) {
    console.log(`  → ⚠️  Fim de semana! Postergado para: ${controle.formatarData(info.dataEnvioReal)}`);
  } else {
    console.log(`  → ✅ Dia útil! Envia neste dia.`);
  }
});

console.log('');
console.log('='.repeat(80));
console.log('');

// ============================================
// Teste 4: Controle de duplicados
// ============================================

console.log('4️⃣ CONTROLE DE ENVIOS DUPLICADOS\n');

const nufin = 12345;
const tipo = 'lembrete';

console.log(`Título: NUFIN = ${nufin}`);
console.log(`Tipo de mensagem: ${tipo}\n`);

// Verificar se já foi enviado
let jaEnviado = controle.jaFoiEnviado(nufin, tipo);
console.log(`1. Verificar se já foi enviado: ${jaEnviado ? '✅ Sim' : '❌ Não'}`);

// Registrar envio
console.log(`2. Registrando envio...`);
controle.registrarEnvio(nufin, tipo, {
  destinatario: '5511999999999',
  parceiro: 'LC BATERIAS'
});
console.log(`   ✅ Envio registrado`);

// Verificar novamente
jaEnviado = controle.jaFoiEnviado(nufin, tipo);
console.log(`3. Verificar novamente: ${jaEnviado ? '✅ Sim (evita duplicado!)' : '❌ Não'}`);

console.log('');
console.log('='.repeat(80));
console.log('');

// ============================================
// Teste 5: Estatísticas
// ============================================

console.log('5️⃣ ESTATÍSTICAS DO SISTEMA\n');

const stats = controle.obterEstatisticas();

console.log(`📊 Total de envios registrados: ${stats.totalEnvios}`);
console.log(`📁 Arquivo de controle: ${stats.arquivoControle}`);

if (Object.keys(stats.porTipo).length > 0) {
  console.log(`\nPor tipo de mensagem:`);
  Object.entries(stats.porTipo).forEach(([tipo, qtd]) => {
    console.log(`   ${tipo}: ${qtd} envio(s)`);
  });
}

console.log('');
console.log('='.repeat(80));
console.log('');

// ============================================
// Resumo
// ============================================

console.log('📝 RESUMO DA LÓGICA\n');

console.log('✅ Contagem de dias: CALENDÁRIO (conta todos os dias)');
console.log('✅ Envio de mensagens: Apenas SEGUNDA a SEXTA');
console.log('✅ Fim de semana: Posterga para próxima segunda-feira');
console.log('✅ Controle de duplicados: Nunca envia a mesma mensagem 2x');
console.log('✅ Arquivo de histórico: Mantém registro de todos os envios');
console.log('');

console.log('💡 Como funciona na prática:');
console.log('');
console.log('   Se D-3 cair no sábado:');
console.log('   → Sistema detecta que é fim de semana');
console.log('   → Calcula próximo dia útil (segunda)');
console.log('   → Envia na segunda-feira');
console.log('   → Registra que já foi enviado');
console.log('   → Na terça, verifica histórico e não envia novamente');
console.log('');

console.log('✨ Teste concluído!\n');
