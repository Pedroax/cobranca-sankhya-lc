/**
 * Gerador de Boletos Itaú em PDF - Layout EXATO do Sankhya
 *
 * Replica pixel-perfect o layout do JRXML Boleto_Hibrido_itau.jrxml
 *
 * @author Automatex
 */

const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class BoletoItauPDFGenerator {
  constructor() {
    // Dimensões da página A4 em pontos (72 pontos = 1 polegada)
    this.pageWidth = 595;
    this.pageHeight = 842;

    // Margens do boleto (para afastar das bordas da página)
    this.margemEsquerda = 20;

    // Cores
    this.azulItau = '#003D7A';
    this.preto = '#000000';
    this.cinza = '#666666';
  }

  /**
   * Gera o PDF do boleto
   */
  async gerarBoleto(dadosTitulo, dadosParceiro, caminhoSaida) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        const stream = doc.pipe(fs.createWriteStream(caminhoSaida));

        // Margem superior para afastar do topo da página
        const margemSuperior = 15;

        // Desenhar recibo do sacado (via superior - com margem)
        await this.desenharVia(doc, dadosTitulo, dadosParceiro, margemSuperior, true);

        // Calcular posição da linha tracejada e ficha baseado no JRXML
        // No JRXML: recibo termina em y=276, linha em y=284 (+8), ficha em y=289 (+5)
        // Recibo vai de 0 a 276 no JRXML
        // Com margemSuperior=15, termina em 15+276=291
        const fimRecibo = margemSuperior + 276;
        const yLinhaCorte = fimRecibo + 8;
        const yFicha = yLinhaCorte + 5;

        // Desenhar linha pontilhada de corte
        this.desenharLinhaDeCorte(doc, yLinhaCorte);

        // Desenhar ficha de compensação (via inferior)
        await this.desenharVia(doc, dadosTitulo, dadosParceiro, yFicha, false);

        doc.end();

        stream.on('finish', () => resolve(caminhoSaida));
        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Desenha uma via do boleto (recibo ou ficha de compensação)
   */
  async desenharVia(doc, titulo, parceiro, offsetY, isRecibo) {
    // No JRXML, os elementos começam em diferentes posições Y
    // Recibo: y começa em ~0
    // Ficha: y começa em ~380 (aprox, calculado pela diferença entre as vias)

    const baseY = offsetY;

    // Logo Itaú + cabeçalho
    await this.desenharCabecalho(doc, baseY, titulo, isRecibo);

    // Campos do boleto (baseado nas coordenadas do JRXML)
    this.desenharCamposBoleto(doc, baseY + 33, titulo, parceiro, isRecibo);

    // Se é ficha de compensação, desenhar código de barras e PIX
    if (!isRecibo) {
      await this.desenharRodapeFicha(doc, baseY, titulo, parceiro);
    }
  }

  /**
   * Desenha o cabeçalho com logo
   */
  async desenharCabecalho(doc, baseY, titulo, isRecibo) {
    // Logo Itaú (x=5, y=1, w=90, h=30 no JRXML)
    const logoPath = path.join(__dirname, 'logo-itau.png');
    const logoX = this.margemEsquerda + 5;
    const logoY = baseY - 2;

    // Tentar carregar logo real
    if (fs.existsSync(logoPath)) {
      try {
        // Logo conforme JRXML: x=5, y=1, width=90, height=30
        // Como a logo é quadrada, vamos usar 35x35 para ficar proporcional
        doc.image(logoPath, logoX, logoY, { height: 35, width: 35 });
      } catch (error) {
        console.error('⚠️  Erro ao carregar logo:', error.message);
        // Fallback: desenhar retângulo azul com texto
        doc.rect(logoX, logoY, 35, 35)
           .fillAndStroke(this.azulItau, this.azulItau);
        doc.fillColor('#FF6600')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Itaú', logoX + 5, logoY + 11);
      }
    }

    // Nome do banco (conforme JRXML) - alinhado com a logo
    const y = baseY + 20;
    const m = this.margemEsquerda;

    doc.fillColor(this.preto)
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('ITAÚ UNIBANCO S/A', m + 90, y);

    doc.fontSize(10).text('|', m + 195, y);
    doc.fontSize(10).text('341-7', m + 205, y);
    doc.fontSize(10).text('|', m + 240, y);

    // Se é ficha de compensação, mostrar linha digitável
    if (!isRecibo && titulo.LINHADIGITAVEL) {
      doc.fontSize(9)
         .font('Helvetica')
         .text(this.formatarLinhaDigitavel(titulo.LINHADIGITAVEL), m + 250, y);
    }

    // Texto "RECIBO DO SACADO" (só no recibo)
    if (isRecibo) {
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .text('RECIBO DO SACADO', m + 380, y, { width: 150, align: 'right' });
    }
  }

  /**
   * Desenha todos os campos do boleto baseado nas coordenadas JRXML
   */
  desenharCamposBoleto(doc, baseY, titulo, parceiro, isRecibo) {
    const m = this.margemEsquerda;

    // LINHA 1: Local de Pagamento (x=6, y=33, w=431, h=24) | Vencimento (x=437, y=33, w=95, h=24)
    this.desenharRetangulo(doc, m + 6, baseY, 431, 24);
    this.desenharTexto(doc, 'Local do Pagamento:', m + 10, baseY + 3, 8);
    this.desenharTexto(doc, 'ATÉ O VENCIMENTO PAGÁVEL EM QUALQUER BANCO', m + 10, baseY + 12, 8);

    this.desenharRetangulo(doc, m + 437, baseY, 95, 24);
    this.desenharTexto(doc, 'Vencimento:', m + 439, baseY + 3, 8);
    const dataVenc = this.formatarData(titulo.DTVENC);
    if (dataVenc) {
      this.desenharTexto(doc, dataVenc, m + 439, baseY + 12, 8, 'right', 90);
    }

    // LINHA 2: Cedente/Sacado (x=6, y=57, w=431, h=24) | Agência/Código (x=437, y=57, w=95, h=24)
    const yLinha2 = baseY + 24;
    this.desenharRetangulo(doc, m + 6, yLinha2, 431, 24);
    this.desenharTexto(doc, 'Cedente/Sacado:', m + 10, yLinha2 + 3, 7);
    const cedente = titulo.RAZEMP || 'BSB DISTRIBUIDORA DE BATERIAS LTDA';
    this.desenharTexto(doc, cedente, m + 10, yLinha2 + 12, 8);

    this.desenharRetangulo(doc, m + 437, yLinha2, 95, 24);
    this.desenharTexto(doc, 'Agência/Código Cedente', m + 439, yLinha2 + 3, 7);
    const agenciaCodigo = this.extrairAgenciaCodigo(titulo);
    this.desenharTexto(doc, agenciaCodigo, m + 439, yLinha2 + 12, 8, 'center', 93);

    // LINHA 3: Data Doc (108) | Num Doc (108) | Esp (108) | Aceite (32) | Data Proc (93) | Nosso Num (95)
    const yLinha3 = baseY + 48;

    // Data do Documento (x=6, w=108)
    this.desenharRetangulo(doc, m + 6, yLinha3, 108, 25);
    this.desenharTexto(doc, 'Data do Documento', m + 7, yLinha3 + 2, 7);
    this.desenharTexto(doc, this.formatarData(titulo.DTNEG || new Date()), m + 7, yLinha3 + 13, 8);

    // Número do Documento (x=114, w=108)
    this.desenharRetangulo(doc, m + 114, yLinha3, 108, 25);
    this.desenharTexto(doc, 'Número do Documento', m + 115, yLinha3 + 2, 7);
    const numDoc = titulo.NUMNOTA ? `${titulo.NUMNOTA} - 1` : '';
    this.desenharTexto(doc, numDoc, m + 115, yLinha3 + 13, 8);

    // Espécie Doc (x=222, w=90)
    this.desenharRetangulo(doc, m + 222, yLinha3, 90, 25);
    this.desenharTexto(doc, 'Esp.Doc.', m + 223, yLinha3 + 2, 7, 'center', 82);
    this.desenharTexto(doc, 'DP', m + 223, yLinha3 + 13, 8, 'center', 82);

    // Aceite (x=312, w=32)
    this.desenharRetangulo(doc, m + 312, yLinha3, 32, 25);
    this.desenharTexto(doc, 'Aceite', m + 312, yLinha3 + 2, 7, 'center', 32);
    this.desenharTexto(doc, 'N', m + 312, yLinha3 + 13, 8, 'center', 32);

    // Data Processamento (x=344, w=93)
    this.desenharRetangulo(doc, m + 344, yLinha3, 93, 25);
    this.desenharTexto(doc, 'Data Processamento', m + 346, yLinha3 + 2, 7);
    this.desenharTexto(doc, this.formatarData(new Date()), m + 346, yLinha3 + 13, 8);

    // Nosso Número (x=437, w=95)
    this.desenharRetangulo(doc, m + 437, yLinha3, 95, 25);
    this.desenharTexto(doc, 'Nosso Número', m + 439, yLinha3 + 3, 7);
    this.desenharTexto(doc, titulo.NOSSONUM || '', m + 439, yLinha3 + 13, 8);

    // LINHA 4: Uso Banco + subcampos | Valor do Documento
    const yLinha4 = baseY + 73;

    // Uso do Banco - Carteira (x=6, w=108)
    this.desenharRetangulo(doc, m + 6, yLinha4, 108, 24);
    this.desenharTexto(doc, 'Uso do Banco', m + 7, yLinha4 + 3, 7);

    // Subcampos
    this.desenharRetangulo(doc, m + 114, yLinha4, 54, 24);
    this.desenharTexto(doc, 'Carteira', m + 116, yLinha4 + 3, 7);
    this.desenharTexto(doc, '109', m + 116, yLinha4 + 12, 8);

    this.desenharRetangulo(doc, m + 167, yLinha4, 55, 24);
    this.desenharTexto(doc, 'Espécie', m + 169, yLinha4 + 3, 7, 'center', 41);

    this.desenharRetangulo(doc, m + 222, yLinha4, 123, 24);
    this.desenharTexto(doc, 'Quantidade', m + 223, yLinha4 + 3, 7);

    this.desenharRetangulo(doc, m + 344, yLinha4, 93, 24);
    this.desenharTexto(doc, 'Valor', m + 347, yLinha4 + 3, 7);

    // (=) Valor do Documento
    this.desenharRetangulo(doc, m + 437, yLinha4, 95, 24);
    this.desenharTexto(doc, '(=) Valor do Documento', m + 439, yLinha4 + 3, 7);
    this.desenharTexto(doc, this.formatarValor(titulo.VLRDESDOB), m + 439, yLinha4 + 12, 8, 'right', 90);

    // INSTRUÇÕES + CAMPOS LATERAIS
    const yInstrucoes = baseY + 97;

    // Instruções (x=6, y=130, w=431, h=96)
    this.desenharRetangulo(doc, m + 6, yInstrucoes, 431, 96);
    const instrucoes = this.gerarInstrucoes(titulo);
    this.desenharTextoMultiline(doc, instrucoes, m + 10, yInstrucoes + 3, 8, 425);

    // Campos laterais
    this.desenharRetangulo(doc, m + 437, yInstrucoes, 95, 24);
    this.desenharTexto(doc, '(-) Desconto/Abatimento', m + 439, yInstrucoes + 3, 7);

    this.desenharRetangulo(doc, m + 437, yInstrucoes + 24, 95, 24);
    this.desenharTexto(doc, '(+) Mora/Multa', m + 439, yInstrucoes + 27, 7);

    this.desenharRetangulo(doc, m + 437, yInstrucoes + 48, 95, 24);
    this.desenharTexto(doc, '(+) Outros Acréscimos', m + 439, yInstrucoes + 51, 7);

    this.desenharRetangulo(doc, m + 437, yInstrucoes + 72, 95, 24);
    this.desenharTexto(doc, '(=) Valor Cobrado', m + 439, yInstrucoes + 75, 7);
    this.desenharTexto(doc, this.formatarValor(titulo.VLRDESDOB), m + 439, yInstrucoes + 84, 8, 'right', 90);

    // SACADO e AUTENTICAÇÃO só no recibo (na ficha eles são desenhados no rodapé)
    if (isRecibo) {
      // SACADO (x=6, y=226, w=526, h=38)
      const ySacado = baseY + 193;
      this.desenharRetangulo(doc, m + 6, ySacado, 526, 38);
      const dadosSacado = this.formatarDadosSacado(parceiro);
      this.desenharTextoMultiline(doc, dadosSacado, m + 10, ySacado + 3, 6, 520, 0, false);

      // Autenticação (x=6, y=264, w=526, h=12)
      const yAutenticacao = baseY + 231;
      this.desenharRetangulo(doc, m + 6, yAutenticacao, 526, 12);
      this.desenharTexto(doc, 'Autenticação', m + 435, yAutenticacao + 3, 8, 'right', 96);
    }
  }

  /**
   * Desenha rodapé da ficha de compensação (Sacado + PIX + Autenticação + Código de Barras)
   * Baseado no JRXML:
   * - Sacado: y=514, height=38
   * - PIX área: y=552, height=107
   * - Autenticação: y=659, height=12
   */
  async desenharRodapeFicha(doc, baseY, titulo, parceiro) {
    const m = this.margemEsquerda;

    // SACADO (y=514 no JRXML, height=38)
    const ySacado = baseY + 225;
    this.desenharRetangulo(doc, m + 6, ySacado, 526, 38);
    const dadosSacado = this.formatarDadosSacado(parceiro);
    // Usar EXATAMENTE os mesmos parâmetros do Sacado de cima que está correto
    this.desenharTextoMultiline(doc, dadosSacado, m + 10, ySacado + 3, 6, 520, 0, false);

    // ÁREA PIX + QR CODE (y=552 no JRXML, height=107)
    const yPixArea = ySacado + 38;
    this.desenharRetangulo(doc, m + 6, yPixArea, 526, 107);

    if (titulo.EMVPIX) {
      // Código PIX na linha de cima (sozinho, em 1 linha inteira)
      // Usar Courier-Bold 5.3pt com width 510 e forçar 1 linha
      doc.fontSize(5.3)
         .fillColor(this.preto)
         .font('Courier-Bold')
         .text(titulo.EMVPIX, m + 10, yPixArea + 6, { width: 510, lineBreak: false, ellipsis: false });

      // Texto "PIX Copia e Cola" embaixo à esquerda
      this.desenharTexto(doc, 'PIX Copia e Cola', m + 10, yPixArea + 25, 8);

      // QR Code embaixo à direita
      try {
        const qrBuffer = await QRCode.toBuffer(titulo.EMVPIX, {
          width: 65,
          margin: 0,
          errorCorrectionLevel: 'M'
        });

        doc.image(qrBuffer, m + 440, yPixArea + 25, { width: 65, height: 65 });
      } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error.message);
      }
    }

    // AUTENTICAÇÃO (y=659 no JRXML, height=12)
    const yAutenticacao = yPixArea + 107;
    this.desenharRetangulo(doc, m + 6, yAutenticacao, 526, 12);
    this.desenharTexto(doc, 'Autenticação', m + 430, yAutenticacao + 3, 8, 'right', 96);

    // CÓDIGO DE BARRAS (descer mais para não ficar em cima da linha)
    const yBarcode = yAutenticacao + 15;
    await this.desenharCodigoBarras(doc, titulo.LINHADIGITAVEL, yBarcode);
  }

  /**
   * Desenha código de barras
   */
  async desenharCodigoBarras(doc, linhaDigitavel, y) {
    try {
      const codigoBarra = this.linhaDigitavelParaCodigoBarras(linhaDigitavel);

      if (!codigoBarra) {
        throw new Error('Código de barras não disponível');
      }

      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: 'interleaved2of5',
        text: codigoBarra,
        scale: 1,
        height: 10,
        includetext: false,
        paddingwidth: 0,
        paddingheight: 0
      });

      // Menor e mais fino, alinhado à esquerda
      const m = this.margemEsquerda;
      doc.image(barcodeBuffer, m + 6, y, { width: 400, height: 30 });

    } catch (error) {
      console.error('❌ Erro ao gerar código de barras:', error.message);
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Desenha linha pontilhada de corte
   */
  desenharLinhaDeCorte(doc, y) {
    doc.save();

    // Desenhar linha pontilhada alinhada com as bordas dos retângulos
    // No JRXML: x=5, width=525
    const m = this.margemEsquerda;
    const inicio = m + 5;
    const fim = m + 5 + 525;

    doc.dash(3, { space: 3 })
       .strokeColor('#000000')
       .lineWidth(1)
       .moveTo(inicio, y)
       .lineTo(fim, y)
       .stroke();

    doc.restore();
  }

  /**
   * Desenha retângulo
   */
  desenharRetangulo(doc, x, y, width, height) {
    doc.rect(x, y, width, height)
       .lineWidth(0.5) // Linha mais fina
       .strokeColor('#999999') // Cinza bem mais claro
       .stroke();
  }

  /**
   * Desenha texto simples
   */
  desenharTexto(doc, texto, x, y, fontSize, align = 'left', width = null) {
    doc.fontSize(fontSize)
       .fillColor(this.preto)
       .font('Helvetica')
       .text(texto, x, y, {
         width: width || undefined,
         align: align,
         lineBreak: false
       });
  }

  /**
   * Desenha texto multilinha
   */
  desenharTextoMultiline(doc, texto, x, y, fontSize, width, lineGap = 2, lineBreak = true) {
    doc.fontSize(fontSize)
       .fillColor(this.preto)
       .font('Helvetica')
       .text(texto, x, y, {
         width: width,
         lineBreak: lineBreak,
         lineGap: lineGap
       });
  }

  /**
   * Converte linha digitável para código de barras
   */
  linhaDigitavelParaCodigoBarras(linhaDigitavel) {
    if (!linhaDigitavel) return null;

    const limpa = linhaDigitavel.replace(/[\s.]/g, '');
    if (limpa.length !== 47) return null;

    const banco = limpa.substring(0, 3);
    const moeda = limpa.substring(3, 4);
    const campo1 = limpa.substring(4, 9);
    const campo2 = limpa.substring(10, 20);
    const campo3 = limpa.substring(21, 31);
    const dv = limpa.substring(32, 33);
    const fatorVenc = limpa.substring(33, 37);
    const valor = limpa.substring(37, 47);

    return banco + moeda + dv + fatorVenc + valor + campo1 + campo2 + campo3;
  }

  /**
   * Formata linha digitável
   */
  formatarLinhaDigitavel(linha) {
    if (!linha) return '';

    const limpa = linha.replace(/[\s.]/g, '');
    if (limpa.length === 47) {
      return `${limpa.substring(0, 5)}.${limpa.substring(5, 10)} ` +
             `${limpa.substring(10, 15)}.${limpa.substring(15, 21)} ` +
             `${limpa.substring(21, 26)}.${limpa.substring(26, 32)} ` +
             `${limpa.substring(32, 33)} ${limpa.substring(33)}`;
    }
    return linha;
  }

  /**
   * Formata data DD/MM/YYYY
   */
  formatarData(data) {
    if (!data) return '';

    // Se já veio formatada como DD/MM/YYYY, retornar direto
    if (typeof data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return data;
    }

    // Converter data do Sankhya (DD/MM/YYYY) para Date
    if (typeof data === 'string' && data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      const d = new Date(ano, mes - 1, dia);
      if (!isNaN(d.getTime())) {
        return data; // Retornar original se já está no formato correto
      }
    }

    // Caso seja Date object
    const d = new Date(data);
    if (isNaN(d.getTime())) return '';

    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();

    return `${dia}/${mes}/${ano}`;
  }

  /**
   * Formata valor monetário
   */
  formatarValor(valor) {
    if (valor === null || valor === undefined) return '';

    const num = typeof valor === 'string' ? parseFloat(valor) : valor;

    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  /**
   * Extrai agência e código cedente
   */
  extrairAgenciaCodigo(titulo) {
    const agencia = titulo.CODAGE || titulo.AGENCIA || '6557';
    const conta = titulo.CODCTABCOINT || titulo.CONTA || '109185';
    return `${agencia}       /       ${conta}`;
  }

  /**
   * Gera instruções
   */
  gerarInstrucoes(titulo) {
    const instrucoes = [];

    // Calcular multa e juros conforme JRXML original
    // Multa: 2% do valor do documento
    // Juros: 0,16% do valor do documento por dia
    const vlrDocumento = parseFloat(titulo.VLRDESDOB || 0);
    const vlrMulta = vlrDocumento * 0.02;
    const vlrJurosDia = (vlrDocumento * 0.16) / 100;

    // Formatar conforme template JRXML
    instrucoes.push(`- APOS VENCIMENTO COBRAR MULTA DE R$ ${this.formatarValor(vlrMulta)}.`);
    instrucoes.push(`- APOS VENCIMENTO COBRAR JUROS DE R$ ${this.formatarValor(vlrJurosDia)} POR DIA DE ATRASO.`);
    instrucoes.push('- ESTE TITULO SERA PROTESTADO AUTOMATICAMENTE APOS 7 DIAS DE VENCIDO.');
    instrucoes.push('- O BOLETO SO SERA CONSIDERADO PAGO QUANDO LIQUIDADO PELO CODIGO DE BARRAS OU PELO PIX');
    instrucoes.push('QR CODE GERADO NO PROPRIO BOLETO.');

    return instrucoes.join('\n');
  }

  /**
   * Formata dados do sacado
   */
  formatarDadosSacado(parceiro) {
    if (!parceiro) return '';

    const linhas = [];

    // Linha 1: Sacado + nome (sem código do parceiro, conforme JRXML)
    const nome = parceiro.NOMEPARC || parceiro.RAZAOSOCIAL || '';
    linhas.push(`Sacado ${nome}`);

    // Linha 2: Endereço completo (conforme JRXML: endereço + número)
    // Usar presentation field Endereco_NOMEEND ou campos diretos
    const endereco = parceiro['Endereco_NOMEEND'] || parceiro.ENDERECOPARC || parceiro.NOMEND || '';
    const numero = parceiro.NUMEND || '';
    const complemento = parceiro.COMPLEMENTO || '';

    // Montar endereço conforme padrão: "ENDERECO,NUMERO"
    let enderecoCompleto = endereco;
    if (numero && endereco.indexOf(numero) === -1) {
      enderecoCompleto = `${endereco},${numero}`;
    }
    if (complemento && enderecoCompleto) {
      enderecoCompleto = `${enderecoCompleto}`;
    }

    if (enderecoCompleto) {
      linhas.push(enderecoCompleto);
    }

    // Linha 3: CEP-Cidade-UF (conforme JRXML)
    const cep = parceiro.CEP || '';

    // Usar presentation field Cidade_AD_UF ou montar manualmente
    let cidadeUf = '';
    if (parceiro['Cidade_AD_UF']) {
      cidadeUf = `${cep}-${parceiro['Cidade_AD_UF']}`;
    } else {
      const cidade = parceiro.CIDPAR || parceiro.NOMECID || '';
      const uf = parceiro.UFPAR || '';
      cidadeUf = `${cep}-${cidade}-${uf}`;
    }

    if (cidadeUf !== '--') {
      linhas.push(cidadeUf);
    }

    // Linha 4: Sacador/Avalista
    linhas.push('Sacador/Avalista');

    return linhas.join('\n');
  }
}

module.exports = BoletoItauPDFGenerator;
