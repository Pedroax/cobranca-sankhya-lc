# 🚀 Integração API Sankhya - Automatex

Integração completa com a API Sankhya usando **OAuth 2.0 Client Credentials**.

## ✅ Status

- ✅ **Autenticação funcionando** em ambiente de produção
- ✅ **Classe reutilizável** criada e testada
- ✅ **Renovação automática** de tokens
- ✅ **Exemplos práticos** incluídos

## 🎯 Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Testar autenticação
npm test

# 3. Rodar exemplos
node exemplos/exemplo-basico.js
node exemplos/exemplo-completo.js
```

## 📖 Uso Básico

```javascript
const SankhyaAPI = require('./SankhyaAPI');

const api = new SankhyaAPI({
  xToken: '04aca2fb-d2b1-4381-88eb-052e71fc84eb',
  clientId: 'd511487e-b742-44f8-8d2e-dcb01cb7d49d',
  clientSecret: 'dUAKxHUShoQa9Juhqliqzpg94vRBqsED'
});

// Fazer requisições (autenticação automática!)
const dados = await api.get('/seu-endpoint');
const resultado = await api.post('/outro-endpoint', { data: 'valor' });
```

## 📚 Documentação Completa

Veja o arquivo [GUIA-USO.md](GUIA-USO.md) para documentação completa.

## 🔐 Credenciais (Produção)

As credenciais estão configuradas no arquivo `.env` (não versionado no git).

## 📂 Estrutura

```
├── SankhyaAPI.js         # Classe principal
├── test-auth.js          # Teste de autenticação
├── exemplos/             # Exemplos de uso
│   ├── exemplo-basico.js
│   └── exemplo-completo.js
├── GUIA-USO.md          # Guia completo
└── .env                 # Credenciais (não commitar!)
```

## 🎓 Como Funciona

### Método OAuth 2.0 usado:

1. **POST** para `https://api.sankhya.com.br/authenticate`
2. **Headers**: `X-Token` (obtido no SankhyaOm)
3. **Body**: `client_id`, `client_secret`, `grant_type=client_credentials`
4. **Resposta**: JWT Access Token válido por 5 minutos
5. **Uso**: `Authorization: Bearer {token}` em todas as requisições

### Renovação Automática:

A classe `SankhyaAPI` gerencia automaticamente:
- ✅ Verifica validade do token antes de cada requisição
- ✅ Renova quando necessário
- ✅ Você não precisa se preocupar!

## 📌 Links Úteis

- [Documentação API Sankhya](https://developer.sankhya.com.br/reference/api-de-integra%C3%A7%C3%B5es-sankhya)
- [Portal do Desenvolvedor](https://developer.sankhya.com.br)

---

**Desenvolvido para Automatex** 🤖
