// ─── DIÁRIO ─────────────────────────────────────────────
export interface DiaryComment {
  id: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
}

export interface DiaryEntry {
  id: string
  sessionNumber: number    // Ex: 14
  sessionTitle: string     // Ex: "A Fuga do Templo"
  authorId: string         // ID de dadosGlobais.players[n].id
  authorName: string       // Cache do nome para exibição
  content: string          // Texto livre
  imageUrl?: string        // base64 ou URL (upload local)
  createdAt: string        // ISO string (Date serializa mal no localStorage)
  likes: string[]          // Array de authorId
  comments?: DiaryComment[] // Supabase ready
}

// ─── MURAL ──────────────────────────────────────────────
export type MuralCardType =
  | 'nota'      // Texto livre (post-it)
  | 'npc'       // Referência a NPC do sistema
  | 'jogador'   // Referência a um jogador do sistema
  | 'artefato'  // Item físico com imagem
  | 'teoria'    // Hipótese do grupo
  | 'retrato'   // Imagem + nome (pessoa sem NPC cadastrado)
  | 'anotacao'  // Anotação de jogador

export interface MuralCard {
  id: string
  muralId: string
  type: MuralCardType
  title: string
  content?: string
  imageUrl?: string
  refId?: string                    // ID do NPC se type === 'npc'
  position: { x: number; y: number }
  createdBy: string                 // 'gm' ou characterId
  authorId?: string                 // ID do jogador que criou (para edição restrita)
  createdAt: string
}

export interface MuralConnection {
  id: string
  muralId: string
  fromCardId: string
  toCardId: string
  label?: string   // Ex: "suspeito de", "localizado em"
  color?: string   // Padrão: var(--accent-primary)
}

export interface Mural {
  id: string
  name: string
  cards: MuralCard[]
  connections: MuralConnection[]
  createdAt: string
  backgroundStyle?: 'grid' | 'dark-paper' | 'wood'
}
