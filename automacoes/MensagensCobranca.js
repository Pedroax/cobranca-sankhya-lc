/**
 * Templates de Mensagens de Cobrança - Produção
 *
 * Mensagens profissionais para envio automático via WhatsApp
 * Cadência: D-3, D-0, D+3, D+5
 *
 * @author Automatex
 */

class MensagensCobranca {

  /**
   * Lembrete: 3 dias antes do vencimento
   */
  static lembrete(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const primeiroNome = nomeCliente.split(' ')[0];
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Olá ${primeiroNome}! 😊

Tudo bem? Aqui é da *LC Baterias*.

Passando para lembrar que o boleto da *NF ${nfNumero}* vence em *${vencimento}* (daqui a 3 dias).

💰 *Valor:* ${valor}

O boleto em PDF será enviado logo abaixo para facilitar o pagamento! ⬇️

Qualquer dúvida, estamos à disposição!`;
  }

  /**
   * Aviso: Vence hoje
   */
  static vencimento(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const primeiroNome = nomeCliente.split(' ')[0];
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Olá ${primeiroNome}! 😊

Passando para avisar que o boleto da *NF ${nfNumero}* vence *hoje*.

💰 *Valor:* ${valor}

📄 Segue o boleto em PDF logo abaixo para facilitar o pagamento.

_Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem._

Tenha um ótimo dia!`;
  }

  /**
   * Cobrança: 3 dias vencido
   */
  static atraso(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const primeiroNome = nomeCliente.split(' ')[0];
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Olá ${primeiroNome},

Identificamos que o boleto da *NF ${nfNumero}*, com vencimento em *${vencimento}*, ainda consta como pendente em nosso sistema.

💰 *Valor:* ${valor}

Por gentileza, solicitamos a regularização o mais breve possível.

📄 Segue o boleto atualizado em PDF logo abaixo.

_Caso já tenha efetuado o pagamento, por favor nos envie o comprovante._

Estamos à disposição para qualquer esclarecimento!`;
  }

  /**
   * Urgente: 5 dias vencido - Aviso de cartório
   */
  static cartorio(titulo, parceiro) {
    const nomeCliente = parceiro.NOMEPARC || 'Cliente';
    const nfNumero = titulo.NUMNOTA || titulo.NUFIN;
    const vencimento = titulo.DTVENC;
    const valor = this.formatarValor(titulo.VLRDESDOB);

    return `Prezado(a) ${nomeCliente},

⚠️ *AVISO IMPORTANTE*

O boleto referente à *NF ${nfNumero}*, vencido em *${vencimento}*, permanece em aberto há 5 dias.

💰 *Valor:* ${valor}

⚠️ Informamos que, conforme nossa política comercial, o título será encaminhado para *protesto em cartório* caso o pagamento não seja identificado até o final do dia de hoje.

📄 Segue o boleto em PDF logo abaixo.

🔹 *Caso já tenha efetuado o pagamento:*
Por favor, nos envie o comprovante com urgência.

Aguardamos retorno urgente.

Atenciosamente,
*LC Baterias*`;
  }

  /**
   * Formata valor em reais
   */
  static formatarValor(valor) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}

module.exports = MensagensCobranca;
