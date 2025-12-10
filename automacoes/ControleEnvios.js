/**
 * Controle de Envios e Dias Úteis
 *
 * Gerencia:
 * - Detecção de fins de semana
 * - Controle de envios duplicados
 * - Lógica de postergação para segunda-feira
 *
 * Regras Automatex:
 * - Contagem de dias: CALENDÁRIO (conta todos os dias)
 * - Envio: Apenas SEGUNDA a SEXTA
 * - Se cair em fim de semana: envia na SEGUNDA seguinte
 *
 * @author Automatex
 */

const fs = require('fs');
const path = require('path');

class ControleEnvios {
  constructor(arquivoControle = null) {
    // Arquivo para controlar envios (evitar duplicação)
    this.arquivoControle = arquivoControle || path.join(__dirname, 'envios-realizados.json');
    this.enviosRealizados = this.carregarEnvios();
  }

  /**
   * Verifica se hoje é dia útil (segunda a sexta)
   *
   * @param {Date} data - Data a verificar (padrão: hoje)
   * @returns {boolean} true se é dia útil
   */
  isDiaUtil(data = new Date()) {
    const diaSemana = data.getDay();
    // 0 = domingo, 6 = sábado
    return diaSemana >= 1 && diaSemana <= 5;
  }

  /**
   * Verifica se é fim de semana
   *
   * @param {Date} data - Data a verificar
   * @returns {boolean} true se é sábado ou domingo
   */
  isFimDeSemana(data = new Date()) {
    return !this.isDiaUtil(data);
  }

  /**
   * Obtém o próximo dia útil a partir de uma data
   * Se a data já for dia útil, retorna ela mesma
   *
   * @param {Date} data - Data base
   * @returns {Date} Próximo dia útil
   */
  obterProximoDiaUtil(data) {
    const novaData = new Date(data);

    while (!this.isDiaUtil(novaData)) {
      novaData.setDate(novaData.getDate() + 1);
    }

    return novaData;
  }

  /**
   * Verifica se HOJE é o dia de enviar uma mensagem que deveria
   * ser enviada em uma data específica
   *
   * Lógica:
   * - Se a data de envio é dia útil: envia nesse dia
   * - Se a data de envio é fim de semana: envia na segunda seguinte
   *
   * @param {Date} dataEnvio - Data em que deveria enviar
   * @returns {boolean} true se deve enviar HOJE
   */
  deveEnviarHoje(dataEnvio) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Se hoje não é dia útil, não envia
    if (!this.isDiaUtil(hoje)) {
      return false;
    }

    // Obter o dia útil em que deve enviar
    const diaUtilEnvio = this.obterProximoDiaUtil(dataEnvio);
    diaUtilEnvio.setHours(0, 0, 0, 0);

    // Compara se hoje é o dia útil de envio
    return hoje.getTime() === diaUtilEnvio.getTime();
  }

  /**
   * Gera chave única para identificar um envio
   *
   * @param {number} nufin - Número único do título
   * @param {string} tipoMensagem - Tipo da mensagem (lembrete, vencimento, etc)
   * @returns {string} Chave única
   */
  gerarChaveEnvio(nufin, tipoMensagem) {
    return `${nufin}_${tipoMensagem}`;
  }

  /**
   * Verifica se uma mensagem já foi enviada
   *
   * @param {number} nufin - Número do título
   * @param {string} tipoMensagem - Tipo da mensagem
   * @returns {boolean} true se já foi enviada
   */
  jaFoiEnviado(nufin, tipoMensagem) {
    const chave = this.gerarChaveEnvio(nufin, tipoMensagem);
    return this.enviosRealizados.hasOwnProperty(chave);
  }

  /**
   * Registra que uma mensagem foi enviada
   *
   * @param {number} nufin - Número do título
   * @param {string} tipoMensagem - Tipo da mensagem
   * @param {Object} dados - Dados adicionais do envio
   */
  registrarEnvio(nufin, tipoMensagem, dados = {}) {
    const chave = this.gerarChaveEnvio(nufin, tipoMensagem);

    this.enviosRealizados[chave] = {
      nufin,
      tipoMensagem,
      dataEnvio: new Date().toISOString(),
      ...dados
    };

    this.salvarEnvios();
  }

  /**
   * Carrega histórico de envios do arquivo
   *
   * @returns {Object} Objeto com envios realizados
   */
  carregarEnvios() {
    try {
      if (fs.existsSync(this.arquivoControle)) {
        const conteudo = fs.readFileSync(this.arquivoControle, 'utf8');
        return JSON.parse(conteudo);
      }
    } catch (error) {
      console.warn('Aviso: Não foi possível carregar histórico de envios:', error.message);
    }

    return {};
  }

  /**
   * Salva histórico de envios no arquivo
   */
  salvarEnvios() {
    try {
      const conteudo = JSON.stringify(this.enviosRealizados, null, 2);
      fs.writeFileSync(this.arquivoControle, conteudo, 'utf8');
    } catch (error) {
      console.error('Erro ao salvar histórico de envios:', error.message);
    }
  }

  /**
   * Limpa envios antigos (mais de 60 dias)
   * Evita que o arquivo cresça indefinidamente
   */
  limparEnviosAntigos(diasRetencao = 60) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasRetencao);

    let removidos = 0;

    Object.keys(this.enviosRealizados).forEach(chave => {
      const envio = this.enviosRealizados[chave];
      const dataEnvio = new Date(envio.dataEnvio);

      if (dataEnvio < dataLimite) {
        delete this.enviosRealizados[chave];
        removidos++;
      }
    });

    if (removidos > 0) {
      this.salvarEnvios();
      console.log(`🗑️  ${removidos} envio(s) antigo(s) removido(s) do histórico`);
    }
  }

  /**
   * Obtém estatísticas de envios
   *
   * @returns {Object} Estatísticas
   */
  obterEstatisticas() {
    const total = Object.keys(this.enviosRealizados).length;

    const porTipo = {};
    Object.values(this.enviosRealizados).forEach(envio => {
      const tipo = envio.tipoMensagem;
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
    });

    return {
      totalEnvios: total,
      porTipo,
      arquivoControle: this.arquivoControle
    };
  }

  /**
   * Calcula em que dia deve enviar a mensagem
   * considerando a regra de fim de semana
   *
   * @param {Date} dataVencimento - Data de vencimento do boleto
   * @param {number} diasAntes - Dias antes do vencimento (negativo para antes, positivo para depois)
   * @returns {Object} { dataEnvioIdeal, dataEnvioReal, ehFimDeSemana }
   */
  calcularDiaEnvio(dataVencimento, diasAntes) {
    // Calcular data ideal de envio (contagem calendário)
    const dataEnvioIdeal = new Date(dataVencimento);
    dataEnvioIdeal.setDate(dataEnvioIdeal.getDate() - diasAntes);
    dataEnvioIdeal.setHours(0, 0, 0, 0);

    // Verificar se cai em fim de semana
    const ehFimDeSemana = this.isFimDeSemana(dataEnvioIdeal);

    // Calcular data real de envio (próximo dia útil)
    const dataEnvioReal = this.obterProximoDiaUtil(dataEnvioIdeal);

    return {
      dataEnvioIdeal,
      dataEnvioReal,
      ehFimDeSemana,
      diasPostergados: ehFimDeSemana ? this.calcularDiasEntre(dataEnvioIdeal, dataEnvioReal) : 0
    };
  }

  /**
   * Calcula dias entre duas datas
   */
  calcularDiasEntre(dataInicio, dataFim) {
    const diff = dataFim.getTime() - dataInicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Formata data para exibição
   */
  formatarData(data) {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Retorna nome do dia da semana
   */
  obterDiaSemana(data) {
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dias[data.getDay()];
  }
}

module.exports = ControleEnvios;
