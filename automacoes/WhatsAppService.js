/**
 * Serviço de Envio de Mensagens via WhatsApp
 *
 * Suporta múltiplos provedores:
 * - business: Meta WhatsApp Cloud API (API Oficial) — PADRÃO
 * - evolution: Evolution API (legado)
 * - webhook: Webhook customizado
 *
 * @author Automatex
 */

const fs = require('fs');
const path = require('path');

class WhatsAppService {
  constructor(config = {}) {
    this.provider = config.provider || 'business';

    // Meta Cloud API
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;

    // Evolution API (legado)
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.instanceName = config.instanceName;

    // Webhook
    this.webhookUrl = config.webhookUrl;
  }

  /**
   * Envia mensagem de template via Meta Cloud API
   *
   * @param {string} numero - Número destino (5511999999999)
   * @param {string} nomeTemplate - Nome do template aprovado
   * @param {Array} components - Componentes do template (header, body, buttons)
   * @param {string} language - Código de idioma (padrão: pt_BR)
   * @returns {Promise<Object>}
   */
  async enviarTemplate(numero, nomeTemplate, components = [], language = 'pt_BR') {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('Meta Cloud API: META_PHONE_NUMBER_ID e META_ACCESS_TOKEN são obrigatórios');
    }

    const numeroFormatado = this.formatarNumero(numero);
    const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;

    const body = {
      messaging_product: 'whatsapp',
      to: numeroFormatado,
      type: 'template',
      template: {
        name: nomeTemplate,
        language: { code: language },
        components: components
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta Cloud API error: ${JSON.stringify(error)}`);
    }

    return await response.json();
  }

  /**
   * Faz upload de um arquivo PDF para a Meta e retorna o media_id
   * O media_id pode ser usado como documento em templates
   *
   * @param {string} filePath - Caminho local do arquivo PDF
   * @returns {Promise<string>} media_id
   */
  async uploadMedia(filePath) {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('Meta Cloud API: META_PHONE_NUMBER_ID e META_ACCESS_TOKEN são obrigatórios');
    }

    const fileContent = await fs.promises.readFile(filePath);
    const fileName = path.basename(filePath);

    const blob = new Blob([fileContent], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'application/pdf');
    formData.append('file', blob, fileName);

    const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/media`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Meta Media upload error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Envia mensagem de texto livre via Evolution API (legado)
   *
   * @param {string} numero - Número destino
   * @param {string} mensagem - Texto da mensagem
   * @param {Object} opcoes - Opções adicionais
   */
  async enviarMensagem(numero, mensagem, opcoes = {}) {
    const numeroFormatado = this.formatarNumero(numero);

    switch (this.provider) {
      case 'evolution':
        return this.enviarEvolutionAPI(numeroFormatado, mensagem, opcoes);
      case 'webhook':
        return this.enviarViaWebhook(numeroFormatado, mensagem, opcoes);
      default:
        throw new Error(`enviarMensagem não suportado para provider '${this.provider}'. Use enviarTemplate para o Meta Cloud API.`);
    }
  }

  /**
   * Envia mensagem via Evolution API (legado)
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
  }

  /**
   * Envia arquivo via Evolution API (legado)
   */
  async enviarArquivo(numero, arquivo, caption = '', nomeArquivo = 'documento.pdf') {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('Evolution API: apiUrl e apiKey são obrigatórios');
    }

    const numeroFormatado = this.formatarNumero(numero);
    const url = `${this.apiUrl}/message/sendMedia/${this.instanceName}`;

    let media = arquivo;
    let mimetype = 'application/pdf';

    if (!arquivo.startsWith('http') && !arquivo.startsWith('data:')) {
      if (!fs.existsSync(arquivo)) {
        throw new Error(`Arquivo não encontrado: ${arquivo}`);
      }
      const conteudo = fs.readFileSync(arquivo);
      media = conteudo.toString('base64');

      const ext = path.extname(arquivo).toLowerCase();
      if (ext === '.html' || ext === '.htm') {
        mimetype = 'text/html';
      }
    }

    const body = {
      number: numeroFormatado,
      mediatype: 'document',
      mimetype: mimetype,
      caption: caption,
      fileName: nomeArquivo,
      media: media
    };

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
  }

  /**
   * Envia via webhook customizado
   */
  async enviarViaWebhook(numero, mensagem, opcoes) {
    if (!this.webhookUrl) {
      throw new Error('webhookUrl é obrigatório para provider webhook');
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero, mensagem, ...opcoes })
    });

    if (!response.ok) {
      throw new Error(`Webhook retornou status ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Formata número de telefone para WhatsApp
   * Retorna formato internacional sem '+': 5511999999999
   */
  formatarNumero(numero) {
    if (!numero) {
      throw new Error('Número de telefone é obrigatório');
    }

    let numeroLimpo = numero.replace(/\D/g, '');

    if (!numeroLimpo.startsWith('55')) {
      numeroLimpo = '55' + numeroLimpo;
    }

    if (numeroLimpo.length < 12 || numeroLimpo.length > 13) {
      console.warn(`Número pode estar em formato incorreto: ${numeroLimpo}`);
    }

    return numeroLimpo;
  }

  /**
   * Envia múltiplos templates com delay entre eles
   */
  async enviarEmLote(envios, delayEntreMensagens = 3000) {
    const resultados = [];

    for (let i = 0; i < envios.length; i++) {
      const { numero, template, components } = envios[i];

      try {
        const resultado = await this.enviarTemplate(numero, template, components);
        resultados.push({ sucesso: true, numero, resultado, index: i });
        console.log(`✅ ${i + 1}/${envios.length} enviado para ${numero}`);
      } catch (error) {
        resultados.push({ sucesso: false, numero, erro: error.message, index: i });
        console.error(`❌ ${i + 1}/${envios.length} erro para ${numero}: ${error.message}`);
      }

      if (i < envios.length - 1) {
        await this.sleep(delayEntreMensagens);
      }
    }

    return resultados;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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
