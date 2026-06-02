# Plano de Implementação — Sistema de Combate D&D 5e
**Projeto:** myRPG-Next2 | **Última revisão:** 2026-06-02

> [!IMPORTANT]
> Este documento é o **guia de execução definitivo**. Cada fase tem pré-requisitos claros, passos ordenados e critérios de conclusão. Não inicie uma fase sem validar os critérios da anterior.

---

## Visão Geral

```
FASE 0 → FASE 1 → FASE 3 → FASE 4 → FASE 5 → FASE 2
  ↑         ↑        ↑        ↑        ↑        ↑
Fundação  HP GM   Dados   Combate  Integra  Buffs
(SQL +    Manual  Widget  Modal    Dados→   Status
import)                           HP
```

| Fase | Nome | Depende de | Dificuldade | Risco |
|---|---|---|---|---|
| **0** | Fundação (SQL + Imports) | — | ⭐ Fácil | Baixo |
| **1** | HP Manual (somente GM) | Fase 0 | ⭐ Fácil | Baixo |
| **3** | Widget de Dados | Fase 1 | ⭐⭐⭐ Médio-Alto | Médio |
| **4** | Modo Combate Reformulado | Fase 3 | ⭐⭐⭐⭐ Difícil | Alto |
| **5** | Integração Dados → HP | Fases 3 + 4 | ⭐⭐⭐⭐ Difícil | Alto |
| **2** | Buffs / Status | Fase 1 | ⭐⭐ Médio | Médio |

### Viabilidade Supabase Free Tier
- Estado de combate vive em **memória + Realtime Broadcast** → zero writes durante o combate
- Apenas o resultado final (HP, mortes) vai ao banco → impacto mínimo no Free Tier
- 2M mensagens/mês Realtime → suficiente para grupos pequenos de RPG

---

## FASE 0 — Fundação: SQL + Sistemas de Importação

> **Objetivo:** Preparar o banco de dados e os importadores para suportar todos os campos necessários ao combate, sem alterar nenhum componente React.

### Pré-requisitos
- Acesso ao Supabase SQL Editor
- Nenhum combate ativo no sistema

### Passo 0.1 — Migração do Banco de Dados

Execute **em ordem** no Supabase SQL Editor:

```sql
-- =============================================
-- FASE 0: Migração de Schema — myRPG Combat
-- =============================================

-- 1. Vida Temporária (persiste entre sessões)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0;
ALTER TABLE public.npcs    ADD COLUMN IF NOT EXISTS temp_hp INTEGER DEFAULT 0;

-- 2. CA e Resistência temporária para NPCs
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS temp_ac  INTEGER DEFAULT 0;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS temp_res TEXT    DEFAULT '';

-- 3. Condições de Combate D&D 5e (ex: ["poisoned", "stunned"])
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs    ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;

-- 4. Buffs Ativos (ex: Armadura Arcana, Abençoar)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS active_buffs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.npcs    ADD COLUMN IF NOT EXISTS active_buffs JSONB DEFAULT '[]'::jsonb;

-- 5. Salvaguardas com proficiência para NPCs (ex: ["FOR", "CON"])
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS saves JSONB DEFAULT '[]'::jsonb;

-- 6. Bônus de Proficiência para NPCs (calculado via CR se vazio)
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS prof_bonus TEXT DEFAULT '';

-- 7. Horas de sono (campo existe na interface mas não no banco)
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS sleep_hours_today INTEGER DEFAULT 0;

-- 8. Padronização: skills de NPCs de objeto {} para array []
--    EXECUTAR NA ORDEM ABAIXO:
UPDATE public.npcs SET skills = '[]'::jsonb WHERE jsonb_typeof(skills) = 'object';
-- (O DEFAULT já é '[]' — sem necessidade de ALTER aqui se o UPDATE limpar os dados)
```

> [!WARNING]
> Confirme que o `UPDATE` retornou sem erros antes de continuar. Se houver NPCs com `skills` em formato de objeto com dados, faça backup antes.

**✅ Critério de conclusão:** Todas as colunas acima existem nas tabelas `players` e `npcs` sem erros.

---

### Passo 0.2 — Atualizar Interfaces TypeScript

**Arquivo:** [`lib/gameData.ts`](file:///e:/@Projetos/myrpg-next2/lib/gameData.ts)

Adicionar os novos campos às interfaces `Player` e `Npc`:

```typescript
// Na interface Player, adicionar após isDead:
tempHp?: number;
conditions?: string[];        // ex: ['poisoned', 'stunned']
activeBuffs?: ActiveBuff[];   // definido em lib/types/buffs.ts
sleepHoursToday?: number;

// Na interface Npc, adicionar após isDead:
tempHp?: number;
tempAc?: number;
tempRes?: string;
conditions?: string[];
activeBuffs?: ActiveBuff[];
saves?: string[];             // ex: ['FOR', 'CON']
profBonus?: string;           // ex: '+3'
```

**Arquivo:** [`lib/types/buffs.ts`](file:///e:/@Projetos/myrpg-next2/lib/types/buffs.ts) — **[NOVO]**

```typescript
export interface ActiveBuff {
  id: string;
  name: string;
  source: string;
  effects: {
    acBonus?: number;
    speedBonus?: number;
    darkvision?: number;
    advantage?: string[];    // ex: ['STR_save', 'DEX_check']
    resistance?: string[];
    custom?: string;
  };
  duration: 'combat' | 'short_rest' | 'long_rest' | 'permanent' | number;
  appliedAt?: string;
}
```

**✅ Critério de conclusão:** TypeScript compila sem erros (`npm run build` sem type errors).

---

### Passo 0.3 — Atualizar Mappers do Supabase

**Arquivo:** [`lib/supabase/mappers.ts`](file:///e:/@Projetos/myrpg-next2/lib/supabase/mappers.ts)

**Em `mapPlayerToDB`**, adicionar:
```typescript
temp_hp: player.tempHp || 0,
conditions: player.conditions || [],
active_buffs: player.activeBuffs || [],
sleep_hours_today: player.sleepHoursToday || 0,
```

**Em `mapDBToPlayer`**, adicionar:
```typescript
tempHp: row.temp_hp || 0,
conditions: row.conditions || [],
activeBuffs: row.active_buffs || [],
sleepHoursToday: row.sleep_hours_today || 0,
```

**Em `mapNpcToDB`**, adicionar:
```typescript
temp_hp: npc.tempHp || 0,
temp_ac: npc.tempAc || 0,
temp_res: npc.tempRes || '',
conditions: npc.conditions || [],
active_buffs: npc.activeBuffs || [],
saves: npc.saves || [],
prof_bonus: npc.profBonus || '',
```

**Em `mapDBToNpc`**, adicionar:
```typescript
tempHp: row.temp_hp || 0,
tempAc: row.temp_ac || 0,
tempRes: row.temp_res || '',
conditions: row.conditions || [],
activeBuffs: row.active_buffs || [],
saves: row.saves || [],
profBonus: row.prof_bonus || '',
```

> [!WARNING]
> Remover duplicação existente: `mapPlayerToDB` salva `class` e `player_class` com o mesmo valor. Manter apenas `player_class` (o campo `class` é legado).

**✅ Critério de conclusão:** Abrir e fechar uma ficha de NPC e Player sem erros no console.

---

### Passo 0.4 — Atualizar Import via IA (Players)

**Arquivo:** [`app/api/import-player/route.ts`](file:///e:/@Projetos/myrpg-next2/app/api/import-player/route.ts)

Substituir o conteúdo do `text:` no `parts.unshift()` pelo prompt abaixo:

```typescript
text: `Você é um assistente especialista em D&D 5e.
Extraia os dados da ficha de personagem da(s) imagem(ns) anexada(s).
Se algum campo não for encontrado, use o valor padrão indicado.

REGRAS OBRIGATÓRIAS DE FORMATO:
- "ac": APENAS número inteiro (ex: 15). NUNCA texto como "(armadura de couro)".
- "init": bônus com sinal (ex: "+3" ou "-1"). NUNCA "Vantagem" ou texto livre.
- "speed": formato "30 ft" ou "9 m". SEMPRE inclua a unidade.
- "profBonus": número com sinal (ex: "+2").
- "saves": APENAS siglas do array: ["FOR", "DES", "CON", "INT", "SAB", "CAR"].
- "skills": nome exato com atributo entre parênteses (ex: "Acrobacia (Des)").
- "attacks.bonus": bônus de acerto com sinal (ex: "+5").
- "attacks.dmg": fórmula de dado com tipo (ex: "1d6+3 cortante").

Retorne APENAS JSON válido com esta estrutura:
{
  "name": "Nome do Personagem",
  "playerClass": "Classe",
  "playerLevel": 1,
  "race": "Raça",
  "background": "",
  "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10,
  "hpMax": 10,
  "ac": 10,
  "init": "+0",
  "speed": "30 ft",
  "perc": 10,
  "hdTotal": "1d10",
  "profBonus": "+2",
  "inspiration": false,
  "minSleepReq": 8,
  "saves": [],
  "skills": [],
  "attacks": [{ "name": "Arma", "bonus": "+4", "dmg": "1d6+2 cortante" }],
  "inventory": [],
  "notes": "",
  "personalGoals": ""
}`
```

**✅ Critério de conclusão:** Importar uma ficha de teste e verificar que `ac` retorna número, `saves` retorna array de siglas, `speed` tem unidade.

---

### Passo 0.5 — Atualizar Template e Parser de Importação de NPC

**Arquivo:** [`components/modals/ImportModals.tsx`](file:///e:/@Projetos/myrpg-next2/components/modals/ImportModals.tsx)

**5a. Atualizar a constante `templateStr`:**

```typescript
const templateStr = `Nome: 
Título/Ocupação: 
Facção (ally/neutral/enemy): 
Raça: 
Alinhamento: 
ND/CR: 
PV Máx: 
CA: 
Deslocamento (ex: 30 ft): 
Iniciativa (ex: +2): 
Percepção: 
Bônus de Proficiência (ex: +3): 
FOR: 10
DES: 10
CON: 10
INT: 10
SAB: 10
CAR: 10
Salvaguardas (ex: FOR, CON): 
Perícias (ex: Furtividade (Des), Percepção (Sab)): 
Ataque Principal (resumo): 
Ataques: Nome[Espada] Bônus[+5] Dano[1d6+3 cortante] | Nome[Arco] Bônus[+4] Dano[1d8+2 perfurante]
Resistências: 
Imunidades: 
Ações (Livre): 
Motivações: 
Segredos: 
Traços: 
Itens Visíveis: 
Itens Ocultos: 
Notas Extras: 
Magias Diárias: 1º[0] 2º[0] 3º[0] 4º[0] 5º[0] 6º[0] 7º[0] 8º[0] 9º[0]`;
```

**5b. Adicionar ao `handleProcess()` — dentro do bloco de parsing de `key/value`:**

```typescript
// Após a linha: if (key.includes("notas") || key.includes("extras")) data.notes = value;

// Salvaguardas (novo)
if (key.includes("salvaguardas") || key === "saves") {
  data.saves = value.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
}

// Bônus de Proficiência (novo)
if (key.includes("bonus de proficiencia") || key.includes("prof")) {
  data.profBonus = value.trim();
}

// Perícias (novo)
if (key.includes("pericias") || key.includes("skills")) {
  data.skills = value.split(",").map((s: string) => s.trim()).filter(Boolean);
}

// Ataques estruturados (novo — formato pipe)
if (key === "ataques") {
  data.attacks = value.split("|").map((atk: string) => {
    const nomeMatch = atk.match(/Nome\[([^\]]+)\]/i);
    const bonusMatch = atk.match(/B[oô]nus\[([^\]]+)\]/i);
    const danoMatch = atk.match(/Dano\[([^\]]+)\]/i);
    return {
      name: nomeMatch?.[1]?.trim() || "",
      bonus: bonusMatch?.[1]?.trim() || "",
      dmg: danoMatch?.[1]?.trim() || ""
    };
  }).filter((atk: any) => atk.name);
}

// Corrigir: forçar hpCurrent = hpMax na importação
if (key.includes("pv") || key.includes("hp")) {
  const val = parseInt(value) || 0;
  data.hpMax = val;
  data.hpCurrent = val;
}

// Corrigir: CA como número inteiro
if (key === "ca" || key === "ac") {
  data.ac = parseInt(value) || 0;
}
```

**✅ Critério de conclusão:** Importar um NPC via texto e verificar que `saves`, `skills` e `attacks` chegam preenchidos, `ac` é número, `hpCurrent === hpMax`.

---

### Passo 0.6 — Adicionar Campos de NPC ao Formulário

**Arquivo:** [`components/modals/NpcFormModal.tsx`](file:///e:/@Projetos/myrpg-next2/components/modals/NpcFormModal.tsx)

Adicionar ao `initialFormState`:
```typescript
profBonus: "",
saves: [] as string[],  // array gerenciado separadamente como no PlayerForm
skills: [] as string[], // idem
```

Adicionar seção "Proficiências" no formulário (após "Detalhes de Combate"), com os mesmos checkboxes de `SAVES_LIST` e `SKILLS_LIST` já usados no `PlayerFormModal`.

Atualizar `constructNpcObject` para incluir `saves`, `profBonus` e `skills`.
Atualizar `dataToFormState` do NPC para ler esses campos.

> [!IMPORTANT]
> Este passo torna o formulário de NPC compatível com os campos já existentes no formulário de Player. Use o `SAVES_LIST` e `SKILLS_LIST` já declarados em `PlayerFormModal.tsx` como referência — mover para um arquivo compartilhado `lib/constants/dnd5e.ts` evita duplicação.

**✅ Critério de conclusão:** Salvar um NPC com salvaguardas e perícias selecionadas, reabrir o formulário e verificar que os campos estão preenchidos.

---

**🏁 FASE 0 CONCLUÍDA quando:** SQL executado, TypeScript compila, imports testados, formulário de NPC com novos campos.

---

## FASE 1 — HP Manual (Somente GM)

> **Objetivo:** Remover completamente a UI antiga de HP dos cards e criar um editor inline limpo, restrito ao Mestre.

### Pré-requisitos
- Fase 0 concluída (campo `temp_hp` existe no banco e mapeado)

### Regras de Negócio
- **GM:** pode editar HP atual e HP temporário de qualquer Player e NPC
- **Jogador:** visualiza seu HP, não edita
- **Regra D&D 5e:** dano é descontado do HP Temp primeiro; cura não ultrapassa o HP Máximo

### Passo 1.1 — Limpar UI Antiga de HP

**Arquivos:** `PlayerCard.tsx` e `NpcCard.tsx`

Remover completamente:
- Todos os `useState` de `localHp`, `localTempHp`
- Todos os `useEffect` que sincronizam esses estados
- Funções `handleHpMod`, `handleTempHpMod` e similares
- Botões `+` / `-` inline de HP
- Qualquer `input` de quantidade de HP

Manter:
- A barra de vida (visual apenas)
- Os valores numéricos de HP (display estático)

### Passo 1.2 — Criar Componente `HpInlineEditor`

**Arquivo:** [`components/ui/HpInlineEditor.tsx`](file:///e:/@Projetos/myrpg-next2/components/ui/HpInlineEditor.tsx) — **[NOVO]**

```typescript
// Interface do componente
interface HpInlineEditorProps {
  hpCurrent: number;
  hpMax: number;
  tempHp: number;
  onApplyDamage: (amount: number) => void;
  onApplyHeal: (amount: number) => void;
  onSetTempHp: (amount: number) => void;
}
```

**Comportamento:**
- Renderiza um `<div>` sobreposto à barra de HP, visível apenas quando `isGM === true`
- Ao clicar na área de HP: expande um pequeno painel in-place com:
  - Input numérico centralizado (valor do dano/cura)
  - Dois botões: `🗡️ Dano` (vermelho) e `💚 Curar` (verde)
  - Campo separado menor para `⚡ HP Temp`
- Fechar ao clicar fora (blur) ou pressionar `Escape`

**Lógica de aplicação de dano (D&D 5e):**
```typescript
const applyDamage = (dmg: number) => {
  if (tempHp > 0) {
    const absorbed = Math.min(tempHp, dmg);
    const remaining = dmg - absorbed;
    onSetTempHp(tempHp - absorbed);
    if (remaining > 0) onApplyDamage(remaining);
  } else {
    onApplyDamage(dmg);
  }
};

const applyHeal = (heal: number) => {
  // Cura não ultrapassa o máximo
  onApplyHeal(Math.min(heal, hpMax - hpCurrent));
};
```

### Passo 1.3 — Integrar em PlayerCard e NpcCard

Em `PlayerCard.tsx` e `NpcCard.tsx`:

```typescript
// Adicionar handler de update de HP
const handleHpUpdate = (updates: Partial<{ hpCurrent: number; tempHp: number }>) => {
  handleActiveUpdate(updates);
};

// Adicionar no JSX, na seção da barra de HP:
{isGM && (
  <HpInlineEditor
    hpCurrent={activeHp}
    hpMax={activePlayer.hpMax}
    tempHp={activePlayer.tempHp || 0}
    onApplyDamage={(dmg) => handleHpUpdate({ hpCurrent: Math.max(0, activeHp - dmg) })}
    onApplyHeal={(heal) => handleHpUpdate({ hpCurrent: activeHp + heal })}
    onSetTempHp={(val) => handleHpUpdate({ tempHp: val })}
  />
)}
```

### Passo 1.4 — Estilizar

**Arquivo:** `app/styles/players-npcs.css`

Adicionar estilos para `.hp-inline-editor`, `.hp-editor-panel`, `.hp-btn-damage`, `.hp-btn-heal`, `.hp-temp-field`.

**✅ Critérios de conclusão:**
- GM consegue clicar no HP e aplicar dano/cura em 1 clique
- HP Temp é consumido antes do HP real
- Jogadores não veem nenhum controle de edição
- Dados persistem após reload da página

---

## FASE 3 — Widget de Rolagem de Dados

> **Objetivo:** Widget flutuante e arrastável para rolagens D&D 5e, com broadcast para todos os jogadores.

### Pré-requisitos
- Fase 1 concluída
- Campos `saves`, `skills`, `profBonus` populados (Fase 0)

### Passo 3.1 — Motor de Regras D&D 5e

**Arquivo:** [`lib/dice/dnd5e.ts`](file:///e:/@Projetos/myrpg-next2/lib/dice/dnd5e.ts) — **[NOVO]**

Implementar as seguintes funções puras (sem efeitos colaterais, fáceis de testar):

```typescript
// Parsers de string para número (críticos para compatibilidade)
export function parseModifier(str: string | number): number
  // ex: "+3" → 3, "-1" → -1, "3" → 3, "" → 0

export function parseAC(str: string | number): number
  // ex: "15" → 15, "15 (couro)" → 15, 15 → 15

export function parseSpeed(str: string): number
  // ex: "30 ft" → 30, "9 m" → 30, "30" → 30

export function parseProfBonus(str: string, cr?: string): number
  // ex: "+2" → 2; se vazio, calcula pelo CR: Math.floor((parseCR(cr) - 1) / 4) + 2

// Rolagem de dados
export function rollDie(sides: number): number
  // Math.floor(Math.random() * sides) + 1

export function rollWithAdvantage(sides: number): { result: number; rolls: number[] }
export function rollWithDisadvantage(sides: number): { result: number; rolls: number[] }

// Cálculo de bônus por tipo de rolagem
export function getAttackBonus(character: Player | Npc, attackIndex: number): number
export function getAbilityModifier(score: number): number
  // Math.floor((score - 10) / 2)

export function getSaveBonus(character: Player | Npc, ability: string): number
  // modificador + profBonus se tiver proficiência em saves

export function getSkillBonus(character: Player | Npc, skill: string): number
  // modificador base da perícia + profBonus se proficiente

export function getInitiativeBonus(character: Player | Npc): number
  // parseModifier(init) — fallback: DEX modifier

// Resultado final de uma rolagem
export interface RollResult {
  id: string;
  rolledBy: string;
  characterName: string;
  diceType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';
  modifier: number;
  rolls: number[];       // resultado bruto(s) do dado
  result: number;        // dado selecionado (maior/menor se vantagem/desvantagem)
  total: number;         // result + modifier
  rollType: 'attack' | 'damage' | 'ability' | 'save' | 'initiative' | 'custom';
  ability?: string;
  timestamp: string;
  advantage: 'normal' | 'advantage' | 'disadvantage';
  isCritical: boolean;   // d20 = 20
  isCritFail: boolean;   // d20 = 1
}
```

> [!IMPORTANT]
> Escrever este arquivo **antes** do widget. As funções são a base de tudo. Testar cada parser com os valores problemáticos encontrados na auditoria: `"+2"`, `"15 (couro)"`, `"30 ft"`, `""`.

### Passo 3.2 — Adicionar Tipo ao GameSync

**Arquivo:** [`hooks/useGameSync.ts`](file:///e:/@Projetos/myrpg-next2/hooks/useGameSync.ts)

```typescript
export type SyncEventType =
  | 'player_update'
  | 'npc_update'
  | 'supply_update'
  | 'block_update'
  | 'mural_update'
  | 'map_update'
  | 'campaign_update'
  | 'dice_roll'       // NOVO
  | 'combat_update'   // NOVO (para Fase 4)
```

### Passo 3.3 — Criar DiceWidget

**Arquivo:** [`components/ui/DiceWidget.tsx`](file:///e:/@Projetos/myrpg-next2/components/ui/DiceWidget.tsx) — **[NOVO]**

**Estrutura do componente:**
```
┌─────────────────────────────────┐
│ ⚄ Dados — [Rolando para: Alric▼]│  ← Drag handle + seletor de contexto (GM)
├─────────────────────────────────┤
│  d4  d6  d8  d10  d12  d20  d% │  ← Seleção de dado
├─────────────────────────────────┤
│ [Ataque▼] [Normal▼] [Bônus: +5] │  ← Tipo, vantagem, bônus auto
├─────────────────────────────────┤
│        [ 🎲 ROLAR ]             │
├─────────────────────────────────┤
│  ═══ 18 ═══  (d20=15 + bônus+3) │  ← Resultado com animação
│  ─ Alric: Ataque +5 → 18 ─     │  ← Histórico (últimas 5)
└─────────────────────────────────┘
```

**Posicionamento:** `position: fixed`, salvo/lido de `localStorage('dice-widget-pos')`. Implementar drag com `onMouseDown` + `onMouseMove` (sem biblioteca extra).

**Lógica do seletor de contexto (GM):**
- Exibe lista de todos os Players + NPCs ativos
- Ao selecionar, bônus automáticos são calculados via `lib/dice/dnd5e.ts` para aquele personagem

**Transmissão do resultado:**
```typescript
const { broadcast } = useGameSync(...);

const handleRoll = async () => {
  const result = performRoll(...); // usa lib/dice/dnd5e.ts
  setLastRoll(result);
  setRollHistory(prev => [result, ...prev].slice(0, 10));
  await broadcast({ type: 'dice_roll', payload: result });
};
```

### Passo 3.4 — Feed de Rolagens Global

**Arquivo:** [`components/ui/DiceRollFeed.tsx`](file:///e:/@Projetos/myrpg-next2/components/ui/DiceRollFeed.tsx) — **[NOVO]**

Toast/feed no canto da tela mostrando as últimas rolagens de todos os jogadores. Recebe eventos via `useGameSync` e exibe por 8 segundos antes de sumir.

### Passo 3.5 — Montar Globalmente

**Arquivo:** [`components/layout/AppShell.tsx`](file:///e:/@Projetos/myrpg-next2/components/layout/AppShell.tsx) — ou equivalente de layout

```tsx
// Montar no layout global (fora de qualquer rota)
<DiceWidget />
<DiceRollFeed />
```

**✅ Critérios de conclusão:**
- Widget aparece e pode ser arrastado
- Rolagem calcula bônus correto a partir da ficha
- Resultado aparece no feed de todos os jogadores simultaneamente
- GM pode trocar o personagem no seletor de contexto
- Posição do widget persiste após reload

---

## FASE 4 — Modo Combate Reformulado

> **Objetivo:** Criar o contexto global de combate, o modal de setup e o tracker de iniciativa.

### Pré-requisitos
- Fase 3 concluída (widget de dados funcionando)
- Campos `conditions`, `temp_hp`, `saves` no banco (Fase 0)

### Passo 4.1 — Contexto Global de Combate

**Arquivo:** [`contexts/CombatContext.tsx`](file:///e:/@Projetos/myrpg-next2/contexts/CombatContext.tsx) — **[NOVO]**

```typescript
// Tipos de dados do combate (100% em memória)
interface CombatParticipant {
  type: 'player' | 'npc';
  refId: string;           // ID do player/npc original (para persistência no endCombat)
  name: string;
  image?: string;
  isTransformed: boolean;  // NOVO: indica se está em forma transformada
  originalName?: string;   // NOVO: nome original do personagem (para exibição no tracker ex: "Talindra [🐻 Urso]")
  initiative: number;      // resultado final (d20 + bônus) — número
  hpCurrent: number;
  hpMax: number;
  tempHp: number;
  ac: number;              // parseAC() aplicado — sempre número
  speed: number;           // parseSpeed() aplicado — sempre número
  conditions: string[];
  activeBuffs: ActiveBuff[];
  isDelayed: boolean;
  isDead: boolean;
  // Referência para cálculos de dado
  saves: string[];
  profBonus: number;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
  attacks: { name: string; bonus: string; dmg: string }[];
}

interface CombatLogEntry {
  id: string;
  round: number;
  actorName: string;
  action: string;         // ex: "Ataque com Espada → 18 (Acerto!)"
  timestamp: string;
}

interface CombatSession {
  id: string;
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  participants: CombatParticipant[];
  log: CombatLogEntry[];
}

// Contexto expõe:
interface CombatContextValue {
  combat: CombatSession | null;
  startCombat: (players: Player[], npcs: Npc[]) => void;
  endCombat: () => Promise<void>;        // persiste HP final no banco
  nextTurn: () => void;
  applyDamage: (participantId: string, amount: number) => void;
  applyHeal: (participantId: string, amount: number) => void;
  addCondition: (participantId: string, condition: string) => void;
  removeCondition: (participantId: string, condition: string) => void;
  setInitiative: (participantId: string, value: number) => void;
  broadcastCombatState: () => void;
}
```

**Importante:** ao chamar `startCombat`, converter todos os campos string (`ac`, `speed`, `init`, `profBonus`) para número usando os parsers de `lib/dice/dnd5e.ts`. Isso garante que o motor de combate sempre recebe tipos corretos.

### Passo 4.2 — Hook de Combate com Persistência

**Arquivo:** [`contexts/CombatContext.tsx`](file:///e:/@Projetos/myrpg-next2/contexts/CombatContext.tsx) — *(Integrado ao próprio arquivo de contexto por simplicidade)*

```typescript
// Responsável por:
// 1. Converter Player/Npc → CombatParticipant (com parsers)
// 2. Broadcast do estado via useGameSync
// 3. Ao endCombat(): salvar hp_current, is_dead de volta ao banco Supabase
export function useCombat(): CombatContextValue
```

**Função de conversão (crítica para evitar bugs de tipo):**
```typescript
function toCombatParticipant(entity: Player | Npc, type: 'player' | 'npc'): CombatParticipant {
  // ⚠️ TRANSFORMAÇÃO: se o entity está transformado (Polimorfismo/Wildshape),
  // usar os stats da forma transformada como base de combate.
  // O refId continua apontando para o entity original para sincronização de HP no endCombat().
  const activeForm = (entity.isTransformed && entity.transformation)
    ? { ...entity, ...entity.transformation }  // merge: campos da transformação sobrescrevem o original
    : entity;

  return {
    type,
    refId: entity.id,           // ← sempre o ID original, não o da transformação
    name: activeForm.name,      // ← nome da forma ativa (ex: "Urso Pardo")
    image: activeForm.image,
    isTransformed: entity.isTransformed || false,
    originalName: entity.isTransformed ? entity.name : undefined, // para exibição no tracker
    initiative: 0, // será preenchido na rolagem de iniciativa
    hpCurrent: activeForm.hpCurrent ?? activeForm.hpMax ?? 0,
    hpMax: activeForm.hpMax ?? 0,
    tempHp: activeForm.tempHp || 0,
    ac: parseAC(activeForm.ac),           // ← parser aplicado aqui
    speed: parseSpeed(activeForm.speed),  // ← parser aplicado aqui
    conditions: activeForm.conditions || [],
    activeBuffs: activeForm.activeBuffs || [],
    isDelayed: false,
    isDead: activeForm.isDead ?? false,
    saves: activeForm.saves || [],
    profBonus: parseProfBonus(
      (activeForm as any).profBonus,
      (activeForm as Npc).cr
    ),
    str: Number(activeForm.str), dex: Number(activeForm.dex),
    con: Number(activeForm.con), int: Number(activeForm.int),
    wis: Number(activeForm.wis), cha: Number(activeForm.cha),
    attacks: (activeForm as Player).attacks || [],
  };
}
```

> [!IMPORTANT]
> **Regra D&D 5e para Transformação (Wildshape/Polimorfismo):**
> - O personagem usa os **atributos físicos** (FOR, DES, CON, AC, PV) da forma transformada.
> - Os **atributos mentais** (INT, SAB, CAR) e **proficiências** são do personagem original (exceto se o feitiço especificar o contrário).
> - Quando a forma transformada chega a 0 HP, o personagem **reverte** para a forma original com o HP que tinha antes (não leva o excesso de dano, exceto se o excesso ultrapassar o HP original).
> - Ao chamar `endCombat()`, persistir no banco o HP do **entity original**, não da forma.

### Passo 4.3 — Mover Botão "Modo Combate" para Dashboard

**Arquivo:** [`components/views/NpcsView.tsx`](file:///e:/@Projetos/myrpg-next2/components/views/NpcsView.tsx)

Remover o toggle de "Modo Combate" e a lógica local de `combatMode`.

**Arquivo:** [`components/views/DashboardView.tsx`](file:///e:/@Projetos/myrpg-next2/components/views/DashboardView.tsx)

Adicionar botão `⚔️ Iniciar Combate` no header (visível apenas para GM), que abre o `CombatSetupModal`.

### Passo 4.4 — Modal de Setup de Combate

**Arquivo:** [`components/combat/CombatSetupModal.tsx`](file:///e:/@Projetos/myrpg-next2/components/combat/CombatSetupModal.tsx) — **[NOVO]**

```
┌─────────────────────────────────────────────────────────┐
│                  ⚔️ Configurar Combate                  │
├──────────────────────────┬──────────────────────────────┤
│   🧑 ALIADOS (Jogadores) │   👹 INIMIGOS (NPCs)         │
│                          │   [🔍 Buscar NPC...]         │
│  ☑ Alric Cinto Frouxo   │   ☑ Goblin Líder             │
│  ☑ Marop: Papai do Ano  │   ☑ Goblin Arqueiro          │
│  ☐ Vinique Chupa Charque │   ☐ Dragão Ancião            │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  [🎲 Rolar Iniciativa de Todos]                         │
│                                                         │
│  Ordem: Alric(18) > Goblin Líder(15) > Marop(12) ...   │
│         [▲][▼] para ajustar manualmente                 │
├─────────────────────────────────────────────────────────┤
│            [Cancelar]    [⚔️ Iniciar Combate]           │
└─────────────────────────────────────────────────────────┘
```

### Passo 4.5 — Painel de Combate Ativo

**Arquivo:** [`components/combat/CombatTracker.tsx`](file:///e:/@Projetos/myrpg-next2/components/combat/CombatTracker.tsx) — **[NOVO]**

Tracker de iniciativa horizontal no topo da tela (overlay fixo), contendo também a listagem de cards compactos e o log lateral (tudo em um único arquivo para facilitar a manutenção):

```
┌────────────────────────────────────────────────────────────────┐
│ ⚔️ RODADA 2  [← Turno Anterior]  Alric → Goblin → Marop  [Próximo Turno →]  [Encerrar]│
└────────────────────────────────────────────────────────────────┘
```

### Passo 4.6 — Montar Globalmente

**Arquivo:** `app/(app)/layout.tsx` e `components/layout/AppShell.tsx`

```tsx
// Em layout.tsx
<CombatProvider>
  <AppShell>
    {children}
  </AppShell>
  <ModalsContainer />
</CombatProvider>

// Em AppShell.tsx
<CombatTracker /> {/* renderiza apenas quando combat.isActive === true */}
```

**✅ Critérios de conclusão:**
- GM inicia combate, seleciona participantes, rola iniciativa
- Tracker aparece com a ordem correta
- GM pode avançar turno, aplicar dano via card
- Jogadores veem o tracker sincronizado via broadcast
- Ao encerrar, HP final é salvo no banco e tracker desaparece

---

## FASE 5 — Integração: Dados → HP em Combate

> **Objetivo:** Conectar o resultado do widget de dados ao painel de combate para aplicação automática de dano.

### Pré-requisitos
- Fases 3 e 4 concluídas e testadas
- `CombatContext` acessível globalmente

### Passo 5.1 — Alvo de Combate no Widget

No `DiceWidget`, adicionar:
- Dropdown "Alvo:" (visível quando `combat.isActive && rollType === 'attack' | 'damage'`)
- Lista dos participantes inimigos do usuário atual

### Passo 5.2 — Resolução de Ataque

Após rolar ataque (d20):
```typescript
if (rollType === 'attack' && targetId && combat.isActive) {
  const target = combat.participants.find(p => p.refId === targetId);
  const hit = result.total >= target.ac;
  const critical = result.isCritical;

  // Exibir resultado: "Acerto!" ou "Erro! (precisava de 15, tirou 12)"
  showAttackResult({ hit, critical, total: result.total, targetAC: target.ac });
}
```

### Passo 5.3 — Aplicação de Dano

Após rolar dano, se o ataque anterior acertou:
```typescript
// Botão "Aplicar Dano a [Alvo]" aparece no widget
// Ao clicar (ou GM confirmar):
const finalDamage = result.total * (wasCritical ? 2 : 1); // crítico dobra o dano
applyDamage(targetId, finalDamage); // via CombatContext
addToLog(`${actorName}: ${attackName} → ${result.total} de dano a ${targetName}`);
```

### Passo 5.4 — Condições via Log

Adicionar ao `CombatLog` um dropdown para o GM aplicar condições padrão D&D 5e:

```typescript
const DND5E_CONDITIONS = [
  'amedrontado', 'atordoado', 'cego', 'surdo', 'envenenado',
  'incapacitado', 'imobilizado', 'paralisado', 'petrificado',
  'prone', 'restringido', 'invisível', 'inconsciente', 'exausto'
];
```

**✅ Critérios de conclusão:**
- Rolar ataque mostra "Acerto!" ou "Erro!" comparando com CA do alvo
- Rolar dano oferece botão "Aplicar" que desconta do HP
- Crítico dobra o dano automaticamente
- Ações aparecem no Combat Log

---

## FASE 2 — Sistema de Buffs e Status

> **Execução:** Esta fase pode ser feita **em paralelo com as Fases 3–5** (depende apenas da Fase 1 concluída). Está listada aqui após as fases de combate por ser de menor criticidade.

> **Objetivo:** Permitir que o GM aplique buffs temporários que modificam CA, velocidade, etc., e que esses buffs sejam carregados automaticamente no combate.

### Pré-requisitos
- Fase 0 concluída (coluna `active_buffs` no banco)
- Fase 1 concluída (cards já têm seção de HP reformulada)

### Passo 2.1 — Painel de Buffs nos Cards

**Arquivo:** [`components/ui/BuffPanel.tsx`](file:///e:/@Projetos/myrpg-next2/components/ui/BuffPanel.tsx) — **[NOVO]**

Seção colapsável no card com:
- Lista de buffs ativos com ícone, nome, duração
- Botão "+" para GM adicionar buff (modal simples: nome, efeitos, duração)
- Botão "×" para remover

### Passo 2.2 — Integrar no `toCombatParticipant`

No `CombatContext.tsx`, ao iniciar combate, aplicar buffs ativos nos stats:
```typescript
const effectiveAC = base.ac + sumBuffs(entity.activeBuffs, 'acBonus');
const effectiveSpeed = base.speed + sumBuffs(entity.activeBuffs, 'speedBonus');
```

**✅ Critérios de conclusão:**
- GM adiciona um buff de CA (+2 Escudo)
- Ao iniciar combate, o participante aparece com CA = base + 2
- Buff com duração "combate" é removido ao `endCombat()`

---

## Constantes Compartilhadas — Criar Antes de Iniciar

**Arquivo:** [`lib/constants/dnd5e.ts`](file:///e:/@Projetos/myrpg-next2/lib/constants/dnd5e.ts) — **[NOVO]** (criar no Passo 0.6)

```typescript
export const SAVES_LIST = ["FOR", "DES", "CON", "INT", "SAB", "CAR"];

export const SKILLS_LIST = [
  "Acrobacia (Des)", "Arcanismo (Int)", "Atletismo (For)", "Atuação (Car)",
  "Enganação (Car)", "Furtividade (Des)", "História (Int)", "Intimidação (Car)",
  "Intuição (Sab)", "Investigação (Int)", "Lidar c/ Animais (Sab)", "Medicina (Sab)",
  "Natureza (Int)", "Percepção (Sab)", "Persuasão (Car)", "Prestidigitação (Des)",
  "Religião (Int)", "Sobrevivência (Sab)"
];

export const CONDITIONS_LIST = [
  "amedrontado", "atordoado", "cego", "surdo", "envenenado",
  "incapacitado", "imobilizado", "paralisado", "petrificado",
  "prone", "restringido", "invisível", "inconsciente", "exausto"
];

// Mapeamento ability abreviação → campo
export const ABILITY_MAP: Record<string, keyof Player> = {
  'FOR': 'str', 'DES': 'dex', 'CON': 'con',
  'INT': 'int', 'SAB': 'wis', 'CAR': 'cha'
};
```

Atualizar `PlayerFormModal.tsx` e `NpcFormModal.tsx` para importar daqui em vez de declarar localmente.

---

## Checklist de Não-Regressão (Executar após cada fase)

Verificar que o seguinte **ainda funciona** após cada fase:

- [ ] Login e carregamento inicial da dashboard
- [ ] Abertura e edição de ficha de Player (PlayerFormModal)
- [ ] Abertura e edição de ficha de NPC (NpcFormModal)
- [ ] Importação de ficha via IA (imagem/PDF)
- [ ] Importação de NPC via texto
- [ ] Visualização da aba Personagens (PlayersView)
- [ ] Visualização da aba NPCs (NpcsView)
- [ ] Mural de Investigação (drag de cards, conexões)
- [ ] Sincronização Realtime entre GM e Jogador (abrir em duas abas)
- [ ] Barra de vida exibe corretamente no card

---

## Arquivos Novos — Mapa Completo

```
lib/
  constants/
    dnd5e.ts          ← Fase 0.6
  types/
    buffs.ts          ← Fase 0.2
  dice/
    dnd5e.ts          ← Fase 3.1 (motor de regras + parsers)

components/
  ui/
    HpInlineEditor.tsx   ← Fase 1.2
    DiceWidget.tsx       ← Fase 3.3
    DiceRollFeed.tsx     ← Fase 3.4
    BuffPanel.tsx        ← Fase 2.1
  combat/
    CombatSetupModal.tsx    ← Fase 4.4
    CombatTracker.tsx       ← Fase 4.5 (Inclui Log e Cards nativamente)

contexts/
  CombatContext.tsx     ← Fase 4.1

```

---

## Arquivos Modificados — Mapa Completo

```
lib/gameData.ts                      ← Fase 0.2 (novos campos nas interfaces)
lib/supabase/mappers.ts              ← Fase 0.3 (mapear novos campos)
app/api/import-player/route.ts       ← Fase 0.4 (prompt da IA atualizado)
components/modals/ImportModals.tsx   ← Fase 0.5 (template + parser NPC)
components/modals/NpcFormModal.tsx   ← Fase 0.6 (salvar/carregar saves, skills)
components/views/PlayerCard.tsx      ← Fase 1 (remover UI antiga, integrar HpInlineEditor)
components/views/NpcCard.tsx         ← Fase 1 (idem)
app/styles/players-npcs.css          ← Fase 1 (estilos HpInlineEditor)
hooks/useGameSync.ts                 ← Fase 3.2 (novos tipos de evento)
components/views/NpcsView.tsx        ← Fase 4.3 (remover botão modo combate)
components/views/DashboardView.tsx   ← Fase 4.3 (adicionar botão iniciar combate)
components/layout/AppShell.tsx       ← Fase 3.5 + 4.6 (montar widget e CombatProvider)
components/modals/PlayerFormModal.tsx ← Fase 0.6 (importar de lib/constants/dnd5e.ts)
```
