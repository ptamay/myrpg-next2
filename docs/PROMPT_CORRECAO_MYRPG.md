# 🛠️ PROMPT MESTRE — Recriação do MyRPG do Zero (Preservando Tudo)

> **Para o AI que vai executar este prompt:**
> Você está recriando o sistema **MyRPG** — uma plataforma de RPG de mesa digital com painel de GM e jogadores.
> O repositório de referência é `https://github.com/ptamay/myrpgbroken`.
> O projeto tem bugs graves em autenticação, sincronização em tempo real e loading eterno em algumas abas.
> **Seu objetivo é recriar do zero**, copiando fielmente toda a UI/UX, CSS, regras de negócio e mecânicas,
> mas com uma fundação de código limpa, sem os bugs acumulados.

---

## ⛔ REGRAS ABSOLUTAS — leia antes de qualquer código

1. **Leia o repositório ANTES de escrever código.** Use `https://github.com/ptamay/myrpgbroken` como fonte da verdade para UI, componentes, CSS e lógica de negócio. Não invente nada.
2. **Um único cliente Supabase.** Crie `lib/supabase/client.ts` como singleton. Nenhum outro arquivo chama `createBrowserClient` diretamente.
3. **Um único canal Realtime.** Canal `game-sync` criado uma vez no `AppShell`, destruído no unmount. Nunca crie canais dentro de componentes filhos.
4. **`AuthContext` só cuida de auth.** Não busca profiles, não redireciona, não tem lógica de negócio.
5. **`UserSessionContext` só cuida do profile/personagem.** Só ativa quando `user !== null`.
6. **Nunca use `useEffect` para redirecionar.** Use `router.replace` dentro do `onAuthStateChange`.
7. **Nunca silencie erros com `catch {}`**. Todo catch deve ter `console.error` + state de erro visível na UI.
8. **Nunca faça DELETE sem checar lista vazia.** `if (ids.length > 0)` antes de qualquer `.delete().in('id', ids)`.
9. **Copie o CSS original integralmente.** Não renomeie classes, não remova variáveis CSS, não troque por Tailwind.
10. **Siga a sequência de fases.** Não pule para Fase 3 sem o checkpoint da Fase 2 passar.

---

## 🗂️ ESTRUTURA DE PASTAS (criar exatamente assim)

```
myrpg/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   ├── layout.tsx
│   └── styles/
│       ├── globals.css
│       ├── blocks.css
│       ├── modals.css
│       └── sidebar.css
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx       ← monta canal game-sync aqui
│   │   └── Sidebar.tsx
│   ├── views/
│   │   ├── DashboardView.tsx
│   │   ├── DashboardBlock.tsx
│   │   ├── NpcCard.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── CronicasView.tsx
│   │   ├── MapsView.tsx
│   │   └── SettingsView.tsx
│   ├── cronicas/
│   │   ├── diario/
│   │   │   └── DiarioEntryCard.tsx
│   │   └── mural/
│   │       └── MuralCanvas.tsx
│   ├── modals/
│   │   ├── NpcDetailModal.tsx
│   │   ├── NpcFormModal.tsx
│   │   ├── PersonalNoteModal.tsx
│   │   ├── PlayerDetailModal.tsx
│   │   ├── PlayerFormModal.tsx
│   │   ├── PlayerManageModal.tsx
│   │   ├── SessionPlayerModal.tsx
│   │   ├── SummaryCardModal.tsx
│   │   ├── SystemDialogModals.tsx
│   │   ├── ModalsContainer.tsx
│   │   └── ImportModals.tsx
│   ├── npcs/
│   │   └── NpcCardPlayer.tsx
│   └── ui/
│       └── Modal.tsx
├── contexts/
│   ├── AuthContext.tsx
│   ├── UserSessionContext.tsx
│   ├── AppContext.tsx
│   └── SystemDialogContext.tsx
├── hooks/
│   ├── useGameData.ts
│   ├── useGameSync.ts
│   └── useRealtime.ts
├── lib/
│   └── supabase/
│       ├── client.ts          ← singleton browser client
│       ├── server.ts          ← server client para SSR
│       └── middleware.ts
├── types/
│   └── index.ts               ← todos os tipos TypeScript
├── middleware.ts
├── db_schema.sql              ← schema completo (ver abaixo)
├── package.json
└── tsconfig.json
```

---

## 🗄️ BANCO DE DADOS — Schema Definitivo

> Execute este SQL **completo** no Supabase SQL Editor antes de qualquer coisa.
> Ele apaga e recria tudo do zero de forma segura.

```sql
-- ==========================================
-- SCHEMA DEFINITIVO — MYRPG
-- Execute no Supabase SQL Editor
-- ==========================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- LIMPEZA (ordem importa por causa de FK)
DROP TABLE IF EXISTS public.mural_connections CASCADE;
DROP TABLE IF EXISTS public.mural_cards CASCADE;
DROP TABLE IF EXISTS public.murals CASCADE;
DROP TABLE IF EXISTS public.diary_entries CASCADE;
DROP TABLE IF EXISTS public.journey_blocks CASCADE;
DROP TABLE IF EXISTS public.journey_days CASCADE;
DROP TABLE IF EXISTS public.maps CASCADE;
DROP TABLE IF EXISTS public.supplies CASCADE;
DROP TABLE IF EXISTS public.npcs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.campaign CASCADE;

-- ==========================================
-- TABELAS
-- ==========================================

CREATE TABLE public.campaign (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  current_day   INTEGER DEFAULT 1,
  active_block_index INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  class         TEXT NOT NULL,
  status        TEXT DEFAULT 'Saudável',
  exhaustion    INTEGER DEFAULT 0,
  hp            INTEGER DEFAULT 10,
  max_hp        INTEGER DEFAULT 10,
  gold          INTEGER DEFAULT 0,
  rations       INTEGER DEFAULT 0,
  notes         TEXT DEFAULT '',
  image_url     TEXT,
  attributes    JSONB DEFAULT '{}'::jsonb,
  skills        JSONB DEFAULT '{}'::jsonb,
  inventory     JSONB DEFAULT '[]'::jsonb,
  is_dead       BOOLEAN DEFAULT false,
  is_transformed BOOLEAN DEFAULT false,
  transformation JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  role          TEXT DEFAULT 'player' CHECK (role IN ('gm', 'player')),
  player_id     UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.npcs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT DEFAULT 'npc',
  class         TEXT,
  status        TEXT DEFAULT 'Neutro',
  location      TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  image_url     TEXT,
  attributes    JSONB DEFAULT '{}'::jsonb,
  skills        JSONB DEFAULT '{}'::jsonb,
  is_hidden     BOOLEAN DEFAULT false,
  is_dead       BOOLEAN DEFAULT false,
  is_transformed BOOLEAN DEFAULT false,
  transformation JSONB,
  faction       TEXT DEFAULT 'neutral',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.supplies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE UNIQUE,
  water         INTEGER DEFAULT 0,
  food          INTEGER DEFAULT 0,
  people        INTEGER DEFAULT 0,
  last_updated  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.maps (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  image_url     TEXT,
  is_visible    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.journey_days (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id   UUID REFERENCES public.campaign(id) ON DELETE CASCADE,
  day_number    INTEGER NOT NULL,
  weather       TEXT DEFAULT 'Ensolarado',
  events        TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, day_number)
);

CREATE TABLE public.journey_blocks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id        UUID REFERENCES public.journey_days(id) ON DELETE CASCADE,
  block_index   INTEGER NOT NULL,
  weather       TEXT DEFAULT 'clear',
  weather_effect TEXT DEFAULT 'clear',
  timeline      JSONB DEFAULT '[]'::jsonb,
  plots         JSONB DEFAULT '[]'::jsonb,
  sidequests    JSONB DEFAULT '[]'::jsonb,
  player_sessions JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_id, block_index)
);

CREATE TABLE public.diary_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  content       TEXT DEFAULT '',
  day_number    INTEGER,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.murals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  pan_x         FLOAT DEFAULT 0,
  pan_y         FLOAT DEFAULT 0,
  zoom          FLOAT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mural_cards (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mural_id      UUID REFERENCES public.murals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT DEFAULT '',
  type          TEXT DEFAULT 'note',
  position_x    FLOAT DEFAULT 0,
  position_y    FLOAT DEFAULT 0,
  width         FLOAT DEFAULT 200,
  height        FLOAT DEFAULT 120,
  color         TEXT DEFAULT '#2A2A35',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mural_connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mural_id      UUID REFERENCES public.murals(id) ON DELETE CASCADE,
  from_card_id  UUID REFERENCES public.mural_cards(id) ON DELETE CASCADE,
  to_card_id    UUID REFERENCES public.mural_cards(id) ON DELETE CASCADE,
  label         TEXT DEFAULT '',
  color         TEXT DEFAULT '#646CFF',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- RLS
-- ==========================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_connections ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- FUNÇÃO AUXILIAR is_gm()
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_gm()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'gm'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- POLICIES
-- ==========================================

-- PROFILES
CREATE POLICY "Leitura global de perfis"       ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insere perfil"             ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Jogador atualiza proprio perfil" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "GM gerencia perfis"             ON profiles FOR ALL    USING (public.is_gm());

-- NPCS
CREATE POLICY "GM gerencia NPCs"               ON npcs FOR ALL    USING (public.is_gm());
CREATE POLICY "Jogadores leem NPCs visiveis"   ON npcs FOR SELECT USING (is_hidden = FALSE OR public.is_gm());

-- PLAYERS
CREATE POLICY "Leitura global de jogadores"    ON players FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia jogadores"          ON players FOR ALL    USING (public.is_gm());
CREATE POLICY "Jogador edita propria ficha"    ON players FOR UPDATE USING (
  id = (SELECT player_id FROM profiles WHERE id = auth.uid())
);

-- CAMPAIGN, JOURNEY_DAYS, JOURNEY_BLOCKS, SUPPLIES, MAPS
CREATE POLICY "Leitura global campanha"        ON campaign       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia campanha"           ON campaign       FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global dias"            ON journey_days   FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia dias"               ON journey_days   FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global blocos"          ON journey_blocks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia blocos"             ON journey_blocks FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global suprimentos"     ON supplies       FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia suprimentos"        ON supplies       FOR ALL    USING (public.is_gm());

CREATE POLICY "Leitura global mapas"           ON maps           FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "GM gerencia mapas"              ON maps           FOR ALL    USING (public.is_gm());

-- COLABORATIVOS (todos autenticados)
CREATE POLICY "Acesso total diarios"           ON diary_entries      FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total murais"            ON murals             FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total mural_cards"       ON mural_cards        FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso total mural_connections" ON mural_connections  FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- TRIGGER: cria profile automaticamente no signup
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, player_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Jogador'),
    COALESCE(new.raw_user_meta_data->>'role', 'player'),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- RPC: merge_player_session
-- ==========================================

CREATE OR REPLACE FUNCTION merge_player_session(
  p_block_id    uuid,
  p_player_id   text,
  p_session_data jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Valida que o player_id pertence ao usuário autenticado
  IF p_player_id != (
    SELECT player_id::text FROM profiles WHERE id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Não autorizado. Apenas o dono do personagem pode salvar.';
  END IF;

  UPDATE journey_blocks
  SET player_sessions =
    COALESCE(player_sessions, '{}'::jsonb) ||
    jsonb_build_object(p_player_id, p_session_data)
  WHERE id = p_block_id;
END;
$$;

-- ==========================================
-- RPC: reset_campaign
-- ==========================================

CREATE OR REPLACE FUNCTION reset_campaign()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_gm() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  DELETE FROM mural_connections;
  DELETE FROM mural_cards;
  DELETE FROM murals;
  DELETE FROM diary_entries;
  DELETE FROM maps;
  DELETE FROM supplies;
  DELETE FROM journey_blocks;
  DELETE FROM journey_days;
  DELETE FROM players;
  DELETE FROM npcs;
  DELETE FROM campaign;

  -- Recria estado base
  INSERT INTO public.campaign (name, current_day, active_block_index)
    VALUES ('Campanha MyRPG', 1, 0);

  INSERT INTO public.murals (name)
    VALUES ('Quadro de Investigação');

  INSERT INTO public.journey_days (campaign_id, day_number, weather, events)
    SELECT id, 1, 'Ensolarado', 'O início da jornada.' FROM public.campaign LIMIT 1;
END;
$$;

-- ==========================================
-- BACKFILL: usuários já existentes ganham profile
-- ==========================================

INSERT INTO public.profiles (id, email, display_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1), 'Jogador'),
  COALESCE(raw_user_meta_data->>'role', 'player')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SEED INICIAL
-- ==========================================

INSERT INTO public.campaign (name, current_day, active_block_index)
SELECT 'Campanha MyRPG', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM public.campaign);

INSERT INTO public.murals (name)
SELECT 'Quadro de Investigação'
WHERE NOT EXISTS (SELECT 1 FROM public.murals);

INSERT INTO public.journey_days (campaign_id, day_number, weather, events)
SELECT id, 1, 'Ensolarado', 'O início da jornada.'
FROM public.campaign
WHERE NOT EXISTS (SELECT 1 FROM public.journey_days);
```

---

## ⚙️ IMPLEMENTAÇÃO — Arquivo por arquivo

### `package.json` — dependências obrigatórias

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

> **Não instale Tailwind** — o projeto usa CSS próprio com variáveis customizadas.

---

### `lib/supabase/client.ts` — SINGLETON obrigatório

```typescript
// ⚠️ ÚNICO lugar onde createBrowserClient é chamado
import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}
```

### `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

### `lib/supabase/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redireciona para login se não autenticado (fora de rotas públicas)
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/auth')

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

### `middleware.ts` (raiz)

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|auth/callback|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

### `contexts/AuthContext.tsx` — spec completa

**Responsabilidade única:** sessão Supabase Auth. Nada mais.

```typescript
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'

type AuthContextType = {
  user: User | null
  loading: boolean          // true apenas durante hidratação inicial
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Hidratação inicial — usa getSession (não getUser, evita request extra)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listener para mudanças subsequentes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
```

---

### `contexts/UserSessionContext.tsx` — spec completa

**Responsabilidade única:** buscar profile e personagem do usuário logado.

```typescript
'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getSupabaseClient } from '@/lib/supabase/client'

// Tipos inline — adaptar conforme types/index.ts
type Profile = {
  id: string
  email: string
  display_name: string | null
  role: 'gm' | 'player'
  player_id: string | null
}

type Player = {
  id: string
  name: string
  class: string
  hp: number
  max_hp: number
  // ... demais campos do schema
}

type UserSessionContextType = {
  profile: Profile | null
  isGM: boolean
  playerCharacter: Player | null
  sessionLoading: boolean
  refreshProfile: () => Promise<void>
}

const UserSessionContext = createContext<UserSessionContextType | null>(null)

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playerCharacter, setPlayerCharacter] = useState<Player | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const supabase = getSupabaseClient()

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setPlayerCharacter(null)
      setSessionLoading(false)
      return
    }

    setSessionLoading(true)
    try {
      // 1. Busca profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile não existe ainda — cria (fallback caso trigger falhe)
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email ?? '',
            display_name: user.email?.split('@')[0] ?? 'Jogador',
            role: 'player',
            player_id: null,
          })
          .select()
          .single()
        setProfile(newProfile)
      } else {
        setProfile(profileData)
      }

      // 2. Se tem player_id, busca o personagem
      if (profileData?.player_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('*')
          .eq('id', profileData.player_id)
          .single()
        setPlayerCharacter(playerData ?? null)
      } else {
        setPlayerCharacter(null)
      }
    } catch (err) {
      console.error('[UserSessionContext] Erro ao buscar profile:', err)
    } finally {
      setSessionLoading(false)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return (
    <UserSessionContext.Provider value={{
      profile,
      isGM: profile?.role === 'gm',
      playerCharacter,
      sessionLoading,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </UserSessionContext.Provider>
  )
}

export function useUserSession() {
  const ctx = useContext(UserSessionContext)
  if (!ctx) throw new Error('useUserSession deve ser usado dentro de UserSessionProvider')
  return ctx
}
```

---

### `contexts/AppContext.tsx` — estado global da UI

```typescript
'use client'
import { createContext, useContext, useState } from 'react'

type View = 'dashboard' | 'cronicas' | 'maps' | 'settings' | 'users'

type ModalState = { isOpen: boolean; data?: unknown }

type AppContextType = {
  activeView: View
  setActiveView: (v: View) => void
  openModal: (name: string, data?: unknown) => void
  closeModal: (name: string) => void
  getModal: (name: string) => ModalState
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [modals, setModals] = useState<Record<string, ModalState>>({})

  const openModal = (name: string, data?: unknown) =>
    setModals(prev => ({ ...prev, [name]: { isOpen: true, data } }))

  const closeModal = (name: string) =>
    setModals(prev => ({ ...prev, [name]: { isOpen: false } }))

  const getModal = (name: string): ModalState =>
    modals[name] ?? { isOpen: false }

  return (
    <AppContext.Provider value={{ activeView, setActiveView, openModal, closeModal, getModal }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
```

---

### `app/layout.tsx` — Root layout

```typescript
// SÓ AuthProvider aqui. AppProvider fica no (app)/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext'
import { SystemDialogProvider } from '@/contexts/SystemDialogContext'
import type { Metadata } from 'next'
import './styles/globals.css'

export const metadata: Metadata = { title: 'MyRPG' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <SystemDialogProvider>
            {children}
          </SystemDialogProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### `app/(app)/layout.tsx` — App layout

```typescript
// ORDEM OBRIGATÓRIA dos providers
import { UserSessionProvider } from '@/contexts/UserSessionContext'
import { AppProvider } from '@/contexts/AppContext'
import AppShell from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserSessionProvider>
      <AppProvider>
        <AppShell>
          {children}
        </AppShell>
      </AppProvider>
    </UserSessionProvider>
  )
}
```

---

### `hooks/useGameSync.ts` — canal único

```typescript
'use client'
import { useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type SyncEventType =
  | 'player_update'
  | 'npc_update'
  | 'supply_update'
  | 'block_update'
  | 'mural_update'
  | 'map_update'
  | 'campaign_update'

export type SyncEvent = {
  type: SyncEventType
  payload: unknown
}

type SyncHandler = (event: SyncEvent) => void

export function useGameSync(onEvent: SyncHandler) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Evita criar canal duplicado
    if (channelRef.current) return

    const channel = supabase.channel('game-sync')

    channel.on('broadcast', { event: 'game_update' }, ({ payload }) => {
      try {
        onEvent(payload as SyncEvent)
      } catch (err) {
        console.error('[useGameSync] Erro ao processar evento:', err)
      }
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[useGameSync] Canal conectado')
      }
    })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcast de evento para todos (GM → jogadores)
  const broadcast = useCallback(async (event: SyncEvent) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'game_update',
      payload: event,
    })
  }, [])

  return { broadcast }
}
```

---

### `components/layout/AppShell.tsx` — monta o canal aqui

```typescript
'use client'
import { useGameSync } from '@/hooks/useGameSync'
import { useUserSession } from '@/contexts/UserSessionContext'
// ... imports de views, sidebar etc.

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { sessionLoading, profile } = useUserSession()

  // Canal único montado no nível mais alto da app autenticada
  const { broadcast } = useGameSync((event) => {
    // Dispatch para AppContext ou estado local conforme o tipo
    console.log('[AppShell] Sync recebido:', event.type)
  })

  if (sessionLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-indicator" />
      </div>
    )
  }

  // Player sem personagem vinculado
  if (profile && profile.role === 'player' && !profile.player_id) {
    return (
      <div className="waiting-screen">
        <p>Aguarde o GM associar seu personagem.</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Sidebar + conteúdo principal */}
      {children}
    </div>
  )
}
```

---

### `app/(auth)/login/page.tsx` — página de login

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [loading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await signIn(email, password)
    if (error) {
      setError('Email ou senha incorretos.')
      setSubmitting(false)
    }
    // Se ok, o useEffect acima redireciona automaticamente via isAuthenticated
  }

  if (loading) {
    return (
      <div className="login-loading">
        <div className="pulse-indicator" />
        <p>Verificando autenticação...</p>
      </div>
    )
  }

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1>MyRPG</h1>
        {error && <p className="login-error">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
```

---

## 🎨 CSS — regras de preservação

### Variáveis obrigatórias em `globals.css`

Copie do repositório original. As principais que **não podem faltar**:

```css
:root {
  /* Backgrounds */
  --bg-dark: #0d0d14;
  --bg-card: #14141f;
  --bg-modal: #1a1a2e;
  --bg-sidebar: #0f0f1a;
  --bg-elevated: #1e1e2e;

  /* Borders */
  --border-subtle: hsla(240, 20%, 60%, 0.15);
  --border-active: hsla(240, 80%, 70%, 0.4);

  /* Accent */
  --accent-primary: #646cff;
  --accent-hover: #535bf2;
  --accent-glow: hsla(240, 100%, 70%, 0.3);

  /* Text */
  --text-primary: #e8e8f0;
  --text-muted: hsla(240, 20%, 70%, 0.6);
  --text-dim: hsla(240, 20%, 60%, 0.4);

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

### Classes CSS críticas — não renomear, não remover

Do `blocks.css`:
- `.hp-current-input`, `.hp-adjuster-group`, `.hp-mod-btn`, `.hp-mod-amount-input`, `.hp-max-val`
- `.block-container`, `.block-header`, `.block-content`, `.block-actions`
- `.timeline-item`, `.timeline-avatar-wrapper`, `.timeline-card`
- `.pulse-indicator`

Do `modals.css`:
- `.modal-overlay`, `.modal-container`, `.modal-header`, `.modal-footer`, `.modal-body`
- `.modal-close-btn`

Do `sidebar.css`:
- `.sidebar`, `.sidebar-nav`, `.sidebar-item`, `.sidebar-item.active`
- `.sidebar-avatar`, `.sidebar-username`

---

## 🐛 BUGS CONHECIDOS — corrija durante a reconstrução

### Bug 1 — "Aguarde o GM" para usuários com personagem vinculado
**Causa:** profile não era criado no signup. O trigger `handle_new_user` no schema acima resolve.
**Verifique:** após signup, a tabela `profiles` deve ter uma row para o usuário.

### Bug 2 — Loading eterno em Crônicas, Mapas, Usuários
**Causa:** componentes dependiam de um contexto que ainda estava `loading: true`, sem fallback.
**Correção:** cada view deve ter seu próprio `useEffect` de fetch **independente**, com estado `loading` e `error` próprios. Nunca dependa de `sessionLoading` do `UserSessionContext` para montar dados de view.

```typescript
// Padrão correto para views com fetch
function CronicasView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('diary_entries').select('*')
        if (error) throw error
        setData(data)
      } catch (err) {
        console.error('[CronicasView]', err)
        setError('Erro ao carregar crônicas.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="loading-state">Carregando...</div>
  if (error)   return <div className="error-state">{error}</div>
  // ... render
}
```

### Bug 3 — Canal Realtime duplicado
**Causa:** `useGameSync` era instanciado em vários componentes.
**Correção:** instanciar apenas em `AppShell`. Os filhos recebem `broadcast` via prop ou context.

### Bug 4 — Delete apagava tudo quando lista estava vazia
**Causa:** `.delete().in('id', [])` no Supabase deleta TODAS as rows.
**Correção:** sempre checar antes:
```typescript
if (idsToDelete.length > 0) {
  await supabase.from('mural_cards').delete().in('id', idsToDelete)
}
```

### Bug 5 — `merge_player_session` com comparação errada
**Causa:** o original comparava `player_id` com `auth.uid()` (UUIDs diferentes).
**Correção:** está corrigida no SQL acima — busca `player_id` pelo `profiles` do usuário.

### Bug 6 — Hydration mismatch
**Causa:** renderização server/client divergindo por dados condicionais.
**Correção:** use `suppressHydrationWarning` apenas onde necessário (ex: timestamps). Para dados de usuário, use `useEffect` + estado local.

---

## 📋 INVENTÁRIO COMPLETO — o que preservar do repo original

### Views (ler do `myrpgbroken/components/views/`)
| Arquivo | O que preservar |
|---------|----------------|
| `DashboardView.tsx` | Layout de blocos, controles do GM, lógica de dia/bloco ativo |
| `DashboardBlock.tsx` | Renderização de timeline, plots, sidequests, player_sessions |
| `NpcCard.tsx` | Cards de NPC com status, HP, transformação, visibilidade |
| `PlayerCard.tsx` | Fichas de jogador, HP adjuster, status, inventário |
| `CronicasView.tsx` | Abas: Investigações (mural) + Diário de bordo |
| `MapsView.tsx` | Upload e exibição de mapas, toggle de visibilidade |
| `SettingsView.tsx` | Gerenciamento de usuários, reset de campanha |

### Modais (ler do `myrpgbroken/components/modals/`)
| Modal | O que preservar |
|-------|----------------|
| `NpcFormModal` | Formulário completo com todos os campos do NPC, upload de avatar |
| `NpcDetailModal` | Visualização detalhada, HP interativo, notas |
| `PlayerFormModal` | Formulário completo, atributos, habilidades |
| `PlayerDetailModal` | Ficha completa, transformação, inventário |
| `PlayerManageModal` | Vinculação player ↔ email de usuário |
| `SessionPlayerModal` | Visão do jogador da própria ficha |
| `PersonalNoteModal` | Anotações privadas por bloco |
| `SummaryCardModal` | Resumo expandido do bloco |
| `SystemDialogModals` | Dialogs de confirmação (sim/não) |

### Mecânicas de negócio críticas
- **HP Adjuster:** inputs de modificação de HP com botões +/- e campo direto. Sincroniza via broadcast após save.
- **Transformação:** toggle entre ficha normal e ficha transformada (campo `transformation jsonb`).
- **Visibilidade de NPCs:** `is_hidden` controla o que o jogador vê. GM vê tudo.
- **Player sessions:** cada jogador pode ter anotações privadas em cada bloco (`player_sessions[player_id]`).
- **Mural de investigações:** canvas drag-and-drop com cards, conexões, pan e zoom.
- **Sync em tempo real:** toda mudança do GM (NPC, player, supplies, blocks) faz broadcast via `game-sync`.

---

## ✅ CHECKLIST DE VALIDAÇÃO — não declare "pronto" sem passar tudo

### Auth
- [ ] Signup cria profile automaticamente (verificar na tabela `profiles`)
- [ ] Login GM → redireciona para `/dashboard` sem piscar
- [ ] Login Player COM personagem → redireciona para `/dashboard`
- [ ] Login Player SEM personagem → vê mensagem "aguarde o GM"
- [ ] Logout funciona e redireciona para `/login`
- [ ] Refresh de página não desloga nem fica em loading eterno

### Dados
- [ ] GM pode criar, editar, deletar NPCs
- [ ] GM pode criar, editar, deletar Players
- [ ] GM pode vincular player a email (`PlayerManageModal`)
- [ ] Player vê apenas NPCs com `is_hidden = false`
- [ ] Player pode editar apenas a própria ficha
- [ ] Player sessions salva corretamente (RPC `merge_player_session`)

### Views
- [ ] Crônicas carrega em < 3 segundos
- [ ] Mapas carrega em < 3 segundos
- [ ] Usuários (settings) carrega em < 3 segundos
- [ ] Mural salva cards e persiste após F5
- [ ] Mural não duplica cards ao salvar

### Real-time
- [ ] Mudança do GM em NPC chega para jogador aberto em outro browser
- [ ] Mudança do GM em supplies chega para jogadores
- [ ] Canal `game-sync` aparece apenas UMA vez no console do Supabase (Realtime)
- [ ] Sem duplicação de eventos ao navegar entre views

### Qualidade
- [ ] Console sem erros de hydration
- [ ] Console sem `Warning: Each child in a list should have a unique key`
- [ ] Nenhum `catch {}` silencioso — todos logam o erro
- [ ] Sem `getSupabaseClient()` chamado mais de uma vez por sessão
- [ ] CSS original preservado integralmente (variables, class names)

---

## 🚀 SEQUÊNCIA DE IMPLEMENTAÇÃO

Execute nesta ordem. **Não avance sem passar o checkpoint de cada fase.**

### Fase 1 — Fundação (⏱ ~30min)
1. `npx create-next-app@latest myrpg --typescript --app --no-tailwind`
2. Instalar dependências: `npm install @supabase/ssr @supabase/supabase-js`
3. Criar Supabase project novo → executar SQL completo acima
4. Criar `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Implementar `lib/supabase/client.ts`, `server.ts`, `middleware.ts`
6. Implementar `middleware.ts` na raiz

**✅ Checkpoint 1:** `npm run dev` sobe sem erros de compilação.

### Fase 2 — Auth (⏱ ~45min)
7. Implementar `contexts/AuthContext.tsx`
8. Implementar `app/layout.tsx` com `AuthProvider`
9. Implementar `app/(auth)/login/page.tsx`

**✅ Checkpoint 2:** Login GM funciona → redireciona para `/dashboard`. Login errado → mostra erro.

### Fase 3 — Sessão de usuário (⏱ ~30min)
10. Implementar `contexts/UserSessionContext.tsx`
11. Implementar `contexts/AppContext.tsx`
12. Implementar `app/(app)/layout.tsx`
13. Implementar `components/layout/AppShell.tsx` (shell vazio com hook do canal)

**✅ Checkpoint 3:** Player sem personagem vê "aguarde GM". Player com personagem passa. GM passa direto.

### Fase 4 — Sync (⏱ ~20min)
14. Implementar `hooks/useGameSync.ts`
15. Integrar canal no `AppShell`
16. Implementar `components/layout/Sidebar.tsx`

**✅ Checkpoint 4:** Dois browsers abertos — broadcast do GM aparece no console do jogador.

### Fase 5 — Views principais (⏱ ~2h)
17. Copiar `DashboardView.tsx` e `DashboardBlock.tsx` do repositório
18. Copiar `NpcCard.tsx` e `PlayerCard.tsx`
19. Copiar todos os modais de NPC e Player
20. Adicionar broadcasts após saves de NPC, Player, Supplies

**✅ Checkpoint 5:** GM cria NPC → aparece em tempo real no browser do jogador.

### Fase 6 — Crônicas e Mural (⏱ ~1h)
21. Implementar `CronicasView.tsx` com fetch independente
22. Implementar `DiarioEntryCard.tsx`
23. Implementar `MuralCanvas.tsx` com todos os fixes:
    - Delete seguro (`ids.length > 0`)
    - Broadcast após save
    - Pan com valor default (`pan ?? { x: 0, y: 0 }`)

**✅ Checkpoint 6:** Mural salva, persiste após F5, sync chega para outros browsers.

### Fase 7 — Mapas, Settings, CSS (⏱ ~1h)
24. `MapsView.tsx` e `SettingsView.tsx`
25. Copiar `blocks.css`, `modals.css`, `sidebar.css` do repositório
26. Aplicar checklist final completo

---

## 📎 REFERÊNCIAS DOS REPOSITÓRIOS

| Repositório | Usar para |
|-------------|-----------|
| `github.com/ptamay/myrpgbroken` | **Fonte principal** — código de todos os componentes, views, CSS, lógica de negócio |
| `github.com/ptamay/myrpg-next` commit `0293dbd` | UI de referência alternativa (estado estável anterior) |

**Ao ler código do `myrpgbroken`:**
- Componentes de UI → copiar quase literalmente
- Contextos (`AuthContext`, `UserSessionContext`) → **reescrever** seguindo as specs acima
- Hooks (`useGameSync`, `useRealtime`) → **reescrever** seguindo specs acima
- CSS → copiar integralmente
- `db_schema_rebuild_final.sql` → **usar o SQL deste documento** (é o mesmo + correções)
