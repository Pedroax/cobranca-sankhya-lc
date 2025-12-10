/**
 * BoletoRapidoAPI - Integração com Boleto Rápido API da Sankhya Fintech
 *
 * Responsável por:
 * - Consultar boletos gerados
 * - Gerar PDF de boletos (incluindo híbridos com PIX)
 * - Download de PDFs
 */

class BoletoRapidoAPI {

  /**
   * @param {SankhyaAPI} sankhyaApi - Instância autenticada da API Sankhya
   */
  constructor(sankhyaApi) {
    this.sankhyaApi = sankhyaApi;

    // ENDPOINTS - A SEREM PREENCHIDOS COM DOCUMENTAÇÃO OFICIAL
    this.endpoints = {
      // Endpoint para consultar/listar boletos
      consultarBoletos: null, // Ex: '/api/boletos' ou '/gateway/v1/boletos'

      // Endpoint para obter PDF de boleto específico
      gerarPDF: null, // Ex: '/api/boletos/{id}/pdf'

      // Endpoint para buscar boleto por NUFIN ou NOSSONUM
      buscarPorNufin: null, // Ex: '/api/boletos/buscar?nufin={nufin}'
    };
  }

  /**
   * Configura os endpoints da API
   * @param {Object} endpoints - Objeto com os endpoints
   */
  configurarEndpoints(endpoints) {
    this.endpoints = { ...this.endpoints, ...endpoints };
  }

  /**
   * Busca ID do boleto usando NUFIN
   * @param {number} nufin - Número único do financeiro
   * @returns {Promise<string>} ID do boleto na API Boleto Rápido
   */
  async buscarIdBoletoPorNufin(nufin) {
    if (!this.endpoints.buscarPorNufin && !this.endpoints.consultarBoletos) {
      throw new Error('Endpoint de consulta de boletos não configurado');
    }

    try {
      // Tentar primeiro por endpoint específico de busca
      if (this.endpoints.buscarPorNufin) {
        const url = this.endpoints.buscarPorNufin.replace('{nufin}', nufin);
        const response = await this.sankhyaApi.get(url);

        if (response && response.id) {
          return response.id;
        }
      }

      // Se não tiver endpoint específico, tentar pelo consultarBoletos
      if (this.endpoints.consultarBoletos) {
        const response = await this.sankhyaApi.get(
          `${this.endpoints.consultarBoletos}?nufin=${nufin}`
        );

        if (response && Array.isArray(response.data) && response.data.length > 0) {
          return response.data[0].id;
        }

        if (response && response.id) {
          return response.id;
        }
      }

      throw new Error(`Boleto não encontrado para NUFIN ${nufin}`);

    } catch (error) {
      throw new Error(`Erro ao buscar ID do boleto: ${error.message}`);
    }
  }

  /**
   * Busca ID do boleto usando NOSSONUM
   * @param {string} nossonum - Nosso número do boleto
   * @returns {Promise<string>} ID do boleto na API Boleto Rápido
   */
  async buscarIdBoletoPorNossoNum(nossonum) {
    if (!this.endpoints.consultarBoletos) {
      throw new Error('Endpoint de consulta de boletos não configurado');
    }

    try {
      const response = await this.sankhyaApi.get(
        `${this.endpoints.consultarBoletos}?nossonum=${nossonum}`
      );

      if (response && Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0].id;
      }

      if (response && response.id) {
        return response.id;
      }

      throw new Error(`Boleto não encontrado para NOSSONUM ${nossonum}`);

    } catch (error) {
      throw new Error(`Erro ao buscar ID do boleto: ${error.message}`);
    }
  }

  /**
   * Gera PDF do boleto
   * @param {string} idBoleto - ID do boleto na API Boleto Rápido
   * @returns {Promise<Buffer|string>} PDF em base64 ou Buffer
   */
  async gerarPDF(idBoleto) {
    if (!this.endpoints.gerarPDF) {
      throw new Error('Endpoint de geração de PDF não configurado');
    }

    try {
      const url = this.endpoints.gerarPDF.replace('{id}', idBoleto);

      console.log(`📄 Gerando PDF do boleto ID: ${idBoleto}...`);

      const response = await this.sankhyaApi.get(url, {
        responseType: 'arraybuffer' // Para receber PDF como binary
      });

      if (response instanceof Buffer || response instanceof ArrayBuffer) {
        return Buffer.from(response);
      }

      // Se retornou base64
      if (typeof response === 'string') {
        return response;
      }

      // Se retornou objeto com PDF
      if (response.pdf) {
        return response.pdf;
      }

      // Se retornou URL
      if (response.url) {
        console.log(`📥 Baixando PDF de: ${response.url}`);
        const pdfResponse = await fetch(response.url);
        const arrayBuffer = await pdfResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      throw new Error('Formato de resposta do PDF não reconhecido');

    } catch (error) {
      throw new Error(`Erro ao gerar PDF: ${error.message}`);
    }
  }

  /**
   * Salva PDF em arquivo local
   * @param {Buffer|string} pdf - PDF em Buffer ou base64
   * @param {string} caminhoArquivo - Caminho onde salvar
   * @returns {Promise<string>} Caminho do arquivo salvo
   */
  async salvarPDF(pdf, caminhoArquivo) {
    const fs = require('fs').promises;

    try {
      let buffer;

      if (typeof pdf === 'string') {
        // Se for base64, converter para buffer
        buffer = Buffer.from(pdf, 'base64');
      } else {
        buffer = pdf;
      }

      await fs.writeFile(caminhoArquivo, buffer);
      console.log(`✅ PDF salvo em: ${caminhoArquivo}`);

      return caminhoArquivo;

    } catch (error) {
      throw new Error(`Erro ao salvar PDF: ${error.message}`);
    }
  }

  /**
   * Fluxo completo: Busca boleto e gera PDF
   * @param {number} nufin - Número único do financeiro
   * @param {string} caminhoSalvar - Caminho onde salvar o PDF (opcional)
   * @returns {Promise<Object>} { idBoleto, pdf, caminhoArquivo? }
   */
  async obterPDFPorNufin(nufin, caminhoSalvar = null) {
    console.log(`\n🔍 Buscando boleto para NUFIN ${nufin}...\n`);

    // 1. Buscar ID do boleto
    const idBoleto = await this.buscarIdBoletoPorNufin(nufin);
    console.log(`✅ Boleto encontrado! ID: ${idBoleto}\n`);

    // 2. Gerar PDF
    const pdf = await this.gerarPDF(idBoleto);
    console.log(`✅ PDF gerado com sucesso!\n`);

    const resultado = {
      idBoleto,
      pdf
    };

    // 3. Salvar em arquivo se solicitado
    if (caminhoSalvar) {
      resultado.caminhoArquivo = await this.salvarPDF(pdf, caminhoSalvar);
    }

    return resultado;
  }

  /**
   * Fluxo completo: Busca boleto por NOSSONUM e gera PDF
   * @param {string} nossonum - Nosso número do boleto
   * @param {string} caminhoSalvar - Caminho onde salvar o PDF (opcional)
   * @returns {Promise<Object>} { idBoleto, pdf, caminhoArquivo? }
   */
  async obterPDFPorNossoNum(nossonum, caminhoSalvar = null) {
    console.log(`\n🔍 Buscando boleto para NOSSONUM ${nossonum}...\n`);

    // 1. Buscar ID do boleto
    const idBoleto = await this.buscarIdBoletoPorNossoNum(nossonum);
    console.log(`✅ Boleto encontrado! ID: ${idBoleto}\n`);

    // 2. Gerar PDF
    const pdf = await this.gerarPDF(idBoleto);
    console.log(`✅ PDF gerado com sucesso!\n`);

    const resultado = {
      idBoleto,
      pdf
    };

    // 3. Salvar em arquivo se solicitado
    if (caminhoSalvar) {
      resultado.caminhoArquivo = await this.salvarPDF(pdf, caminhoSalvar);
    }

    return resultado;
  }
}

module.exports = BoletoRapidoAPI;
