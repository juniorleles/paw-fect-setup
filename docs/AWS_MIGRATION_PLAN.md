# Plano de Migração para AWS — MagicZap

> Documento técnico para migração do backend Supabase/Lovable Cloud para infraestrutura AWS.
> Cenário-alvo: **1.000 clientes ativos** com processamento de mensagens WhatsApp em tempo real.

---

## 1. Visão Geral da Arquitetura Atual

| Componente | Tecnologia Atual | Função |
|---|---|---|
| Banco de dados | PostgreSQL (Supabase) | Armazenamento de dados, RLS, triggers |
| Edge Functions | Deno (Supabase Functions) | Lógica de negócio serverless |
| Autenticação | Supabase Auth | Login, signup, JWT |
| Webhook Handler | `evolution-webhook` | Recebe eventos do WhatsApp |
| Message Buffer | `process-sender` + `process-message-queue` | Agrupamento e processamento de mensagens |
| AI Handler | `whatsapp-ai-handler` | Processamento com Gemini/GPT |
| Pagamentos | Stripe (webhooks + checkout) | Assinaturas e cobranças |
| Frontend | React + Vite (Lovable) | SPA hospedada |

---

## 2. Arquitetura AWS Proposta

```
                    ┌─────────────────────────────────────┐
                    │          CloudFront (CDN)            │
                    │     Frontend React (S3 Static)       │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │      API Gateway (REST/HTTP)         │
                    │    + WAF (proteção DDoS/rate limit)  │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
    ┌─────────▼──────┐  ┌─────────▼──────┐  ┌─────────▼──────┐
    │  Lambda:        │  │  Lambda:        │  │  Lambda:        │
    │  evolution-     │  │  whatsapp-ai-   │  │  stripe-        │
    │  webhook        │  │  handler        │  │  webhook        │
    └─────────┬──────┘  └─────────┬──────┘  └─────────┬──────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │      Amazon RDS (PostgreSQL 16)      │
                    │        Multi-AZ, db.r6g.large        │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │      Amazon SQS (Message Buffer)     │
                    │   Substitui a tabela message_buffer  │
                    └──────────────────────────────────────┘
```

---

## 3. Mapeamento de Componentes

### 3.1 Banco de Dados → Amazon RDS

| Aspecto | Supabase | AWS |
|---|---|---|
| Engine | PostgreSQL 15 | PostgreSQL 16 (RDS) |
| RLS Policies | Nativas | Mantidas (mesmo SQL) |
| Triggers | `validate_appointment_slot` | Migração direta |
| Functions | `acquire_sender_lock`, etc. | Migração direta |
| Backup | Automático | RDS Automated Backups (35 dias) |
| Conexões | ~200 simultâneas | ~500+ com `db.r6g.large` |

**Instância recomendada:** `db.r6g.large` (2 vCPU, 16 GB RAM)
- Multi-AZ para alta disponibilidade
- Storage: gp3, 100 GB inicial com auto-scaling

### 3.2 Edge Functions → AWS Lambda

| Edge Function | Lambda Equivalente | Runtime |
|---|---|---|
| `evolution-webhook` | `magiczap-evolution-webhook` | Node.js 20 |
| `process-sender` | `magiczap-process-sender` | Node.js 20 |
| `process-message-queue` | Substituído por SQS + Lambda trigger | Node.js 20 |
| `whatsapp-ai-handler` | `magiczap-ai-handler` | Node.js 20 |
| `chat-simulator` | `magiczap-chat-simulator` | Node.js 20 |
| `create-checkout` | `magiczap-stripe-checkout` | Node.js 20 |
| `stripe-webhook` | `magiczap-stripe-webhook` | Node.js 20 |
| `check-instance-status` | `magiczap-check-instance` | Node.js 20 |
| `appointment-reminder` | EventBridge + Lambda | Node.js 20 |
| `trial-expiry-notification` | EventBridge + Lambda | Node.js 20 |

**Configuração Lambda:**
- Memory: 256 MB (webhook), 512 MB (AI handler)
- Timeout: 30s (webhook), 120s (AI handler)
- Concurrency reservada: 100 (AI handler)

### 3.3 Message Buffer → Amazon SQS

Substituir a tabela `message_buffer` + polling por:

```
Evolution Webhook → SQS (FIFO, GroupId=senderPhone)
                      ↓
                  Lambda Trigger (batch size=10, window=8s)
                      ↓
                  AI Handler Lambda
```

**Vantagens:**
- Elimina polling (`process-message-queue` via pg_cron)
- Elimina locks no banco (`conversation_locks`)
- Agrupamento nativo por `MessageGroupId`
- Retry automático com DLQ (Dead Letter Queue)

### 3.4 Autenticação → Amazon Cognito

| Aspecto | Supabase Auth | Cognito |
|---|---|---|
| Email/senha | ✅ | ✅ |
| JWT | ✅ | ✅ |
| RLS integration | Nativa | Via Lambda Authorizer |
| Custo | Incluído | Primeiros 50k MAU grátis |

**Alternativa:** Manter autenticação via biblioteca open-source (como `supabase-js` apontando para self-hosted Supabase Auth) para minimizar refatoração.

### 3.5 Frontend → S3 + CloudFront

- Build estático do Vite → upload para S3
- CloudFront como CDN global
- CI/CD via GitHub Actions (já configurado)

### 3.6 Cron Jobs → Amazon EventBridge

| Cron Atual | EventBridge Rule |
|---|---|
| `process-message-queue` (5 min) | **Eliminado** (SQS substitui) |
| `appointment-reminder` | Rate: every 1 hour |
| `trial-expiry-notification` | Rate: every 6 hours |

---

## 4. Plano de Migração — Fases

### Fase 1: Preparação (2-3 semanas)
- [ ] Criar conta AWS com AWS Organizations
- [ ] Configurar VPC, subnets, security groups
- [ ] Provisionar RDS PostgreSQL Multi-AZ
- [ ] Migrar schema (DDL + functions + triggers + RLS)
- [ ] Configurar Secrets Manager com todas as chaves

### Fase 2: Migração do Backend (3-4 semanas)
- [ ] Converter Edge Functions (Deno) → Lambda (Node.js)
- [ ] Configurar API Gateway + rotas
- [ ] Implementar SQS FIFO para message buffer
- [ ] Configurar Lambda triggers para SQS
- [ ] Implementar Cognito ou auth alternativa
- [ ] Configurar EventBridge para cron jobs

### Fase 3: Migração de Dados (1 semana)
- [ ] Exportar dados do Supabase via `pg_dump`
- [ ] Importar para RDS via `pg_restore`
- [ ] Validar integridade dos dados
- [ ] Migrar usuários autenticados (senhas hashadas)

### Fase 4: Frontend e DNS (1 semana)
- [ ] Deploy frontend no S3 + CloudFront
- [ ] Atualizar variáveis de ambiente (API URLs)
- [ ] Configurar domínio `magiczap.io` no Route 53
- [ ] Atualizar webhook URL na Evolution API

### Fase 5: Testes e Cutover (1-2 semanas)
- [ ] Testes end-to-end com instância de teste
- [ ] Testes de carga (simular 1000 clientes)
- [ ] Migração final com downtime mínimo (< 1h)
- [ ] Monitoramento intensivo por 72h

**Tempo total estimado: 8-11 semanas** com 1 desenvolvedor full-time.

---

## 5. Estimativa de Custos — 1.000 Clientes

### Premissas
- 1.000 clientes ativos
- Média de 50 mensagens/dia por cliente = **50.000 mensagens/dia**
- Cada mensagem gera ~3 invocações Lambda (webhook + process + AI)
- 150.000 invocações Lambda/dia = **4.5M/mês**
- ~30.000 agendamentos/mês
- ~1.000 usuários autenticados (MAU)

### Custos Mensais Detalhados

| Serviço | Especificação | Custo/Mês (USD) |
|---|---|---|
| **RDS PostgreSQL** | `db.r6g.large` Multi-AZ, 100 GB gp3 | **~$380** |
| **Lambda** | 4.5M invocações, 256-512 MB, avg 500ms | **~$45** |
| **API Gateway** | 4.5M requests HTTP API | **~$15** |
| **SQS FIFO** | 1.5M mensagens/mês | **~$2** |
| **S3 + CloudFront** | Frontend estático, ~50 GB transfer | **~$15** |
| **Cognito** | 1.000 MAU (grátis até 50k) | **$0** |
| **EventBridge** | ~5.000 eventos/mês | **~$1** |
| **Secrets Manager** | ~15 secrets | **~$6** |
| **CloudWatch** | Logs + métricas | **~$20** |
| **WAF** | Proteção básica | **~$10** |
| **Route 53** | 1 hosted zone | **~$1** |
| **NAT Gateway** | Para Lambda acessar internet | **~$35** |
| **Data Transfer** | ~100 GB saída | **~$9** |
| | | |
| **TOTAL AWS** | | **~$539/mês** |

### Comparação com Custo Atual

| | Lovable Cloud (Atual) | AWS (Projetado) |
|---|---|---|
| Infra backend | ~$25-50/mês* | ~$539/mês |
| API Gemini/GPT | ~$200-500/mês** | ~$200-500/mês** |
| Lovable Platform | Plano Business | Não necessário |
| **Complexidade operacional** | **Baixa** | **Alta** |

\* Custo baseado em uso do Lovable Cloud
\** Custo de IA é independente da infra

### Análise de Break-Even

Com 1.000 clientes pagando R$ 97/mês (plano starter):
- **Receita mensal:** R$ 97.000 (~$19.400 USD)
- **Custo AWS:** ~$539 (**2.8% da receita**)
- **Custo IA:** ~$500 (**2.6% da receita**)
- **Margem operacional de infra:** ~**94.6%**

> ✅ **O custo AWS é altamente viável para 1.000 clientes.**

---

## 6. Otimizações para Escala

### 6.1 Banco de Dados
- **Read Replicas** para consultas do dashboard admin
- **Connection Pooling** via RDS Proxy ($0.015/vCPU/hora)
- **Particionamento** da tabela `appointments` por mês
- **Índices** otimizados para queries frequentes

### 6.2 Cache
- **ElastiCache Redis** para cache de `pet_shop_configs` (evita queries repetidas)
- Custo adicional: ~$25/mês (`cache.t3.micro`)

### 6.3 AI Handler
- **Provisioned Concurrency** no Lambda para cold starts
- **Batch processing** via SQS para otimizar chamadas à API
- **Cache de respostas** para perguntas frequentes (Redis)

### 6.4 Monitoramento
- **CloudWatch Alarms** para latência, erros, throughput
- **X-Ray** para tracing distribuído
- **CloudWatch Dashboards** para visão operacional

---

## 7. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Downtime durante migração | Alto | Blue-green deployment, migração em horário de baixo tráfego |
| Perda de dados | Crítico | Backup completo antes da migração, validação pós-migração |
| Cold starts no Lambda | Médio | Provisioned concurrency para funções críticas |
| Complexidade operacional | Alto | Documentação detalhada, runbooks, alertas |
| Custo inesperado | Médio | AWS Budgets + alertas, Reserved Instances para RDS |
| Migração de auth | Alto | Exportar hashes bcrypt, testar login antes do cutover |

---

## 8. Quando Migrar?

### Recomendação: **Não migrar agora.**

A arquitetura atual no Lovable Cloud é suficiente para **500+ clientes**. Considere migrar quando:

1. **Receita justificar** o custo operacional (~$539/mês + tempo de engenharia)
2. **Necessidade de compliance** (LGPD com dados no Brasil, SOC2, etc.)
3. **Funcionalidades específicas** da AWS (ML/SageMaker, IoT, etc.)
4. **Controle total** sobre infraestrutura for um requisito de negócio

### Marco sugerido para migração: **500-800 clientes ativos**

Nesse ponto, a receita (~R$ 50-80k/mês) justifica o investimento em infraestrutura própria e um DevOps dedicado.

---

## 9. Checklist Pré-Migração

- [ ] Contratar ou alocar DevOps/SRE
- [ ] Definir estratégia de autenticação (Cognito vs self-hosted)
- [ ] Testar migração em ambiente staging completo
- [ ] Documentar todos os endpoints e integrações
- [ ] Preparar rollback plan
- [ ] Comunicar clientes sobre janela de manutenção
- [ ] Configurar monitoramento antes do cutover

---

*Documento gerado em 02/03/2026 — Revisão recomendada a cada 6 meses ou quando atingir 500 clientes ativos.*
