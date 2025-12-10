/**
 * Gerador de Boleto PDF
 *
 * Como o PDF do boleto não está armazenado no Sankhya,
 * vamos gerar uma representação visual do boleto com as informações disponíveis:
 * - Linha digitável
 * - Código de barras (como texto)
 * - QR Code PIX
 * - Dados do título
 */

class GeradorBoletoPDF {

  /**
   * Gera HTML do boleto para ser convertido em PDF
   * @param {Object} titulo - Título financeiro completo
   * @returns {String} HTML do boleto
   */
  gerarHTML(titulo) {
    const hoje = new Date();
    const dataEmissao = hoje.toLocaleDateString('pt-BR');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Boleto - ${titulo.NUMNOTA}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      padding: 20px;
      background: white;
    }

    .boleto {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #000;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px dashed #000;
    }

    .header h1 {
      font-size: 16pt;
      margin-bottom: 5px;
    }

    .info-box {
      border: 1px solid #000;
      padding: 10px;
      margin-bottom: 15px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .info-label {
      font-weight: bold;
      min-width: 150px;
    }

    .linha-digitavel {
      background: #f0f0f0;
      border: 2px solid #000;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
    }

    .codigo-barras {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 10px;
      margin: 15px 0;
      text-align: center;
      font-size: 10pt;
      font-family: 'Courier New', monospace;
    }

    .pix-section {
      border: 2px solid #00a86b;
      background: #f0fff0;
      padding: 15px;
      margin-top: 20px;
      text-align: center;
    }

    .pix-section h2 {
      color: #00a86b;
      margin-bottom: 10px;
    }

    .pix-code {
      background: white;
      border: 1px solid #00a86b;
      padding: 10px;
      margin-top: 10px;
      word-break: break-all;
      font-family: 'Courier New', monospace;
      font-size: 9pt;
    }

    .instructions {
      margin-top: 20px;
      padding: 15px;
      background: #fffacd;
      border: 1px solid #000;
    }

    .instructions h3 {
      margin-bottom: 10px;
    }

    .instructions ol {
      margin-left: 20px;
    }

    .instructions li {
      margin-bottom: 5px;
    }

    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 8pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="boleto">
    <!-- Header -->
    <div class="header">
      <h1>🏦 BOLETO BANCÁRIO</h1>
      <p><strong>Banco:</strong> ${titulo.Banco_NOMEBCO || 'Banco Itaú S.A.'}</p>
    </div>

    <!-- Beneficiário -->
    <div class="info-box">
      <h3>💼 BENEFICIÁRIO (Cedente)</h3>
      <div class="info-row">
        <span class="info-label">Empresa:</span>
        <span>${titulo.Empresa_NOMEFANTASIA || 'LC BATERIAS'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Local:</span>
        <span>${titulo.CentroResultado_DESCRCENCUS || 'BRASILIA'}</span>
      </div>
    </div>

    <!-- Pagador -->
    <div class="info-box">
      <h3>👤 PAGADOR (Sacado)</h3>
      <div class="info-row">
        <span class="info-label">Nome:</span>
        <span>${titulo.Parceiro_NOMEPARC || titulo.parceiro?.nome || ''}</span>
      </div>
      <div class="info-row">
        <span class="info-label">CNPJ/CPF:</span>
        <span>${this.formatarCpfCnpj(titulo.CGC_CPF_PARC || '')}</span>
      </div>
    </div>

    <!-- Dados do Título -->
    <div class="info-box">
      <h3>📋 DADOS DO TÍTULO</h3>
      <div class="info-row">
        <span class="info-label">Nota Fiscal:</span>
        <span>${titulo.NUMNOTA || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Número Único:</span>
        <span>${titulo.NUFIN}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Nosso Número:</span>
        <span>${titulo.NOSSONUM || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data de Emissão:</span>
        <span>${dataEmissao}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data de Vencimento:</span>
        <span><strong>${titulo.DTVENC}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Valor do Documento:</span>
        <span><strong>R$ ${titulo.VLRDESDOB}</strong></span>
      </div>
    </div>

    <!-- Linha Digitável -->
    <div class="linha-digitavel">
      🔢 LINHA DIGITÁVEL<br><br>
      ${this.formatarLinhaDigitavel(titulo.LINHADIGITAVEL)}
    </div>

    <!-- Código de Barras -->
    ${titulo.CODIGOBARRA ? `
    <div class="codigo-barras">
      <strong>Código de Barras:</strong><br>
      ${titulo.CODIGOBARRA}
    </div>
    ` : ''}

    <!-- PIX -->
    ${titulo.EMVPIX ? `
    <div class="pix-section">
      <h2>📱 PAGUE COM PIX - INSTANTÂNEO</h2>
      <p>Copie o código abaixo e cole no seu aplicativo bancário:</p>
      <div class="pix-code">${titulo.EMVPIX}</div>
      <p style="margin-top: 10px; font-size: 9pt; color: #666;">
        ✅ Aprovação instantânea | 🔒 Seguro | 💰 Mesmo valor
      </p>
    </div>
    ` : ''}

    <!-- Instruções -->
    <div class="instructions">
      <h3>📌 INSTRUÇÕES DE PAGAMENTO</h3>
      <ol>
        <li><strong>Pelo aplicativo do banco:</strong> Use a opção "Pagar com código de barras" e digite a linha digitável acima</li>
        <li><strong>Por PIX:</strong> Copie e cole o código PIX no seu app bancário para pagamento instantâneo</li>
        <li><strong>Em caixa eletrônico:</strong> Selecione "Pagamentos" e digite a linha digitável</li>
        <li><strong>Internet Banking:</strong> Acesse seu banco online e use a opção "Pagar boleto"</li>
      </ol>
      <p style="margin-top: 10px; font-weight: bold;">
        ⚠️ Após o vencimento, podem ser acrescidos juros e multa conforme legislação vigente.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Documento gerado automaticamente em ${dataEmissao}</p>
      <p>Sistema de Cobrança LC Baterias - Automatex</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Formata CPF/CNPJ
   */
  formatarCpfCnpj(valor) {
    if (!valor) return '';

    const limpo = String(valor).replace(/\D/g, '');

    if (limpo.length === 11) {
      // CPF: 000.000.000-00
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (limpo.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    return valor;
  }

  /**
   * Formata linha digitável com espaços
   */
  formatarLinhaDigitavel(linha) {
    if (!linha) return '';

    // Remove espaços extras e formata novamente
    const limpa = String(linha).replace(/\s+/g, ' ').trim();
    return limpa;
  }

  /**
   * Gera URL do boleto (data URL com HTML)
   * Pode ser usada para preview
   */
  gerarDataURL(titulo) {
    const html = this.gerarHTML(titulo);
    const base64 = Buffer.from(html).toString('base64');
    return `data:text/html;base64,${base64}`;
  }

  /**
   * Salva HTML do boleto em arquivo
   */
  async salvarHTML(titulo, caminhoArquivo) {
    const fs = require('fs').promises;
    const html = this.gerarHTML(titulo);
    await fs.writeFile(caminhoArquivo, html, 'utf-8');
    return caminhoArquivo;
  }
}

module.exports = GeradorBoletoPDF;
