-- ══ PLAYERS: campos de conjuração ══
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS has_spells           BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS spellcasting_ability TEXT    DEFAULT 'int'
    CHECK (spellcasting_ability IN ('str','dex','con','int','wis','cha')),
  ADD COLUMN IF NOT EXISTS spell_slot_type      TEXT    DEFAULT 'standard'
    CHECK (spell_slot_type IN ('standard','pact')),
  ADD COLUMN IF NOT EXISTS spell_slots          JSONB   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS spell_slots_used     JSONB   DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS spells_known         JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expertise_skills     JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_class         TEXT    DEFAULT '';

-- ══ NPCS: campos faltando ══
ALTER TABLE public.npcs
  ADD COLUMN IF NOT EXISTS spellcasting_ability TEXT DEFAULT 'int'
    CHECK (spellcasting_ability IN ('str','dex','con','int','wis','cha')),
  ADD COLUMN IF NOT EXISTS spell_slot_type      TEXT DEFAULT 'standard'
    CHECK (spell_slot_type IN ('standard','pact')),
  ADD COLUMN IF NOT EXISTS spells_known         JSONB DEFAULT '[]'::jsonb;
