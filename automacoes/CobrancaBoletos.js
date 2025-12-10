/**
 * Automação de Cobrança de Boletos
 *
 * Este módulo gerencia o envio automático de cobranças via WhatsApp
 * baseado na data de vencimento dos boletos no Sankhya.
 *
 * Fluxo:
 * 1. Busca títulos financeiros próximos ao vencimento
 * 2. Obtém dados do parceiro (nome, telefone/WhatsApp)
 * 3. Envia mensagem via WhatsApp conforme cadência configurada
 *
 * @author Automatex
 */

const SankhyaAPI = require('../SankhyaAPI');

class CobrancaBoletos {
  /**
   * @param {SankhyaAPI} sankhyaApi - Instância autenticada da API Sankhya
   * @param {Object} whatsappApi - API de WhatsApp configurada
   */
  constructor(sankhyaApi, whatsappApi = null) {
    this.api = sankhyaApi;
    this.whatsapp = whatsappApi;
  }

  /**
   * Busca títulos financeiros (boletos) com base em filtros
   *
   * Tabela: TGFFIN (Financeiro)
   * Campos importantes:
   * - NUFIN: ID único do título
   * - CODPARC: Código do parceiro
   * - DTVENC: Data de vencimento
   * - VLRDESDOB: Valor do título
   * - RECDESP: 1 = Receita (Contas a Receber), -1 = Despesa
   * - NOSSONUM: Número do boleto
   * - PROVISAO: 'S' = Provisão (não considerar)
   * - DHBAIXA: Data/hora de baixa (null = em aberto)
   *
   * @param {Date} dataInicio - Data inicial do filtro
   * @param {Date} dataFim - Data final do filtro
   * @param {Object} opcoes - Opções adicionais de filtro
   * @returns {Promise<Array>} Lista de títulos encontrados
   */
  async buscarTitulosVencimento(dataInicio, dataFim, opcoes = {}) {
    const {
      apenasEmAberto = true,
      apenasComBoleto = true,
      apenasReceita = true
    } = opcoes;

    // Formatar datas para o padrão Sankhya (DD/MM/YYYY)
    const dataInicioStr = this.formatarDataSankhya(dataInicio);
    const dataFimStr = this.formatarDataSankhya(dataFim);

    // Construir expressão de filtro
    let expressions = [];
    let parameters = [];

    // Filtro de data de vencimento
    expressions.push('this.DTVENC BETWEEN ? AND ?');
    parameters.push(
      { $: dataInicioStr, type: 'D' },
      { $: dataFimStr, type: 'D' }
    );

    // Apenas contas a receber (RECDESP = 1)
    if (apenasReceita) {
      expressions.push('this.RECDESP = ?');
      parameters.push({ $: '1', type: 'I' });
    }

    // Apenas títulos em aberto (sem data de baixa)
    if (apenasEmAberto) {
      expressions.push('this.DHBAIXA IS NULL');
    }

    // Apenas títulos com boleto (NOSSONUM preenchido)
    if (apenasComBoleto) {
      expressions.push('this.NOSSONUM IS NOT NULL');
    }

    // Não incluir provisões
    expressions.push("(this.PROVISAO IS NULL OR this.PROVISAO <> 'S')");

    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Financeiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: {
              $: expressions.join(' AND ')
            },
            parameter: parameters
          },
          entity: {
            fieldset: {
              list: 'NUFIN,CODPARC,DTVENC,VLRDESDOB,NOSSONUM,NUMNOTA,RECDESP,DHBAIXA,PROVISAO'
            }
          }
        }
      }
    };

    try {
      const response = await this.api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestBody
      );

      return this.processarRespostaFinanceiro(response);

    } catch (error) {
      throw new Error(`Erro ao buscar títulos: ${error.message}`);
    }
  }

  /**
   * Busca dados completos de um parceiro pelo código
   *
   * Tabela: TGFPAR (Parceiros)
   * Campos importantes:
   * - CODPARC: Código do parceiro
   * - NOMEPARC: Nome/Razão Social
   * - TELEFONE: Telefone (contém fixo ou celular/WhatsApp)
   * - EMAIL: E-mail
   * - CGC_CPF: CNPJ/CPF
   *
   * Nota: Campo CELULAR não existe nesta base Sankhya.
   * O campo TELEFONE é usado para armazenar números de WhatsApp.
   *
   * @param {number} codParc - Código do parceiro
   * @returns {Promise<Object>} Dados do parceiro
   */
  async buscarDadosParceiro(codParc) {
    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPARC = ?'
            },
            parameter: [
              { $: String(codParc), type: 'I' }
            ]
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NOMEPARC,TELEFONE,EMAIL,CGC_CPF,IDENTINSCESTAD'
            }
          }
        }
      }
    };

    try {
      const response = await this.api.post(
        '/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        requestBody
      );

      const parceiros = this.processarRespostaParceiro(response);

      if (!parceiros || parceiros.length === 0) {
        throw new Error(`Parceiro ${codParc} não encontrado`);
      }

      return parceiros[0];

    } catch (error) {
      throw new Error(`Erro ao buscar parceiro ${codParc}: ${error.message}`);
    }
  }

  /**
   * Busca títulos que vencem em X dias a partir de hoje
   *
   * @param {number} diasParaVencimento - Número de dias até o vencimento
   * @returns {Promise<Array>} Lista de títulos
   */
  async buscarTitulosPorDiasVencimento(diasParaVencimento) {
    const hoje = new Date();
    const dataAlvo = new Date(hoje);
    dataAlvo.setDate(dataAlvo.getDate() + diasParaVencimento);

    // Buscar títulos que vencem no dia específico
    return this.buscarTitulosVencimento(dataAlvo, dataAlvo);
  }

  /**
   * Busca títulos vencidos
   *
   * @param {number} diasAtras - Quantos dias atrás buscar (padrão: 30 dias)
   * @returns {Promise<Array>} Lista de títulos vencidos
   */
  async buscarTitulosVencidos(diasAtras = 30) {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - diasAtras);

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    return this.buscarTitulosVencimento(dataInicio, ontem);
  }

  /**
   * Busca títulos considerando lógica de fim de semana
   *
   * Regra Automatex:
   * - Contagem de dias: CALENDÁRIO (todos os dias)
   * - Se D-3, D-0, D+3 ou D+5 cair em fim de semana,
   *   busca também os títulos que deveriam ter sido enviados
   *   no sábado/domingo para enviar na segunda
   *
   * @param {number} diasCadencia - Dias da cadência (-3, 0, 3, 5)
   * @param {Object} controleEnvios - Instância de ControleEnvios
   * @returns {Promise<Array>} Títulos que devem ser enviados HOJE
   */
  async buscarTitulosParaEnviarHoje(diasCadencia, controleEnvios) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Se hoje não é dia útil, não busca nada
    if (!controleEnvios.isDiaUtil(hoje)) {
      return [];
    }

    // Buscar títulos dos últimos 3 dias (para cobrir fim de semana)
    // Exemplo: segunda busca sábado (-2), domingo (-1) e segunda (0)
    const titulosParaAnalisar = [];

    for (let offset = -2; offset <= 0; offset++) {
      const dataAlvo = new Date(hoje);
      dataAlvo.setDate(dataAlvo.getDate() + offset - diasCadencia);

      const titulos = await this.buscarTitulosVencimento(dataAlvo, dataAlvo);
      titulosParaAnalisar.push(...titulos);
    }

    // Filtrar apenas os que devem enviar HOJE
    const titulosParaEnviar = [];

    for (const titulo of titulosParaAnalisar) {
      const vencimento = this.parsearDataSankhya(titulo.DTVENC);
      const infoEnvio = controleEnvios.calcularDiaEnvio(vencimento, diasCadencia);

      // Se a data real de envio é hoje, inclui
      const dataEnvioReal = infoEnvio.dataEnvioReal;
      dataEnvioReal.setHours(0, 0, 0, 0);

      if (dataEnvioReal.getTime() === hoje.getTime()) {
        titulosParaEnviar.push({
          ...titulo,
          infoEnvio
        });
      }
    }

    return titulosParaEnviar;
  }

  /**
   * Processa títulos e busca dados dos parceiros
   *
   * @param {Array} titulos - Lista de títulos financeiros
   * @returns {Promise<Array>} Títulos enriquecidos com dados do parceiro
   */
  async enriquecerTitulosComParceiros(titulos) {
    const titulosEnriquecidos = [];

    for (const titulo of titulos) {
      try {
        const parceiro = await this.buscarDadosParceiro(titulo.CODPARC);

        titulosEnriquecidos.push({
          ...titulo,
          parceiro: {
            codigo: parceiro.CODPARC,
            nome: parceiro.NOMEPARC,
            telefone: parceiro.TELEFONE,
            whatsapp: parceiro.TELEFONE, // TELEFONE contém o WhatsApp
            email: parceiro.EMAIL,
            documento: parceiro.CGC_CPF
          }
        });

      } catch (error) {
        console.warn(`Aviso: Não foi possível buscar dados do parceiro ${titulo.CODPARC}: ${error.message}`);

        // Adiciona título mesmo sem dados do parceiro
        titulosEnriquecidos.push({
          ...titulo,
          parceiro: null,
          erro: error.message
        });
      }
    }

    return titulosEnriquecidos;
  }

  /**
   * Formata data para o padrão Sankhya (DD/MM/YYYY)
   *
   * @param {Date} data - Data a ser formatada
   * @returns {string} Data formatada
   */
  formatarDataSankhya(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Formata valor monetário para exibição
   *
   * @param {number} valor - Valor numérico
   * @returns {string} Valor formatado (R$ 1.234,56)
   */
  formatarValor(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Processa resposta da API para títulos financeiros
   *
   * @param {Object} response - Resposta da API
   * @returns {Array} Lista de títulos processados
   */
  processarRespostaFinanceiro(response) {
    if (!response.responseBody || !response.responseBody.entities) {
      return [];
    }

    const entities = response.responseBody.entities;

    if (!entities.entity || !Array.isArray(entities.entity)) {
      return [];
    }

    // Processar array de entidades
    return entities.entity.map(item => {
      const result = {};
      const metadata = entities.metadata?.fields?.field || [];

      // Mapear f0, f1, f2... para os nomes dos campos
      metadata.forEach((field, index) => {
        const fieldKey = `f${index}`;
        if (item[fieldKey]) {
          result[field.name] = item[fieldKey].$ || item[fieldKey];
        }
      });

      return result;
    });
  }

  /**
   * Processa resposta da API para parceiros
   *
   * @param {Object} response - Resposta da API
   * @returns {Array} Lista de parceiros processados
   */
  processarRespostaParceiro(response) {
    if (!response.responseBody || !response.responseBody.entities) {
      return [];
    }

    const entities = response.responseBody.entities;

    if (!entities.entity) {
      return [];
    }

    const metadata = entities.metadata?.fields?.field || [];

    // A API retorna objeto único quando é 1 resultado, array quando é múltiplo
    const items = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

    // Processar entidades
    return items.map(item => {
      const result = {};

      // Mapear f0, f1, f2... para os nomes dos campos
      metadata.forEach((field, index) => {
        const fieldKey = `f${index}`;
        if (item[fieldKey]) {
          result[field.name] = item[fieldKey].$ || item[fieldKey];
        }
      });

      return result;
    });
  }

  /**
   * Calcula dias até o vencimento
   *
   * @param {string|Date} dataVencimento - Data de vencimento
   * @returns {number} Número de dias (negativo se vencido)
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
   * Converte data do formato Sankhya (DD/MM/YYYY) para Date
   *
   * @param {string} dataStr - Data em formato DD/MM/YYYY
   * @returns {Date} Objeto Date
   */
  parsearDataSankhya(dataStr) {
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(ano, mes - 1, dia);
  }
}

module.exports = CobrancaBoletos;
