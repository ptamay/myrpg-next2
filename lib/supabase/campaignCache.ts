/**
 * campaignCache.ts
 *
 * Singleton em memória para o ID da campanha ativa.
 * Evita 9+ round-trips desnecessários ao Supabase a cada operação de escrita.
 * O ID da campanha é imutável durante uma sessão, portanto o cache nunca precisa
 * ser invalidado — apenas resetado em logout ou troca de campanha.
 */

import { getSupabaseClient } from "./client";

let _cachedCampaignId: string | null = null;
let _fetchPromise: Promise<string | null> | null = null;

/**
 * Retorna o ID da campanha ativa.
 * Na primeira chamada, busca no banco e cacheia.
 * Chamadas subsequentes retornam o valor em memória instantaneamente.
 */
export async function getCampaignId(): Promise<string | null> {
  if (_cachedCampaignId) return _cachedCampaignId;

  // Deduplicar requisições paralelas: se já há uma promise em andamento, aguarda ela
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("campaign")
        .select("id")
        .limit(1)
        .maybeSingle();
      _cachedCampaignId = data?.id ?? null;
      return _cachedCampaignId;
    } catch (err) {
      console.error("[campaignCache] Erro ao buscar campaign id:", err);
      return null;
    } finally {
      _fetchPromise = null;
    }
  })();

  return _fetchPromise;
}

/**
 * Limpa o cache (use ao fazer logout ou resetar campanha).
 */
export function clearCampaignCache(): void {
  _cachedCampaignId = null;
  _fetchPromise = null;
}
