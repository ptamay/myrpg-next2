import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { rateLimitCheck, getClientIp } from '@/lib/rateLimit';

export async function POST(request: Request) {
  // Rate limiting
  const ip = getClientIp(request);
  const rl = rateLimitCheck(ip, 'delete-user');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfterMs / 1000)} segundos.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  try {
    const { targetUserId } = await request.json();
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'ID de usuário alvo não fornecido' }, { status: 400 });
    }
    
    // 1. Validar autorização server-side
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Permitir se for o admin configurado (via env)
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    
    // Verificar se é GM consultando a tabela profiles
    let isGM = false;
    if (!isAdmin) {
      const { data: profile } = await supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      isGM = profile?.role === 'gm';
    }

    if (!isAdmin && !isGM) {
      return NextResponse.json({ error: 'Acesso negado. Apenas o GM/Admin pode excluir usuários.' }, { status: 403 });
    }
    
    // 2. Realizar deleção com Service Role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada. Configure no arquivo .env.local para usar este recurso.' }, { status: 400 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    
    if (error) throw error;
    
    // 3. Trilha de Auditoria (Audit Log)
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      action: 'DELETE_USER',
      target_id: targetUserId,
      details: { role: isAdmin ? 'admin' : 'gm' }
    });

    return NextResponse.json({ success: true, message: 'Usuário deletado com sucesso do Auth e Profiles.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Erro na deleção de usuário:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
