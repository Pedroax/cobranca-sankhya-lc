/**
 * Serverless Function Handler for Vercel
 *
 * Este arquivo adapta o Express app para o formato Serverless da Vercel
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const SankhyaAPI = require('./SankhyaAPI');
const CobrancaBoletos = require('./automacoes/CobrancaBoletos');
const BoletoItauPDFGenerator = require('./automacoes/BoletoItauPDFGenerator');

const app = express();

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Instância global da API
let apiInstance = null;

async function getAPI() {
  if (!apiInstance) {
    apiInstance = new SankhyaAPI(config.production);
    await apiInstance.autenticar();
  }
  return apiInstance;
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'API de Boletos LC Baterias',
    endpoints: [
      'GET /api/boleto/:nufin - Baixar PDF do boleto',
      'GET /api/boleto/:nufin/info - Informações do boleto',
      'GET /api/titulos/:codparc - Listar títulos do parceiro',
      'GET /health - Health check'
    ],
    version: '1.0.0'
  });
});

// Endpoint: Download PDF do boleto
app.get('/api/boleto/:nufin', async (req, res) => {
  const { nufin } = req.params;

  console.log(`📄 Requisição de boleto - NUFIN: ${nufin}`);

  try {
    const api = await getAPI();
    const cobranca = new CobrancaBoletos(api);
    const geradorBoleto = new BoletoItauPDFGenerator();

    console.log(`   Buscando dados do título ${nufin}...`);
    const titulo = await cobranca.buscarDadosCompletosTitulo(parseInt(nufin));

    if (!titulo) {
      return res.status(404).json({
        erro: 'Título não encontrado',
        nufin
      });
    }

    console.log(`   Buscando dados do parceiro ${titulo.CODPARC}...`);
    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

    if (!parceiro) {
      return res.status(404).json({
        erro: 'Parceiro não encontrado',
        codparc: titulo.CODPARC
      });
    }

    // Gerar PDF em /tmp (Vercel tem acesso de escrita em /tmp)
    console.log(`   Gerando PDF do boleto...`);
    const tempDir = '/tmp';
    const caminhoTemp = path.join(tempDir, `boleto_${nufin}_${Date.now()}.pdf`);

    await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoTemp);

    // Ler PDF
    console.log(`   Enviando PDF...`);
    const pdfBuffer = fs.readFileSync(caminhoTemp);

    // Limpar arquivo temporário
    try {
      fs.unlinkSync(caminhoTemp);
    } catch (e) {
      console.warn('Aviso: não foi possível deletar arquivo temporário');
    }

    // Headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="boleto_${nufin}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    console.log(`✅ Boleto enviado com sucesso - NUFIN: ${nufin}`);

  } catch (error) {
    console.error(`❌ Erro ao gerar boleto - NUFIN: ${nufin}`);
    console.error(error);

    res.status(500).json({
      erro: 'Erro ao gerar boleto',
      mensagem: error.message,
      nufin
    });
  }
});

// Endpoint: Informações do boleto
app.get('/api/boleto/:nufin/info', async (req, res) => {
  const { nufin } = req.params;

  console.log(`ℹ️  Requisição de info - NUFIN: ${nufin}`);

  try {
    const api = await getAPI();
    const cobranca = new CobrancaBoletos(api);

    const titulo = await cobranca.buscarDadosCompletosTitulo(parseInt(nufin));

    if (!titulo) {
      return res.status(404).json({
        erro: 'Título não encontrado',
        nufin
      });
    }

    const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

    res.json({
      nufin: titulo.NUFIN,
      notaFiscal: titulo.NUMNOTA,
      vencimento: titulo.DTVENC,
      valor: titulo.VLRDESDOB,
      nossoNumero: titulo.NOSSONUM,
      linhaDigitavel: titulo.LINHADIGITAVEL,
      temPix: !!titulo.EMVPIX,
      parceiro: {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        cpfCnpj: parceiro.CGC_CPF
      }
    });

    console.log(`✅ Info retornada - NUFIN: ${nufin}`);

  } catch (error) {
    console.error(`❌ Erro ao buscar info - NUFIN: ${nufin}`);
    console.error(error);

    res.status(500).json({
      erro: 'Erro ao buscar informações do boleto',
      mensagem: error.message,
      nufin
    });
  }
});

// Endpoint: Listar títulos do parceiro
app.get('/api/titulos/:codparc', async (req, res) => {
  const { codparc } = req.params;

  console.log(`📋 Requisição de títulos - CODPARC: ${codparc}`);

  try {
    const api = await getAPI();
    const cobranca = new CobrancaBoletos(api);

    const dataHoje = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 365);

    const titulos = await cobranca.buscarTitulosVencimento(
      dataHoje,
      dataFim,
      {
        codparc: parseInt(codparc),
        apenasBoletos: true
      }
    );

    const titulosFormatados = titulos.map(t => ({
      nufin: t.NUFIN,
      notaFiscal: t.NUMNOTA,
      vencimento: t.DTVENC,
      valor: t.VLRDESDOB,
      nossoNumero: t.NOSSONUM,
      temPix: !!t.EMVPIX,
      diasParaVencimento: cobranca.calcularDiasParaVencimento(
        cobranca.parsearDataSankhya(t.DTVENC)
      )
    }));

    res.json({
      codparc: parseInt(codparc),
      total: titulosFormatados.length,
      titulos: titulosFormatados
    });

    console.log(`✅ ${titulosFormatados.length} título(s) retornado(s) - CODPARC: ${codparc}`);

  } catch (error) {
    console.error(`❌ Erro ao buscar títulos - CODPARC: ${codparc}`);
    console.error(error);

    res.status(500).json({
      erro: 'Erro ao buscar títulos',
      mensagem: error.message,
      codparc
    });
  }
});

// Endpoint: Executar cobrança automática (Cron Job)
app.get('/api/executar-cobranca', async (req, res) => {
  console.log('🤖 Iniciando execução de cobrança automática...');

  try {
    // Verificar se é dia útil
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0 = Domingo, 6 = Sábado

    if (diaSemana === 0 || diaSemana === 6) {
      console.log('⏸️  Hoje é fim de semana - cobrança não executada');
      return res.json({
        sucesso: false,
        mensagem: 'Cobrança não executada - fim de semana',
        data: hoje.toISOString()
      });
    }

    const api = await getAPI();
    const CobrancaBoletosClass = require('./automacoes/CobrancaBoletos');
    const WhatsAppServiceClass = require('./automacoes/WhatsAppService');
    const CadenciaCobrancaClass = require('./automacoes/CadenciaCobranca');
    const ControleEnviosClass = require('./automacoes/ControleEnvios');
    const BoletoItauPDFGeneratorClass = require('./automacoes/BoletoItauPDFGenerator');

    const cobranca = new CobrancaBoletosClass(api);
    const whatsapp = new WhatsAppServiceClass({
      apiUrl: process.env.WHATSAPP_API_URL,
      apiKey: process.env.WHATSAPP_API_KEY,
      instanceName: process.env.WHATSAPP_INSTANCE,
      provider: 'evolution'
    });
    const cadencia = new CadenciaCobrancaClass();
    const controleEnvios = new ControleEnviosClass();
    const geradorBoleto = new BoletoItauPDFGeneratorClass();

    console.log('📊 Buscando títulos para cobrança...');

    const resultados = {
      data: hoje.toISOString(),
      enviosRealizados: [],
      erros: [],
      totalProcessado: 0
    };

    // Buscar títulos para cada estágio da cadência
    const estagios = ['lembrete', 'vencimento', 'atraso', 'cartorio'];

    for (const estagio of estagios) {
      console.log(`\n📋 Processando estágio: ${estagio}`);

      const { dataInicio, dataFim } = cadencia.obterPeriodoEstagio(estagio);
      const titulos = await cobranca.buscarTitulosVencimento(dataInicio, dataFim, {
        apenasBoletos: true
      });

      console.log(`   Encontrados ${titulos.length} título(s)`);

      for (const titulo of titulos) {
        try {
          resultados.totalProcessado++;

          // Verificar se já foi enviado
          if (controleEnvios.jaFoiEnviado(titulo.NUFIN, estagio)) {
            console.log(`   ⏭️  NUFIN ${titulo.NUFIN} - já enviado (${estagio})`);
            continue;
          }

          // Buscar dados do parceiro
          const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

          if (!parceiro?.TELEFONE) {
            console.log(`   ⚠️  NUFIN ${titulo.NUFIN} - sem telefone cadastrado`);
            continue;
          }

          // Gerar mensagem
          const MensagensCobrancaClass = require('./automacoes/MensagensCobranca');
          const MensagensCobranca = MensagensCobrancaClass || class {
            static lembrete(t, p) { return `Lembrete: Boleto NF ${t.NUMNOTA} vence em ${t.DTVENC}. Valor: R$ ${t.VLRDESDOB}`; }
            static vencimento(t, p) { return `Boleto NF ${t.NUMNOTA} vence HOJE. Valor: R$ ${t.VLRDESDOB}`; }
            static atraso(t, p) { return `Boleto NF ${t.NUMNOTA} vencido em ${t.DTVENC}. Valor: R$ ${t.VLRDESDOB}`; }
            static cartorio(t, p) { return `URGENTE: Boleto NF ${t.NUMNOTA} será enviado para protesto. Valor: R$ ${t.VLRDESDOB}`; }
          };

          const mensagem = MensagensCobranca[estagio](titulo, parceiro);

          // Gerar PDF do boleto
          const caminhoTemp = `/tmp/boleto_${titulo.NUFIN}_${Date.now()}.pdf`;
          await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoTemp);

          // Enviar mensagem
          await whatsapp.enviarMensagem(parceiro.TELEFONE, mensagem);

          // Aguardar 2 segundos
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Enviar PDF
          await whatsapp.enviarArquivo(
            parceiro.TELEFONE,
            caminhoTemp,
            `Boleto - NF ${titulo.NUMNOTA}`,
            `boleto_${titulo.NUFIN}.pdf`
          );

          // Registrar envio
          controleEnvios.registrarEnvio(titulo.NUFIN, estagio, parceiro.CODPARC);

          resultados.enviosRealizados.push({
            nufin: titulo.NUFIN,
            codparc: parceiro.CODPARC,
            estagio,
            telefone: parceiro.TELEFONE
          });

          console.log(`   ✅ NUFIN ${titulo.NUFIN} - enviado com sucesso`);

          // Limpar arquivo temporário
          try {
            const fs = require('fs');
            fs.unlinkSync(caminhoTemp);
          } catch (e) {
            // Ignorar erro ao deletar
          }

        } catch (error) {
          console.error(`   ❌ Erro no NUFIN ${titulo.NUFIN}:`, error.message);
          resultados.erros.push({
            nufin: titulo.NUFIN,
            erro: error.message
          });
        }
      }
    }

    console.log('\n✅ Execução de cobrança concluída!');

    res.json({
      sucesso: true,
      mensagem: 'Cobrança executada com sucesso',
      ...resultados
    });

  } catch (error) {
    console.error('❌ Erro ao executar cobrança:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Exportar para Vercel
module.exports = app;
