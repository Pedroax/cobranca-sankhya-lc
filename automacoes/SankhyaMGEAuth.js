/**
 * SankhyaMGEAuth - Autenticação no MGE (Management Gateway Enterprise)
 *
 * Usa autenticação tradicional (usuário/senha) para acessar endpoints /mge/
 * Diferente da API Gateway que usa OAuth 2.0
 */

class SankhyaMGEAuth {

  /**
   * @param {string} serverUrl - URL do servidor (ex: https://lcbaterias.sankhyacloud.com.br)
   * @param {string} username - Usuário Sankhya
   * @param {string} password - Senha
   */
  constructor(serverUrl, username, password) {
    this.serverUrl = serverUrl;
    this.username = username;
    this.password = password;
    this.jsessionid = null;
  }

  /**
   * Autentica no MGE e obtém JSESSIONID
   */
  async autenticar() {
    const url = `${this.serverUrl}/mge/service.sbr?serviceName=MobileLoginSP.login&outputType=json`;

    const requestBody = {
      serviceName: 'MobileLoginSP.login',
      requestBody: {
        NOMUSU: { $: this.username },
        SENHA: { $: this.password },
        KEEPCONNECTED: { $: 'S' }
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Capturar cookie JSESSIONID
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/JSESSIONID=([^;]+)/);
        if (match) {
          this.jsessionid = match[1];
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.status !== '1') {
        throw new Error(`Erro ao autenticar: ${data.statusMessage || JSON.stringify(data)}`);
      }

      console.log('✅ Autenticado no MGE');
      console.log(`   JSESSIONID: ${this.jsessionid}`);

      return data;

    } catch (error) {
      throw new Error(`Erro ao autenticar no MGE: ${error.message}`);
    }
  }

  /**
   * Faz requisição POST autenticada ao MGE
   */
  async post(endpoint, body) {
    if (!this.jsessionid) {
      await this.autenticar();
    }

    const url = `${this.serverUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `JSESSIONID=${this.jsessionid}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Faz requisição GET autenticada ao MGE
   */
  async get(endpoint) {
    if (!this.jsessionid) {
      await this.autenticar();
    }

    const url = `${this.serverUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': `JSESSIONID=${this.jsessionid}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Baixa arquivo (retorna Buffer)
   */
  async getFile(endpoint) {
    const response = await this.get(endpoint);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

module.exports = SankhyaMGEAuth;
