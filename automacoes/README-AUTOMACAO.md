# 🤖 Automação de Cobrança de Boletos

Sistema completo de automação para envio de cobranças via WhatsApp baseado em títulos financeiros do Sankhya.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Como Funciona](#como-funciona)
3. [Instalação e Configuração](#instalação-e-configuração)
4. [Uso](#uso)
5. [Cadência de Mensagens](#cadência-de-mensagens)
6. [API WhatsApp](#api-whatsapp)
7. [Personalização](#personalização)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Esta automação realiza:

✅ **Busca automática** de títulos financeiros (boletos) no Sankhya
✅ **Filtragem inteligente** por data de vencimento
✅ **Enriquecimento** com dados do parceiro (nome, telefone, WhatsApp)
✅ **Geração de mensagens** personalizadas baseadas em cadência
✅ **Envio via WhatsApp** com suporte a múltiplos provedores
✅ **Relatórios** de envio e estatísticas

---

## ⚙️ Como Funciona

### Fluxo da Automação

```
┌─────────────────────────────────────────────────────────┐
│  1. Conectar API Sankhya                                │
│     ↓                                                    │
│  2. Buscar títulos por data de vencimento               │
│     ├─ D-3: 3 dias antes                                │
│     ├─ D-0: Hoje (vencimento)                           │
│     ├─ D+1, D+3, D+7, D+15, D+30: Vencidos              │
│     ↓                                                    │
│  3. Para cada título, buscar dados do parceiro          │
│     ├─ Nome                                             │
│     ├─ Telefone/Celular                                 │
│     └─ WhatsApp                                         │
│     ↓                                                    │
│  4. Gerar mensagem personalizada                        │
│     └─ Baseada na cadência e dias para vencimento       │
│     ↓                                                    │
│  5. Enviar via WhatsApp                                 │
│     ├─ Evolution API                                    │
│     ├─ Baileys (em desenvolvimento)                     │
│     └─ Webhook customizado                              │
│     ↓                                                    │
│  6. Gerar relatório de envios                           │
│     ├─ Total de mensagens                               │
│     ├─ Sucessos                                         │
│     └─ Falhas                                           │
└─────────────────────────────────────────────────────────┘
```

### Módulos

| Módulo | Responsabilidade |
|--------|------------------|
| **[CobrancaBoletos.js](CobrancaBoletos.js)** | Busca títulos e dados de parceiros na API Sankhya |
| **[CadenciaCobranca.js](CadenciaCobranca.js)** | Gerencia cadência e templates de mensagens |
| **[WhatsAppService.js](WhatsAppService.js)** | Integração com APIs de WhatsApp |

---

## 🚀 Instalação e Configuração

### 1. Pré-requisitos

- Node.js 16+ instalado
- Credenciais da API Sankhya configuradas no `.env`
- API de WhatsApp (Evolution API recomendada)

### 2. Configurar WhatsApp

#### Opção A: Evolution API (Recomendado)

```bash
# 1. Instalar Evolution API
# Siga: https://doc.evolution-api.com/

# 2. Configurar no .env
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua-api-key
WHATSAPP_INSTANCE=instance1
```

#### Opção B: Webhook Customizado

```bash
# No .env
WHATSAPP_API_URL=https://seu-webhook.com/send
WHATSAPP_API_KEY=sua-chave
```

### 3. Testar Conexão

```bash
# Teste 1: Buscar títulos (sem enviar mensagens)
node automacoes/exemplo-buscar-titulos.js

# Teste 2: Executar automação completa (modo simulação)
node automacoes/exemplo-cobranca-completo.js
```

---

## 📖 Uso

### Exemplo Simples: Buscar Títulos

```javascript
const SankhyaAPI = require('../SankhyaAPI');
const CobrancaBoletos = require('./CobrancaBoletos');

const api = new SankhyaAPI({ xToken, clientId, clientSecret });
const cobranca = new CobrancaBoletos(api);

// Buscar títulos que vencem em 3 dias
const titulos = await cobranca.buscarTitulosPorDiasVencimento(3);

// Buscar dados do parceiro
const parceiro = await cobranca.buscarDadosParceiro(123);

// Enriquecer títulos com dados dos parceiros
const enriquecidos = await cobranca.enriquecerTitulosComParceiros(titulos);
```

### Exemplo Completo: Automação

```bash
# Executar automação completa (modo simulação)
node automacoes/exemplo-cobranca-completo.js
```

Para ativar o **envio real**, edite o arquivo e descomente o bloco de envio.

---

## 📅 Cadência de Mensagens

### Cadência Padrão

| Momento | Dias | Tipo | Prioridade | Mensagem |
|---------|------|------|------------|----------|
| Antes | **D-3** | Lembrete | Baixa | "Seu boleto vence em 3 dias" |
| Vencimento | **D-0** | Vencimento | Média | "Seu boleto vence HOJE" |
| Vencido | **D+1** | Vencido | Alta | "Boleto vencido há 1 dia" |
| Vencido | **D+3** | Vencido | Alta | "Boleto vencido há 3 dias" |
| Vencido | **D+7** | Vencido | Alta | "Boleto vencido há 7 dias" |
| Grave | **D+15** | Vencido Grave | Urgente | "URGENTE - 15 dias vencido" |
| Grave | **D+30** | Vencido Grave | Urgente | "URGENTE - 30 dias vencido" |

### Personalizar Cadência

```javascript
const cadencia = new CadenciaCobranca();

// Definir cadência customizada
cadencia.definirCadencia([
  { dias: -5, tipo: 'lembrete', prioridade: 'baixa' },
  { dias: -1, tipo: 'lembrete', prioridade: 'media' },
  { dias: 0, tipo: 'vencimento', prioridade: 'alta' },
  { dias: 2, tipo: 'vencido', prioridade: 'urgente' }
]);
```

### Templates de Mensagem

Você pode personalizar os templates editando [CadenciaCobranca.js](CadenciaCobranca.js):

```javascript
templateLembrete(titulo, dias) {
  const nome = titulo.parceiro?.nome;
  const valor = this.formatarValor(titulo.VLRDESDOB);

  return `Olá ${nome}! Seu boleto de ${valor} vence em ${Math.abs(dias)} dias...`;
}
```

---

## 📱 API WhatsApp

### Evolution API (Recomendado)

**Vantagens:**
- ✅ Open source
- ✅ Fácil instalação
- ✅ Suporta múltiplas instâncias
- ✅ API REST completa

**Instalação:**
```bash
# Docker
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  atendai/evolution-api
```

**Configuração:**
```javascript
const whatsapp = new WhatsAppService({
  provider: 'evolution',
  apiUrl: 'http://localhost:8080',
  apiKey: 'sua-api-key',
  instanceName: 'instance1'
});
```

### Webhook Customizado

```javascript
const whatsapp = new WhatsAppService({
  provider: 'webhook',
  webhookUrl: 'https://sua-api.com/send'
});
```

O webhook receberá:
```json
{
  "numero": "5511999999999",
  "mensagem": "Texto da mensagem..."
}
```

---

## 🎨 Personalização

### 1. Modificar Campos Buscados

Em [CobrancaBoletos.js](CobrancaBoletos.js), linha ~70:

```javascript
fieldset: {
  list: 'NUFIN,CODPARC,DTVENC,VLRDESDOB,NOSSONUM,SEU_CAMPO_AQUI'
}
```

### 2. Filtros Adicionais

```javascript
// Apenas títulos acima de R$ 100
if (opcoes.valorMinimo) {
  expressions.push('this.VLRDESDOB >= ?');
  parameters.push({ $: String(opcoes.valorMinimo), type: 'F' });
}
```

### 3. Adicionar Novos Templates

Em [CadenciaCobranca.js](CadenciaCobranca.js):

```javascript
this.templates = {
  lembrete: this.templateLembrete,
  vencimento: this.templateVencimento,
  meu_template: this.meuTemplateCustomizado // NOVO
};

meuTemplateCustomizado(titulo, dias) {
  return `Sua mensagem customizada aqui...`;
}
```

---

## 🐛 Troubleshooting

### ❌ "Invalid client or Invalid client credentials"

**Causa:** Credenciais inválidas ou ambiente errado (sandbox vs production).

**Solução:**
1. Verifique as credenciais no `.env`
2. Confirme o ambiente ativo: `AMBIENTE=production`
3. Teste autenticação: `npm test`

### ❌ "Parceiro X não encontrado"

**Causa:** CODPARC não existe ou usuário sem permissão.

**Solução:**
1. Verifique se o parceiro existe no Sankhya
2. Confirme permissões do usuário de integração no SankhyaOm

### ❌ "Número pode estar em formato incorreto"

**Causa:** Telefone sem DDI ou com formatação incorreta.

**Solução:**
Os números devem estar no formato: `5511999999999`
- 55 = DDI Brasil
- 11 = DDD
- 9 dígitos do número

### ❌ Nenhum título encontrado

**Causas possíveis:**
1. Não há títulos nas datas da cadência
2. Filtros muito restritivos
3. Usuário sem permissão

**Solução:**
```bash
# Teste buscar todos os títulos em aberto
node automacoes/exemplo-buscar-titulos.js
```

### ❌ Erro ao enviar via WhatsApp

**Causas:**
1. Evolution API não está rodando
2. API key incorreta
3. Instância não conectada

**Solução:**
```bash
# Verificar status da Evolution API
curl http://localhost:8080/instance/connectionState/instance1 \
  -H "apikey: sua-api-key"
```

---

## 📊 Campos da API Sankhya

### Tabela TGFFIN (Financeiro)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| NUFIN | Número | ID único do título |
| CODPARC | Número | Código do parceiro |
| DTVENC | Data | Data de vencimento |
| VLRDESDOB | Decimal | Valor do título |
| RECDESP | Número | 1=Receita, -1=Despesa |
| NOSSONUM | Texto | Número do boleto |
| DHBAIXA | Data/Hora | Data de baixa (null=em aberto) |
| PROVISAO | Texto | 'S'=Provisão |

### Tabela TGFPAR (Parceiros)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| CODPARC | Número | Código do parceiro |
| NOMEPARC | Texto | Nome/Razão Social |
| TELEFONE | Texto | Telefone fixo |
| CELULAR | Texto | Celular/WhatsApp |
| EMAIL | Texto | E-mail |
| CGC_CPF | Texto | CNPJ/CPF |

---

## 🔒 Segurança

1. **NUNCA** commite o arquivo `.env`
2. Use `.gitignore` para proteger credenciais
3. Em produção, use variáveis de ambiente do servidor
4. Limite permissões do usuário de integração no SankhyaOm

---

## 📞 Suporte

- **Documentação Sankhya:** https://developer.sankhya.com.br
- **Evolution API:** https://doc.evolution-api.com/
- **Issues:** Reporte bugs e sugestões

---

## 📝 Licença

Desenvolvido para **Automatex** 🤖

---

**Última atualização:** 19/11/2024
