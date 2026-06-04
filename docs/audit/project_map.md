# Project Map - myrpg-next2

**Data:** 2026-06-04
**Cenario:** B - sem documentacao formal
**Stack inferida:** Next.js 16.2.6, React 19.2.4, TypeScript, Supabase/PostgreSQL
**Escopo analisado nesta fase:** estrutura e metadados. Logica de negocio sera lida nas fases seguintes.

## Estrutura de diretorios

```text
/
|-- app/                         App Router ativo
|   |-- (app)/                   Area autenticada da aplicacao
|   |-- (auth)/                  Login
|   |-- api/                     Route handlers
|   |-- auth/                    Callback OAuth/Auth
|   `-- styles/                  CSS global por dominio visual
|-- components/                  Componentes de UI, views, modais e combate
|   |-- combat/
|   |-- cronicas/
|   |-- layout/
|   |-- modals/
|   |-- npcs/
|   |-- ui/
|   `-- views/
|-- contexts/                    Contextos globais de auth, app e sessao
|-- hooks/                       Hooks de dados, realtime e storage
|-- lib/                         Constantes, dados, dice, Supabase e mappers
|-- types/                       Tipos de dominio
|-- docs/                        Documentacao e artefatos de auditoria
|-- public/                      Assets publicos
|-- scratch/                     Scripts auxiliares
|-- src/app/                     Arvore App Router residual/possivelmente inativa
`-- myrpgbroken_ref/             Referencia/legado excluido por tsconfig
```

## Modulos principais

| Modulo | Responsabilidade inferida | Arquivos-chave |
|--------|---------------------------|----------------|
| `/app` | Rotas Next.js App Router, layouts e APIs | `app/layout.tsx`, `app/page.tsx`, `app/(app)/layout.tsx` |
| `/app/(auth)` | Fluxo de login | `app/(auth)/login/page.tsx` |
| `/app/auth` | Callback de autenticacao | `app/auth/callback/route.ts` |
| `/app/api` | Endpoints server-side | `app/api/admin/reset-password/route.ts`, `app/api/import-player/route.ts` |
| `/contexts` | Estado global de autenticacao, perfil e sessao | `contexts/AuthContext.tsx`, `contexts/UserSessionContext.tsx` |
| `/hooks` | Persistencia e sincronizacao com Supabase | `hooks/useGameData.ts`, `hooks/useGameSync.ts`, `hooks/useMapStorage.ts` |
| `/lib/supabase` | Clientes Supabase browser/server/middleware e mappers | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/mappers.ts` |
| `/components/views` | Telas principais do produto | `DashboardView.tsx`, `PlayersView.tsx`, `UsersView.tsx`, `MapsView.tsx` |
| `/components/modals` | Operacoes de criacao/edicao/destrutivas via modais | `PlayerFormModal.tsx`, `PlayerManageModal.tsx`, `QuestModals.tsx` |
| `/components/cronicas` | Diario e mural investigativo | `DiarioFeed.tsx`, `MuralCanvas.tsx` |
| `/lib/dice` e `/components/combat` | Regras DnD/combat tracker | `lib/dice/dnd5e.ts`, `components/combat/CombatTracker.tsx` |
| `/myrpgbroken_ref` | Copia de referencia/legado, excluida do build TS | `tsconfig.json` exclui `myrpgbroken_ref` |

## Grafo de dependencias inferido

```text
Browser
  -> app/(auth)/login
  -> app/(app) pages
      -> components/views
      -> components/modals
      -> contexts
      -> hooks/useGameData, useGameSync, useMapStorage
      -> lib/supabase/client
      -> Supabase Auth, Database, Realtime, Storage

Next route handlers
  -> app/auth/callback/route.ts
      -> lib/supabase/server
      -> Supabase Auth
  -> app/api/admin/reset-password/route.ts
      -> @supabase/supabase-js createClient
      -> Supabase Admin API via service role env
  -> app/api/import-player/route.ts
      -> request JSON parser
      -> response JSON

Next proxy
  -> proxy.ts
      -> lib/supabase/middleware
      -> Supabase session refresh
```

## Rotas de pagina

| Rota | Arquivo | Observacao |
|------|---------|------------|
| `/` | `app/page.tsx` | Entrada raiz |
| `/login` | `app/(auth)/login/page.tsx` | Publica por design |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Area app |
| `/jogadores` | `app/(app)/jogadores/page.tsx` | Area app |
| `/npcs` | `app/(app)/npcs/page.tsx` | Area app |
| `/mapas` | `app/(app)/mapas/page.tsx` | Area app |
| `/alimentos` | `app/(app)/alimentos/page.tsx` | Area app |
| `/cronicas` | `app/(app)/cronicas/page.tsx` | Area app |
| `/ajustes` | `app/(app)/ajustes/page.tsx` | Area app |

## Rotas de API

| Metodo | Rota | Arquivo | Auth? |
|--------|------|---------|-------|
| GET | `/auth/callback` | `app/auth/callback/route.ts` | Publica/OAuth callback |
| POST | `/api/import-player` | `app/api/import-player/route.ts` | A validar |
| POST | `/api/admin/reset-password` | `app/api/admin/reset-password/route.ts` | A validar, caminho critico |

## Entidades do banco

| Entidade | Campos sensiveis identificados | Relacionamentos |
|----------|--------------------------------|-----------------|
| `campaign` | nome da campanha | Pai de players, npcs, supplies, maps, journey_days, diary_entries |
| `players` | `player_name`, `notes`, `background`, `personal_goals`, `image_url`, atributos e inventario | `campaign_id`, relacionado a `profiles.player_id` |
| `profiles` | `email`, `display_name`, `role`, `player_id` | `id` referencia `auth.users(id)` |
| `npcs` | `notes`, `secrets`, `items_hidden`, `image_url`, atributos | `campaign_id` |
| `supplies` | recursos da campanha | `campaign_id` unico |
| `maps` | `image_url`, visibilidade | `campaign_id`, usa storage |
| `journey_days` | eventos da campanha | `campaign_id` |
| `journey_blocks` | `timeline`, `plots`, `sidequests`, `player_sessions` | `day_id` |
| `diary_entries` | `content`, `author_id`, `author_name`, comentarios | `campaign_id`, `created_by` |
| `murals` | nome e estado visual | Sem `campaign_id` no schema base |
| `mural_cards` | `title`, `content`, posicao, cor | `mural_id` |
| `mural_connections` | labels e relacoes entre cards | `mural_id`, `from_card_id`, `to_card_id` |

## Controles de banco identificados

| Controle | Evidencia |
|----------|-----------|
| RLS habilitado | `db_schema.sql` linhas 238-249 |
| Helper `is_gm()` | `db_schema.sql` linhas 258-260 |
| Politicas por role | `db_schema.sql` linhas 270-306 |
| Trigger de perfil ao criar usuario | `db_schema.sql` linhas 315-330 |
| RPC para salvar sessao de jogador | `db_schema.sql` linhas 338-355 |
| RPC de reset de campanha | `db_schema.sql` linhas 366-390 |

## Integracoes externas

| Servico | Tipo | Arquivo de integracao |
|---------|------|-----------------------|
| Supabase Auth | Autenticacao | `contexts/AuthContext.tsx`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts` |
| Supabase Database/PostgREST | Banco de dados | `hooks/useGameData.ts`, `contexts/UserSessionContext.tsx`, `components/views/UsersView.tsx` |
| Supabase Realtime | Sincronizacao em tempo real | `hooks/useGameSync.ts`, `hooks/useGameData.ts`, `components/cronicas/mural/MuralCanvas.tsx` |
| Supabase Storage | Upload/armazenamento de mapas | `hooks/useMapStorage.ts` |
| Supabase Admin API | Reset de senha | `app/api/admin/reset-password/route.ts` |

## Pontos de entrada externos

| Ponto | Tipo | Arquivo |
|-------|------|---------|
| Browser -> rotas App Router | UI publica/autenticada | `app/**/page.tsx` |
| Proxy Next | Middleware de sessao | `proxy.ts`, `lib/supabase/middleware.ts` |
| Auth callback | OAuth/Auth code exchange | `app/auth/callback/route.ts` |
| API import player | Endpoint POST | `app/api/import-player/route.ts` |
| API admin reset password | Endpoint POST privilegiado | `app/api/admin/reset-password/route.ts` |
| Supabase Realtime channels | Eventos externos do banco | `hooks/useGameSync.ts`, `hooks/useGameData.ts`, `MuralCanvas.tsx` |
| Upload de mapas | Storage externo | `hooks/useMapStorage.ts` |

## Critical paths identificados

Arquivos que envolvem autenticacao, autorizacao, dados pessoais, storage, operacoes destrutivas ou admin:

- `proxy.ts`
- `lib/supabase/middleware.ts`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `contexts/AuthContext.tsx`
- `contexts/UserSessionContext.tsx`
- `app/(app)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/auth/callback/route.ts`
- `app/api/admin/reset-password/route.ts`
- `app/api/import-player/route.ts`
- `components/views/UsersView.tsx`
- `components/modals/PlayerFormModal.tsx`
- `hooks/useGameData.ts`
- `hooks/useGameSync.ts`
- `hooks/useMapStorage.ts`
- `db_schema.sql`
- `fix_reset_campaign.sql`
- `fix_rls.sql`

## Observacoes de escopo

- `src/app` contem outra arvore minima de App Router. Sera verificada para conflito/ambiguidade durante a ingestao.
- `myrpgbroken_ref` parece ser referencia ou copia legada e esta excluida em `tsconfig.json`; nao sera tratada como codigo ativo sem evidencia contraria.
- `.env.local` existe na raiz, mas `.env*` esta no `.gitignore` e `git ls-files` nao retornou arquivos de ambiente rastreados. O conteudo de `.env.local` nao deve ser lido.
- Busca estrutural nao encontrou sinais de LLM/RAG, agentes com ferramentas, pagamentos ou webhooks. CAT-1.6 permanece ignorada salvo evidencia posterior.
- O projeto declara 16 dependencias diretas de runtime e 5 de desenvolvimento; CAT-2.5 Supply Chain fica reduzida, pois esta abaixo do limiar de 50 dependencias diretas.
