/**
 * Serviço de Envio de Mensagens via WhatsApp
 *
 * Este módulo abstrai a integração com APIs de WhatsApp.
 * Suporta múltiplos provedores:
 * - Evolution API
 * - Baileys
 * - WhatsApp Business API
 * - Outros via webhook
 *
 * @author Automatex
 */

class WhatsAppService {
  constructor(config = {}) {
    this.provider = config.provider || 'evolution'; // evolution, baileys, business, webhook
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.instanceName = config.instanceName;
    this.webhookUrl = config.webhookUrl;
  }

  /**
   * Envia mensagem via WhatsApp
   *
   * @param {string} numero - Número do WhatsApp (com DDI: 5511999999999)
   * @param {string} mensagem - Texto da mensagem
   * @param {Object} opcoes - Opções adicionais
   * @returns {Promise<Object>} Resultado do envio
   */
  async enviarMensagem(numero, mensagem, opcoes = {}) {
    // Limpar e formatar número
    const numeroFormatado = this.formatarNumero(numero);

    switch (this.provider) {
      case 'evolution':
        return this.enviarEvolutionAPI(numeroFormatado, mensagem, opcoes);

      case 'baileys':
        return this.enviarBaileys(numeroFormatado, mensagem, opcoes);

      case 'business':
        return this.enviarBusinessAPI(numeroFormatado, mensagem, opcoes);

      case 'webhook':
        return this.enviarViaWebhook(numeroFormatado, mensagem, opcoes);

      default:
        throw new Error(`Provider '${this.provider}' não suportado`);
    }
  }

  /**
   * Envia mensagem via Evolution API
   * Documentação: https://doc.evolution-api.com/
   */
  async enviarEvolutionAPI(numero, mensagem, opcoes) {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('Evolution API: apiUrl e apiKey são obrigatórios');
    }

    const url = `${this.apiUrl}/message/sendText/${this.instanceName}`;

    const body = {
      number: numero,
      text: mensagem,
      delay: opcoes.delay || 0
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Evolution API error: ${JSON.stringify(error)}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Erro ao enviar via Evolution API: ${error.message}`);
    }
  }

  /**
   * Envia arquivo/documento via Evolution API
   *
   * @param {string} numero - Número WhatsApp
   * @param {string} arquivo - Caminho do arquivo local, URL ou base64
   * @param {string} caption - Legenda/texto que acompanha o arquivo
   * @param {string} nomeArquivo - Nome do arquivo
   * @returns {Promise<Object>}
   */
  async enviarArquivo(numero, arquivo, caption = '', nomeArquivo = 'documento.pdf') {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('Evolution API: apiUrl e apiKey são obrigatórios');
    }

    const numeroFormatado = this.formatarNumero(numero);
    const url = `${this.apiUrl}/message/sendMedia/${this.instanceName}`;

    // Se arquivo for caminho local, converter para base64
    let media = arquivo;
    let mimetype = 'application/pdf';

    if (!arquivo.startsWith('http') && !arquivo.startsWith('data:')) {
      // É caminho de arquivo local
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(arquivo)) {
        throw new Error(`Arquivo não encontrado: ${arquivo}`);
      }

      const conteudo = fs.readFileSync(arquivo);
      media = conteudo.toString('base64');

      // Detectar mimetype pela extensão
      const ext = path.extname(arquivo).toLowerCase();
      if (ext === '.html' || ext === '.htm') {
        mimetype = 'text/html';
      } else if (ext === '.pdf') {
        mimetype = 'application/pdf';
      }
    }

    const body = {
      number: numeroFormatado,
      mediatype: 'document',
      mimetype: mimetype,
      caption: caption,
      fileName: nomeArquivo,
      media: media // Base64 puro ou URL
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Evolution API error: ${JSON.stringify(error)}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Erro ao enviar arquivo via Evolution API: ${error.message}`);
    }
  }

  /**
   * Envia mensagem via Baileys (implementação custom)
   */
  async enviarBaileys(numero, mensagem, opcoes) {
    // Implementar integração com Baileys
    throw new Error('Baileys provider ainda não implementado. Use Evolution API.');
  }

  /**
   * Envia mensagem via WhatsApp Business API oficial
   */
  async enviarBusinessAPI(numero, mensagem, opcoes) {
    // Implementar integração com WhatsApp Business API
    throw new Error('Business API ainda não implementado. Use Evolution API.');
  }

  /**
   * Envia mensagem via webhook customizado
   */
  async enviarViaWebhook(numero, mensagem, opcoes) {
    if (!this.webhookUrl) {
      throw new Error('webhookUrl é obrigatório para provider webhook');
    }

    const body = {
      numero,
      mensagem,
      ...opcoes
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Erro ao enviar via webhook: ${error.message}`);
    }
  }

  /**
   * Formata número de telefone para WhatsApp
   *
   * @param {string} numero - Número em qualquer formato
   * @returns {string} Número formatado (5511999999999)
   */
  formatarNumero(numero) {
    if (!numero) {
      throw new Error('Número de telefone é obrigatório');
    }

    // Remove tudo que não é número
    let numeroLimpo = numero.replace(/\D/g, '');

    // Se não tem DDI (55), adiciona
    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
    }

    // Valida tamanho (deve ter 13 dígitos: 55 + DDD + 9 dígitos)
    if (numeroLimpo.length < 12 || numeroLimpo.length > 13) {
      console.warn(`Número pode estar em formato incorreto: ${numeroLimpo}`);
    }

    return numeroLimpo;
  }

  /**
   * Valida se o número é válido para WhatsApp
   *
   * @param {string} numero - Número a validar
   * @returns {boolean} true se válido
   */
  validarNumero(numero) {
    try {
      const numeroFormatado = this.formatarNumero(numero);
      return numeroFormatado.length >= 12 && numeroFormatado.length <= 13;
    } catch (error) {
      return false;
    }
  }

  /**
   * Envia múltiplas mensagens com delay entre elas
   *
   * @param {Array} mensagens - Array de objetos {numero, mensagem}
   * @param {number} delayEntreMensagens - Delay em ms entre mensagens
   * @returns {Promise<Array>} Resultados dos envios
   */
  async enviarEmLote(mensagens, delayEntreMensagens = 2000) {
    const resultados = [];

    for (let i = 0; i < mensagens.length; i++) {
      const { numero, mensagem, opcoes } = mensagens[i];

      try {
        const resultado = await this.enviarMensagem(numero, mensagem, opcoes);

        resultados.push({
          sucesso: true,
          numero,
          resultado,
          index: i
        });

        console.log(`✅ Mensagem ${i + 1}/${mensagens.length} enviada para ${numero}`);

      } catch (error) {
        resultados.push({
          sucesso: false,
          numero,
          erro: error.message,
          index: i
        });

        console.error(`❌ Erro ao enviar mensagem ${i + 1}/${mensagens.length} para ${numero}: ${error.message}`);
      }

      // Delay entre mensagens (exceto na última)
      if (i < mensagens.length - 1) {
        await this.sleep(delayEntreMensagens);
      }
    }

    return resultados;
  }

  /**
   * Função auxiliar para delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gera relatório de envios
   *
   * @param {Array} resultados - Resultados do enviarEmLote
   * @returns {Object} Estatísticas de envio
   */
  gerarRelatorio(resultados) {
    const total = resultados.length;
    const sucessos = resultados.filter(r => r.sucesso).length;
    const falhas = total - sucessos;

    return {
      total,
      sucessos,
      falhas,
      taxaSucesso: total > 0 ? ((sucessos / total) * 100).toFixed(2) + '%' : '0%',
      detalhes: resultados
    };
  }
}

module.exports = WhatsAppService;
