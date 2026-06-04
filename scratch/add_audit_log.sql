-- Script para criar a tabela de Auditoria
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy de leitura: Apenas o GM pode ler os logs
CREATE POLICY "GM pode ler logs"
ON public.audit_logs FOR SELECT
USING ( public.is_gm() );

-- Policy de inserção: Apenas functions com security definer ou o service_role
-- (No front-end não permitimos inserção direta via client anon)
CREATE POLICY "Server-side inserts only"
ON public.audit_logs FOR INSERT
WITH CHECK ( false ); -- Força que apenas operações bypass RLS (como triggers/RPC/Service Role) possam inserir.
