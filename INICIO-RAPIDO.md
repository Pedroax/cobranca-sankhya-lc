# 🚀 Início Rápido - Automação de Cobrança

## ✅ O Que Foi Criado

Você agora tem um **sistema completo de automação** que:

1. 🔍 Busca boletos no Sankhya por data de vencimento
2. 👥 Obtém dados dos clientes (nome, WhatsApp)
3. 💬 Gera mensagens personalizadas
4. 📱 Envia via WhatsApp automaticamente
5. 📊 Gera relatórios de envio

---

## 📁 Estrutura dos Arquivos

```
sankhya/
├── SankhyaAPI.js                    # ✅ Classe de integração com Sankhya
├── test-auth.js                     # ✅ Teste de autenticação
├── .env                             # ✅ Suas credenciais
│
├── automacoes/                      # 🤖 AUTOMAÇÃO DE COBRANÇA
│   ├── CobrancaBoletos.js          # Busca títulos e parceiros
│   ├── CadenciaCobranca.js         # Gerencia cadência e mensagens
│   ├── WhatsAppService.js          # Envia mensagens via WhatsApp
│   │
│   ├── exemplo-buscar-titulos.js   # 📝 Exemplo: Apenas buscar
│   ├── exemplo-cobranca-completo.js# 📝 Exemplo: Automação completa
│   └── README-AUTOMACAO.md         # 📖 Documentação detalhada
│
├── exemplos/
│   ├── exemplo-basico.js
│   └── exemplo-completo.js
│
└── GUIA-USO.md
```

---

## 🎯 Como Começar (5 Minutos)

### Passo 1: Testar Busca de Títulos

```bash
# Teste simples - NÃO envia mensagens
node automacoes/exemplo-buscar-titulos.js
```

**O que acontece:**
- ✅ Conecta na API Sankhya
- ✅ Busca títulos que vencem em 3 dias, hoje e vencidos
- ✅ Mostra dados dos parceiros
- ❌ **NÃO envia** nenhuma mensagem

### Passo 2: Executar Automação (Modo Simulação)

```bash
# Automação completa - Modo simulação (não envia mensagens)
node automacoes/exemplo-cobranca-completo.js
```

**O que acontece:**
- ✅ Busca todos os títulos da cadência
- ✅ Enriquece com dados dos parceiros
- ✅ Gera mensagens personalizadas
- ✅ Mostra exemplo de mensagem
- ❌ **NÃO envia** mensagens (modo simulação)

### Passo 3: Configurar WhatsApp

#### Opção A: Evolution API (Recomendado)

```bash
# 1. Instalar Evolution API com Docker
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  atendai/evolution-api

# 2. Acessar: http://localhost:8080

# 3. Criar instância e obter API Key

# 4. Configurar no .env:
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua-api-key-aqui
WHATSAPP_INSTANCE=instance1
```

#### Opção B: Usar Outro Serviço

Edite [WhatsAppService.js](automacoes/WhatsAppService.js) e implemente seu provedor.

### Passo 4: Ativar Envio Real

Em [exemplo-cobranca-completo.js](automacoes/exemplo-cobranca-completo.js), **descomente** o bloco de envio (linha ~120):

```javascript
// ANTES (modo simulação):
/*
const resultados = await whatsapp.enviarEmLote(mensagensFormatadas, 3000);
*/

// DEPOIS (envio ativo):
const resultados = await whatsapp.enviarEmLote(mensagensFormatadas, 3000);
```

---

## 📅 Cadência de Mensagens

A automação envia mensagens automaticamente nestes momentos:

| Quando | Dias | Mensagem |
|--------|------|----------|
| **Antes** | D-3 | "Seu boleto vence em 3 dias" |
| **Vencimento** | D-0 | "Seu boleto vence HOJE" |
| **Vencido** | D+1 | "Boleto vencido há 1 dia" |
| **Vencido** | D+3 | "Boleto vencido há 3 dias" |
| **Vencido** | D+7 | "Boleto vencido há 7 dias" |
| **Grave** | D+15 | "URGENTE - 15 dias vencido" |
| **Grave** | D+30 | "URGENTE - 30 dias vencido" |

**Para personalizar:** Edite [CadenciaCobranca.js](automacoes/CadenciaCobranca.js)

---

## 🔄 Automatizar Execução Diária

### Opção 1: Cron (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Adicionar linha (executar todo dia às 8h)
0 8 * * * cd /caminho/para/sankhya && node automacoes/exemplo-cobranca-completo.js >> logs/cobranca.log 2>&1
```

### Opção 2: Task Scheduler (Windows)

1. Abra **Agendador de Tarefas**
2. Criar Tarefa Básica
3. Nome: "Cobrança Boletos"
4. Gatilho: Diário, 8:00
5. Ação: Iniciar programa
   - Programa: `node`
   - Argumentos: `automacoes/exemplo-cobranca-completo.js`
   - Iniciar em: `C:\Users\Pedro M\Desktop\sankhya`

### Opção 3: PM2 (Recomendado para servidores)

```bash
# Instalar PM2
npm install -g pm2

# Criar arquivo ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cobranca-boletos',
    script: 'automacoes/exemplo-cobranca-completo.js',
    cron_restart: '0 8 * * *',  // Todo dia às 8h
    autorestart: false
  }]
};

# Iniciar
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📊 Exemplo de Mensagem Gerada

```
Olá, LC BATERIAS! 👋

📋 *Lembrete de Vencimento*

Gostaríamos de lembrar que você possui um boleto que vence em *3 dias*:

💰 Valor: *R$ 1.250,00*
📅 Vencimento: *22/11/2024*
🔢 Nosso Número: 123456

Se já realizou o pagamento, desconsidere esta mensagem.

Para dúvidas, estamos à disposição!
```

---

## 🎨 Personalizar Mensagens

Edite [CadenciaCobranca.js](automacoes/CadenciaCobranca.js):

```javascript
templateLembrete(titulo, dias) {
  const nome = titulo.parceiro?.nome;
  const valor = this.formatarValor(titulo.VLRDESDOB);

  // ✏️ PERSONALIZE SUA MENSAGEM AQUI
  return `Olá ${nome}!

  Seu boleto de ${valor} vence em ${Math.abs(dias)} dias.

  Adicione sua mensagem customizada aqui!`;
}
```

---

## 🔧 APIs Usadas

### API Sankhya

**Endpoints utilizados:**

1. **Autenticação:**
   ```
   POST https://api.sankhya.com.br/authenticate
   ```

2. **Buscar Títulos Financeiros:**
   ```
   POST https://api.sankhya.com.br/gateway/v1/mge/service.sbr
   Body: CRUDServiceProvider.loadRecords
   Entity: Financeiro (TGFFIN)
   ```

3. **Buscar Dados de Parceiros:**
   ```
   POST https://api.sankhya.com.br/gateway/v1/mge/service.sbr
   Body: CRUDServiceProvider.loadRecords
   Entity: Parceiro (TGFPAR)
   ```

### API WhatsApp (Evolution)

```
POST http://localhost:8080/message/sendText/instance1
Headers: { "apikey": "sua-key" }
Body: { "number": "5511999999999", "text": "mensagem" }
```

---

## ❓ Perguntas Frequentes

### Como sei se os títulos foram encontrados?

Execute o exemplo de busca:
```bash
node automacoes/exemplo-buscar-titulos.js
```

### Posso testar sem enviar mensagens?

Sim! O exemplo completo roda em **modo simulação** por padrão.

### Como adicionar mais dias na cadência?

Em [CadenciaCobranca.js](automacoes/CadenciaCobranca.js):
```javascript
this.cadenciaPadrao = [
  { dias: -5, tipo: 'lembrete', prioridade: 'baixa' },  // NOVO
  { dias: -3, tipo: 'lembrete', prioridade: 'baixa' },
  // ... resto da cadência
];
```

### E se o cliente não tiver WhatsApp cadastrado?

A automação:
1. Detecta títulos sem WhatsApp
2. Mostra lista no console
3. Pula o envio para esses clientes

### Como ver os logs?

```bash
# Redirecionar saída para arquivo
node automacoes/exemplo-cobranca-completo.js > logs/cobranca-$(date +%Y%m%d).log 2>&1
```

---

## 🆘 Precisa de Ajuda?

1. **Documentação Completa:** [README-AUTOMACAO.md](automacoes/README-AUTOMACAO.md)
2. **Teste de Autenticação:** `npm test`
3. **Buscar Títulos:** `node automacoes/exemplo-buscar-titulos.js`

---

## ✅ Checklist

- [ ] Testei autenticação (`npm test`) ✅
- [ ] Testei busca de títulos (`exemplo-buscar-titulos.js`)
- [ ] Configurei Evolution API (ou outro provedor)
- [ ] Testei em modo simulação (`exemplo-cobranca-completo.js`)
- [ ] Personalizei mensagens (se necessário)
- [ ] Ativei envio real (descomentei bloco)
- [ ] Configurei execução automática (cron/scheduler)

---

## 🎉 Pronto!

Sua automação está **100% funcional**!

Execute diariamente e economize horas de trabalho manual. 🚀

**Desenvolvido para Automatex** 🤖
