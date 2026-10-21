/**
 * BLACKTOWER™ PEOPLE INTELLIGENCE — DOMAIN TYPES & SCHEMAS
 */

export type AppRole = "admin" | "member";

export type PersonProfileType =
  | "founder"
  | "internal_staff"
  | "strategic_external_partner";

export type PersonStatus = "active" | "archived";

export type IntelligenceSourceType =
  | "FACT"
  | "USER_PROVIDED"
  | "ADMIN_RECORDED"
  | "AI_INFERENCE";

export type InvestigationStatus =
  | "open"
  | "review"
  | "resolved"
  | "closed"
  | "archived";

export type InvestigationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AuditActionType =
  | "PROFILE_READ"
  | "PROFILE_CREATE"
  | "PROFILE_UPDATE"
  | "PROFILE_ARCHIVE"
  | "INTELLIGENCE_READ"
  | "INTELLIGENCE_CREATE"
  | "INTELLIGENCE_UPDATE"
  | "INTELLIGENCE_ARCHIVE"
  | "PARTNER_READ"
  | "PARTNER_CREATE"
  | "PARTNER_UPDATE"
  | "PARTNER_ARCHIVE"
  | "INVESTIGATION_READ"
  | "INVESTIGATION_CREATE"
  | "INVESTIGATION_UPDATE"
  | "INVESTIGATION_ARCHIVE"
  | "ROLE_UPDATE"
  | "ACCESS_DENIED";

export interface PersonProfile {
  id: string;
  person_code: string;
  auth_user_id: string | null;
  full_name_zh: string | null;
  full_name_en: string;
  display_name: string;
  profile_type: PersonProfileType;
  organization: string;
  job_title: string | null;
  status: PersonStatus;
  access_level: number;
  security_classification: string;
  executive_summary: string | null;
  core_responsibilities: string[];
  expertise: string[];
  working_style: string[];
  communication_preferences: string[];
  leadership_style: string[];
  contribution_history: string[];
  good_records: string[];
  growth_objectives: string[];
  trust_level: string;
  ai_interaction_rules: string[];
  relationship_summary: Record<string, unknown>;
  incident_policy: string | null;
  profile_health: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

export interface InternalIntelligenceRecord {
  id: string;
  person_id: string;
  category: string;
  content: string;
  source_type: IntelligenceSourceType;
  source_reference: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

export interface PartnerProfileRecord {
  id: string;
  person_id: string;
  organization: string;
  relationship_type: string;
  collaboration_history: string[];
  follow_up_items: string[];
  relationship_status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

export interface InvestigationRecord {
  id: string;
  person_id: string | null;
  case_reference: string;
  title: string;
  description: string | null;
  status: InvestigationStatus;
  severity: InvestigationSeverity;
  evidence: string[];
  timeline: string[];
  resolution: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

export interface AccessAuditLogRecord {
  id: string;
  actor_user_id: string;
  action: AuditActionType;
  resource_type: string;
  resource_id: string | null;
  target_person_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  ip_hash: string | null;
  user_agent: string | null;
}

export interface ProfileVersionRecord {
  id: string;
  person_id: string;
  version_number: number;
  snapshot: PersonProfile;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
}

export interface ActorIdentity {
  userId: string | null;
  roles: AppRole[];
}
