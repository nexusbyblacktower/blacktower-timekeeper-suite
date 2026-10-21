import type {
  AccessAuditLogRecord,
  ActorIdentity,
  InternalIntelligenceRecord,
  InvestigationRecord,
  PartnerProfileRecord,
  PersonProfile,
  ProfileVersionRecord,
} from "./peopleTypes";

/**
 * BLACKTOWER™ PEOPLE INTELLIGENCE — CANONICAL SEED RECORDS & DETERMINISTIC RLS GUARD
 *
 * CRITICAL SECURITY INVARIANTS (Sections 3, 4, 5, 6, 37, 38):
 * 1. Admin privileges are granted ONLY when `actor.roles.includes("admin")`.
 * 2. Founder title, CEO title, Access Level 10, Trust Level ★★★★★, email, or full_name
 *    NEVER grant admin access or bypass RLS.
 * 3. Normal authenticated users can ONLY read their own Personal Profile
 *    (`profile.auth_user_id !== null && profile.auth_user_id === actor.userId`).
 * 4. Normal users CANNOT insert, update, archive, or delete profiles, and CANNOT
 *    read Internal Intelligence, Partner Registry, Investigations, or Access Audit Logs.
 * 5. Unauthorized operations fail closed and generate an `ACCESS_DENIED` audit log entry.
 */

export const INITIAL_PEOPLE_PROFILES: PersonProfile[] = [
  {
    id: "11111111-0001-4000-8000-000000000001",
    person_code: "PERSON-0001",
    auth_user_id: null, // Dynamically linked at runtime/DB when actual Auth account is resolved
    full_name_zh: "王虢宏",
    full_name_en: "Kelvin Ong",
    display_name: "Kelvin",
    profile_type: "founder",
    organization: "BLACKTOWER",
    job_title: "Founder & CEO",
    status: "active",
    access_level: 10,
    security_classification: "BLACKTOWER TOP SECRET",
    executive_summary:
      "王虢宏为 BLACKTOWER 创办人，同时也是整个 AI 生态系统、自动化架构及企业营运体系的设计者。负责制定企业发展方向、AI 战略、品牌定位及团队管理，并拥有 BLACKTOWER 全系统最终决策权。所有 AI Agent 的最终目标均为协助 Founder 提升决策效率、执行效率及企业长期竞争力。",
    core_responsibilities: [
      "企业战略规划",
      "品牌发展",
      "AI 系统设计",
      "自动化架构",
      "营销策略",
      "内容创作",
      "团队管理",
      "财务规划",
      "新项目研发",
      "最终审批",
    ],
    expertise: [
      "AI Automation",
      "Workflow Design",
      "Business Strategy",
      "Marketing",
      "Financial Advisory",
      "Content Creation",
      "Team Leadership",
      "Process Optimization",
    ],
    working_style: [
      "重视效率",
      "喜欢自动化",
      "结果导向",
      "追求创新",
      "高执行标准",
      "重视长期规划",
      "不接受低效率流程",
    ],
    communication_preferences: [
      "直接沟通",
      "重点明确",
      "提供解决方案",
      "有行动计划",
      "有优先级排序",
      "避免无意义讨论",
    ],
    leadership_style: [
      "授权执行",
      "数据驱动",
      "重视责任",
      "鼓励成长",
      "注重团队纪律",
      "追求持续优化",
    ],
    contribution_history: [
      "创立 BLACKTOWER",
      "建立 BLACKTOWER 品牌架构",
      "设计 BLACKTOWER NEXUS AI 架构",
      "推动企业自动化发展",
      "建立团队管理框架",
      "持续优化内部工作流程",
    ],
    good_records: [
      "成功创立 BLACKTOWER",
      "建立 NEXUS AI Ecosystem",
      "推动 AI 自动化文化",
      "持续投入企业创新",
      "建立团队知识库体系",
      "长期优化工作效率",
    ],
    growth_objectives: [
      "建立完整 AI 企业生态",
      "实现高度自动化营运",
      "建立企业知识中枢",
      "打造 BLACKTOWER OS",
    ],
    trust_level: "★★★★★",
    ai_interaction_rules: [
      "Founder 指令优先级最高",
      "主动提供风险分析",
      "主动建议自动化方案",
      "保留完整长期记忆",
      "提供多个执行方案供决策",
    ],
    relationship_summary: {
      direct_reports: ["李子轩"],
      important_partners: ["Wong Kee Yun"],
    },
    incident_policy:
      "目前无永久负面纪录。所有调查案件独立存放于 Investigation Database，不纳入人物评价。",
    profile_health: "Excellent",
    created_at: "2026-10-20T00:00:00.000Z",
    updated_at: "2026-10-20T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    archived_at: null,
    archived_by: null,
  },
  {
    id: "11111111-0002-4000-8000-000000000002",
    person_code: "PERSON-0002",
    auth_user_id: null, // Dynamically linked at runtime/DB when actual Auth account is resolved
    full_name_zh: "李子轩",
    full_name_en: "Lee Zi Xuan",
    display_name: "Lee Zi Xuan",
    profile_type: "internal_staff",
    organization: "BLACKTOWER",
    job_title: "团队成员",
    status: "active",
    access_level: 5,
    security_classification: "BLACKTOWER INTERNAL",
    executive_summary:
      "李子轩为 BLACKTOWER 内部成员，参与团队日常营运、沟通协调及工作执行。NEXUS 应保留其工作表现、任务执行、成长记录及历史贡献，同时以事实为基础维护事件与纪律纪录。",
    core_responsibilities: [
      "执行指派任务",
      "团队协作",
      "日常沟通",
      "配合公司安排",
      "持续学习及改善",
    ],
    expertise: [],
    working_style: [
      "能参与团队日常运作",
      "持续接受 NEXUS 提醒及跟进",
      "需要明确工作目标及 Deadline",
    ],
    communication_preferences: [],
    leadership_style: [],
    contribution_history: [],
    good_records: [
      "长期参与 BLACKTOWER 团队工作",
      "配合团队日常营运",
      "曾持续参与内部项目执行",
      "持续接受自我反省机制",
    ],
    growth_objectives: [
      "时间管理",
      "主动汇报",
      "工作跟进",
      "执行稳定性",
      "沟通清晰度",
    ],
    trust_level: "Dynamic",
    ai_interaction_rules: [
      "保持客观",
      "明确任务",
      "提供 Deadline",
      "鼓励自我反省",
      "以成长为目标",
      "纪律事件以证据为依据",
    ],
    relationship_summary: {
      manager: "王虢宏（Founder）",
      collaborators: ["BLACKTOWER Team"],
    },
    incident_policy:
      "所有事件均记录于 Investigation Database。人物档案保留成长记录，不以单一事件定义整体评价。",
    profile_health: "Standard",
    created_at: "2026-10-20T00:00:00.000Z",
    updated_at: "2026-10-20T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    archived_at: null,
    archived_by: null,
  },
  {
    id: "11111111-0003-4000-8000-000000000003",
    person_code: "PERSON-0003",
    auth_user_id: null, // External partner: never requires a Supabase Auth account
    full_name_zh: null,
    full_name_en: "Wong Kee Yun",
    display_name: "Lance Wong",
    profile_type: "strategic_external_partner",
    organization: "PinkTower",
    job_title: "Founder",
    status: "active",
    access_level: 6,
    security_classification: "BLACKTOWER INTERNAL",
    executive_summary:
      "Wong Kee Yun（Lance Wong）为 PinkTower 创办人，也是 BLACKTOWER 的重要外部合作伙伴。双方曾进行商业交流及私人活动互动，并建立持续合作关系。",
    core_responsibilities: [
      "战略合作伙伴",
      "Founder 层级沟通对象",
      "商业交流联系人",
      "长期合作关系",
    ],
    expertise: [],
    working_style: [],
    communication_preferences: [],
    leadership_style: [],
    contribution_history: [
      "会面纪录",
      "活动参与纪录",
      "商业合作纪录",
      "后续 Follow Up",
      "未来合作机会",
    ],
    good_records: [
      "接受 BLACKTOWER 私人活动邀请",
      "确认出席 Founder 交流活动",
      "与 BLACKTOWER 保持友好合作关系",
      "持续维持沟通联系",
    ],
    growth_objectives: [],
    trust_level: "★★★★☆",
    ai_interaction_rules: [
      "保持专业沟通",
      "自动提醒 Follow Up",
      "保存合作历史",
      "协助安排会议及活动",
      "提供合作建议",
    ],
    relationship_summary: {
      founder: "王虢宏（BLACKTOWER）",
      partner: "Wong Kee Yun（PinkTower）",
      relationship: "Strategic Business Partner",
    },
    incident_policy: null,
    profile_health: "Excellent",
    created_at: "2026-10-20T00:00:00.000Z",
    updated_at: "2026-10-20T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    archived_at: null,
    archived_by: null,
  },
];

export const INITIAL_PARTNER_PROFILES: PartnerProfileRecord[] = [
  {
    id: "22222222-0003-4000-8000-000000000003",
    person_id: "11111111-0003-4000-8000-000000000003",
    organization: "PinkTower",
    relationship_type: "Strategic Business Partner",
    collaboration_history: [
      "会面纪录",
      "活动参与纪录",
      "商业合作纪录",
      "后续 Follow Up",
      "未来合作机会",
    ],
    follow_up_items: [
      "安排 Founder 战略交流会面",
      "跟进商业合作机会与后续活动",
    ],
    relationship_status: "active",
    created_at: "2026-10-20T00:00:00.000Z",
    updated_at: "2026-10-20T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    archived_at: null,
    archived_by: null,
  },
];

/**
 * Pure authorization check mirroring `public.is_admin(auth.uid())`.
 * NEVER inspects email, full_name, job_title, profile_type, access_level, or trust_level.
 */
export function isActorAdmin(actor: ActorIdentity | null | undefined): boolean {
  if (!actor || !actor.userId || !Array.isArray(actor.roles)) return false;
  return actor.roles.includes("admin");
}

/**
 * Pure RLS read check for `people_profiles`:
 * - Normal authenticated user can ONLY read rows where `auth_user_id === actor.userId`
 * - Admin can read all rows
 * - Unauthenticated or external partner with no login has zero access
 */
export function canReadPersonProfile(
  actor: ActorIdentity | null | undefined,
  profile: PersonProfile
): boolean {
  if (!actor || !actor.userId) return false;
  if (isActorAdmin(actor)) return true;
  return profile.auth_user_id !== null && profile.auth_user_id === actor.userId;
}

/**
 * Filters a list of `people_profiles` according to strict RLS rules.
 */
export function filterReadableProfiles(
  actor: ActorIdentity | null | undefined,
  profiles: PersonProfile[]
): PersonProfile[] {
  if (!actor || !actor.userId) return [];
  if (isActorAdmin(actor)) return [...profiles];
  return profiles.filter(
    (p) => p.auth_user_id !== null && p.auth_user_id === actor.userId
  );
}

/**
 * Computes changed field names between two `PersonProfile` objects for safe
 * audit logging (without logging sensitive values).
 */
export function computeChangedProfileFields(
  before: PersonProfile,
  after: Partial<PersonProfile>
): string[] {
  const ignoredKeys = new Set(["updated_at", "updated_by"]);
  const changed: string[] = [];

  for (const key of Object.keys(after) as Array<keyof PersonProfile>) {
    if (ignoredKeys.has(key)) continue;
    const prevVal = JSON.stringify(before[key]);
    const nextVal = JSON.stringify(after[key]);
    if (prevVal !== nextVal) {
      changed.push(key);
    }
  }
  return changed;
}

/**
 * Deterministic People Intelligence Store & Policy Enforcer
 * Used for both local state enforcement and automated security policy testing (Tests 1–13).
 */
export class PeopleSecurityGuardStore {
  private profiles: PersonProfile[];
  private intelligence: InternalIntelligenceRecord[];
  private partners: PartnerProfileRecord[];
  private investigations: InvestigationRecord[];
  private auditLogs: AccessAuditLogRecord[];
  private versions: ProfileVersionRecord[];

  constructor(
    initialProfiles: PersonProfile[] = INITIAL_PEOPLE_PROFILES,
    initialPartners: PartnerProfileRecord[] = INITIAL_PARTNER_PROFILES
  ) {
    this.profiles = initialProfiles.map((p) => ({ ...p }));
    this.partners = initialPartners.map((p) => ({ ...p }));
    this.intelligence = [];
    this.investigations = [];
    this.auditLogs = [];
    this.versions = initialProfiles.map((p) => ({
      id: `ver-${p.person_code}-1`,
      person_id: p.id,
      version_number: 1,
      snapshot: { ...p },
      changed_by: null,
      change_reason: "INITIAL_SEED",
      created_at: p.created_at,
    }));
  }

  private recordAudit(
    actorUserId: string,
    action: AccessAuditLogRecord["action"],
    resourceType: string,
    resourceId: string | null,
    targetPersonId: string | null,
    metadata: Record<string, unknown> = {}
  ): AccessAuditLogRecord {
    const entry: AccessAuditLogRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actor_user_id: actorUserId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      target_person_id: targetPersonId,
      metadata,
      created_at: new Date().toISOString(),
      ip_hash: null,
      user_agent: null,
    };
    this.auditLogs.unshift(entry);
    return entry;
  }

  public linkAuthUser(personCode: string, authUserId: string | null): void {
    const target = this.profiles.find((p) => p.person_code === personCode);
    if (target) {
      target.auth_user_id = authUserId;
    }
  }

  public selectProfiles(actor: ActorIdentity): PersonProfile[] {
    if (!actor.userId) return [];
    const readable = filterReadableProfiles(actor, this.profiles);
    for (const p of readable) {
      this.recordAudit(actor.userId, "PROFILE_READ", "people_profile", p.id, p.id, {
        person_code: p.person_code,
      });
    }
    return readable;
  }

  public selectProfileByCode(
    actor: ActorIdentity,
    personCode: string
  ): { ok: true; data: PersonProfile } | { ok: false; error: string } {
    if (!actor.userId) {
      return { ok: false, error: "ACCESS_DENIED: Unauthenticated" };
    }
    const target = this.profiles.find((p) => p.person_code === personCode);
    if (!target) {
      return { ok: false, error: "NOT_FOUND" };
    }
    if (!canReadPersonProfile(actor, target)) {
      this.recordAudit(
        actor.userId,
        "ACCESS_DENIED",
        "people_profile",
        target.id,
        target.id,
        { attempted_action: "PROFILE_READ", person_code: personCode }
      );
      return { ok: false, error: "ACCESS_DENIED: Insufficient role or ownership" };
    }
    this.recordAudit(
      actor.userId,
      "PROFILE_READ",
      "people_profile",
      target.id,
      target.id,
      { person_code: target.person_code }
    );
    return { ok: true, data: { ...target } };
  }

  public createProfile(
    actor: ActorIdentity,
    input: Omit<
      PersonProfile,
      "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "archived_at" | "archived_by"
    >
  ): { ok: true; data: PersonProfile } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "people_profile",
        null,
        null,
        { attempted_action: "PROFILE_CREATE", person_code: input.person_code }
      );
      return { ok: false, error: "ACCESS_DENIED: Admin role required to create people profiles" };
    }

    const nowIso = new Date().toISOString();
    const created: PersonProfile = {
      ...input,
      id: `person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: actor.userId,
      updated_by: actor.userId,
      archived_at: null,
      archived_by: null,
    };

    this.profiles.push(created);
    this.versions.push({
      id: `ver-${created.id}-1`,
      person_id: created.id,
      version_number: 1,
      snapshot: { ...created },
      changed_by: actor.userId,
      change_reason: "INITIAL_PROFILE_CREATION",
      created_at: nowIso,
    });
    this.recordAudit(
      actor.userId,
      "PROFILE_CREATE",
      "people_profile",
      created.id,
      created.id,
      { person_code: created.person_code, profile_type: created.profile_type }
    );

    return { ok: true, data: { ...created } };
  }

  public updateProfile(
    actor: ActorIdentity,
    personId: string,
    updates: Partial<PersonProfile>,
    changeReason: string = "ADMIN_PROFILE_UPDATE"
  ): { ok: true; data: PersonProfile } | { ok: false; error: string } {
    const idx = this.profiles.findIndex((p) => p.id === personId);
    const target = idx >= 0 ? this.profiles[idx] : null;

    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "people_profile",
        personId,
        personId,
        { attempted_action: "PROFILE_UPDATE" }
      );
      return { ok: false, error: "ACCESS_DENIED: Admin role required to update people profiles" };
    }

    if (!target) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const changedFields = computeChangedProfileFields(target, updates);
    const nowIso = new Date().toISOString();
    const updated: PersonProfile = {
      ...target,
      ...updates,
      id: target.id,
      updated_at: nowIso,
      updated_by: actor.userId,
    };

    this.profiles[idx] = updated;

    const existingVers = this.versions.filter((v) => v.person_id === personId);
    const nextVersionNumber =
      existingVers.reduce((max, v) => Math.max(max, v.version_number), 0) + 1;

    this.versions.push({
      id: `ver-${personId}-${nextVersionNumber}`,
      person_id: personId,
      version_number: nextVersionNumber,
      snapshot: { ...updated },
      changed_by: actor.userId,
      change_reason: changeReason,
      created_at: nowIso,
    });

    this.recordAudit(
      actor.userId,
      "PROFILE_UPDATE",
      "people_profile",
      personId,
      personId,
      {
        person_code: updated.person_code,
        changed_fields: changedFields,
        version_number: nextVersionNumber,
      }
    );

    return { ok: true, data: { ...updated } };
  }

  public archiveProfile(
    actor: ActorIdentity,
    personId: string
  ): { ok: true; data: PersonProfile } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "people_profile",
        personId,
        personId,
        { attempted_action: "PROFILE_ARCHIVE" }
      );
      return { ok: false, error: "ACCESS_DENIED: Admin role required to archive people profiles" };
    }

    const idx = this.profiles.findIndex((p) => p.id === personId);
    if (idx < 0) return { ok: false, error: "NOT_FOUND" };

    const target = this.profiles[idx];
    const nowIso = new Date().toISOString();
    const archived: PersonProfile = {
      ...target,
      status: "archived",
      archived_at: nowIso,
      archived_by: actor.userId,
      updated_at: nowIso,
      updated_by: actor.userId,
    };
    this.profiles[idx] = archived;

    const existingVers = this.versions.filter((v) => v.person_id === personId);
    const nextVersionNumber =
      existingVers.reduce((max, v) => Math.max(max, v.version_number), 0) + 1;

    this.versions.push({
      id: `ver-${personId}-${nextVersionNumber}`,
      person_id: personId,
      version_number: nextVersionNumber,
      snapshot: { ...archived },
      changed_by: actor.userId,
      change_reason: "PROFILE_ARCHIVED",
      created_at: nowIso,
    });

    this.recordAudit(
      actor.userId,
      "PROFILE_ARCHIVE",
      "people_profile",
      personId,
      personId,
      {
        person_code: archived.person_code,
        changed_fields: ["status", "archived_at", "archived_by"],
        version_number: nextVersionNumber,
      }
    );

    return { ok: true, data: { ...archived } };
  }

  public selectInternalIntelligence(
    actor: ActorIdentity
  ): { ok: true; data: InternalIntelligenceRecord[] } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "internal_intelligence",
        null,
        null,
        { attempted_action: "INTELLIGENCE_READ" }
      );
      return { ok: false, error: "ACCESS_DENIED: Internal Intelligence is restricted to Admin" };
    }
    this.recordAudit(actor.userId, "INTELLIGENCE_READ", "internal_intelligence", null, null);
    return { ok: true, data: [...this.intelligence] };
  }

  public createInternalIntelligence(
    actor: ActorIdentity,
    input: Pick<
      InternalIntelligenceRecord,
      "person_id" | "category" | "content" | "source_type" | "source_reference"
    >
  ): { ok: true; data: InternalIntelligenceRecord } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "internal_intelligence",
        null,
        input.person_id,
        { attempted_action: "INTELLIGENCE_CREATE" }
      );
      return { ok: false, error: "ACCESS_DENIED: Admin role required" };
    }
    const nowIso = new Date().toISOString();
    const rec: InternalIntelligenceRecord = {
      id: `intel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      person_id: input.person_id,
      category: input.category,
      content: input.content,
      source_type: input.source_type,
      source_reference: input.source_reference,
      visibility: "admin_only",
      created_at: nowIso,
      updated_at: nowIso,
      created_by: actor.userId,
      updated_by: actor.userId,
      archived_at: null,
      archived_by: null,
    };
    this.intelligence.unshift(rec);
    this.recordAudit(
      actor.userId,
      "INTELLIGENCE_CREATE",
      "internal_intelligence",
      rec.id,
      rec.person_id,
      { category: rec.category, source_type: rec.source_type }
    );
    return { ok: true, data: rec };
  }

  public selectInvestigations(
    actor: ActorIdentity
  ): { ok: true; data: InvestigationRecord[] } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "investigations",
        null,
        null,
        { attempted_action: "INVESTIGATION_READ" }
      );
      return { ok: false, error: "ACCESS_DENIED: Investigations are restricted to Admin" };
    }
    this.recordAudit(actor.userId, "INVESTIGATION_READ", "investigations", null, null);
    return { ok: true, data: [...this.investigations] };
  }

  public createInvestigation(
    actor: ActorIdentity,
    input: Pick<
      InvestigationRecord,
      "person_id" | "case_reference" | "title" | "description" | "status" | "severity" | "evidence" | "timeline" | "resolution"
    >
  ): { ok: true; data: InvestigationRecord } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "investigations",
        null,
        input.person_id,
        { attempted_action: "INVESTIGATION_CREATE" }
      );
      return { ok: false, error: "ACCESS_DENIED: Admin role required" };
    }
    const nowIso = new Date().toISOString();
    const rec: InvestigationRecord = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...input,
      created_at: nowIso,
      updated_at: nowIso,
      created_by: actor.userId,
      updated_by: actor.userId,
      closed_at: input.status === "closed" ? nowIso : null,
      closed_by: input.status === "closed" ? actor.userId : null,
      archived_at: null,
      archived_by: null,
    };
    this.investigations.unshift(rec);
    this.recordAudit(
      actor.userId,
      "INVESTIGATION_CREATE",
      "investigations",
      rec.id,
      rec.person_id,
      { case_reference: rec.case_reference, severity: rec.severity }
    );
    return { ok: true, data: rec };
  }

  public selectPartners(
    actor: ActorIdentity
  ): { ok: true; data: PartnerProfileRecord[] } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "partner_profiles",
        null,
        null,
        { attempted_action: "PARTNER_READ" }
      );
      return { ok: false, error: "ACCESS_DENIED: Partner Registry is restricted to Admin" };
    }
    this.recordAudit(actor.userId, "PARTNER_READ", "partner_profiles", null, null);
    return { ok: true, data: [...this.partners] };
  }

  public selectAuditLogs(
    actor: ActorIdentity
  ): { ok: true; data: AccessAuditLogRecord[] } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "access_audit_logs",
        null,
        null,
        { attempted_action: "AUDIT_LOG_READ" }
      );
      return { ok: false, error: "ACCESS_DENIED: Audit logs are restricted to Admin" };
    }
    return { ok: true, data: [...this.auditLogs] };
  }

  public selectProfileVersions(
    actor: ActorIdentity,
    personId?: string
  ): { ok: true; data: ProfileVersionRecord[] } | { ok: false; error: string } {
    if (!actor.userId || !isActorAdmin(actor)) {
      this.recordAudit(
        actor?.userId || "anonymous",
        "ACCESS_DENIED",
        "profile_versions",
        null,
        personId ?? null,
        { attempted_action: "VERSION_HISTORY_READ" }
      );
      return { ok: false, error: "ACCESS_DENIED: Version history is restricted to Admin" };
    }
    const list = personId
      ? this.versions.filter((v) => v.person_id === personId)
      : this.versions;
    return { ok: true, data: [...list] };
  }
}
