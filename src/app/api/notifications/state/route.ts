// API Route for persisting notification read state per user account in database & long-lived cookie
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  // 1. Attempt database query from public.user_notification_state
  try {
    const { data, error } = await supabase
      .from('user_notification_state')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        state: {
          bell_read_at: data.bell_read_at,
          ack_pending: data.ack_pending,
          ack_low_stock: data.ack_low_stock,
        },
      });
    }
  } catch {
    // Database table not yet created, proceed to cookie fallback
  }

  // 2. Fallback to server cookie for this specific user
  const cookieName = `simpatk_notif_${user.id}`;
  const rawCookie = cookieStore.get(cookieName)?.value;
  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie);
      return NextResponse.json({ state: parsed });
    } catch {
      // Ignored
    }
  }

  return NextResponse.json({ state: null });
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const bellReadAt = body.bell_read_at || new Date().toISOString();
    const ackPending = typeof body.ack_pending === 'number' ? body.ack_pending : undefined;
    const ackLowStock = typeof body.ack_low_stock === 'number' ? body.ack_low_stock : undefined;

    // 1. Best-effort update to Supabase user_notification_state table
    try {
      await supabase.from('user_notification_state').upsert({
        user_id: user.id,
        bell_read_at: bellReadAt,
        ...(ackPending !== undefined ? { ack_pending: ackPending } : {}),
        ...(ackLowStock !== undefined ? { ack_low_stock: ackLowStock } : {}),
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist yet
    }

    // 2. Set long-lived HTTP cookie (1 year) specifically keyed to user.id
    const cookieName = `simpatk_notif_${user.id}`;
    const statePayload = {
      bell_read_at: bellReadAt,
      ...(ackPending !== undefined ? { ack_pending: ackPending } : {}),
      ...(ackLowStock !== undefined ? { ack_low_stock: ackLowStock } : {}),
    };

    const response = NextResponse.json({ success: true, state: statePayload });
    response.cookies.set(cookieName, JSON.stringify(statePayload), {
      path: '/',
      maxAge: 31536000, // 1 year
      sameSite: 'lax',
      httpOnly: false, // Available to client JS as well
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan status' }, { status: 500 });
  }
}
