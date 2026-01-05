# 🚀 Sistema de Cobrança Automática - PRODUÇÃO

## 📋 Visão Geral

Sistema completo de envio automático de cobranças com boleto em PDF via WhatsApp para clientes da LC Baterias.

---

## ✅ O que foi criado:

### **Arquivo Principal:**
`automacoes/envio-cobranca-producao.js`

**Funcionalidades:**
- ✅ Busca títulos automaticamente no Sankhya
- ✅ Identifica qual cliente deve receber cobrança hoje
- ✅ Gera mensagens profissionais personalizadas
- ✅ Gera PDF do boleto automaticamente
- ✅ Envia mensagem + boleto via WhatsApp
- ✅ Controla para não enviar duplicado no mesmo dia
- ✅ Registra histórico de envios

---

## 📅 Cadência de Cobrança

O sistema envia automaticamente nos seguintes momentos:

| Dias | Tipo | Mensagem |
|------|------|----------|
| **D-3** | 🔔 Lembrete | "Seu boleto vence em 3 dias" |
| **D-0** | ⏰ Vencimento | "Seu boleto vence hoje" |
| **D+3** | ⚠️ Cobrança | "Seu boleto está vencido há 3 dias" |
| **D+5** | 🚨 Cartório | "AVISO: Boleto será protestado" |

---

## 🎯 Mensagens Profissionais

### 1. **Lembrete (D-3)**
```
Olá João! 😊

Tudo bem? Aqui é da LC Baterias.

Passando para lembrar que o boleto da NF 181065
vence em 08/12/2025 (daqui a 3 dias).

💰 Valor: R$ 819,46

O boleto em PDF será enviado logo abaixo para
facilitar o pagamento! ⬇️

Qualquer dúvida, estamos à disposição!
```

### 2. **Vencimento Hoje (D-0)**
```
Olá João! 😊

Passando para avisar que o boleto da NF 181065
vence hoje.

💰 Valor: R$ 819,46

📄 Segue o boleto em PDF logo abaixo para
facilitar o pagamento.

Caso já tenha efetuado o pagamento, por favor
desconsidere esta mensagem.

Tenha um ótimo dia!
```

### 3. **Vencido (D+3)**
```
Olá João,

Identificamos que o boleto da NF 181065, com
vencimento em 08/12/2025, ainda consta como
pendente em nosso sistema.

💰 Valor: R$ 819,46

Por gentileza, solicitamos a regularização o
mais breve possível.

📄 Segue o boleto atualizado em PDF logo abaixo.

Caso já tenha efetuado o pagamento, por favor
nos envie o comprovante.

Estamos à disposição para qualquer esclarecimento!
```

### 4. **Cartório (D+5)**
```
Prezado(a) QUIXABA AUTO PECAS LTDA,

⚠️ AVISO IMPORTANTE

O boleto referente à NF 181065, vencido em
08/12/2025, permanece em aberto há 5 dias.

💰 Valor: R$ 819,46

⚠️ Informamos que, conforme nossa política
comercial, o título será encaminhado para
protesto em cartório caso o pagamento não
seja identificado até o final do dia de hoje.

📄 Segue o boleto em PDF logo abaixo.

🔹 Caso já tenha efetuado o pagamento:
Por favor, nos envie o comprovante com urgência.

🔹 Caso precise negociar:
Entre em contato conosco imediatamente.

Aguardamos retorno urgente.

Atenciosamente,
LC Baterias
```

---

## 🚀 Como Executar

### **Teste Manual (uma vez):**

```bash
cd c:\Users\pedro\Desktop\cobranca-sankhya
node automacoes/envio-cobranca-producao.js
```

**O que acontece:**
1. Busca todos os títulos em aberto
2. Filtra apenas os que devem receber hoje (D-3, D-0, D+3, D+5)
3. Gera mensagem + boleto para cada um
4. Envia via WhatsApp
5. Registra no histórico

**Saída esperada:**
```
🚀 SISTEMA DE COBRANÇA AUTOMÁTICA - LC BATERIAS
================================================================================
Data/Hora: 14/12/2025 20:45:00
================================================================================

📡 1. Autenticando na API Sankhya...
✅ Autenticado

📋 2. Buscando títulos para cobrança...
   📊 Total de títulos encontrados: 15

   📄 Processando NUFIN 19107...
      - NF: 181065
      - Cliente: 2878
      - Vencimento: 08/12/2025 (3 dias)
      📝 Tipo: Vencido
      🔨 Gerando PDF do boleto...
      📤 Enviando mensagem...
      📎 Enviando boleto PDF...
      ✅ Enviado com sucesso!

================================================================================
📊 RESUMO DA EXECUÇÃO
================================================================================
   ✅ Enviados com sucesso: 5
   ⏭️  Ignorados (já enviados ou fora da cadência): 8
   ❌ Erros: 0
   📋 Total processado: 15
================================================================================

✅ Execução concluída!
```

---

## ⏰ Automatizar (Execução Diária)

### **Opção 1: Agendador do Windows (Task Scheduler)**

1. Abra o **Agendador de Tarefas** do Windows
2. Criar Nova Tarefa
3. **Nome:** "Cobrança LC Baterias"
4. **Gatilho:** Diário às 09:00
5. **Ação:**
   - Programa: `node`
   - Argumentos: `c:\Users\pedro\Desktop\cobranca-sankhya\automacoes\envio-cobranca-producao.js`
   - Iniciar em: `c:\Users\pedro\Desktop\cobranca-sankhya`

### **Opção 2: Script BAT**

Crie um arquivo `executar-cobranca.bat`:

```batch
@echo off
cd c:\Users\pedro\Desktop\cobranca-sankhya
node automacoes/envio-cobranca-producao.js
pause
```

Agende no Task Scheduler para executar esse `.bat` diariamente.

---

## 🔒 Segurança e Controle

### **1. Evita Duplicação**

O sistema **não envia duas vezes no mesmo dia** para o mesmo título:

```javascript
// Verifica histórico antes de enviar
if (controleEnvios.jaFoiEnviado(titulo.NUFIN)) {
  console.log('Já enviado hoje - pulando');
  continue;
}
```

### **2. Histórico de Envios**

Todos os envios são registrados em:
```
automacoes/envios-realizados.json
```

Estrutura:
```json
{
  "19107": {
    "dataEnvio": "2025-12-14",
    "codparc": 2878,
    "numnota": "181065",
    "whatsapp": "556199660063",
    "tipo": "vencido"
  }
}
```

### **3. Apenas Clientes com WhatsApp**

Se o cliente não tiver WhatsApp cadastrado, é ignorado automaticamente.

---

## 📊 Monitoramento

### **Logs Completos**

O sistema loga tudo no console:
- ✅ Sucessos
- ⏭️ Ignorados (motivo)
- ❌ Erros (detalhes)

### **Relatório Final**

Ao final, mostra resumo:
```
✅ Enviados: 5
⏭️  Ignorados: 8
❌ Erros: 0
📋 Total: 15
```

---

## ⚙️ Configuração

### **Variáveis de Ambiente (.env)**

Certifique-se que estão configuradas:

```bash
# Sankhya API
PROD_X_TOKEN=seu_token_aqui
PROD_CLIENT_ID=seu_client_id
PROD_CLIENT_SECRET=seu_client_secret

# WhatsApp (Evolution API)
WHATSAPP_API_URL=https://evolutionv2.dev.automatexia.com.br
WHATSAPP_API_KEY=434E2E3F8BEE-4722-B8F4-EA61880FFE53
WHATSAPP_INSTANCE=lc
```

---

## 🧪 Teste Antes de Usar em Produção

### **1. Teste com 1 Cliente Específico**

Edite temporariamente o arquivo para testar com apenas 1 cliente:

```javascript
// Adicionar após buscar títulos (linha ~75)
const titulosTeste = titulos.filter(t => t.CODPARC === 2878); // Seu código de teste

// Usar titulosTeste em vez de titulos no loop
for (const titulo of titulosTeste) {
  // ...
}
```

### **2. Verificar Mensagens**

Antes de rodar, confira se as mensagens estão adequadas em:
```javascript
class MensagensCobranca {
  static lembrete(titulo, parceiro) { ... }
  static vencimentoHoje(titulo, parceiro) { ... }
  static vencido(titulo, parceiro) { ... }
  static cartorio(titulo, parceiro) { ... }
}
```

---

## 🚨 Troubleshooting

### **Erro: "WhatsApp instance not found"**

**Solução:** Verifique se a instância `lc` está conectada:
```
https://evolutionv2.dev.automatexia.com.br/instance/fetchInstances
```

### **Erro: "Título não possui WhatsApp"**

**Normal.** Sistema pula automaticamente clientes sem WhatsApp.

### **Boleto não está gerando**

**Verifique:**
1. Título possui `LINHADIGITAVEL` no Sankhya
2. Título possui `EMVPIX` (opcional, mas recomendado)
3. Pasta `temp/` existe e tem permissões

### **Envios duplicados**

**Improvável**, mas se acontecer:
- Delete o arquivo `automacoes/envios-realizados.json`
- Ele será recriado automaticamente

---

## 📞 Suporte

Para dúvidas ou problemas, contate a Automatex.

---

**Desenvolvido por Automatex** 🚀
**Sistema pronto para produção!** ✅
