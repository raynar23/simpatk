// Next.js API route for administrative user management (listing and creating user accounts)
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in route handler
          }
        },
      },
    }
  );

  // Verify current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak: Hanya Admin GA' }, { status: 403 });
  }

  // Attempt RPC first, fallback to direct profiles query
  const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_users_list');

  if (!rpcError && rpcUsers) {
    return NextResponse.json({ users: rpcUsers });
  }

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profError) {
    return NextResponse.json({ error: profError.message }, { status: 500 });
  }

  return NextResponse.json({ users: profiles || [] });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in route handler
          }
        },
      },
    }
  );

  // Verify current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak: Hanya Admin GA' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, nama_divisi, role = 'user' } = body;

    if (!email || !password || !nama_divisi) {
      return NextResponse.json(
        { error: 'Email, kata sandi, dan nama divisi wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Kata sandi minimal harus 6 karakter.' },
        { status: 400 }
      );
    }

    // Use isolated client with no session persistence to avoid mutating caller session
    const isolatedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: signUpData, error: signUpError } = await isolatedClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          nama_divisi,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: 'Gagal membuat pengguna di sistem autentikasi.' }, { status: 500 });
    }

    // Insert or update public.profiles with division, email, and role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: signUpData.user.id,
      email,
      nama_divisi,
      role,
    });

    if (profileError) {
      return NextResponse.json({
        user: signUpData.user,
        warning: 'Akun dibuat, namun pembaruan profil gagal: ' + profileError.message,
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: signUpData.user.id,
        email,
        nama_divisi,
        role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
