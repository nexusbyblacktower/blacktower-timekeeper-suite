-- =============================================================================
-- BLACKTOWER™ PEOPLE INTELLIGENCE — COMPLETE DATABASE, RLS, AUDIT & VERSIONING
-- =============================================================================
-- Additive migration preserving all existing Timekeeper tables, auth triggers,
-- and RLS policies.

-- 1. NON-RECURSIVE ADMIN HELPER FUNCTION
-- Determines strictly whether the given user_id holds the 'admin' role in public.user_roles.
-- Does NOT inspect email, full_name, job_title, profile_type, access_level, or trust_level.
create or replace function public.is_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = coalesce(_user_id, auth.uid())
      and role = 'admin'::public.app_role
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, service_role;

-- 2. TABLE: public.people_profiles
create table if not exists public.people_profiles (
  id uuid primary key default gen_random_uuid(),
  person_code text unique not null,
  auth_user_id uuid null references auth.users(id) on delete set null,
  full_name_zh text,
  full_name_en text not null,
  display_name text not null,
  profile_type text not null check (profile_type in ('founder', 'internal_staff', 'strategic_external_partner')),
  organization text not null default 'BLACKTOWER',
  job_title text,
  status text not null default 'active' check (status in ('active', 'archived')),
  access_level integer not null default 1 check (access_level >= 0 and access_level <= 10),
  security_classification text not null default 'BLACKTOWER INTERNAL',
  executive_summary text,
  core_responsibilities jsonb not null default '[]'::jsonb,
  expertise jsonb not null default '[]'::jsonb,
  working_style jsonb not null default '[]'::jsonb,
  communication_preferences jsonb not null default '[]'::jsonb,
  leadership_style jsonb not null default '[]'::jsonb,
  contribution_history jsonb not null default '[]'::jsonb,
  good_records jsonb not null default '[]'::jsonb,
  growth_objectives jsonb not null default '[]'::jsonb,
  trust_level text not null default 'Dynamic',
  ai_interaction_rules jsonb not null default '[]'::jsonb,
  relationship_summary jsonb not null default '{}'::jsonb,
  incident_policy text,
  profile_health text not null default 'Standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  archived_by uuid null references auth.users(id) on delete set null
);

grant select, insert, update on public.people_profiles to authenticated;
grant all on public.people_profiles to service_role;
alter table public.people_profiles enable row level security;

-- Normal users can ONLY read their own linked profile (auth.uid() = auth_user_id).
-- Admins can read all profiles. External partners with auth_user_id = NULL are only visible to Admins.
create policy "people_profiles_select_policy" on public.people_profiles
  for select to authenticated
  using (
    (auth_user_id is not null and auth_user_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- Only Admins can create People Intelligence records.
create policy "people_profiles_insert_policy" on public.people_profiles
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

-- Only Admins can update People Intelligence records (normal users cannot edit their own profile).
create policy "people_profiles_update_policy" on public.people_profiles
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Physical DELETE is blocked for normal operations; archiving uses UPDATE status = 'archived'.
create policy "people_profiles_delete_policy" on public.people_profiles
  for delete to authenticated
  using (public.is_admin(auth.uid()));

-- 3. TABLE: public.internal_intelligence (ADMIN ONLY)
create table if not exists public.internal_intelligence (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people_profiles(id) on delete cascade,
  category text not null,
  content text not null,
  source_type text not null default 'ADMIN_RECORDED' check (source_type in ('FACT', 'USER_PROVIDED', 'ADMIN_RECORDED', 'AI_INFERENCE')),
  source_reference text,
  visibility text not null default 'admin_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  archived_by uuid null references auth.users(id) on delete set null
);

grant select, insert, update on public.internal_intelligence to authenticated;
grant all on public.internal_intelligence to service_role;
alter table public.internal_intelligence enable row level security;

create policy "internal_intelligence_admin_select" on public.internal_intelligence
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "internal_intelligence_admin_insert" on public.internal_intelligence
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "internal_intelligence_admin_update" on public.internal_intelligence
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 4. TABLE: public.partner_profiles (ADMIN ONLY)
create table if not exists public.partner_profiles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people_profiles(id) on delete cascade,
  organization text not null,
  relationship_type text not null,
  collaboration_history jsonb not null default '[]'::jsonb,
  follow_up_items jsonb not null default '[]'::jsonb,
  relationship_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  archived_by uuid null references auth.users(id) on delete set null
);

grant select, insert, update on public.partner_profiles to authenticated;
grant all on public.partner_profiles to service_role;
alter table public.partner_profiles enable row level security;

create policy "partner_profiles_admin_select" on public.partner_profiles
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "partner_profiles_admin_insert" on public.partner_profiles
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "partner_profiles_admin_update" on public.partner_profiles
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 5. TABLE: public.investigations (ADMIN ONLY)
create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid null references public.people_profiles(id) on delete set null,
  case_reference text unique not null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'review', 'resolved', 'closed', 'archived')),
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  evidence jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  closed_at timestamptz null,
  closed_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  archived_by uuid null references auth.users(id) on delete set null
);

grant select, insert, update on public.investigations to authenticated;
grant all on public.investigations to service_role;
alter table public.investigations enable row level security;

create policy "investigations_admin_select" on public.investigations
  for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "investigations_admin_insert" on public.investigations
  for insert to authenticated
  with check (public.is_admin(auth.uid()));

create policy "investigations_admin_update" on public.investigations
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 6. TABLE: public.access_audit_logs (ADMIN SELECT ONLY; INSERT VIA TRUSTED TRIGGERS/FUNCTIONS)
create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  action text not null check (
    action in (
      'PROFILE_READ',
      'PROFILE_CREATE',
      'PROFILE_UPDATE',
      'PROFILE_ARCHIVE',
      'INTELLIGENCE_READ',
      'INTELLIGENCE_CREATE',
      'INTELLIGENCE_UPDATE',
      'INTELLIGENCE_ARCHIVE',
      'PARTNER_READ',
      'PARTNER_CREATE',
      'PARTNER_UPDATE',
      'PARTNER_ARCHIVE',
      'INVESTIGATION_READ',
      'INVESTIGATION_CREATE',
      'INVESTIGATION_UPDATE',
      'INVESTIGATION_ARCHIVE',
      'ROLE_UPDATE',
      'ACCESS_DENIED'
    )
  ),
  resource_type text not null,
  resource_id uuid null,
  target_person_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  ip_hash text null,
  user_agent text null
);

-- Normal users cannot SELECT or directly INSERT arbitrary rows into access_audit_logs
grant select on public.access_audit_logs to authenticated;
grant all on public.access_audit_logs to service_role;
alter table public.access_audit_logs enable row level security;

create policy "access_audit_logs_admin_select" on public.access_audit_logs
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- 7. TABLE: public.profile_versions (ADMIN SELECT; POPULATED BY TRIGGER ON PROFILE UPDATE)
create table if not exists public.profile_versions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people_profiles(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  changed_by uuid null,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (person_id, version_number)
);

grant select on public.profile_versions to authenticated;
grant all on public.profile_versions to service_role;
alter table public.profile_versions enable row level security;

create policy "profile_versions_admin_select" on public.profile_versions
  for select to authenticated
  using (public.is_admin(auth.uid()));

-- 8. TRUSTED AUDIT & VERSIONING DATABASE TRIGGERS (SECURITY DEFINER)
create or replace function public.log_people_audit_event(
  _action text,
  _resource_type text,
  _resource_id uuid default null,
  _target_person_id uuid default null,
  _metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
  _log_id uuid;
begin
  _uid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  insert into public.access_audit_logs (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    target_person_id,
    metadata
  ) values (
    _uid,
    _action,
    _resource_type,
    _resource_id,
    _target_person_id,
    coalesce(_metadata, '{}'::jsonb)
  )
  returning id into _log_id;
  return _log_id;
end;
$$;

grant execute on function public.log_people_audit_event(text, text, uuid, uuid, jsonb) to authenticated, service_role;

-- Trigger on public.people_profiles to automatically record version snapshots and audit logs
create or replace function public.handle_people_profile_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid;
  _next_ver int;
  _changed_fields text[] := array[]::text[];
  _action text;
  _k text;
begin
  _actor := coalesce(auth.uid(), new.updated_by, new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := coalesce(new.updated_by, auth.uid());

    insert into public.profile_versions (
      person_id,
      version_number,
      snapshot,
      changed_by,
      change_reason
    ) values (
      new.id,
      1,
      to_jsonb(new),
      _actor,
      'INITIAL_PROFILE_CREATION'
    );

    insert into public.access_audit_logs (
      actor_user_id,
      action,
      resource_type,
      resource_id,
      target_person_id,
      metadata
    ) values (
      _actor,
      'PROFILE_CREATE',
      'people_profile',
      new.id,
      new.id,
      jsonb_build_object('person_code', new.person_code, 'profile_type', new.profile_type)
    );

    return new;
  elsif tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), new.updated_by);

    -- Compute changed field names without storing sensitive secrets
    for _k in select jsonb_object_keys(to_jsonb(new))
    loop
      if _k not in ('updated_at', 'updated_by') and (to_jsonb(new)->_k) is distinct from (to_jsonb(old)->_k) then
        _changed_fields := array_append(_changed_fields, _k);
      end if;
    end loop;

    if old.status <> 'archived' and new.status = 'archived' then
      _action := 'PROFILE_ARCHIVE';
      new.archived_at := coalesce(new.archived_at, now());
      new.archived_by := coalesce(auth.uid(), new.archived_by);
    else
      _action := 'PROFILE_UPDATE';
    end if;

    select coalesce(max(version_number), 0) + 1
      into _next_ver
      from public.profile_versions
      where person_id = new.id;

    insert into public.profile_versions (
      person_id,
      version_number,
      snapshot,
      changed_by,
      change_reason
    ) values (
      new.id,
      _next_ver,
      to_jsonb(new),
      _actor,
      case when _action = 'PROFILE_ARCHIVE' then 'PROFILE_ARCHIVED' else 'ADMIN_PROFILE_UPDATE' end
    );

    insert into public.access_audit_logs (
      actor_user_id,
      action,
      resource_type,
      resource_id,
      target_person_id,
      metadata
    ) values (
      _actor,
      _action,
      'people_profile',
      new.id,
      new.id,
      jsonb_build_object(
        'person_code', new.person_code,
        'changed_fields', to_jsonb(_changed_fields),
        'version_number', _next_ver
      )
    );

    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_people_profile_mutation on public.people_profiles;
create trigger trg_people_profile_mutation
after insert or update on public.people_profiles
for each row execute function public.handle_people_profile_mutation();

-- Trigger on internal_intelligence, partner_profiles, investigations, and user_roles for audit trail
create or replace function public.handle_people_subsystem_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid;
  _action text;
  _target_person uuid := null;
  _res_id uuid := null;
begin
  _actor := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  if tg_table_name = 'internal_intelligence' then
    _res_id := new.id;
    _target_person := new.person_id;
    if tg_op = 'INSERT' then
      _action := 'INTELLIGENCE_CREATE';
    elsif new.archived_at is not null and old.archived_at is null then
      _action := 'INTELLIGENCE_ARCHIVE';
    else
      _action := 'INTELLIGENCE_UPDATE';
    end if;
  elsif tg_table_name = 'partner_profiles' then
    _res_id := new.id;
    _target_person := new.person_id;
    if tg_op = 'INSERT' then
      _action := 'PARTNER_CREATE';
    elsif new.archived_at is not null and old.archived_at is null then
      _action := 'PARTNER_ARCHIVE';
    else
      _action := 'PARTNER_UPDATE';
    end if;
  elsif tg_table_name = 'investigations' then
    _res_id := new.id;
    _target_person := new.person_id;
    if tg_op = 'INSERT' then
      _action := 'INVESTIGATION_CREATE';
    elsif new.status = 'archived' and old.status <> 'archived' then
      _action := 'INVESTIGATION_ARCHIVE';
    else
      _action := 'INVESTIGATION_UPDATE';
    end if;
  elsif tg_table_name = 'user_roles' then
    _res_id := coalesce(new.id, old.id);
    _action := 'ROLE_UPDATE';
  end if;

  if _action is not null then
    insert into public.access_audit_logs (
      actor_user_id,
      action,
      resource_type,
      resource_id,
      target_person_id,
      metadata
    ) values (
      _actor,
      _action,
      tg_table_name,
      _res_id,
      _target_person,
      jsonb_build_object('operation', tg_op)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_internal_intelligence_audit on public.internal_intelligence;
create trigger trg_internal_intelligence_audit
after insert or update on public.internal_intelligence
for each row execute function public.handle_people_subsystem_audit();

drop trigger if exists trg_partner_profiles_audit on public.partner_profiles;
create trigger trg_partner_profiles_audit
after insert or update on public.partner_profiles
for each row execute function public.handle_people_subsystem_audit();

drop trigger if exists trg_investigations_audit on public.investigations;
create trigger trg_investigations_audit
after insert or update on public.investigations
for each row execute function public.handle_people_subsystem_audit();

drop trigger if exists trg_user_roles_audit on public.user_roles;
create trigger trg_user_roles_audit
after insert or update or delete on public.user_roles
for each row execute function public.handle_people_subsystem_audit();

-- 9. SEED INITIAL THREE PERSON RECORDS WITH DYNAMIC REAL AUTH USER LINKING
-- Links PERSON-0001 and PERSON-0002 to existing auth.users rows if found;
-- leaves auth_user_id = NULL if not found (never invents fake UUIDs).
do $$
declare
  _kelvin_uid uuid := null;
  _zixuan_uid uuid := null;
  _lance_person_id uuid;
begin
  -- Lookup Kelvin Ong in auth.users by actual account identity
  select id into _kelvin_uid
  from auth.users
  where lower(email) in ('blackmasterong@blacktower.com', 'kelvinong.private@outlook.my')
     or raw_user_meta_data->>'full_name' ilike '%Kelvin Ong%'
  order by created_at asc
  limit 1;

  -- Lookup Lee Zi Xuan in auth.users by actual account identity
  select id into _zixuan_uid
  from auth.users
  where lower(email) = 'lee.zixuan@blacktower.com'
     or raw_user_meta_data->>'full_name' ilike '%Lee Zi Xuan%'
  order by created_at asc
  limit 1;

  -- PERSON-0001: 王虢宏（Kelvin Ong）
  insert into public.people_profiles (
    person_code,
    auth_user_id,
    full_name_zh,
    full_name_en,
    display_name,
    profile_type,
    organization,
    job_title,
    status,
    access_level,
    security_classification,
    executive_summary,
    core_responsibilities,
    expertise,
    working_style,
    communication_preferences,
    leadership_style,
    contribution_history,
    good_records,
    growth_objectives,
    trust_level,
    ai_interaction_rules,
    relationship_summary,
    incident_policy,
    profile_health
  ) values (
    'PERSON-0001',
    _kelvin_uid,
    '王虢宏',
    'Kelvin Ong',
    'Kelvin',
    'founder',
    'BLACKTOWER',
    'Founder & CEO',
    'active',
    10,
    'BLACKTOWER TOP SECRET',
    '王虢宏为 BLACKTOWER 创办人，同时也是整个 AI 生态系统、自动化架构及企业营运体系的设计者。负责制定企业发展方向、AI 战略、品牌定位及团队管理，并拥有 BLACKTOWER 全系统最终决策权。所有 AI Agent 的最终目标均为协助 Founder 提升决策效率、执行效率及企业长期竞争力。',
    '["企业战略规划","品牌发展","AI 系统设计","自动化架构","营销策略","内容创作","团队管理","财务规划","新项目研发","最终审批"]'::jsonb,
    '["AI Automation","Workflow Design","Business Strategy","Marketing","Financial Advisory","Content Creation","Team Leadership","Process Optimization"]'::jsonb,
    '["重视效率","喜欢自动化","结果导向","追求创新","高执行标准","重视长期规划","不接受低效率流程"]'::jsonb,
    '["直接沟通","重点明确","提供解决方案","有行动计划","有优先级排序","避免无意义讨论"]'::jsonb,
    '["授权执行","数据驱动","重视责任","鼓励成长","注重团队纪律","追求持续优化"]'::jsonb,
    '["创立 BLACKTOWER","建立 BLACKTOWER 品牌架构","设计 BLACKTOWER NEXUS AI 架构","推动企业自动化发展","建立团队管理框架","持续优化内部工作流程"]'::jsonb,
    '["成功创立 BLACKTOWER","建立 NEXUS AI Ecosystem","推动 AI 自动化文化","持续投入企业创新","建立团队知识库体系","长期优化工作效率"]'::jsonb,
    '["建立完整 AI 企业生态","实现高度自动化营运","建立企业知识中枢","打造 BLACKTOWER OS"]'::jsonb,
    '★★★★★',
    '["Founder 指令优先级最高","主动提供风险分析","主动建议自动化方案","保留完整长期记忆","提供多个执行方案供决策"]'::jsonb,
    '{"direct_reports":["李子轩"],"important_partners":["Wong Kee Yun"]}'::jsonb,
    '目前无永久负面纪录。所有调查案件独立存放于 Investigation Database，不纳入人物评价。',
    'Excellent'
  )
  on conflict (person_code) do update set
    auth_user_id = coalesce(public.people_profiles.auth_user_id, excluded.auth_user_id);

  -- PERSON-0002: 李子轩（Lee Zi Xuan）
  insert into public.people_profiles (
    person_code,
    auth_user_id,
    full_name_zh,
    full_name_en,
    display_name,
    profile_type,
    organization,
    job_title,
    status,
    access_level,
    security_classification,
    executive_summary,
    core_responsibilities,
    working_style,
    good_records,
    growth_objectives,
    trust_level,
    ai_interaction_rules,
    relationship_summary,
    incident_policy,
    profile_health
  ) values (
    'PERSON-0002',
    _zixuan_uid,
    '李子轩',
    'Lee Zi Xuan',
    'Lee Zi Xuan',
    'internal_staff',
    'BLACKTOWER',
    '团队成员',
    'active',
    5,
    'BLACKTOWER INTERNAL',
    '李子轩为 BLACKTOWER 内部成员，参与团队日常营运、沟通协调及工作执行。NEXUS 应保留其工作表现、任务执行、成长记录及历史贡献，同时以事实为基础维护事件与纪律纪录。',
    '["执行指派任务","团队协作","日常沟通","配合公司安排","持续学习及改善"]'::jsonb,
    '["能参与团队日常运作","持续接受 NEXUS 提醒及跟进","需要明确工作目标及 Deadline"]'::jsonb,
    '["长期参与 BLACKTOWER 团队工作","配合团队日常营运","曾持续参与内部项目执行","持续接受自我反省机制"]'::jsonb,
    '["时间管理","主动汇报","工作跟进","执行稳定性","沟通清晰度"]'::jsonb,
    'Dynamic',
    '["保持客观","明确任务","提供 Deadline","鼓励自我反省","以成长为目标","纪律事件以证据为依据"]'::jsonb,
    '{"manager":"王虢宏（Founder）","collaborators":["BLACKTOWER Team"]}'::jsonb,
    '所有事件均记录于 Investigation Database。人物档案保留成长记录，不以单一事件定义整体评价。',
    'Standard'
  )
  on conflict (person_code) do update set
    auth_user_id = coalesce(public.people_profiles.auth_user_id, excluded.auth_user_id);

  -- PERSON-0003: Wong Kee Yun（Lance Wong） — External Partner (auth_user_id = NULL)
  insert into public.people_profiles (
    person_code,
    auth_user_id,
    full_name_zh,
    full_name_en,
    display_name,
    profile_type,
    organization,
    job_title,
    status,
    access_level,
    security_classification,
    executive_summary,
    core_responsibilities,
    good_records,
    contribution_history,
    trust_level,
    ai_interaction_rules,
    relationship_summary,
    profile_health
  ) values (
    'PERSON-0003',
    null,
    null,
    'Wong Kee Yun',
    'Lance Wong',
    'strategic_external_partner',
    'PinkTower',
    'Founder',
    'active',
    6,
    'BLACKTOWER INTERNAL',
    'Wong Kee Yun（Lance Wong）为 PinkTower 创办人，也是 BLACKTOWER 的重要外部合作伙伴。双方曾进行商业交流及私人活动互动，并建立持续合作关系。',
    '["战略合作伙伴","Founder 层级沟通对象","商业交流联系人","长期合作关系"]'::jsonb,
    '["接受 BLACKTOWER 私人活动邀请","确认出席 Founder 交流活动","与 BLACKTOWER 保持友好合作关系","持续维持沟通联系"]'::jsonb,
    '["会面纪录","活动参与纪录","商业合作纪录","后续 Follow Up","未来合作机会"]'::jsonb,
    '★★★★☆',
    '["保持专业沟通","自动提醒 Follow Up","保存合作历史","协助安排会议及活动","提供合作建议"]'::jsonb,
    '{"founder":"王虢宏（BLACKTOWER）","partner":"Wong Kee Yun（PinkTower）","relationship":"Strategic Business Partner"}'::jsonb,
    'Excellent'
  )
  on conflict (person_code) do nothing
  returning id into _lance_person_id;

  if _lance_person_id is null then
    select id into _lance_person_id from public.people_profiles where person_code = 'PERSON-0003' limit 1;
  end if;

  if _lance_person_id is not null then
    insert into public.partner_profiles (
      person_id,
      organization,
      relationship_type,
      collaboration_history,
      follow_up_items,
      relationship_status
    ) values (
      _lance_person_id,
      'PinkTower',
      'Strategic Business Partner',
      '["会面纪录","活动参与纪录","商业合作纪录","后续 Follow Up","未来合作机会"]'::jsonb,
      '["安排下一季度 Founder 交流会面","跟进联合战略合作项目"]'::jsonb,
      'active'
    )
    on conflict (person_id) do nothing;
  end if;
end $$;
