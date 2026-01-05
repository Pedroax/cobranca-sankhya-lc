# 🔗 Integração API de Boletos com Portal LC Baterias

## 📋 Visão Geral

Esta API permite que o portal web da LC Baterias gere e baixe boletos em PDF diretamente do navegador do cliente.

---

## 🚀 Como Iniciar a API

### 1. Iniciar o servidor

```bash
cd C:\Users\pedro\Desktop\cobranca-sankhya
node api-boletos.js
```

A API estará disponível em: **http://localhost:3001**

### 2. Verificar se está rodando

Abra no navegador: http://localhost:3001/health

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2025-12-14T...",
  "apiAtiva": true
}
```

---

## 📡 Endpoints Disponíveis

### 1. **Baixar PDF do Boleto**

```
GET /api/boleto/:nufin
```

**Parâmetros:**
- `nufin` - Número único do financeiro (ID do título)

**Response:**
- `Content-Type: application/pdf`
- Arquivo PDF pronto para download

**Exemplo de URL:**
```
http://localhost:3001/api/boleto/19107
```

---

### 2. **Informações do Boleto (sem PDF)**

```
GET /api/boleto/:nufin/info
```

**Parâmetros:**
- `nufin` - Número único do financeiro

**Response (JSON):**
```json
{
  "nufin": 19107,
  "notaFiscal": "181065",
  "vencimento": "08/12/2025",
  "valor": 819.46,
  "nossoNumero": "109001350919",
  "linhaDigitavel": "34191.09008...",
  "temPix": true,
  "parceiro": {
    "codigo": 2878,
    "nome": "QUIXABA AUTO PECAS LTDA",
    "cpfCnpj": "12.345.678/0001-90"
  }
}
```

---

### 3. **Listar Títulos do Parceiro**

```
GET /api/titulos/:codparc
```

**Parâmetros:**
- `codparc` - Código do parceiro/cliente

**Response (JSON):**
```json
{
  "codparc": 2878,
  "total": 3,
  "titulos": [
    {
      "nufin": 19107,
      "notaFiscal": "181065",
      "vencimento": "08/12/2025",
      "valor": 819.46,
      "nossoNumero": "109001350919",
      "temPix": true,
      "diasParaVencimento": -6
    },
    ...
  ]
}
```

---

## 💻 Exemplos de Integração no Frontend

### Exemplo 1: React/Next.js - Botão de Download

```jsx
// Componente BotaoBoleto.jsx
import React from 'react';

export default function BotaoBoleto({ nufin, notaFiscal }) {
  const baixarBoleto = () => {
    const url = `http://localhost:3001/api/boleto/${nufin}`;
    window.open(url, '_blank');
  };

  return (
    <button onClick={baixarBoleto} className="btn-download">
      📄 Baixar Boleto NF {notaFiscal}
    </button>
  );
}
```

### Exemplo 2: JavaScript Puro - Fazer Download

```html
<!DOCTYPE html>
<html>
<head>
  <title>Boletos LC Baterias</title>
</head>
<body>
  <h1>Meus Boletos</h1>
  <div id="boletos"></div>

  <script>
    const codparc = 2878; // Código do cliente logado
    const API_URL = 'http://localhost:3001';

    // 1. Carregar lista de boletos
    fetch(`${API_URL}/api/titulos/${codparc}`)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('boletos');

        data.titulos.forEach(titulo => {
          const div = document.createElement('div');
          div.className = 'boleto-item';
          div.innerHTML = `
            <h3>NF ${titulo.notaFiscal}</h3>
            <p>Vencimento: ${titulo.vencimento}</p>
            <p>Valor: R$ ${titulo.valor.toFixed(2)}</p>
            <button onclick="baixarBoleto(${titulo.nufin})">
              📥 Baixar Boleto
            </button>
          `;
          container.appendChild(div);
        });
      });

    // 2. Função para baixar boleto
    function baixarBoleto(nufin) {
      window.open(`${API_URL}/api/boleto/${nufin}`, '_blank');
    }
  </script>
</body>
</html>
```

### Exemplo 3: React - Página Completa de Boletos

```jsx
// pages/boletos.jsx
import { useState, useEffect } from 'react';

export default function BoletoPage() {
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assumindo que você tem o CODPARC do cliente logado
  const codparc = 2878; // Vir da sessão/autenticação

  useEffect(() => {
    fetch(`http://localhost:3001/api/titulos/${codparc}`)
      .then(res => res.json())
      .then(data => {
        setTitulos(data.titulos);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao carregar boletos:', error);
        setLoading(false);
      });
  }, [codparc]);

  const baixarBoleto = (nufin) => {
    window.open(`http://localhost:3001/api/boleto/${nufin}`, '_blank');
  };

  if (loading) return <div>Carregando boletos...</div>;

  return (
    <div className="container">
      <h1>Meus Boletos em Aberto</h1>

      {titulos.length === 0 ? (
        <p>Nenhum boleto em aberto.</p>
      ) : (
        <div className="boletos-grid">
          {titulos.map(titulo => (
            <div key={titulo.nufin} className="boleto-card">
              <h3>Nota Fiscal: {titulo.notaFiscal}</h3>
              <p><strong>Vencimento:</strong> {titulo.vencimento}</p>
              <p><strong>Valor:</strong> R$ {titulo.valor.toFixed(2)}</p>
              <p>
                <strong>Status:</strong>{' '}
                {titulo.diasParaVencimento > 0
                  ? `Vence em ${titulo.diasParaVencimento} dias`
                  : titulo.diasParaVencimento === 0
                  ? 'Vence hoje!'
                  : `Vencido há ${Math.abs(titulo.diasParaVencimento)} dias`
                }
              </p>

              <button
                onClick={() => baixarBoleto(titulo.nufin)}
                className="btn-primary"
              >
                📥 Baixar Boleto PDF
              </button>

              {titulo.temPix && (
                <span className="badge-pix">✅ PIX Disponível</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Exemplo 4: Axios (mais robusto)

```jsx
import axios from 'axios';

const API_BOLETOS = axios.create({
  baseURL: 'http://localhost:3001/api'
});

// Serviço de Boletos
export const BoletoService = {
  // Listar títulos do parceiro
  async listarTitulos(codparc) {
    const { data } = await API_BOLETOS.get(`/titulos/${codparc}`);
    return data;
  },

  // Obter informações do boleto
  async obterInfo(nufin) {
    const { data } = await API_BOLETOS.get(`/boleto/${nufin}/info`);
    return data;
  },

  // Baixar PDF do boleto
  baixarPDF(nufin) {
    const url = `http://localhost:3001/api/boleto/${nufin}`;
    window.open(url, '_blank');
  },

  // Baixar com nome customizado
  async baixarComNome(nufin, nomeArquivo) {
    const response = await fetch(`http://localhost:3001/api/boleto/${nufin}`);
    const blob = await response.blob();

    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = nomeArquivo || `boleto_${nufin}.pdf`;
    link.click();
  }
};

// Uso:
// const titulos = await BoletoService.listarTitulos(2878);
// BoletoService.baixarPDF(19107);
```

---

## 🔒 Segurança (Produção)

### CORS - Configurar domínio permitido

Edite `api-boletos.js` linha 28:

```javascript
// Desenvolvimento (aceita qualquer origem)
res.header('Access-Control-Allow-Origin', '*');

// Produção (apenas domínio do portal)
res.header('Access-Control-Allow-Origin', 'https://portal.lcbaterias.com.br');
```

### Autenticação

Adicione verificação de token JWT nos endpoints:

```javascript
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  // Verificar token JWT aqui
  // jwt.verify(token, SECRET_KEY)

  next();
};

// Proteger endpoints
app.get('/api/boleto/:nufin', verificarToken, async (req, res) => {
  // ...
});
```

---

## 🚀 Deploy em Produção

### Opção 1: PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start api-boletos.js --name "api-boletos-lc"
pm2 save
pm2 startup
```

### Opção 2: Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "api-boletos.js"]
```

### Opção 3: Servidor Windows (como serviço)

Use `node-windows` para criar um serviço do Windows.

---

## 📊 Monitoramento

### Logs

A API loga todas as requisições no console:

```
📄 Requisição de boleto - NUFIN: 19107
   Buscando dados do título 19107...
   Buscando dados do parceiro 2878...
   Gerando PDF do boleto...
   Enviando PDF...
✅ Boleto enviado com sucesso - NUFIN: 19107
```

### Health Check

Configure um monitor para verificar: `GET /health`

Se retornar `status: "ok"`, a API está funcionando.

---

## 🐛 Troubleshooting

### Erro: "ECONNREFUSED"
- Verifique se a API está rodando: `node api-boletos.js`

### Erro: "CORS blocked"
- Configure o CORS com o domínio correto (linha 28 de `api-boletos.js`)

### Erro: "Título não encontrado"
- Verifique se o NUFIN existe na base Sankhya
- Use `/api/titulos/:codparc` para listar NUFINs disponíveis

### PDF não baixa
- Verifique se a pasta `temp/` existe e tem permissões de escrita
- Verifique logs no console da API

---

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a Automatex.

---

**Desenvolvido por Automatex** 🚀
