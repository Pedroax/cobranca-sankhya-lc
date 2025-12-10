# 📚 Guia de Uso - API Sankhya

## ✅ Status da Integração

- **Método de Autenticação**: OAuth 2.0 Client Credentials com X-Token
- **Ambiente Testado**: Produção ✅
- **Status**: Funcionando perfeitamente!

---

## 🔐 Suas Credenciais

### Produção (FUNCIONANDO ✅)
- **X-Token**: `04aca2fb-d2b1-4381-88eb-052e71fc84eb`
- **Client ID**: `d511487e-b742-44f8-8d2e-dcb01cb7d49d`
- **Client Secret**: `dUAKxHUShoQa9Juhqliqzpg94vRBqsED`
- **Usuário de Integração**: 68 - Automatex

### Sandbox (Pendente configuração ⚠️)
- **X-Token**: `04aca2fb-d2b1-4381-88eb-052e71fc84eb`
- **Client ID**: `c37b2e3c-df70-40a1-918c-52708ecd2ad2`
- **Client Secret**: `fcZndmggDORwvbRjRRpRdIPDVkpuwSLj`
- **Status**: Credenciais inválidas - pode precisar de configuração adicional no portal

---

## 🚀 Como Usar

### Instalação

```bash
npm install
```

### Teste Rápido

```bash
# Testar em produção
npm test

# Ou especificar o ambiente
AMBIENTE=production node test-auth.js
```

### Uso Básico

```javascript
const SankhyaAPI = require('./SankhyaAPI');

// Criar instância da API
const api = new SankhyaAPI({
  xToken: '04aca2fb-d2b1-4381-88eb-052e71fc84eb',
  clientId: 'd511487e-b742-44f8-8d2e-dcb01cb7d49d',
  clientSecret: 'dUAKxHUShoQa9Juhqliqzpg94vRBqsED'
});

// Usar a API
async function exemplo() {
  // A autenticação é automática!
  const resultado = await api.get('/seu-endpoint');
  console.log(resultado);
}
```

### Exemplos Disponíveis

```bash
# Exemplo básico
node exemplos/exemplo-basico.js

# Exemplo completo
node exemplos/exemplo-completo.js
```

---

## 📖 Métodos Disponíveis

### `api.autenticar()`
Realiza autenticação OAuth 2.0 e obtém access token.

```javascript
await api.autenticar();
```

### `api.garantirToken()`
Garante que existe um token válido, renovando automaticamente se necessário.

```javascript
const token = await api.garantirToken();
```

### `api.get(endpoint, options)`
Faz uma requisição GET autenticada.

```javascript
const dados = await api.get('/gateway/v1/mge/clientes');
```

### `api.post(endpoint, body, options)`
Faz uma requisição POST autenticada.

```javascript
const resultado = await api.post('/gateway/v1/mge/service.sbr', {
  serviceName: 'SeuServico',
  dados: { /* ... */ }
});
```

### `api.put(endpoint, body, options)`
Faz uma requisição PUT autenticada.

```javascript
await api.put('/gateway/v1/mge/clientes/123', {
  nome: 'Novo Nome'
});
```

### `api.delete(endpoint, options)`
Faz uma requisição DELETE autenticada.

```javascript
await api.delete('/gateway/v1/mge/clientes/123');
```

### `api.request(endpoint, options)`
Método genérico para requisições customizadas.

```javascript
const resultado = await api.request('/endpoint', {
  method: 'PATCH',
  body: JSON.stringify({ campo: 'valor' }),
  headers: { 'Custom-Header': 'valor' }
});
```

### `api.infoToken()`
Retorna informações sobre o token atual.

```javascript
console.log(api.infoToken());
// {
//   status: 'Válido',
//   tempoRestante: '245 segundos',
//   token: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6IC...'
// }
```

---

## 🔄 Gerenciamento Automático de Token

A classe **SankhyaAPI** gerencia automaticamente a renovação do token:

- ✅ Verifica se o token está válido antes de cada requisição
- ✅ Renova automaticamente quando necessário
- ✅ Considera um token inválido 30 segundos antes de expirar
- ✅ Você não precisa se preocupar com autenticação!

---

## 📝 Informações do Token

- **Tipo**: Bearer Token (JWT)
- **Validade**: 300 segundos (5 minutos)
- **Renovação**: Automática

---

## ⚠️ Observações Importantes

1. **Sandbox não funcionou**: As credenciais de Sandbox retornaram erro `invalid_client`. Pode ser necessário configuração adicional no portal Sankhya.

2. **Use Produção**: As credenciais de **PRODUÇÃO** estão funcionando perfeitamente.

3. **Segurança**:
   - NUNCA commite o arquivo `.env` no git
   - O `.gitignore` já está configurado para proteger suas credenciais
   - Use `.env.example` como template

4. **Documentação da API**: https://developer.sankhya.com.br/reference/api-de-integra%C3%A7%C3%B5es-sankhya

---

## 🎯 Próximos Passos

1. **Descobrir os endpoints**: Consulte a documentação da Sankhya para ver quais endpoints você precisa usar
2. **Testar operações**: Use os exemplos para testar GET, POST, PUT, DELETE
3. **Criar suas automações**: Use a classe `SankhyaAPI` nas suas automações
4. **Explorar a API**: Veja todos os recursos disponíveis no portal do desenvolvedor

---

## 🆘 Precisa de Ajuda?

- **Documentação Oficial**: https://developer.sankhya.com.br
- **Portal do Desenvolvedor**: Onde você obtém AppKey, Client ID e Client Secret
- **SankhyaOm**: Onde você gera o X-Token (Configuração de Gateway)

---

## 📂 Estrutura do Projeto

```
sankhya/
├── .env                    # Suas credenciais (NÃO commitar!)
├── .env.example           # Template de credenciais
├── .gitignore            # Ignora arquivos sensíveis
├── package.json          # Configuração do projeto
├── SankhyaAPI.js         # Classe principal de integração
├── test-auth.js          # Script de teste de autenticação
├── GUIA-USO.md          # Este arquivo
└── exemplos/
    ├── exemplo-basico.js     # Exemplo básico de uso
    └── exemplo-completo.js   # Exemplo completo com todas as features
```

---

**Desenvolvido para Automatex** 🤖
