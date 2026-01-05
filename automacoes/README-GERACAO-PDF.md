# 📄 Geração de Boletos em PDF

## 🎯 Visão Geral

Este módulo implementa a **geração automática de boletos em PDF** usando Node.js, sem depender da API do MGE ou de JasperReports (que requer Java).

### Problema Resolvido

A API do Sankhya não retorna o arquivo PDF do boleto, apenas os dados. O sistema Sankhya usa templates JasperReports (.jrxml) que são processados em Java. Esta solução cria PDFs nativamente em Node.js.

## 🚀 Como Funciona

### 1. **BoletoItauPDFGenerator**
Classe que gera PDFs de boletos bancários do Itaú.

**Características:**
- Layout profissional seguindo padrão Itaú
- Código de barras gerado automaticamente
- Linha digitável formatada
- QR Code PIX (quando disponível)
- Dados completos do beneficiário e sacado
- Recibo do sacado + Ficha de compensação

**Tecnologias:**
- `pdfkit`: Geração de PDF
- `bwip-js`: Código de barras

### 2. **Fluxo de Geração**

```
1. Buscar dados completos do título
   ↓
2. Buscar dados completos do parceiro
   ↓
3. Gerar PDF do boleto
   ↓
4. Enviar via WhatsApp
```

## 📦 Instalação

As dependências já foram instaladas:

```bash
npm install pdfkit bwip-js
```

## 🧪 Testes

### Teste Básico de Geração

```bash
node automacoes/teste-gerar-boleto-pdf.js
```

Gera um PDF do boleto para o título NUFIN 19106 e salva em `temp/boleto_19106.pdf`.

### Teste de Envio Completo

```bash
node automacoes/exemplo-envio-boleto-com-pdf.js
```

Gera PDF e envia via WhatsApp (em modo teste).

## 💻 Uso Básico

### Gerar PDF de um Boleto

```javascript
const BoletoItauPDFGenerator = require('./automacoes/BoletoItauPDFGenerator');
const CobrancaBoletos = require('./automacoes/CobrancaBoletos');

// 1. Buscar dados completos
const titulo = await cobranca.buscarDadosCompletosTitulo(nufin);
const parceiro = await cobranca.buscarDadosCompletosParceiro(titulo.CODPARC);

// 2. Gerar PDF
const geradorBoleto = new BoletoItauPDFGenerator();
await geradorBoleto.gerarBoleto(titulo, parceiro, 'caminho/boleto.pdf');
```

### Enviar Boleto com PDF via WhatsApp

```javascript
const WhatsAppService = require('./automacoes/WhatsAppService');

// 1. Gerar PDF (código acima)

// 2. Enviar mensagem
await whatsapp.enviarMensagem(numero, mensagem);

// 3. Enviar PDF
await whatsapp.enviarArquivo(numero, 'caminho/boleto.pdf', {
  caption: 'Boleto - NF 12345',
  mimetype: 'application/pdf',
  fileName: 'boleto.pdf'
});
```

## 🔧 Integração com Automação

### Nova Automação com PDF

Use o arquivo `exemplo-cobranca-automatex-com-pdf.js`:

```bash
node automacoes/exemplo-cobranca-automatex-com-pdf.js
```

Este script:
1. Busca títulos conforme cadência (-3, 0, +3, +5 dias)
2. Gera PDF para cada boleto
3. Envia mensagem + PDF via WhatsApp
4. Controla duplicatas e fins de semana

### Configuração

Edite as constantes no arquivo:

```javascript
const DIAS_CADENCIA = [-3, 0, 3, 5];      // Dias da cadência
const MODO_SIMULACAO = true;              // true = teste, false = produção
```

## 📋 Campos Necessários

### Campos Obrigatórios do Título

- `LINHADIGITAVEL`: Linha digitável do boleto (47 dígitos)
- `NOSSONUM`: Nosso número
- `DTVENC`: Data de vencimento
- `VLRDESDOB`: Valor do título
- `NUMNOTA`: Número da nota fiscal

### Campos Opcionais mas Recomendados

- `CODBARRA`: Código de barras (gerado automaticamente da linha digitável se ausente)
- `EMVPIX`: QR Code PIX (copia e cola)
- `VLRJURO`: Valor de juros
- `VLRMULTA`: Valor de multa

### Campos do Parceiro

- `NOMEPARC`: Nome do cliente
- `CGC_CPF`: CPF/CNPJ
- `TELEFONE`: WhatsApp
- `CEP`, `CIDPAR`, `UFPAR`: Endereço completo

## 🎨 Layout do Boleto

O PDF gerado contém:

### Parte Superior: Recibo do Sacado
- Logo e nome do banco (Itaú)
- Linha digitável formatada
- Dados do beneficiário
- Dados do documento
- Instruções de pagamento
- Dados do sacado (pagador)

### Linha de Corte
- Separação visual com tesoura

### Parte Inferior: Ficha de Compensação
- Mesmos campos do recibo
- **Código de barras** (gerado automaticamente)
- **QR Code PIX** (se disponível)

## 🔄 Conversão Linha Digitável → Código de Barras

Quando o campo `CODBARRA` não está disponível no Sankhya, o sistema **converte automaticamente** a linha digitável:

```
Linha digitável (47 dígitos):
34191.09008 13509.016559 71091.850009 2 12750000081947

↓ Remove dígitos verificadores e reorganiza

Código de barras (44 dígitos):
34192127500000819471090013509016559710918500
```

## ⚙️ Personalização

### Alterar Layout

Edite a classe `BoletoItauPDFGenerator.js`:

```javascript
this.config = {
  cores: {
    azulItau: '#003D7A',  // Cor do cabeçalho
    // ...
  },
  fontes: {
    titulo: 10,
    normal: 8,
    // ...
  }
};
```

### Adicionar Campos

Métodos auxiliares em `BoletoItauPDFGenerator.js`:

- `desenharCampo()`: Adicionar novo campo ao boleto
- `gerarInstrucoes()`: Customizar instruções
- `formatarDadosSacado()`: Alterar formato dos dados do cliente

## 🐛 Troubleshooting

### Erro: "Código de barras não disponível"

**Causa:** Campo `CODBARRA` vazio no Sankhya e falha na conversão da linha digitável.

**Solução:** Verifique se `LINHADIGITAVEL` está preenchido e tem 47 dígitos.

### PDF gerado está vazio ou com erros

**Causa:** Falta de campos obrigatórios.

**Solução:** Execute o teste primeiro:
```bash
node automacoes/teste-gerar-boleto-pdf.js
```

Ele mostra quais campos estão ausentes.

### Erro ao enviar PDF via WhatsApp

**Causa:** Arquivo muito grande ou caminho inválido.

**Solução:**
1. Verifique se o arquivo existe em `temp/`
2. Tamanho normal: ~3-5 KB
3. Verifique permissões de leitura do arquivo

## 📊 Comparação: Antes vs Depois

### ❌ Antes (BoletoService.js com MGE)

```javascript
// Dependia de:
- Autenticação MGE separada (usuário/senha)
- Chamada ao serviço BoletoSP.buildPreVisualizacao
- Download via visualizadorArquivos.mge
- Geração server-side pelo Sankhya

// Problemas:
- Lento (múltiplas chamadas)
- Depende de servidor MGE online
- Não funciona se serviço estiver indisponível
```

### ✅ Depois (BoletoItauPDFGenerator.js)

```javascript
// Totalmente local:
- Busca dados via API Gateway (OAuth)
- Gera PDF localmente em Node.js
- Controle total sobre layout
- Rápido e independente

// Vantagens:
- Não depende do MGE
- Mais rápido
- Customizável
- Funciona offline (com dados cacheados)
```

## 🚦 Próximos Passos

### Produção

1. **Teste em Simulação:**
   ```bash
   node automacoes/exemplo-cobranca-automatex-com-pdf.js
   ```

2. **Valide os PDFs gerados** em `temp/`

3. **Ative Produção:**
   ```javascript
   const MODO_SIMULACAO = false;  // em exemplo-cobranca-automatex-com-pdf.js
   ```

4. **Automatize Execução:**
   ```bash
   # Cron (Linux/Mac) - Todo dia às 8h
   0 8 * * * cd /caminho/projeto && node automacoes/exemplo-cobranca-automatex-com-pdf.js

   # PM2 (Servidor)
   pm2 start automacoes/exemplo-cobranca-automatex-com-pdf.js --cron "0 8 * * *"

   # Agendador de Tarefas (Windows)
   # Configurar via interface gráfica
   ```

### Melhorias Futuras

- [ ] Cache de PDFs gerados
- [ ] Suporte a múltiplos bancos (não só Itaú)
- [ ] Envio de boleto por email
- [ ] Dashboard de visualização de envios
- [ ] Logs estruturados

## 📚 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `BoletoItauPDFGenerator.js` | Classe principal de geração de PDF |
| `teste-gerar-boleto-pdf.js` | Teste básico de geração |
| `exemplo-envio-boleto-com-pdf.js` | Exemplo de envio único |
| `exemplo-cobranca-automatex-com-pdf.js` | Automação completa com PDF |
| `README-GERACAO-PDF.md` | Esta documentação |

## 🆘 Suporte

### Logs de Debug

Adicione logs para debug:

```javascript
console.log('Título:', JSON.stringify(titulo, null, 2));
console.log('Parceiro:', JSON.stringify(parceiro, null, 2));
```

### Verificar Campos Disponíveis

Execute para ver TODOS os campos do título:

```bash
node automacoes/teste-buscar-nufin-19106.js
```

## ✅ Checklist de Implementação

- [x] Instalar dependências (pdfkit, bwip-js)
- [x] Criar classe BoletoItauPDFGenerator
- [x] Implementar conversão linha digitável → código de barras
- [x] Adicionar métodos de busca completa em CobrancaBoletos
- [x] Criar teste de geração de PDF
- [x] Criar exemplo de envio único
- [x] Criar automação completa com PDF
- [x] Documentar funcionalidade

---

**Desenvolvido por:** Automatex
**Data:** Dezembro 2025
**Versão:** 1.0.0
