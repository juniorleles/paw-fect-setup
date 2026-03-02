# Migração para WhatsApp Cloud API (Meta) — MagicZap

> Guia completo para migrar da Evolution API para a WhatsApp Cloud API oficial da Meta.
> Abordagem: **Embedded Signup** (cada cliente conecta seu próprio número)

---

## 1. Resumo Executivo

### Por que migrar?

| Aspecto | Evolution API (Atual) | WhatsApp Cloud API (Meta) |
|---|---|---|
| Conexão | QR Code / Pairing Code | Popup oficial da Meta (Embedded Signup) |
| Alerta de golpe | ⚠️ Aparece para o usuário | ✅ Não aparece |
| Dispositivo fantasma | ⚠️ Aparece como "MacOS/Windows" | ✅ Não aparece |
| Servidor externo | ⚠️ Servidor na Finlândia/Europa | ✅ Servidores da Meta |
| Estabilidade | Média (desconexões frequentes) | Alta (oficial) |
| Custo de mensagens | Grátis (não-oficial) | Pago por conversa (veja seção 6) |
| Risco de bloqueio | ⚠️ Alto (API não-oficial) | ✅ Baixo (oficial) |
| Limite de velocidade | Sem controle | Rate limits claros da Meta |
| Suporte | Comunidade | Suporte oficial Meta |

### O que muda para o cliente final?

- **Antes**: Escanear QR Code ou digitar código de 8 dígitos, aceitar alerta de golpe
- **Depois**: Clicar num botão, fazer login no Facebook, selecionar número → pronto

---

## 2. O Que Você Precisa Fazer na Meta (Pré-requisitos)

### 2.1 Criar uma Conta Business na Meta

1. Acesse [business.facebook.com](https://business.facebook.com)
2. Crie uma conta Business (ou use uma existente)
3. Verifique seu negócio (pode levar 2-7 dias úteis)
   - Será necessário enviar documentos da empresa (CNPJ, contrato social, etc.)

### 2.2 Criar um App de Desenvolvedor

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em **"Criar App"**
3. Selecione **"Business"** como tipo
4. Preencha o nome do app (ex: "MagicZap")
5. Vincule ao Business Manager criado no passo anterior

### 2.3 Adicionar o Produto "WhatsApp" ao App

1. No painel do app, clique em **"Adicionar produto"**
2. Selecione **"WhatsApp"**
3. Siga a configuração inicial

### 2.4 Configurar Embedded Signup

Para permitir que seus clientes conectem seus próprios números:

1. No app, vá em **WhatsApp → Embedded Signup**
2. Configure o **Callback URL** (será uma Edge Function sua)
3. Configure o **Verify Token** (string secreta que você define)
4. Solicite as permissões:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`

### 2.5 Obter Credenciais

Você precisará das seguintes credenciais:

| Credencial | Onde encontrar | Para que serve |
|---|---|---|
| **App ID** | Painel do App → Configurações | Identificar seu app |
| **App Secret** | Painel do App → Configurações → Básico | Autenticar chamadas da API |
| **System User Token** | Business Manager → Configurações → Usuários do Sistema | Token permanente para API |
| **Verify Token** | Você define (string qualquer) | Validar webhooks |
| **Config ID** | Embedded Signup → Configuration | Identificar a config do signup |

---

## 3. O Que Precisa Mudar no Código (Lovable)

### 3.1 Novas Edge Functions

| Função | Descrição |
|---|---|
| `whatsapp-embedded-signup` | Recebe o callback do Embedded Signup quando um cliente conecta o número |
| `whatsapp-cloud-webhook` | Recebe mensagens e eventos da Cloud API (substitui `evolution-webhook`) |
| `whatsapp-cloud-send` | Envia mensagens via Cloud API (substitui chamadas à Evolution API) |

### 3.2 Edge Functions a Modificar

| Função Atual | Mudança |
|---|---|
| `whatsapp-ai-handler` | Trocar envio de resposta da Evolution API → Cloud API |
| `reconnect-whatsapp` | Substituir por fluxo de Embedded Signup |
| `evolution-webhook` | Substituir por `whatsapp-cloud-webhook` |
| `sync-whatsapp-status` | Adaptar para verificar status via Cloud API |
| `check-instance-status` | Adaptar para Cloud API |

### 3.3 Mudanças no Banco de Dados

```sql
-- Adicionar colunas na tabela pet_shop_configs
ALTER TABLE pet_shop_configs ADD COLUMN meta_waba_id TEXT;        -- WhatsApp Business Account ID
ALTER TABLE pet_shop_configs ADD COLUMN meta_phone_number_id TEXT; -- Phone Number ID na Meta
ALTER TABLE pet_shop_configs ADD COLUMN meta_access_token TEXT;    -- Token de acesso do cliente
-- A coluna evolution_instance_name pode ser mantida para retrocompatibilidade
```

### 3.4 Mudanças no Frontend

| Componente | Mudança |
|---|---|
| `WhatsAppStatusBadge.tsx` | Trocar botão de QR Code/Pairing por botão "Conectar com Meta" |
| `StepWhatsApp.tsx` (onboarding) | Integrar Embedded Signup popup |
| `Settings.tsx` | Mostrar status da conexão Cloud API |

### 3.5 Novos Secrets Necessários

| Secret | Descrição |
|---|---|
| `META_APP_ID` | ID do app na Meta |
| `META_APP_SECRET` | Secret do app |
| `META_SYSTEM_USER_TOKEN` | Token permanente do system user |
| `META_VERIFY_TOKEN` | Token para verificação de webhook |
| `META_CONFIG_ID` | ID da configuração do Embedded Signup |

---

## 4. Fluxo de Conexão (Embedded Signup)

### Como funciona para o cliente:

```
1. Cliente clica "Conectar WhatsApp" no MagicZap
                    ↓
2. Abre popup oficial da Meta (Facebook Login)
                    ↓
3. Cliente faz login no Facebook
                    ↓
4. Cliente seleciona/cria Business Account
                    ↓
5. Cliente seleciona o número de telefone
                    ↓
6. Meta envia callback para sua Edge Function
                    ↓
7. Edge Function salva WABA_ID + Phone Number ID no banco
                    ↓
8. Status muda para "connected" automaticamente
```

### Código do Frontend (SDK da Meta):

```javascript
// Carregar SDK da Meta
window.fbAsyncInit = function() {
  FB.init({
    appId: 'SEU_APP_ID',
    autoLogAppEvents: true,
    xfbml: true,
    version: 'v21.0'
  });
};

// Iniciar Embedded Signup
FB.login((response) => {
  if (response.authResponse) {
    const code = response.authResponse.code;
    // Enviar code para sua Edge Function
    // A Edge Function troca o code por token permanente
  }
}, {
  config_id: 'SEU_CONFIG_ID',
  response_type: 'code',
  override_default_response_type: true,
  extras: {
    setup: {},
    featureType: '',
    sessionInfoVersion: '3',
  }
});
```

---

## 5. Fluxo de Mensagens (Cloud API)

### Receber mensagens (Webhook):

```
Cliente envia mensagem no WhatsApp
        ↓
Meta envia POST para sua Edge Function (whatsapp-cloud-webhook)
        ↓
Edge Function processa (mesmo fluxo atual: buffer → AI → resposta)
        ↓
Resposta enviada via Cloud API
```

### Enviar mensagens (API):

```bash
# Enviar mensagem de texto
POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "text",
  "text": { "body": "Olá! Seu agendamento está confirmado." }
}
```

---

## 6. Custos da WhatsApp Cloud API

### Modelo de Precificação

A Meta cobra por **conversa** (janela de 24h), não por mensagem individual.

| Tipo de Conversa | Preço (Brasil, USD) | Quem inicia |
|---|---|---|
| **Service** (atendimento) | ~$0.0300 | Cliente envia mensagem |
| **Marketing** | ~$0.0625 | Você envia template |
| **Utility** (notificações) | ~$0.0350 | Você envia template (confirmação, lembrete) |
| **Authentication** | ~$0.0315 | Você envia código/OTP |

### Primeiras 1.000 conversas Service/mês: **GRÁTIS**

### Estimativa para 1.000 clientes MagicZap:

| Cenário | Conversas/mês | Custo/mês (USD) |
|---|---|---|
| Baixo uso (5 conversas/cliente) | 5.000 | ~$120 |
| Uso médio (15 conversas/cliente) | 15.000 | ~$420 |
| Alto uso (30 conversas/cliente) | 30.000 | ~$870 |

> **Nota**: Com a Evolution API atual o custo de mensagens é $0, mas há risco de bloqueio por ser não-oficial.

---

## 7. O Que Pode Ser Feito no Lovable?

### ✅ Sim, pode fazer no Lovable:

- [x] Criar/modificar Edge Functions para Cloud API
- [x] Modificar componentes do frontend (botão Embedded Signup)
- [x] Adicionar colunas no banco de dados (migrations)
- [x] Armazenar secrets (META_APP_ID, etc.)
- [x] Configurar webhook URL para a Meta
- [x] Adaptar o AI handler para enviar via Cloud API
- [x] Toda a lógica de negócio

### ⚠️ Precisa fazer fora do Lovable:

- [ ] Criar conta no Meta Business Manager
- [ ] Criar App de Desenvolvedor na Meta
- [ ] Verificar negócio na Meta (enviar documentos)
- [ ] Configurar Embedded Signup no painel da Meta
- [ ] Apontar webhook URL no painel da Meta
- [ ] Obter aprovação do app (revisão da Meta)

---

## 8. Plano de Execução — Fases

### Fase 1: Configuração na Meta (1-2 semanas)
- [ ] Criar/verificar Business Manager
- [ ] Criar App de Desenvolvedor
- [ ] Configurar produto WhatsApp
- [ ] Solicitar permissões Embedded Signup
- [ ] Obter credenciais (App ID, Secret, Token)
- [ ] Configurar webhook URL de teste

### Fase 2: Backend no Lovable (1-2 semanas)
- [ ] Adicionar secrets (META_APP_ID, etc.)
- [ ] Criar migration para novas colunas
- [ ] Criar Edge Function `whatsapp-cloud-webhook`
- [ ] Criar Edge Function `whatsapp-embedded-signup`
- [ ] Adaptar `whatsapp-ai-handler` para Cloud API
- [ ] Adaptar `sync-whatsapp-status`

### Fase 3: Frontend no Lovable (1 semana)
- [ ] Integrar SDK da Meta no frontend
- [ ] Atualizar `WhatsAppStatusBadge` com novo fluxo
- [ ] Atualizar onboarding (`StepWhatsApp`)
- [ ] Atualizar página de configurações

### Fase 4: Testes (1 semana)
- [ ] Testar Embedded Signup com número de teste
- [ ] Testar recebimento de mensagens
- [ ] Testar envio de respostas
- [ ] Testar agendamentos end-to-end
- [ ] Testar reconexão/desconexão

### Fase 5: Migração de Clientes (gradual)
- [ ] Migrar clientes em lotes (10-20 por dia)
- [ ] Manter Evolution API como fallback
- [ ] Monitorar erros e conversões
- [ ] Desativar Evolution API após 100% migrados

**Tempo total estimado: 4-6 semanas**

---

## 9. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Aprovação do app pela Meta demorar | Alto | Iniciar processo de verificação ASAP |
| Custo por conversa | Médio | Monitorar uso, otimizar conversas |
| Rate limits da API | Médio | Implementar fila de envio |
| Clientes resistentes à mudança | Baixo | Comunicação clara, processo simples |
| Downtime durante migração | Alto | Migração gradual, manter Evolution como backup |

---

## 10. Decisão: Quando Migrar?

### Migrar agora se:
- Clientes estão reclamando de alertas de golpe
- Desconexões frequentes estão impactando o negócio
- Você quer uma solução oficial e de longo prazo

### Esperar se:
- A Evolution API está funcionando bem para os clientes atuais
- O custo por conversa da Meta não é viável no momento
- Você não tem tempo para o processo de verificação da Meta

### Abordagem híbrida (recomendada):
1. **Iniciar verificação da Meta agora** (leva dias/semanas)
2. **Manter Evolution API** para clientes atuais
3. **Implementar Cloud API** para novos clientes
4. **Migrar gradualmente** os existentes

---

*Documento criado em 02/03/2026*
