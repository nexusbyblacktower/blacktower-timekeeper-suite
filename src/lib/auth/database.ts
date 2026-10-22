import type { Database } from "@/integrations/supabase/types";
import type { PersonProfile, InternalIntelligenceRecord, PartnerProfileRecord, InvestigationRecord, AccessAuditLogRecord, ProfileVersionRecord } from "@/lib/people/peopleTypes";
import type { ObservableActivitySession } from "@/lib/context/contextSwitchingEngine";

type Fields<T> = { [K in keyof T]: T[K] };
type Table<T> = { Row: Fields<T>; Insert: Partial<Fields<T>>; Update: Partial<Fields<T>>; Relationships: [] };
// Application-owned schema extension while the dedicated connection is pending.
// This declares the existing migration contract; it does not provision tables.
export type AuthDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      operator_profiles: Table<{ id: string; auth_user_id: string | null; person_code: string; full_name: string }>;
      people_profiles: Table<PersonProfile>;
      internal_intelligence: Table<InternalIntelligenceRecord>;
      partner_profiles: Table<PartnerProfileRecord>;
      investigations: Table<InvestigationRecord>;
      access_audit_logs: Table<AccessAuditLogRecord>;
      profile_versions: Table<ProfileVersionRecord>;
      time_sessions: Table<ObservableActivitySession & { user_id: string }>;
    };
  };
};