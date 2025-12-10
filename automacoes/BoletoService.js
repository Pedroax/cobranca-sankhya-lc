/**
 * BoletoService - Serviço para gerar e baixar PDFs de boletos
 *
 * Fluxo:
 * 1. BoletoSP.buildPreVisualizacao -> Gera boleto e retorna chave
 * 2. visualizadorArquivos.mge -> Baixa PDF usando a chave
 */

class BoletoService {

  /**
   * @param {SankhyaMGEAuth} mgeAuth - Instância autenticada do MGE
   */
  constructor(mgeAuth) {
    this.mgeAuth = mgeAuth;
  }

  /**
   * Gera pré-visualização do boleto e retorna chave do arquivo
   * @param {number} nufin - Número único do financeiro
   * @returns {Promise<string>} Chave do arquivo (ex: boleto_ABC123...)
   */
  async gerarPreVisualizacao(nufin) {
    const requestBody = {
      serviceName: 'BoletoSP.buildPreVisualizacao',
      requestBody: {
        configBoleto: {
          agrupamentoBoleto: '4',
          ordenacaoParceiro: 1,
          dupRenegociadas: false,
          gerarNumeroBoleto: false,
          multiTransacional: true,
          reimprimir: true,
          telaImpressaoBoleto: true,
          tipoReimpressao: 'T',
          tipoTitulo: -1,
          codigoRelatorio: 202,
          titulo: [{ $: nufin }]
        }
      }
    };

    const response = await this.mgeAuth.post(
      '/mge/service.sbr?serviceName=BoletoSP.buildPreVisualizacao&outputType=json',
      requestBody
    );

    if (response.status !== '1') {
      throw new Error(`Erro ao gerar boleto: ${response.statusMessage || JSON.stringify(response)}`);
    }

    const chaveArquivo = response.responseBody?.boleto?.valor;

    if (!chaveArquivo) {
      throw new Error('Chave do arquivo não retornada pela API');
    }

    return chaveArquivo;
  }

  /**
   * Baixa PDF do boleto usando a chave do arquivo
   * @param {string} chaveArquivo - Chave retornada por gerarPreVisualizacao
   * @returns {Promise<Buffer>} PDF em formato Buffer
   */
  async baixarPDF(chaveArquivo) {
    const url = `/mge/visualizadorArquivos.mge?chaveArquivo=${chaveArquivo}`;
    return await this.mgeAuth.getFile(url);
  }

  /**
   * Fluxo completo: gera boleto e baixa PDF
   * @param {number} nufin - Número único do financeiro
   * @param {string} caminhoSalvar - Caminho onde salvar o PDF (opcional)
   * @returns {Promise<Object>} { chaveArquivo, pdf, caminhoArquivo? }
   */
  async obterBoletoPDF(nufin, caminhoSalvar = null) {
    console.log(`📄 Gerando boleto para NUFIN ${nufin}...`);

    // 1. Gerar pré-visualização e obter chave
    const chaveArquivo = await this.gerarPreVisualizacao(nufin);
    console.log(`✅ Chave do arquivo: ${chaveArquivo}`);

    // 2. Baixar PDF
    console.log(`📥 Baixando PDF...`);
    const pdf = await this.baixarPDF(chaveArquivo);
    console.log(`✅ PDF baixado! Tamanho: ${pdf.length} bytes`);

    const resultado = {
      chaveArquivo,
      pdf
    };

    // 3. Salvar em arquivo se solicitado
    if (caminhoSalvar) {
      const fs = require('fs').promises;
      await fs.writeFile(caminhoSalvar, pdf);
      resultado.caminhoArquivo = caminhoSalvar;
      console.log(`💾 PDF salvo em: ${caminhoSalvar}`);
    }

    return resultado;
  }

  /**
   * Gera boletos para múltiplos títulos
   * @param {number[]} nufins - Array de NUFINs
   * @returns {Promise<Object>} { chaveArquivo, pdf }
   */
  async obterBoletosPDF(nufins) {
    const requestBody = {
      serviceName: 'BoletoSP.buildPreVisualizacao',
      requestBody: {
        configBoleto: {
          agrupamentoBoleto: '4',
          ordenacaoParceiro: 1,
          dupRenegociadas: false,
          gerarNumeroBoleto: false,
          multiTransacional: true,
          reimprimir: true,
          telaImpressaoBoleto: true,
          tipoReimpressao: 'T',
          tipoTitulo: -1,
          codigoRelatorio: 202,
          titulo: nufins.map(n => ({ $: n }))
        }
      }
    };

    const response = await this.mgeAuth.post(
      '/mge/service.sbr?serviceName=BoletoSP.buildPreVisualizacao&outputType=json',
      requestBody
    );

    if (response.status !== '1') {
      throw new Error(`Erro ao gerar boletos: ${response.statusMessage || 'Erro desconhecido'}`);
    }

    const chaveArquivo = response.responseBody?.boleto?.valor;

    if (!chaveArquivo) {
      throw new Error('Chave do arquivo não retornada pela API');
    }

    const pdf = await this.baixarPDF(chaveArquivo);

    return {
      chaveArquivo,
      pdf
    };
  }
}

module.exports = BoletoService;
