-- BLACKTOWER™ TIMEKEEPER SUITE — TEMPORAL & FORENSIC INTELLIGENCE MIGRATION
-- 1. Restore EXECUTE permission on public.has_role to authenticated so RLS policies evaluate without permission errors
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- 2. Forensic Verifications Table (Feature 7 — Multimodal 5-Pillar Forensic Verification)
create table if not exists public.forensic_verifications (
  id uuid primary key default gen_random_uuid(),
  proof_record_id uuid references public.proof_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_number text not null,
  sha256_hash text not null,
  image_sha256_hash text,
  cryptographic_status text not null default 'PASS',
  temporal_status text not null default 'PASS',
  gps_status text not null default 'PASS',
  device_status text not null default 'PASS',
  visual_forensics_status text not null default 'UNAVAILABLE',
  visual_risk_score int,
  ai_confidence int,
  signals jsonb not null default '[]'::jsonb,
  limitations text[] not null default array['AI visual inspection cannot independently prove physical presence.'],
  summary text,
  final_verdict text not null default 'REVIEW',
  model_id text,
  created_at timestamptz not null default now()
);

grant select, insert on public.forensic_verifications to authenticated;
grant all on public.forensic_verifications to service_role;
alter table public.forensic_verifications enable row level security;

create policy "own forensic_verifications read" on public.forensic_verifications
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "own forensic_verifications insert" on public.forensic_verifications
  for insert to authenticated
  with check (user_id = auth.uid());

-- 3. Temporal Analyses Table (Feature 5 — Temporal Anomaly Detection)
create table if not exists public.temporal_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_record_ids uuid[] not null default '{}',
  deterministic_metrics jsonb not null default '{}'::jsonb,
  risk_level text not null default 'NORMAL',
  risk_score int not null default 0,
  anomalies jsonb not null default '[]'::jsonb,
  summary text,
  recommended_action text,
  model_id text,
  created_at timestamptz not null default now()
);

grant select, insert on public.temporal_analyses to authenticated;
grant all on public.temporal_analyses to service_role;
alter table public.temporal_analyses enable row level security;

create policy "own temporal_analyses read" on public.temporal_analyses
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "own temporal_analyses insert" on public.temporal_analyses
  for insert to authenticated
  with check (user_id = auth.uid());

-- 4. Geospatial Events Table (Feature 6 — AI Geospatial Timeline)
create table if not exists public.geospatial_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proof_record_id uuid references public.proof_records(id) on delete cascade,
  prev_proof_record_id uuid references public.proof_records(id) on delete set null,
  from_ref text,
  to_ref text not null,
  distance_km double precision,
  elapsed_minutes double precision,
  estimated_speed_kmh double precision,
  plausibility_status text not null default 'NORMAL',
  ai_interpretation text,
  model_id text,
  created_at timestamptz not null default now()
);

grant select, insert on public.geospatial_events to authenticated;
grant all on public.geospatial_events to service_role;
alter table public.geospatial_events enable row level security;

create policy "own geospatial_events read" on public.geospatial_events
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "own geospatial_events insert" on public.geospatial_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- 5. Time Sessions Table (Feature 10 — Context Switching & Focus Intelligence)
create table if not exists public.time_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'FIELD_OPS',
  activity_label text not null,
  source_type text not null default 'MANUAL',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.time_sessions to authenticated;
grant all on public.time_sessions to service_role;
alter table public.time_sessions enable row level security;

create policy "own time_sessions read" on public.time_sessions
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "own time_sessions insert" on public.time_sessions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "own time_sessions update" on public.time_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
