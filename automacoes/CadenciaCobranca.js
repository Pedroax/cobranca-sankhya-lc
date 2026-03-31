/**
 * Sistema de Cadência de Cobrança
 *
 * Gerencia o envio de mensagens de cobrança via WhatsApp
 * em diferentes momentos do ciclo de vencimento do boleto.
 *
 * Cadência Automatex:
 * - D-3: 3 dias ANTES do vencimento (Lembrete)
 * - D-0: NO DIA do vencimento (Aviso)
 * - D+3: 3 dias APÓS vencido (Cobrança)
 * - D+5: 5 dias APÓS vencido (AVISO DE CARTÓRIO)
 *
 * @author Automatex
 */

class CadenciaCobranca {
  constructor() {
    // Cadência: apenas títulos VENCIDOS
    // - D+1: 1 dia de atraso  → template 1_apos_3dias (com boleto PDF)
    // - D+3: 3 dias de atraso → template 2_apos_3dias (com boleto PDF)
    // - D+5: 5 dias de atraso → template 3_apo_5dias  (sem boleto)
    //
    // OBS: diasParaVencimento é negativo para títulos vencidos.
    // Ex: vencido há 1 dia = diasParaVencimento = -1
    this.cadenciaPadrao = [
      { dias: -1, tipo: 'atraso_1', prioridade: 'media',   template: '1_apos_3dias', precisaDocumento: true  },
      { dias: -3, tipo: 'atraso_3', prioridade: 'alta',    template: '2_apos_3dias', precisaDocumento: true  },
      { dias: -5, tipo: 'cartorio', prioridade: 'urgente', template: '3_apo_5dias',  precisaDocumento: false }
    ];
  }

  /**
   * Define uma cadência customizada
   *
   * @param {Array} cadencia - Array de objetos com configuração da cadência
   * @example
   * [
   *   { dias: -5, tipo: 'lembrete', prioridade: 'baixa' },
   *   { dias: 0, tipo: 'vencimento', prioridade: 'media' }
   * ]
   */
  definirCadencia(cadencia) {
    this.cadenciaPadrao = cadencia;
  }

  /**
   * Verifica se um título deve receber mensagem hoje
   *
   * @param {number} diasParaVencimento - Dias até vencimento (negativo se vencido)
   * @returns {Object|null} Configuração da cadência ou null se não deve enviar
   */
  verificarEnvio(diasParaVencimento) {
    const etapa = this.cadenciaPadrao.find(e => e.dias === diasParaVencimento);
    return etapa || null;
  }

  /**
   * Gera mensagem personalizada baseada no template e dados do título
   *
   * @param {Object} titulo - Dados do título enriquecido com parceiro
   * @param {number} diasParaVencimento - Dias até vencimento
   * @returns {Object} Objeto com mensagem e metadados
   */
  gerarMensagem(titulo, diasParaVencimento) {
    const etapa = this.verificarEnvio(diasParaVencimento);

    if (!etapa) {
      return null;
    }

    const template = this.templates[etapa.tipo];

    if (!template) {
      throw new Error(`Template '${etapa.tipo}' não encontrado`);
    }

    const mensagem = template.call(this, titulo);

    return {
      mensagem,
      tipo: etapa.tipo,
      prioridade: etapa.prioridade,
      diasParaVencimento,
      destinatario: {
        nome: titulo.parceiro?.nome || 'Cliente',
        whatsapp: titulo.parceiro?.whatsapp || titulo.parceiro?.celular,
        telefone: titulo.parceiro?.telefone
      },
      titulo: {
        numero: titulo.NUFIN,
        valor: titulo.VLRDESDOB,
        vencimento: titulo.DTVENC,
        nossoNumero: titulo.NOSSONUM
      }
    };
  }

  /**
   * Template: Lembrete (3 dias antes do vencimento)
   */
  templateLembrete(titulo) {
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;

    return `Olá! Tudo bem? 😊 Aqui é a Alice da LC Baterias.

Passando para lembrar que seu boleto referente a NF. ${nfNumero}, com vencimento em ${vencimento}, está próximo do vencimento.

Segue aqui para facilitar seu planejamento.`;
  }

  /**
   * Template: Vencimento hoje
   */
  templateVencimento(titulo) {
    return `Olá! 😊

Este é um lembrete de que o boleto do seu pedido vence hoje.

Caso já tenha efetuado o pagamento, por favor desconsiderar esta mensagem.

Tenha um ótimo dia!`;
  }

  /**
   * Template: Vencido (3 dias após vencimento)
   */
  templateVencido(titulo) {
    const vencimento = titulo.DTVENC;

    return `Olá! Tudo bem?

Consta em nosso sistema que o boleto vencido em ${vencimento} permanece pendente.

Por gentileza, pedimos a regularização imediata. Estamos à disposição caso precise de suporte.`;
  }

  /**
   * Template: Aviso de envio para cartório (5 dias vencido)
   */
  templateCartorio(titulo) {
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;

    return `Prezado(a) cliente,

O boleto referente ao pedido ${nfNumero}, vencido em ${vencimento}, continua em aberto há 5 dias.

Informamos que, conforme nossa política, o título será encaminhado para protesto em cartório caso o pagamento não seja identificado ainda hoje.

Pedimos o pagamento imediato ou envio do comprovante caso já tenha efetuado o pagamento, por gentileza.`;
  }

  /**
   * Formata valor monetário
   */
  formatarValor(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Gera relatório de envios programados
   *
   * @param {Array} titulos - Lista de títulos enriquecidos
   * @returns {Array} Lista de mensagens a serem enviadas
   */
  gerarRelatorioEnvios(titulos) {
    const envios = [];

    for (const titulo of titulos) {
      // Calcular dias para vencimento
      const diasParaVencimento = this.calcularDiasVencimento(titulo.DTVENC);

      // Verificar se deve enviar mensagem
      const etapa = this.verificarEnvio(diasParaVencimento);

      if (etapa) {
        const mensagem = this.gerarMensagem(titulo, diasParaVencimento);

        if (mensagem) {
          envios.push(mensagem);
        }
      }
    }

    return envios;
  }

  /**
   * Obtém o período de datas para buscar títulos de um estágio específico
   *
   * @param {string} estagio - Nome do estágio (lembrete, vencimento, atraso, cartorio)
   * @returns {Object} Objeto com dataInicio e dataFim
   */
  obterPeriodoEstagio(estagio) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Mapear estágios para dias
    // ATENÇÃO: O sinal é INVERTIDO do que parece!
    // Para buscar títulos que VENCEM em 3 dias, precisamos somar +3
    // Para buscar títulos VENCIDOS há 3 dias, precisamos subtrair -3
    const mapeamento = {
      'atraso_1': -1,  // Títulos VENCIDOS há 1 dia (hoje - 1)
      'atraso_3': -3,  // Títulos VENCIDOS há 3 dias (hoje - 3)
      'cartorio': -5   // Títulos VENCIDOS há 5 dias (hoje - 5)
    };

    const dias = mapeamento[estagio];

    if (dias === undefined) {
      throw new Error(`Estágio '${estagio}' não reconhecido`);
    }

    // Calcular a data alvo (data de vencimento dos títulos que queremos buscar)
    const dataAlvo = new Date(hoje);
    dataAlvo.setDate(dataAlvo.getDate() + dias);

    // Retornar mesmo dia como início e fim (busca exata)
    return {
      dataInicio: new Date(dataAlvo),
      dataFim: new Date(dataAlvo)
    };
  }

  /**
   * Calcula dias até vencimento
   */
  calcularDiasVencimento(dataVencimento) {
    const vencimento = typeof dataVencimento === 'string'
      ? this.parsearDataSankhya(dataVencimento)
      : dataVencimento;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    vencimento.setHours(0, 0, 0, 0);

    const diffTime = vencimento - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Parseia data do formato Sankhya
   */
  parsearDataSankhya(dataStr) {
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(ano, mes - 1, dia);
  }

  /**
   * Filtra títulos que devem receber mensagem hoje
   *
   * @param {Array} titulos - Lista de títulos enriquecidos
   * @returns {Array} Títulos que devem receber mensagem
   */
  filtrarTitulosParaEnvio(titulos) {
    return titulos.filter(titulo => {
      const diasParaVencimento = this.calcularDiasVencimento(titulo.DTVENC);
      return this.verificarEnvio(diasParaVencimento) !== null;
    });
  }

  /**
   * Agrupa mensagens por prioridade
   *
   * @param {Array} mensagens - Lista de mensagens geradas
   * @returns {Object} Mensagens agrupadas por prioridade
   */
  agruparPorPrioridade(mensagens) {
    return mensagens.reduce((acc, msg) => {
      const prioridade = msg.prioridade || 'media';

      if (!acc[prioridade]) {
        acc[prioridade] = [];
      }

      acc[prioridade].push(msg);

      return acc;
    }, {});
  }
}

module.exports = CadenciaCobranca;
