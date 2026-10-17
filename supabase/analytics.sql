-- SIMPATK: Security-definer analytical RPC functions for Admin GA dashboard and reporting.

-- 1. Consolidated KPI metrics with current vs previous period comparison
create or replace function public.dashboard_kpi(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := coalesce(p_days, 30);
  v_now timestamptz := now();
  v_current_start timestamptz := v_now - (v_days || ' days')::interval;
  v_prev_start timestamptz := v_now - (2 * v_days || ' days')::interval;
  
  v_total_permintaan bigint := 0;
  v_total_permintaan_prev bigint := 0;
  v_permintaan_diproses bigint := 0;
  v_permintaan_selesai bigint := 0;
  v_avg_completion_hours double precision := 0;
  v_avg_completion_hours_prev double precision := 0;
  v_tingkat_penyelesaian numeric := 0;
  v_barang_menipis bigint := 0;
  v_barang_habis bigint := 0;
  v_nilai_persediaan bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak mengakses analitik dashboard.';
  end if;

  -- Total requests in current period
  select count(*) into v_total_permintaan
  from public.requests
  where created_at >= v_current_start and created_at <= v_now;

  -- Total requests in previous period
  select count(*) into v_total_permintaan_prev
  from public.requests
  where created_at >= v_prev_start and created_at < v_current_start;

  -- Active pending requests queue (all active uncompleted requests)
  select count(*) into v_permintaan_diproses
  from public.requests
  where status = 'diproses';

  -- Completed requests in current period
  select count(*) into v_permintaan_selesai
  from public.requests
  where status = 'selesai' and created_at >= v_current_start and created_at <= v_now;

  -- Average completion duration in hours for current period
  select coalesce(extract(epoch from avg(completed_at - created_at)) / 3600.0, 0)
  into v_avg_completion_hours
  from public.requests
  where status = 'selesai'
    and completed_at is not null
    and created_at >= v_current_start;

  -- Average completion duration in hours for previous period
  select coalesce(extract(epoch from avg(completed_at - created_at)) / 3600.0, 0)
  into v_avg_completion_hours_prev
  from public.requests
  where status = 'selesai'
    and completed_at is not null
    and created_at >= v_prev_start
    and created_at < v_current_start;

  -- Completion rate percentage
  if v_total_permintaan > 0 then
    v_tingkat_penyelesaian := round((v_permintaan_selesai::numeric * 100.0) / v_total_permintaan::numeric, 1);
  else
    v_tingkat_penyelesaian := 0;
  end if;

  -- Low stock items (stock <= minimum)
  select count(*) into v_barang_menipis
  from public.items
  where stok <= stok_minimum;

  -- Out of stock items (stock = 0)
  select count(*) into v_barang_habis
  from public.items
  where stok = 0;

  -- Total inventory valuation (stok * harga_satuan)
  select coalesce(sum(stok * coalesce(harga_satuan, 0)), 0)::bigint
  into v_nilai_persediaan
  from public.items;

  return jsonb_build_object(
    'total_permintaan', v_total_permintaan,
    'total_permintaan_sebelumnya', v_total_permintaan_prev,
    'permintaan_diproses', v_permintaan_diproses,
    'permintaan_selesai', v_permintaan_selesai,
    'rata_rata_waktu_jam', round(v_avg_completion_hours::numeric, 1),
    'rata_rata_waktu_jam_sebelumnya', round(v_avg_completion_hours_prev::numeric, 1),
    'tingkat_penyelesaian_persen', v_tingkat_penyelesaian,
    'barang_menipis', v_barang_menipis,
    'barang_habis', v_barang_habis,
    'nilai_persediaan', v_nilai_persediaan
  );
end;
$$;

grant execute on function public.dashboard_kpi(integer) to authenticated;

-- 2. Request volume trend over time with previous period comparison
create or replace function public.request_trend(p_days integer default 30)
returns table (
  label text,
  tanggal date,
  total_current bigint,
  total_previous bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := coalesce(p_days, 30);
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak mengakses tren permintaan.';
  end if;

  if v_days <= 30 then
    -- Daily grouping for 7 and 30 days
    return query
    with days as (
      select (current_date - (v_days - 1) + s.i)::date as dt
      from generate_series(0, v_days - 1) as s(i)
    ),
    curr as (
      select created_at::date as dt, count(*)::bigint as cnt
      from public.requests
      where created_at >= (current_date - (v_days - 1))::timestamptz
      group by created_at::date
    ),
    prev as (
      select (created_at::date + (v_days || ' days')::interval)::date as dt, count(*)::bigint as cnt
      from public.requests
      where created_at >= (current_date - (2 * v_days - 1))::timestamptz
        and created_at < (current_date - (v_days - 1))::timestamptz
      group by created_at::date
    )
    select
      to_char(d.dt, 'DD/MM')::text as label,
      d.dt as tanggal,
      coalesce(c.cnt, 0)::bigint as total_current,
      coalesce(p.cnt, 0)::bigint as total_previous
    from days d
    left join curr c on c.dt = d.dt
    left join prev p on p.dt = d.dt
    order by d.dt;
  else
    -- Monthly grouping for 180 days (6 months)
    return query
    with months as (
      select date_trunc('month', (current_date - interval '5 months' + (s.i || ' months')::interval))::date as m_start
      from generate_series(0, 5) as s(i)
    ),
    curr as (
      select date_trunc('month', created_at)::date as m_start, count(*)::bigint as cnt
      from public.requests
      where created_at >= date_trunc('month', current_date - interval '5 months')
      group by date_trunc('month', created_at)::date
    ),
    prev as (
      select date_trunc('month', created_at + interval '6 months')::date as m_start, count(*)::bigint as cnt
      from public.requests
      where created_at >= date_trunc('month', current_date - interval '11 months')
        and created_at < date_trunc('month', current_date - interval '5 months')
      group by date_trunc('month', created_at)::date
    )
    select
      to_char(m.m_start, 'Mon')::text as label,
      m.m_start as tanggal,
      coalesce(c.cnt, 0)::bigint as total_current,
      coalesce(p.cnt, 0)::bigint as total_previous
    from months m
    left join curr c on c.m_start = m.m_start
    left join prev p on p.m_start = m.m_start
    order by m.m_start;
  end if;
end;
$$;

grant execute on function public.request_trend(integer) to authenticated;

-- 3. Top requested items by total quantity demanded within period
create or replace function public.top_items(
  p_days integer default 30,
  p_limit integer default 5
)
returns table (
  item_id uuid,
  kode text,
  nama text,
  kategori text,
  satuan text,
  total_diminta bigint,
  total_frekuensi bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := coalesce(p_days, 30);
  v_limit integer := coalesce(p_limit, 5);
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak mengakses data barang terpopuler.';
  end if;

  return query
  select
    i.id as item_id,
    i.kode,
    i.nama,
    i.kategori,
    i.satuan,
    coalesce(sum(r.jumlah), 0)::bigint as total_diminta,
    count(r.id)::bigint as total_frekuensi
  from public.items i
  join public.requests r on r.item_id = i.id
  where r.created_at >= (now() - (v_days || ' days')::interval)
  group by i.id, i.kode, i.nama, i.kategori, i.satuan
  order by total_diminta desc, total_frekuensi desc
  limit v_limit;
end;
$$;

grant execute on function public.top_items(integer, integer) to authenticated;

-- 4. Status breakdown with counts and percentages
create or replace function public.status_breakdown(p_days integer default 30)
returns table (
  status text,
  jumlah bigint,
  persentase numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := coalesce(p_days, 30);
  v_total bigint;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang berhak mengakses rincian status permintaan.';
  end if;

  select count(*) into v_total
  from public.requests
  where created_at >= (now() - (v_days || ' days')::interval);

  return query
  with statuses as (
    select 'diproses'::text as st
    union all
    select 'selesai'::text as st
  ),
  counts as (
    select r.status::text as st, count(*)::bigint as cnt
    from public.requests r
    where r.created_at >= (now() - (v_days || ' days')::interval)
    group by r.status
  )
  select
    s.st as status,
    coalesce(c.cnt, 0)::bigint as jumlah,
    case
      when coalesce(v_total, 0) > 0 then round((coalesce(c.cnt, 0)::numeric * 100.0) / v_total::numeric, 1)
      else 0.0
    end as persentase
  from statuses s
  left join counts c on c.st = s.st
  order by s.st desc;
end;
$$;

grant execute on function public.status_breakdown(integer) to authenticated;
