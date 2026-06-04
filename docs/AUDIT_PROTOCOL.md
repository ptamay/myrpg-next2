# AUDIT_PROTOCOL.md — Protocolo de Auditoria de Código

> **Versão:** 3.0 | **Compatível com:** Master Spec v3.8 | **Uso:** Antigravity + Claude Opus/Sonnet
> **Regra fundamental:** AUDITAR ≠ CORRIGIR. Nenhuma alteração de código ocorre sem confirmação explícita do usuário.

---

## 0. PROMPT 0 — Briefing Obrigatório (Execute Antes de Tudo)

> ⚠️ **Este bloco é o ponto de partida absoluto. Nenhuma fase de auditoria começa sem ele.**
> O agente faz estas perguntas ao usuário antes de ler qualquer arquivo do projeto.

---

### 0.1 — Perguntas de Contexto

**P1 — Tipo de projeto:**
> "Este projeto foi desenvolvido com base no Master Spec v3.8 (Cenário A) ou é um projeto Vibe Code sem documentação formal (Cenário B)?"

Se A → leia `constitution.md` antes de continuar. Ele tem precedência absoluta sobre este protocolo.
Se B → este documento é a única referência. Continue para P2.
Se o usuário não souber → assuma Cenário B.

**P2 — Stack e linguagem:**
> "Qual é a stack principal do projeto? (ex: Next.js + Prisma + PostgreSQL, Python + FastAPI, etc.)"

Isso determina quais ferramentas SAST usar na Fase A0 e quais padrões arquiteturais esperar no CAT-0.

**P3 — Integrações externas:**
> "O projeto integra: (a) LLM/RAG/banco vetorial? (b) agentes autônomos com uso de ferramentas (tool use)? (c) pagamento/gateway financeiro?"

- (a) sim → ativa CAT-1.6 (Cross-Session Leak)
- (b) sim → ativa CAT-1.6 + sub-bloco AI Agent Security
- (c) sim → eleva peso de CAT-1 no Audit Score

**P4 — Multi-tenancy:**
> "O sistema serve múltiplos clientes/empresas a partir da mesma base de dados?"

Se sim → CAT-1.5 completo + verificação de isolamento vetorial se P3(a) = sim.
Se não → CAT-1.5 reduzida a secrets e autenticação.

**P5 — Objetivo prioritário:**
> "Qual é o foco desta auditoria?"
> - (A) Segurança e vulnerabilidades — foco em CAT-0, CAT-1, CAT-2
> - (B) Performance e otimização — foco em CAT-2.4, CAT-3, CAT-3.5
> - (C) Auditoria completa

**P6 — Testes existentes:**
> "O projeto já possui testes automatizados? Se sim, qual framework?"

Se sim e usuário autorizar → ativa validação empírica em critical paths no CAT-3.1.
Se não → registrar ausência como finding CAT-3.1.

**P7 — Tamanho do projeto:**
> "Quantas linhas de código aproximadamente, ou qual o número de arquivos na pasta principal?"

- < 5k linhas → leitura direta, A0.5 opcional
- 5k–50k linhas → A0.5 recomendado
- > 50k linhas ou monorepo → A0.5 obrigatório

---

### 0.2 — Regra de Resposta Incompleta

Se o usuário não souber responder qualquer pergunta, o agente apresenta opções concretas com recomendação padrão (Protocolo de Decisão Guiada, Master Spec v3.8 Seção 2). Nunca deixe o usuário travado.

---

### 0.3 — Confirmação Antes de Iniciar

```
Entendido. Vou auditar:
- Cenário: [A | B]
- Stack: [stack informada]
- Tamanho: [< 5k | 5k–50k | > 50k linhas]
- Foco: [segurança | performance | completo]
- CAT-0 (Arquitetura + STRIDE): ativa — sempre
- CAT-1.5 (multi-tenant): [completo | reduzido]
- CAT-1.6 (LLM/RAG): [ativa | ignorada]
- AI Agent Security: [ativo | ignorado]
- CAT-2.5 (Supply Chain): [ativa | ignorada]
- CAT-3.5 (Operabilidade): [ativa | ignorada]
- Validação empírica de testes (critical paths): [ativa | inativa]
- A0.5 Project Mapping: [obrigatório | recomendado | opcional]

Posso iniciar?
```

Aguarde confirmação explícita do usuário antes de prosseguir.

---

## 1. Princípios Anti-Falso-Positivo

> Estes princípios são inegociáveis. Violá-los degrada a auditoria.

**Princípio 1 — Evidência Obrigatória**
Nenhum finding pode ser reportado sem citar a localização exata: arquivo + número de linha + trecho relevante. Suspeita sem evidência = silêncio.

**Princípio 2 — Separação de Auditoria e Correção**
A fase de auditoria gera apenas um relatório. A fase de correção é separada, opt-in, e requer confirmação por finding. Nunca faça as duas ao mesmo tempo.

**Princípio 3 — Impacto Antes de Correção**
Para cada finding, estime o risco de regressão antes de propor qualquer fix. Risco ALTO → branch separado + testes antes e depois.

**Princípio 4 — Conservadorismo em Código Funcional**
Código que funciona mas não segue convenção estilística NÃO é finding de segurança. Separe: vulnerabilidade real vs. debt de estilo vs. sugestão de melhoria.

**Princípio 5 — Contexto Antes de Julgamento**
Antes de reportar um padrão como problema, verifique se é intencional. `try/catch` ausente pode ser erro propagado para handler global. Verifique antes de reportar.

**Princípio 6 — SAST Antes de LLM**
O agente nunca audita código cru para detectar vulnerabilidades estruturais. Fluxo obrigatório: execute SAST → forneça o relatório ao LLM → LLM avalia contexto semântico e descarta falsos positivos.

**Princípio 7 — Arquitetura Antes de Código**
Vulnerabilidades arquiteturais (trust zone incorreta, boundary ausente, fluxo sem autenticação) não aparecem em nenhuma linha de código isolada. CAT-0 sempre precede CAT-1.

---

## 2. Protocolo de Execução

```
Prompt 0 (Briefing + confirmação)
    ↓
Fase A0.5: Project Mapping (obrigatório > 5k linhas)
    ↓
Fase A0: SAST (Semgrep) + SCA (npm audit / pip-audit)
    ↓
Fase 1: Ingestão de arquivos
    ↓
CAT-0: Arquitetura + Fluxo de Dados + Threat Model STRIDE
CAT-1: Segurança Crítica  ← usa relatório SAST + mapa CAT-0
CAT-2: Segurança Média    ← usa relatório SCA
CAT-3: Qualidade          ← mutation test em critical paths (opt-in)
CAT-4: LGPD
    ↓
Fase 3: Relatório com Audit Score → aguarda confirmação
    ↓
Fase 4: Correção (opt-in, por finding, branch separado se risco ALTO)
```

---

### Fase A0.5 — Project Mapping (obrigatório > 5k linhas)

> Execute antes do SAST. O mapa gerado é o contexto de navegação para todas as fases seguintes.
> Objetivo: o agente nunca audita um projeto grande sem entender sua topologia primeiro.

```
AÇÃO: Gere o mapa do projeto lendo apenas estrutura e metadados.
Não leia lógica de negócio ainda.

1. Estrutura de diretórios completa (3 níveis)
2. Inventário de módulos principais e responsabilidades inferidas
3. Grafo de dependências entre módulos (quem importa quem)
4. Lista de todas as rotas de API com método HTTP e arquivo de origem
5. Lista de todas as entidades do banco (tabelas/modelos)
6. Pontos de entrada externos: endpoints públicos, webhooks, cron jobs
7. Integrações externas: nome do serviço + arquivo de integração

Salve em /docs/audit/project_map.md
```

Formato de saída esperado:

```markdown
## Módulos principais
| Módulo | Responsabilidade inferida | Arquivos-chave |
|--------|--------------------------|----------------|
| /auth  | Autenticação JWT + sessão | middleware/auth.ts, api/login.ts |

## Rotas de API
| Método | Rota | Arquivo | Auth? |
|--------|------|---------|-------|
| POST | /api/login | api/auth/login.ts | ❌ público |
| GET  | /api/products | api/products/index.ts | ✅ JWT |

## Entidades do banco
| Entidade | Campos sensíveis identificados | Relacionamentos |
|----------|-------------------------------|-----------------|

## Integrações externas
| Serviço | Tipo | Arquivo de integração |
|---------|------|----------------------|

## Critical paths identificados
Caminhos que envolvem: autenticação, pagamento, dados pessoais, operações destrutivas.
[lista de arquivos]
```

> Os critical paths listados aqui são a entrada para o mutation testing no CAT-3.1.

---

### Fase A0 — SAST/SCA Pré-Auditoria (obrigatório)

> Execute ANTES da leitura de código. Os resultados são contexto de entrada para CAT-1 e CAT-2.

```
AÇÃO: Com base na stack do Prompt 0:

── JavaScript / TypeScript:
   semgrep --config=auto --json > /docs/audit/sast_report.json
   npm audit --json > /docs/audit/sca_report.json

── Python:
   semgrep --config=auto --json > /docs/audit/sast_report.json
   pip-audit --format json > /docs/audit/sca_report.json

── Monorepo: execute por pasta separadamente.

NÃO interprete os relatórios ainda. Apenas execute e salve.
```

Se terminal indisponível → registre `⚠️ SAST não executado — cobertura de CAT-1 reduzida` e prossiga.

---

### Fase 1 — Ingestão (leitura, sem modificação)

> Guiada pelo project_map.md. Em projetos grandes, leia apenas arquivos relevantes para a categoria em execução.

```
Ordem de leitura:
1. /.agents/memory/constitution.md (Cenário A)
2. /.agents/memory/spec.md (Cenário A)
3. package.json / requirements.txt / pyproject.toml
4. /docs/audit/project_map.md (se gerado)
5. Configurações: .env.example, next.config.js, tsconfig.json
6. Schema: prisma/schema.prisma, migrations
7. Rotas de API e controllers
8. Middlewares de autenticação e autorização
9. Arquivos de teste existentes

NÃO leia: binários, node_modules, .env real, build artifacts.
```

---

### Fase 2 — Auditoria por Categoria

Execute cada categoria em sequência e de forma independente.

> **Projetos > 5k linhas:** invoque um agente separado por categoria, fornecendo como contexto apenas: (a) este bloco, (b) arquivos relevantes do project_map.md, (c) relatório SAST/SCA. Não forneça todas as categorias ao mesmo agente simultaneamente.

---

### Fase 3 — Relatório com Audit Score

Gere o relatório no formato da Seção 4. Apresente e aguarde instrução.

---

### Fase 4 — Correção (opt-in, por finding)

Somente após confirmação:
1. Branch separado se risco ALTO.
2. Correção mínima — não refatore além do escopo do finding.
3. Execute testes após cada correção.
4. Se testes quebrarem: reporte imediatamente, não conserte o teste sem confirmação.

---

## 3. Categorias de Auditoria

---

### CAT-0 — Arquitetura e Modelagem de Ameaças (Severidade: CRÍTICA / ALTA)

> **Execute sempre, antes de CAT-1.**
> Vulnerabilidades arquiteturais não aparecem em linhas de código — aparecem em fluxos e boundaries.
> Contexto de entrada: project_map.md + arquivos de configuração da Fase 1.

**0.1 — Mapeamento Arquitetural**
- [ ] Desenhe o diagrama de fluxo: cliente → frontend → API → banco → serviços externos
- [ ] Identifique as trust zones: o que é público, autenticado, interno
- [ ] Identifique os boundaries: onde ocorre validação de entrada, autenticação, autorização
- [ ] Verifique se algum fluxo atravessa um boundary sem validação ou autenticação
- [ ] Identifique single points of failure: serviços externos sem fallback, dependências críticas sem redundância

Exemplo de diagrama esperado:
```
[Browser] → (HTTPS) → [Next.js / Vercel]
                            ↓ (JWT verificado no middleware)
                       [API Routes]
                            ↓ (Prisma ORM — queries parametrizadas)
                       [PostgreSQL / Supabase]
                            ↓ (API key via env var)
                       [OpenAI API]
```

> Se qualquer seta não tiver mecanismo de proteção identificado → finding arquitetural.

**0.2 — Fluxo de Dados Sensíveis**
- [ ] Rastreie o caminho de cada tipo de dado sensível (senha, CPF, token, PII) da entrada até o armazenamento
- [ ] Verifique se dados sensíveis trafegam em texto claro em qualquer ponto (URL, log, header sem HTTPS)
- [ ] Verifique se dados sensíveis são mascarados antes de qualquer log
- [ ] Verifique se existe cache de dados sensíveis sem TTL ou sem criptografia

**0.3 — Threat Model STRIDE**

> Execute sobre o diagrama do CAT-0.1, não sobre o código.
> Para cada componente e fluxo, aplique as 6 categorias:

| Ameaça | O que verificar |
|--------|----------------|
| **S**poofing | Um atacante pode se passar por usuário ou serviço legítimo? Verificação de identidade em todos os pontos de entrada? |
| **T**ampering | Dados podem ser alterados em trânsito ou em repouso sem detecção? Integridade verificada? |
| **R**epudiation | Operações críticas têm log de auditoria? É possível negar ter executado uma ação? |
| **I**nformation Disclosure | Quais dados podem vazar por erro, log excessivo ou resposta de API mal configurada? |
| **D**enial of Service | Quais endpoints ou recursos podem ser esgotados? Rate limiting presente? |
| **E**levation of Privilege | Usuário comum pode escalar para admin? Um tenant pode acessar dados de outro? |

> Findings STRIDE sem evidência em código → **findings arquiteturais** (-5 pontos no score, reportados separadamente).
> Findings STRIDE com evidência em código → linkados ao finding de código correspondente.

---

### CAT-1 — Segurança Crítica (Severidade: CRÍTICA / ALTA)

> Carregue sast_report.json e sca_report.json como contexto primário. Avalie cada alerta do SAST com contexto semântico. Findings descartados vão para "Findings Descartados" com justificativa.

**1.1 Secrets e Credenciais**
- [ ] Chaves de API, tokens, senhas hardcoded em arquivo rastreado pelo git
- [ ] `.env` commitado (verificar `.gitignore`)
- [ ] Credenciais em comentários ou strings de log
- [ ] Connection strings com usuário/senha na URL

*Evidência: arquivo + linha + trecho redacted*

**1.2 Injeção (SQLi, XSS, Command Injection)**
- [ ] Queries SQL por concatenação de string com input do usuário
- [ ] `innerHTML`, `dangerouslySetInnerHTML`, `eval()` com dados não sanitizados
- [ ] Execução de shell com input externo (`exec`, `spawn`, `subprocess`)

**1.3 Autenticação e Autorização**
- [ ] Rotas protegidas sem verificação de token/sessão
- [ ] Admin endpoint sem checagem de role
- [ ] JWT sem verificação de assinatura (`verify` vs `decode`)
- [ ] Senha em plaintext ou hash fraco (MD5, SHA1 sem salt)
- [ ] Log com token JWT, senha ou dados de sessão

**1.4 Exposição de Dados**
- [ ] Endpoints retornando campos sensíveis desnecessários
- [ ] Erros expondo stack trace em produção
- [ ] PII em logs

**1.5 Multi-Tenancy (se P4 = sim)**
- [ ] Queries sem filtro de `tenant_id`
- [ ] Endpoints aceitando `tenant_id` como parâmetro do usuário (escalação)
- [ ] Upload sem isolamento de tenant no storage path
- [ ] RBAC inconsistente: escritas sem verificação de role por tenant

**1.6 LLM / RAG / AI Agent Security (se P3 = sim)**

> Severidade padrão: **CRÍTICA** para qualquer falha neste bloco.

*Cross-Session Leak — ativar se P3(a) = sim:*
- [ ] Busca vetorial sem filtro de `tenant_id` — captura documentos de outro cliente silenciosamente sem erro
- [ ] Contexto conversacional persistido entre sessões de usuários diferentes (ausência de Burn-After-Use)
- [ ] Histórico de conversas sem isolamento por usuário/tenant
- [ ] Embeddings de documentos privados em namespace compartilhado
- [ ] Ausência de namespace isolation no vector store (Pinecone namespace, pgvector schema, Weaviate class)

*AI Agent Security — ativar apenas se P3(b) = sim (agentes com tool use):*
- [ ] **Prompt Injection:** inputs externos (conteúdo do usuário, dados de banco, respostas de API) injetados no prompt do agente sem sanitização — conteúdo malicioso pode redirecionar ações do agente
- [ ] **Tool Injection:** agente pode ser instruído por conteúdo externo a chamar ferramentas não autorizadas ou com parâmetros arbitrários
- [ ] **Recursive Tool Loops:** ausência de limite de iterações ou circuit breaker — agente pode entrar em loop infinito de chamadas
- [ ] **Unsafe Tool Execution:** ferramentas com acesso a filesystem, shell ou banco sem validação de parâmetros antes da execução
- [ ] **Privilege Escalation via Tool Use:** ferramenta executa com permissões maiores do que o usuário que iniciou a sessão possui

> Prompt Injection → linkar ao finding CAT-1.2 se houver evidência de código.
> Tool Injection e Recursive Loops → reportar como finding arquitetural se não houver evidência direta em código.

---

### CAT-2 — Segurança Média (Severidade: MÉDIA)

**2.1 Headers e Configuração HTTP**
- [ ] Ausência de `helmet.js` ou `next-safe`
- [ ] CORS como `*` em produção
- [ ] Rate limiting ausente em endpoints públicos ou de auth
- [ ] HTTPS não forçado

**2.2 Dependências**

> Carregue sca_report.json. Liste CVEs HIGH/CRITICAL com: pacote, versão atual, versão corrigida, CVSS, tipo (direta ou transitiva).

- [ ] CVE HIGH/CRITICAL em dependências
- [ ] Patches de segurança disponíveis ignorados

**2.3 Upload de Arquivos**
- [ ] Ausência de validação de tipo MIME (não apenas extensão)
- [ ] Ausência de limite de tamanho
- [ ] Arquivo salvo com nome fornecido pelo usuário (path traversal)

**2.4 Resiliência e Performance**
- [ ] Chamadas a APIs externas sem timeout
- [ ] Ausência de retry com backoff em integrações críticas
- [ ] Ausência de fallback para serviço externo
- [ ] N+1 óbvio: queries em loop sem batch ou eager loading
- [ ] Endpoints retornando listas não-paginadas com volume potencialmente alto

**2.5 Supply Chain (condicional — ativar se projeto usa > 50 dependências diretas)**

> Para projetos PME simples (< 50 dependências diretas), não ative — gera mais ruído do que sinal.
> Ferramentas: [Socket.dev](https://socket.dev), [OSV](https://osv.dev), [deps.dev](https://deps.dev)

- [ ] Dependências com histórico de comprometimento (verificar OSV além do CVE padrão)
- [ ] Pacotes recém-publicados (< 6 meses) com poucos downloads sem justificativa — risco de typosquatting
- [ ] Dependências sem manutenção há > 2 anos em posição crítica (auth, crypto, parsing)
- [ ] Dependências com repositório arquivado ainda em uso ativo
- [ ] Dependency confusion: pacotes internos com nome que poderia conflitar com pacotes públicos

*Evidência obrigatória:* nome do pacote + versão + data da última publicação + downloads semanais.

---

### CAT-3 — Qualidade e Manutenibilidade (Severidade: BAIXA)

> ⚠️ Findings desta categoria são sugestões, não bloqueadores. Não corrija sem confirmação explícita.

**3.1 Cobertura de Testes**
- [ ] Cobertura estimada < 80%
- [ ] Critical paths (auth, pagamento, checkout) sem teste automatizado
- [ ] Testes sem assertions

> **Validação empírica — somente em critical paths (se P6 = sim e usuário autorizar):**
>
> Execute mutation testing APENAS nos arquivos listados como critical paths no project_map.md.
> Nunca na aplicação inteira.
>
> - JS/TS: `npx stryker run --files "src/auth/**,src/billing/**,src/payment/**"`
> - Python: `mutmut run --paths-to-mutate src/auth,src/billing,src/payment`
>
> **Regra obrigatória:** branch isolado. O agente cria o branch, executa, registra e retorna ao branch original antes de qualquer outro passo. Mutation score < 60% = asserções fracas = finding confirmado.

**3.2 Arquitetura**
- [ ] Funções > 50 linhas com responsabilidades não relacionadas
- [ ] Código duplicado em 3+ lugares sem abstração
- [ ] Lógica de negócio dentro de componentes de UI

**3.3 Observabilidade**
- [ ] Ausência de monitoramento de erros (Sentry ou equivalente)
- [ ] `console.log` de debug em produção
- [ ] Ausência de logs estruturados em operações críticas

**3.4 Banco de Dados**
- [ ] Migrations sem rollback pareado
- [ ] Ausência de índices em colunas de busca frequente
- [ ] Campos nullable sem justificativa

**3.5 Operabilidade (condicional — ativar se foco = performance ou auditoria completa)**
- [ ] Ausência de endpoint `/health` (verifica se a aplicação está viva)
- [ ] Ausência de endpoint `/ready` (verifica se dependências externas estão acessíveis)
- [ ] Ausência de tracing distribuído (OpenTelemetry ou equivalente) em sistemas com múltiplos serviços
- [ ] Ausência de métricas de aplicação expostas (Prometheus, Datadog ou equivalente)
- [ ] Ausência de alertas configurados para erros críticos (taxa de erro acima de threshold, latência acima do SLA)

---

### CAT-4 — Conformidade LGPD (se sistema armazena dados pessoais)

**4.1 Dados Pessoais**
- [ ] CPF, RG, dados de saúde, financeiros sem criptografia at-rest
- [ ] Ausência de mecanismo de exportação de dados do usuário
- [ ] Ausência de mecanismo de exclusão de dados do usuário
- [ ] Dados de usuários deletados ainda presentes (soft delete sem hard delete programado)

---

## 4. Formato do Relatório

```markdown
# Relatório de Auditoria — [Nome do Projeto]
**Data:** [data]
**Auditor:** Antigravity / Claude [Opus | Sonnet]
**Modo:** [A — Com SDD | B — Vibe Code]
**Stack:** [stack auditada]
**SAST executado:** [Sim (Semgrep vX.X) | Não — sem terminal]
**SCA executado:** [Sim | Não]
**CAT-1.6 (LLM/RAG):** [Ativa | Ignorada]
**AI Agent Security:** [Ativo | Ignorado]
**CAT-2.5 (Supply Chain):** [Ativa | Ignorada]
**CAT-3.5 (Operabilidade):** [Ativa | Ignorada]
**Total de findings:** [N]

---

## Audit Score

| Categoria | Peso | Penalidade | Score parcial |
|-----------|------|-----------|---------------|
| CAT-0 Arquitetura + STRIDE | 20 | -X | XX/20 |
| CAT-1 Segurança Crítica    | 35 | -X | XX/35 |
| CAT-2 Segurança Média      | 20 | -X | XX/20 |
| CAT-3 Qualidade            | 10 | -X | XX/10 |
| CAT-4 LGPD                 | 15 | -X | XX/15 |
| **Total**                  | **100** | | **XX/100** |

**Penalidades:**
- Finding CRÍTICO: -8 pontos da categoria
- Finding ALTO: -4 pontos
- Finding MÉDIO: -2 pontos
- Finding BAIXO: -1 ponto
- Finding arquitetural STRIDE (sem evidência de código): -5 pontos do CAT-0
- Floor por categoria: 0 (nunca negativo)

**Ajuste de pesos por contexto:**
- Projeto com pagamento (P3(c) = sim): CAT-1 = 45, CAT-3 = 0
- Sistema de saúde ou jurídico: CAT-4 = 25, CAT-3 = 0
- Auditoria parcial (apenas segurança): score calculado sobre CAT-0 + CAT-1, normalizado para 100

**Score final: [XX]/100**

| Faixa | Status |
|-------|--------|
| 90–100 | ✅ Production Ready |
| 80–89  | 🟡 Low Risk — corrigir antes do próximo deploy |
| 70–79  | 🟠 Medium Risk — não deployar em produção |
| 60–69  | 🔴 High Risk — revisão completa necessária |
| < 60   | ⛔ Unsafe — não operar em produção |

---

## Resumo Executivo

| Severidade | Quantidade | Ação recomendada |
|------------|------------|-----------------|
| CRÍTICA       | N | Corrigir antes de qualquer deploy |
| ALTA          | N | Corrigir antes do próximo sprint |
| MÉDIA         | N | Planejar para os próximos 2 sprints |
| BAIXA         | N | Backlog de qualidade |
| Arquitetural  | N | Revisão de design antes de nova feature |

---

## Diagrama Arquitetural (gerado no CAT-0.1)

[diagrama em texto ou mermaid]

---

## Findings Detalhados

### [CAT-0.3 / STRIDE-E] Escalação de Privilégio via parâmetro tenant_id
**Severidade:** ALTA (finding arquitetural)
**Confirmado em código:** CAT-1.5 — linha 34
**Descrição:** Modelo de ameaça identifica que usuário autenticado pode fornecer `tenant_id` arbitrário. Confirmado: endpoint `/api/data` aceita `tenant_id` como query param sem validação contra o JWT.

---

### [CAT-1.2] SQLi em query de busca
**Severidade:** CRÍTICA
**Fonte:** SAST (Semgrep) — confirmado por revisão semântica
**Arquivo:** `src/api/products/search.ts` — linha 47
**Evidência:** `const query = \`SELECT * FROM products WHERE name LIKE '%${userInput}%'\``
**Risco de regressão:** BAIXO
**Correção sugerida:** `prisma.product.findMany({ where: { name: { contains: userInput } } })`

---

[repita para cada finding]

---

## Findings Descartados (Anti-Falso-Positivo)

- `src/lib/errorHandler.ts` linha 12 — Semgrep: `try/catch ausente`
  **Descartado:** handler global em `middleware/errorHandler.ts` linha 8. Falso positivo.

---

## Decisões Arquiteturais Implícitas (Vibe Code — Cenário B)

Padrões inferidos do código que deveriam estar em `constitution.md`:
- Autenticação: JWT Bearer com verificação manual — não documentado.
- Multi-tenancy: Row-level filtering por `organization_id` — padrão consistente sem contrato explícito.

---

## Próximos Passos

1. Confirme quais findings deseja corrigir nesta sessão.
2. Findings CRÍTICOS e ALTOS: corrigir antes de qualquer nova feature.
3. Findings arquiteturais: requerem decisão de design, não apenas correção de código.
4. Para cada correção confirmada: branch separado se risco ALTO.
```

---

## 5. Regras de Comportamento do Agente

**O agente NUNCA deve:**
- Modificar código sem confirmação explícita
- Reportar finding sem evidência de arquivo + linha
- Corrigir múltiplos findings em uma única operação
- Reportar como vulnerabilidade algo que é preferência de estilo
- Assumir que código comentado é código ativo
- Consertar teste que quebrou como resultado de correção
- Executar `npm audit fix --force` sem revisar cada mudança
- Auditar código cru para falhas estruturais sem SAST primeiro
- Alterar lógica de produção manualmente para mutation testing
- Executar mutation testing em toda a aplicação — apenas critical paths do project_map.md
- Reportar finding de Supply Chain sem: nome do pacote + versão + data de última publicação

**O agente SEMPRE deve:**
- Executar CAT-0 antes de CAT-1
- Executar A0.5 em projetos > 5k linhas antes de qualquer leitura de código
- Executar A0 (SAST/SCA) antes de CAT-1 e CAT-2
- Executar testes existentes após qualquer correção
- Reportar testes quebrados antes de continuar
- Tratar `.env.example` como referência — nunca ler `.env` real
- Separar findings de segurança de sugestões de estilo
- Perguntar antes de instalar qualquer nova dependência
- Confirmar branch ativo antes e retornar ao original após qualquer operação de branch

---

## 6. Gatilhos de Parada Imediata

1. **Secret exposto em arquivo rastreado pelo git** — requer rotação antes de qualquer outra ação
2. **Testes quebrando após correção** — não continue para o próximo finding
3. **Finding afeta schema do banco** — requer estratégia de migração antes da correção
4. **Correção altera interface pública de API** — verificar consumidores da rota
5. **Cross-Session Leak em LLM multi-tenant** — CRÍTICO imediato, notifica antes de continuar
6. **Finding arquitetural STRIDE que invalida o modelo de isolamento do sistema** — parar todas as fases; a correção é de design, não de código

---

## 7. Uso com Vibe Code (Cenário B)

| Domínio | Default assumido | O que verificar |
|---------|-----------------|-----------------|
| Arquitetura | Monolito Next.js ou similar | CAT-0.1 gera diagrama desde zero |
| Isolamento de dados | Row-level security | Queries sem tenant_id |
| Autenticação | JWT Bearer | Rotas sem middleware de auth |
| Secrets | Variáveis de ambiente | Qualquer hardcode |
| Rate limiting | 100 req/min público, 30 auth | Ausência de middleware |
| Cobertura de testes | 80% mínimo | Ausência de arquivos de teste |
| Logging | Sem PII | `console.log` com dados pessoais |
| LLM/RAG (se presente) | Isolamento por namespace/tenant | Busca vetorial sem filtro |

O relatório de Cenário B inclui obrigatoriamente a seção **"Decisões Arquiteturais Implícitas"**.

---

## 8. Integração com o Fluxo de Desenvolvimento

| Situação | Fases obrigatórias |
|----------|-------------------|
| Antes de deploy para produção | A0.5 + A0 + CAT-0 + CAT-1 + CAT-2 |
| Ao receber vibe code de terceiro | Protocolo completo |
| Após sprint de novas features | A0 + CAT-0 + CAT-1 + CAT-2 + CAT-4 |
| Revisão mensal de qualidade | Protocolo completo |
| Nova integração externa | A0 + CAT-0.2 + CAT-1.1 + CAT-2.4 |
| Ao integrar LLM/RAG pela primeira vez | A0 + CAT-0 + CAT-1.6 completo |
| Ao adicionar agentes com tool use | A0 + CAT-0 + CAT-1.6 (AI Agent Security) |

**Como invocar no Antigravity:**
Salve em `.agents/workflows/audit-protocol.md` e invoque com `/audit-protocol`.

**Modelo recomendado:**
- CAT-0 + CAT-1 + relatório final: **Claude Opus** (síntese profunda, menor taxa de falsos positivos)
- CAT-2 + CAT-3 + CAT-4: **Claude Sonnet** (suficiente, mais econômico)
