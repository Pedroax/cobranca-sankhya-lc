/**
 * API REST para Geração de Boletos
 *
 * Endpoint para integração com o portal LC Baterias
 * Permite download de boletos em PDF diretamente no navegador
 *
 * @author Automatex
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const SankhyaAPI = require('./SankhyaAPI');
const CobrancaBoletos = require('./automacoes/CobrancaBoletos');
const BoletoItauPDFGenerator = require('./automacoes/BoletoItauPDFGenerator');

// Configuração
const app = express();
const PORT = process.env.API_PORT || 3001;

const config = {
  production: {
    xToken: process.env.PROD_X_TOKEN,
    clientId: process.env.PROD_CLIENT_ID,
    clientSecret: process.env.PROD_CLIENT_SECRET
  }
};

// Middleware
app.use(express.json());

// CORS - Permitir requisições do portal
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Em produção, especifique o domínio do portal
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Instância global da API (reutilizar token)
let apiInstance = null;

async function getAPI() {
  if (!apiInstance) {
    apiInstance = new SankhyaAPI(config.production);
    await apiInstance.autenticar();
  }
  return apiInstance;
}

/**
 * GET /api/boleto/:nufin
 *
 * Gera e retorna PDF do boleto para download
 *
 * Parâmetros:
 *   - nufin: Número único do financeiro (ID do título)
 *
 * Response:
 *   - Content-Type: application/pdf
 *   - Content-Disposition: attachment; filename="boleto_NUFIN.pdf"
 *
 * Exemplo de uso no frontend:
 *   window.open(`http://localhost:3001/api/boleto/${nufin}`, '_blank');
 */
app.get('/api/boleto/:nufin', async (req, res) => {
  const { nufin } = req.params;

  console.log(`📄 Requisição de boleto - NUFIN: ${nufin}`);

  try {
    // 1. Autenticar e buscar dados
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

    // 2. Gerar PDF em memória
    console.log(`   Gerando PDF do boleto...`);
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const caminhoTemp = path.join(tempDir, `boleto_api_${nufin}_${Date.now()}.pdf`);

    await geradorBoleto.gerarBoleto(titulo, parceiro, caminhoTemp);

    // 3. Ler PDF e enviar como response
    console.log(`   Enviando PDF...`);
    const pdfBuffer = fs.readFileSync(caminhoTemp);

    // Limpar arquivo temporário
    fs.unlinkSync(caminhoTemp);

    // 4. Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="boleto_${nufin}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // 5. Enviar PDF
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

/**
 * GET /api/boleto/:nufin/info
 *
 * Retorna informações do boleto sem gerar PDF
 * Útil para mostrar dados antes do download
 */
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

/**
 * GET /api/titulos/:codparc
 *
 * Lista todos os títulos em aberto de um parceiro
 * Útil para mostrar na tela do portal quais boletos estão disponíveis
 */
app.get('/api/titulos/:codparc', async (req, res) => {
  const { codparc } = req.params;

  console.log(`📋 Requisição de títulos - CODPARC: ${codparc}`);

  try {
    const api = await getAPI();
    const cobranca = new CobrancaBoletos(api);

    // Buscar títulos em aberto do parceiro
    const dataHoje = new Date();
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 365); // Próximos 365 dias

    const titulos = await cobranca.buscarTitulosVencimento(
      dataHoje,
      dataFim,
      {
        codparc: parseInt(codparc),
        apenasBoletos: true
      }
    );

    // Formatar resposta
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

/**
 * GET /health
 *
 * Health check da API
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiAtiva: !!apiInstance
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('='.repeat(80));
  console.log('🚀 API de Boletos LC Baterias');
  console.log('='.repeat(80));
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
  console.log('\n📋 Endpoints disponíveis:');
  console.log(`   GET  /api/boleto/:nufin        - Baixar PDF do boleto`);
  console.log(`   GET  /api/boleto/:nufin/info   - Informações do boleto`);
  console.log(`   GET  /api/titulos/:codparc     - Listar títulos do parceiro`);
  console.log(`   GET  /health                   - Health check`);
  console.log('\n💡 Exemplo de uso:');
  console.log(`   http://localhost:${PORT}/api/boleto/19107`);
  console.log(`   http://localhost:${PORT}/api/titulos/2878`);
  console.log('\n');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});
