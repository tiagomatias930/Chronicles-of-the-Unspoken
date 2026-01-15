# 🚀 Instruções para Deployment na Vercel

## Configuração de Variáveis de Ambiente

O projeto está pronto para ser deployado na Vercel com variáveis de ambiente seguras.

### ✅ O que foi configurado:

1. **`.env.example`** - Arquivo de exemplo com as variáveis necessárias
2. **`.gitignore`** - Configurado para ignorar arquivos `.env` e `.env.local`
3. **`vite.config.ts`** - Otimizado para carregar variáveis de ambiente com prefixo `VITE_`
4. **`services/geminiLiveService.ts`** - Atualizado para ler a API_KEY das variáveis de ambiente
5. **`src/config/env.ts`** - Arquivo de configuração centralizado

### 📝 Variáveis de Ambiente Necessárias:

Na Vercel, configure a seguinte variável de ambiente no dashboard do projeto:

- **`VITE_GEMINI_API_KEY`** - Sua chave de API do Gemini

### 🔧 Passos para Deploy na Vercel:

1. **Conecte seu repositório GitHub à Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Selecione seu repositório

2. **Configure as Variáveis de Ambiente**
   - Vá para "Settings" → "Environment Variables"
   - Adicione a variável `VITE_GEMINI_API_KEY` com sua chave API
   - Garanta que está disponível em: Production, Preview, Development

3. **Deploy**
   - Clique em "Deploy"
   - O build será feito automaticamente com as variáveis de ambiente

### 🔐 Segurança:

- ✅ Arquivos `.env` e `.env.local` estão no `.gitignore`
- ✅ Variáveis nunca serão commitadas no repositório
- ✅ A API_KEY é validada no construtor do serviço
- ✅ Mensagens de erro claras indicam quando variáveis estão faltando

### 💻 Desenvolvimento Local:

1. Crie um arquivo `.env.local` na raiz do projeto:
   ```bash
   VITE_GEMINI_API_KEY=sua_chave_api_aqui
   ```

2. Execute o projeto:
   ```bash
   npm run dev
   ```

### ⚠️ Notas Importantes:

- As variáveis de ambiente com prefixo `VITE_` são expostas no build e visíveis no código cliente
- Para dados sensíveis que NÃO devem ser expostos ao cliente, use variáveis de servidor (sem prefixo `VITE_`)
- A chave API do Gemini é necessária no cliente para comunicação direta com a API

---

**Status:** ✅ Código pronto para Vercel
