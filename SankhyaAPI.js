/**
 * Classe para integração com API Sankhya
 * Método de autenticação: OAuth 2.0 Client Credentials com X-Token
 *
 * @author Automatex
 * @version 1.0.0
 */

class SankhyaAPI {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'https://api.sankhya.com.br';
    this.xToken = config.xToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Realiza autenticação OAuth 2.0 e obtém access token
   * @returns {Promise<Object>} Dados de autenticação incluindo access_token
   */
  async autenticar() {
    try {
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('grant_type', 'client_credentials');

      const response = await fetch(`${this.baseUrl}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Token': this.xToken
        },
        body: params
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Falha na autenticação: ${error.error_description || error.error}`);
      }

      const data = await response.json();

      // Armazena o token e calcula o tempo de expiração
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      return data;

    } catch (error) {
      throw new Error(`Erro ao autenticar: ${error.message}`);
    }
  }

  /**
   * Verifica se o token ainda é válido
   * @returns {boolean} true se o token é válido, false caso contrário
   */
  tokenValido() {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }

    // Considera inválido se faltam menos de 30 segundos para expirar
    return Date.now() < (this.tokenExpiry - 30000);
  }

  /**
   * Garante que existe um token válido, renovando se necessário
   * @returns {Promise<string>} Access token válido
   */
  async garantirToken() {
    if (!this.tokenValido()) {
      await this.autenticar();
    }
    return this.accessToken;
  }

  /**
   * Executa uma requisição autenticada para a API
   * @param {string} endpoint - Endpoint da API (ex: '/gateway/v1/mge/clientes')
   * @param {Object} options - Opções da requisição (method, body, headers, etc)
   * @returns {Promise<Object>} Resposta da API
   */
  async request(endpoint, options = {}) {
    await this.garantirToken();

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Atalho para requisição GET
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Atalho para requisição POST
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  /**
   * Atalho para requisição PUT
   */
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  /**
   * Atalho para requisição DELETE
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Método auxiliar para debug - mostra informações do token
   */
  infoToken() {
    if (!this.accessToken) {
      return { status: 'Não autenticado' };
    }

    const expiresIn = this.tokenExpiry - Date.now();

    return {
      status: this.tokenValido() ? 'Válido' : 'Expirado',
      tempoRestante: `${Math.floor(expiresIn / 1000)} segundos`,
      token: this.accessToken.substring(0, 50) + '...'
    };
  }
}

module.exports = SankhyaAPI;
