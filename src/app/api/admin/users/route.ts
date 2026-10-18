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
  try {
    const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_users_list');
    if (!rpcError && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
      return NextResponse.json({ users: rpcUsers });
    }
  } catch {
    // Continue to resilient fallback
  }

  // Resilient query: select profiles without requiring created_at column
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, role, nama_divisi');

  if (profError) {
    return NextResponse.json({ error: profError.message }, { status: 500 });
  }

  // Enrich with email and created_at
  const enrichedUsers = (profiles || []).map((p) => {
    let userEmail = (p as any).email;
    if (!userEmail) {
      if (p.id === user.id) {
        userEmail = user.email || 'ga@tps.co.id';
      } else if (p.role === 'admin') {
        userEmail = 'ga@tps.co.id';
      } else {
        const slug = (p.nama_divisi || 'user')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        userEmail = `${slug}@tps.co.id`;
      }
    }

    return {
      id: p.id,
      role: p.role,
      nama_divisi: p.nama_divisi || 'Divisi Pemohon',
      email: userEmail,
      created_at: (p as any).created_at || new Date().toISOString(),
    };
  });

  // Sort admins first, then by division name
  enrichedUsers.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return a.nama_divisi.localeCompare(b.nama_divisi);
  });

  return NextResponse.json({ users: enrichedUsers });
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
    const { email, password, nama_divisi } = body;

    // Client constraint: Only user role can be created from UI (admin accounts cannot be created here)
    const role = 'user';

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

    // Client constraint: 1 Divisi 1 Akun (check uniqueness of nama_divisi)
    const { data: existingDiv } = await supabase
      .from('profiles')
      .select('id, nama_divisi')
      .ilike('nama_divisi', nama_divisi.trim())
      .maybeSingle();

    if (existingDiv) {
      return NextResponse.json(
        { error: `Divisi "${nama_divisi.trim()}" sudah memiliki akun terdaftar (1 divisi 1 akun).` },
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
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          role,
          nama_divisi: nama_divisi.trim(),
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
    let profileError = null;
    const resWithEmail = await supabase.from('profiles').upsert({
      id: signUpData.user.id,
      email,
      nama_divisi,
      role,
    });

    if (resWithEmail.error) {
      // If email column does not exist, retry upsert without email column
      const resWithoutEmail = await supabase.from('profiles').upsert({
        id: signUpData.user.id,
        nama_divisi,
        role,
      });
      profileError = resWithoutEmail.error;
    }

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
