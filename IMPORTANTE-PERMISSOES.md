# ⚠️ IMPORTANTE - Configurar Permissões no SankhyaOm

## 🔴 Problema Encontrado

Ao tentar buscar dados de parceiros, a API retornou:

```json
{
  "status": "0",
  "statusMessage": "Não autorizado"
}
```

Isso significa que o **usuário de integração** (68 - Automatex) **não tem permissão** para acessar:
- Entidade `Parceiro` (TGFPAR)
- Entidade `Financeiro` (TGFFIN)

---

## ✅ Solução - Configurar Permissões no SankhyaOm

### **Passo 1: Acessar SankhyaOm**

1. Acesse o SankhyaOm com usuário administrador
2. Vá em: **Configurações** → **Integrações** → **API Gateway**

### **Passo 2: Selecionar a Aplicação**

1. Encontre a aplicação: **AutomateX**
2. Clique para editar

### **Passo 3: Configurar Permissões do Usuário**

1. Procure o **Usuário de Integração**: `68 - Automatex`
2. Clique em **Permissões** ou **Controle de Acesso**

### **Passo 4: Liberar Entidades Necessárias**

Marque as seguintes entidades para **leitura**:

#### **Obrigatórias para a Automação Funcionar:**

| Entidade | Tabela | Para quê |
|----------|--------|----------|
| ✅ **Financeiro** | TGFFIN | Buscar boletos/títulos |
| ✅ **Parceiro** | TGFPAR | Buscar dados do cliente (nome, telefone, WhatsApp) |

#### **Opcional (mas recomendado):**

| Entidade | Tabela | Para quê |
|----------|--------|----------|
| ⭐ **Contato** | TGFCTT | Buscar contatos alternativos do parceiro |

### **Passo 5: Salvar e Testar**

1. Salvar as configurações
2. Aguardar 1-2 minutos (propagação das permissões)
3. Testar novamente:

```bash
node automacoes/teste-buscar-parceiro.js
```

---

## 📖 Documentação Oficial

Para mais detalhes, consulte:

- **[Camada de Autorização para API](https://developer.sankhya.com.br/reference/camada-de-autorização-para-api)**
- **[Como gerar TOKEN - API Gateway](https://ajuda.sankhya.com.br/hc/pt-br/articles/12226863277591)**

A documentação menciona:

> "O usuário responsável pelo Sankhya Om pode definir acesso aos serviços que podem ser consultados através de integração via API."

> "A tabela [swagger.sankhya.com.br/tabelas/lib_acessos_integ.html](http://swagger.sankhya.com.br/tabelas/lib_acessos_integ.html) identifica quais telas precisam de autorização para consumir determinada entidade."

---

## 🎯 Exemplo de Como Ficará Após Configurar

Depois de liberar as permissões, o retorno será assim:

### **Buscar Títulos Financeiros:**

```json
{
  "serviceName": "CRUDServiceProvider.loadRecords",
  "status": "1",
  "responseBody": {
    "entities": [{
      "f": [
        {
          "NUFIN": 12345,
          "CODPARC": 123,
          "DTVENC": "25/11/2024",
          "VLRDESDOB": 1250.00,
          "NOSSONUM": "123456789"
        }
      ]
    }]
  }
}
```

### **Buscar Dados do Parceiro:**

```json
{
  "serviceName": "CRUDServiceProvider.loadRecords",
  "status": "1",
  "responseBody": {
    "entities": [{
      "f": [
        {
          "CODPARC": 123,
          "NOMEPARC": "LC BATERIAS",
          "TELEFONE": "1133334444",
          "CELULAR": "11999998888",
          "EMAIL": "contato@lcbaterias.com.br",
          "CGC_CPF": "12.345.678/0001-99"
        }
      ]
    }]
  }
}
```

---

## 🔧 Checklist de Permissões

- [ ] Acessei o SankhyaOm como administrador
- [ ] Encontrei a aplicação AutomateX
- [ ] Localizei o usuário de integração (68 - Automatex)
- [ ] Liberti acesso à entidade **Financeiro** (TGFFIN)
- [ ] Liberti acesso à entidade **Parceiro** (TGFPAR)
- [ ] Salvei as configurações
- [ ] Aguardei 1-2 minutos
- [ ] Testei novamente: `node automacoes/teste-buscar-parceiro.js`

---

## ❓ Dúvidas Comuns

### **Por que preciso liberar permissões?**

A Sankhya implementou uma **camada de segurança** onde cada usuário de integração precisa ter permissões explícitas para acessar dados. Isso evita que aplicações não autorizadas acessem informações sensíveis.

### **Isso é perigoso?**

Não! Você está apenas liberando **leitura** de dados para o usuário de integração da sua própria aplicação (AutomateX). Não está dando acesso externo.

### **Preciso fazer isso toda vez?**

Não! Após configurar as permissões, elas ficam salvas permanentemente.

### **E se eu não tiver acesso ao SankhyaOm?**

Solicite ao **administrador do sistema** ou ao **responsável pela integração** na sua empresa.

---

## 📞 Próximos Passos

1. **Configure as permissões** conforme descrito acima
2. **Teste novamente**: `node automacoes/teste-buscar-parceiro.js`
3. **Se funcionar**, você verá os dados reais dos parceiros
4. **Se continuar com erro**, me avise que ajudo a investigar

---

**Após configurar, execute:**

```bash
node automacoes/teste-buscar-parceiro.js
```

E você verá os dados reais dos parceiros com telefone e WhatsApp! 🚀
