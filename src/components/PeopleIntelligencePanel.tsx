import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Lock,
  FileText,
  Briefcase,
  Search,
  Plus,
  Edit3,
  Archive,
  History,
  CheckCircle2,
  AlertTriangle,
  Eye,
  UserCheck,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIntelligence } from "@/hooks/useIntelligence";
import type {
  AccessAuditLogRecord,
  ActorIdentity,
  IntelligenceSourceType,
  InternalIntelligenceRecord,
  InvestigationRecord,
  InvestigationSeverity,
  InvestigationStatus,
  PartnerProfileRecord,
  PersonProfile,
  PersonProfileType,
  ProfileVersionRecord,
} from "@/lib/people/peopleTypes";
import {
  INITIAL_PARTNER_PROFILES,
  INITIAL_PEOPLE_PROFILES,
  PeopleSecurityGuardStore,
  canReadPersonProfile,
  isActorAdmin,
} from "@/lib/people/peopleSecurityEngine";

type PeopleSubTab =
  | "MY_PROFILE"
  | "DIRECTORY"
  | "INTERNAL_INTEL"
  | "PARTNERS"
  | "INVESTIGATIONS"
  | "AUDIT_LOGS";

const KELVIN_DEFAULT_UID = "00000000-0000-4000-8000-000000000001";
const ZIXUAN_DEFAULT_UID = "00000000-0000-4000-8000-000000000002";

const parseStringArray = (val: unknown): string[] => {
  if (Array.isArray(val)) return val.map((item) => String(item));
  if (typeof val === "string" && val.trim().length > 0) {
    return val
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeDbPerson = (row: Record<string, unknown>): PersonProfile => ({
  id: String(row.id),
  person_code: String(row.person_code),
  auth_user_id: row.auth_user_id ? String(row.auth_user_id) : null,
  full_name_zh: row.full_name_zh ? String(row.full_name_zh) : null,
  full_name_en: String(row.full_name_en || ""),
  display_name: String(row.display_name || ""),
  profile_type: (row.profile_type as PersonProfileType) || "internal_staff",
  organization: String(row.organization || "BLACKTOWER"),
  job_title: row.job_title ? String(row.job_title) : null,
  status: row.status === "archived" ? "archived" : "active",
  access_level: Number(row.access_level ?? 1),
  security_classification: String(row.security_classification || "BLACKTOWER INTERNAL"),
  executive_summary: row.executive_summary ? String(row.executive_summary) : null,
  core_responsibilities: parseStringArray(row.core_responsibilities),
  expertise: parseStringArray(row.expertise),
  working_style: parseStringArray(row.working_style),
  communication_preferences: parseStringArray(row.communication_preferences),
  leadership_style: parseStringArray(row.leadership_style),
  contribution_history: parseStringArray(row.contribution_history),
  good_records: parseStringArray(row.good_records),
  growth_objectives: parseStringArray(row.growth_objectives),
  trust_level: String(row.trust_level || "Dynamic"),
  ai_interaction_rules: parseStringArray(row.ai_interaction_rules),
  relationship_summary:
    row.relationship_summary && typeof row.relationship_summary === "object"
      ? (row.relationship_summary as Record<string, unknown>)
      : {},
  incident_policy: row.incident_policy ? String(row.incident_policy) : null,
  profile_health: String(row.profile_health || "Standard"),
  created_at: String(row.created_at || new Date().toISOString()),
  updated_at: String(row.updated_at || new Date().toISOString()),
  created_by: row.created_by ? String(row.created_by) : null,
  updated_by: row.updated_by ? String(row.updated_by) : null,
  archived_at: row.archived_at ? String(row.archived_at) : null,
  archived_by: row.archived_by ? String(row.archived_by) : null,
});

// Persistent singleton guard store for deterministic local/fallback enforcement
const singletonGuardStore = new PeopleSecurityGuardStore(
  INITIAL_PEOPLE_PROFILES.map((p) => {
    if (p.person_code === "PERSON-0001") return { ...p, auth_user_id: KELVIN_DEFAULT_UID };
    if (p.person_code === "PERSON-0002") return { ...p, auth_user_id: ZIXUAN_DEFAULT_UID };
    return { ...p, auth_user_id: null };
  }),
  INITIAL_PARTNER_PROFILES
);

const PeopleIntelligencePanel = () => {
  const { user, fullName, roles, isAdmin, setLocalOperatorRoleAndIdentity } = useAuth();
  const { logToolInteraction } = useIntelligence();

  const actor: ActorIdentity = useMemo(
    () => ({
      userId: user?.id ?? null,
      roles,
    }),
    [user?.id, roles]
  );

  // Strict RBAC check: never relies on fullName, email, job_title, or access_level
  const verifiedAdmin = isActorAdmin(actor) && isAdmin;

  const [subTab, setSubTab] = useState<PeopleSubTab>("MY_PROFILE");
  const [profiles, setProfiles] = useState<PersonProfile[]>([]);
  const [intelligenceNotes, setIntelligenceNotes] = useState<InternalIntelligenceRecord[]>([]);
  const [partners, setPartners] = useState<PartnerProfileRecord[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AccessAuditLogRecord[]>([]);
  const [versions, setVersions] = useState<ProfileVersionRecord[]>([]);

  const [selectedPersonCode, setSelectedPersonCode] = useState<string>("PERSON-0001");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("active");
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Admin Edit / Create Modal States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Profile Form Fields
  const [formPersonCode, setFormPersonCode] = useState("");
  const [formNameZh, setFormNameZh] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formProfileType, setFormProfileType] = useState<PersonProfileType>("internal_staff");
  const [formOrg, setFormOrg] = useState("BLACKTOWER");
  const [formJobTitle, setFormJobTitle] = useState("");
  const [formAccessLevel, setFormAccessLevel] = useState(5);
  const [formClassification, setFormClassification] = useState("BLACKTOWER INTERNAL");
  const [formTrustLevel, setFormTrustLevel] = useState("Dynamic");
  const [formProfileHealth, setFormProfileHealth] = useState("Standard");
  const [formSummary, setFormSummary] = useState("");
  const [formResponsibilities, setFormResponsibilities] = useState("");
  const [formExpertise, setFormExpertise] = useState("");
  const [formWorkingStyle, setFormWorkingStyle] = useState("");
  const [formGoodRecords, setFormGoodRecords] = useState("");
  const [formGrowthObjectives, setFormGrowthObjectives] = useState("");
  const [formAiRules, setFormAiRules] = useState("");
  const [formIncidentPolicy, setFormIncidentPolicy] = useState("");

  // Internal Intelligence Form
  const [intelPersonId, setIntelPersonId] = useState("");
  const [intelCategory, setIntelCategory] = useState("OPERATIONAL_OBSERVATION");
  const [intelSourceType, setIntelSourceType] = useState<IntelligenceSourceType>("ADMIN_RECORDED");
  const [intelReference, setIntelReference] = useState("");
  const [intelContent, setIntelContent] = useState("");

  // Investigation Form
  const [invCaseRef, setInvCaseRef] = useState("");
  const [invPersonId, setInvPersonId] = useState("");
  const [invTitle, setInvTitle] = useState("");
  const [invSeverity, setInvSeverity] = useState<InvestigationSeverity>("MEDIUM");
  const [invStatus, setInvStatus] = useState<InvestigationStatus>("open");
  const [invDescription, setInvDescription] = useState("");
  const [invEvidence, setInvEvidence] = useState("");
  const [invResolution, setInvResolution] = useState("");

  // Partner Follow-up Form
  const [newFollowUpText, setNewFollowUpText] = useState("");

  // Ensure non-admins are locked to MY_PROFILE
  useEffect(() => {
    if (!verifiedAdmin && subTab !== "MY_PROFILE") {
      setSubTab("MY_PROFILE");
    }
  }, [verifiedAdmin, subTab]);

  // Synchronize guard store auth_user_id linkage with current operator when matching
  useEffect(() => {
    if (!user) return;
    const emailLower = (user.email || "").toLowerCase();
    if (
      emailLower === "blackmasterong@blacktower.com" ||
      emailLower === "kelvinong.private@outlook.my" ||
      user.id === KELVIN_DEFAULT_UID
    ) {
      singletonGuardStore.linkAuthUser("PERSON-0001", user.id);
    } else if (
      emailLower === "lee.zixuan@blacktower.com" ||
      user.id === ZIXUAN_DEFAULT_UID
    ) {
      singletonGuardStore.linkAuthUser("PERSON-0002", user.id);
    }
  }, [user]);

  const syncFromStoreAndSupabase = useCallback(async () => {
    if (!actor.userId) return;

    // 1. Always enforce deterministic RLS filtering via PeopleSecurityGuardStore
    const guardProfiles = singletonGuardStore.selectProfiles(actor);
    setProfiles(guardProfiles);

    if (verifiedAdmin) {
      const intelRes = singletonGuardStore.selectInternalIntelligence(actor);
      if (intelRes.ok) setIntelligenceNotes(intelRes.data);

      const partnerRes = singletonGuardStore.selectPartners(actor);
      if (partnerRes.ok) setPartners(partnerRes.data);

      const invRes = singletonGuardStore.selectInvestigations(actor);
      if (invRes.ok) setInvestigations(invRes.data);

      const verRes = singletonGuardStore.selectProfileVersions(actor);
      if (verRes.ok) setVersions(verRes.data);

      const auditRes = singletonGuardStore.selectAuditLogs(actor);
      if (auditRes.ok) setAuditLogs(auditRes.data);
    } else {
      setIntelligenceNotes([]);
      setPartners([]);
      setInvestigations([]);
      setVersions([]);
      setAuditLogs([]);
    }

    // 2. If Supabase is configured, query real RLS-protected tables and merge
    if (isSupabaseConfigured) {
      try {
        const { data: dbProfiles, error: profErr } = await supabase
          .from("people_profiles")
          .select("*")
          .order("person_code", { ascending: true });

        if (!profErr && dbProfiles && dbProfiles.length > 0) {
          const normalized = dbProfiles
            .map((r) => normalizeDbPerson(r as Record<string, unknown>))
            .filter((p) => canReadPersonProfile(actor, p));
          if (normalized.length > 0) {
            setProfiles(normalized);
          }
        }

        if (verifiedAdmin) {
          const [dbIntel, dbPartners, dbInvs, dbAudits, dbVers] = await Promise.all([
            supabase
              .from("internal_intelligence")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("partner_profiles")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("investigations")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("access_audit_logs")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(100),
            supabase
              .from("profile_versions")
              .select("*")
              .order("created_at", { ascending: false }),
          ]);

          if (dbIntel.data && dbIntel.data.length > 0) {
            setIntelligenceNotes(dbIntel.data as unknown as InternalIntelligenceRecord[]);
          }
          if (dbPartners.data && dbPartners.data.length > 0) {
            setPartners(
              dbPartners.data.map((p) => ({
                ...p,
                collaboration_history: parseStringArray(p.collaboration_history),
                follow_up_items: parseStringArray(p.follow_up_items),
              })) as PartnerProfileRecord[]
            );
          }
          if (dbInvs.data && dbInvs.data.length > 0) {
            setInvestigations(
              dbInvs.data.map((inv) => ({
                ...inv,
                evidence: parseStringArray(inv.evidence),
                timeline: parseStringArray(inv.timeline),
              })) as InvestigationRecord[]
            );
          }
          if (dbAudits.data && dbAudits.data.length > 0) {
            setAuditLogs(dbAudits.data as unknown as AccessAuditLogRecord[]);
          }
          if (dbVers.data && dbVers.data.length > 0) {
            setVersions(dbVers.data as unknown as ProfileVersionRecord[]);
          }
        }
      } catch {
        // Retain deterministic guard store state on network error
      }
    }
  }, [actor, verifiedAdmin]);

  useEffect(() => {
    syncFromStoreAndSupabase();
  }, [syncFromStoreAndSupabase]);

  // Own Personal Profile (`auth_user_id === actor.userId`)
  const myPersonalProfile = useMemo(
    () => profiles.find((p) => p.auth_user_id !== null && p.auth_user_id === actor.userId) ?? null,
    [profiles, actor.userId]
  );

  // Selected Profile in Admin Directory
  const selectedProfile = useMemo(
    () =>
      profiles.find((p) => p.person_code === selectedPersonCode) ??
      profiles[0] ??
      null,
    [profiles, selectedPersonCode]
  );

  const filteredDirectoryProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.person_code.toLowerCase().includes(q) ||
        p.full_name_en.toLowerCase().includes(q) ||
        (p.full_name_zh && p.full_name_zh.toLowerCase().includes(q)) ||
        p.display_name.toLowerCase().includes(q) ||
        p.organization.toLowerCase().includes(q) ||
        (p.job_title && p.job_title.toLowerCase().includes(q))
      );
    });
  }, [profiles, statusFilter, searchQuery]);

  const populateEditForm = (p: PersonProfile) => {
    setFormPersonCode(p.person_code);
    setFormNameZh(p.full_name_zh || "");
    setFormNameEn(p.full_name_en);
    setFormDisplayName(p.display_name);
    setFormProfileType(p.profile_type);
    setFormOrg(p.organization);
    setFormJobTitle(p.job_title || "");
    setFormAccessLevel(p.access_level);
    setFormClassification(p.security_classification);
    setFormTrustLevel(p.trust_level);
    setFormProfileHealth(p.profile_health);
    setFormSummary(p.executive_summary || "");
    setFormResponsibilities(p.core_responsibilities.join("\n"));
    setFormExpertise(p.expertise.join("\n"));
    setFormWorkingStyle(p.working_style.join("\n"));
    setFormGoodRecords(p.good_records.join("\n"));
    setFormGrowthObjectives(p.growth_objectives.join("\n"));
    setFormAiRules(p.ai_interaction_rules.join("\n"));
    setFormIncidentPolicy(p.incident_policy || "");
  };

  const startCreatePerson = () => {
    if (!verifiedAdmin) return;
    const nextNum = profiles.length + 1;
    setFormPersonCode(`PERSON-000${nextNum}`);
    setFormNameZh("");
    setFormNameEn("");
    setFormDisplayName("");
    setFormProfileType("internal_staff");
    setFormOrg("BLACKTOWER");
    setFormJobTitle("");
    setFormAccessLevel(5);
    setFormClassification("BLACKTOWER INTERNAL");
    setFormTrustLevel("Dynamic");
    setFormProfileHealth("Standard");
    setFormSummary("");
    setFormResponsibilities("");
    setFormExpertise("");
    setFormWorkingStyle("");
    setFormGoodRecords("");
    setFormGrowthObjectives("");
    setFormAiRules("");
    setFormIncidentPolicy("");
    setIsEditingProfile(false);
    setIsCreatingProfile(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);

    const payload = {
      person_code: formPersonCode.trim(),
      auth_user_id: isEditingProfile && selectedProfile ? selectedProfile.auth_user_id : null,
      full_name_zh: formNameZh.trim() || null,
      full_name_en: formNameEn.trim(),
      display_name: formDisplayName.trim() || formNameEn.trim(),
      profile_type: formProfileType,
      organization: formOrg.trim() || "BLACKTOWER",
      job_title: formJobTitle.trim() || null,
      status: (isEditingProfile && selectedProfile ? selectedProfile.status : "active") as
        | "active"
        | "archived",
      access_level: Math.max(0, Math.min(10, Number(formAccessLevel) || 1)),
      security_classification: formClassification.trim() || "BLACKTOWER INTERNAL",
      executive_summary: formSummary.trim() || null,
      core_responsibilities: parseStringArray(formResponsibilities),
      expertise: parseStringArray(formExpertise),
      working_style: parseStringArray(formWorkingStyle),
      communication_preferences:
        isEditingProfile && selectedProfile ? selectedProfile.communication_preferences : [],
      leadership_style:
        isEditingProfile && selectedProfile ? selectedProfile.leadership_style : [],
      contribution_history:
        isEditingProfile && selectedProfile ? selectedProfile.contribution_history : [],
      good_records: parseStringArray(formGoodRecords),
      growth_objectives: parseStringArray(formGrowthObjectives),
      trust_level: formTrustLevel.trim() || "Dynamic",
      ai_interaction_rules: parseStringArray(formAiRules),
      relationship_summary:
        isEditingProfile && selectedProfile ? selectedProfile.relationship_summary : {},
      incident_policy: formIncidentPolicy.trim() || null,
      profile_health: formProfileHealth.trim() || "Standard",
    };

    if (isCreatingProfile) {
      const res = singletonGuardStore.createProfile(actor, payload);
      if (!res.ok) {
        setStatusBanner({ type: "error", text: res.error });
        return;
      }

      if (isSupabaseConfigured) {
        await supabase.from("people_profiles").insert(payload).then(() => {});
      }

      logToolInteraction("ADMIN", `PEOPLE_CREATE:${payload.person_code}`);
      setIsCreatingProfile(false);
      setSelectedPersonCode(payload.person_code);
      await syncFromStoreAndSupabase();
      setStatusBanner({
        type: "success",
        text: `Created ${payload.person_code} (${payload.full_name_en}) with Version 1 snapshot and PROFILE_CREATE audit log.`,
      });
    } else if (isEditingProfile && selectedProfile) {
      const res = singletonGuardStore.updateProfile(
        actor,
        selectedProfile.id,
        payload,
        "ADMIN_DOSSIER_UPDATE"
      );
      if (!res.ok) {
        setStatusBanner({ type: "error", text: res.error });
        return;
      }

      if (isSupabaseConfigured) {
        await supabase
          .from("people_profiles")
          .update(payload)
          .eq("id", selectedProfile.id)
          .then(() => {});
      }

      logToolInteraction("ADMIN", `PEOPLE_UPDATE:${payload.person_code}`);
      setIsEditingProfile(false);
      await syncFromStoreAndSupabase();
      setStatusBanner({
        type: "success",
        text: `Updated ${payload.person_code}. Version snapshot saved and PROFILE_UPDATE audit event logged.`,
      });
    }
  };

  const handleArchivePerson = async (profile: PersonProfile) => {
    setStatusBanner(null);
    const res = singletonGuardStore.archiveProfile(actor, profile.id);
    if (!res.ok) {
      setStatusBanner({ type: "error", text: res.error });
      return;
    }

    if (isSupabaseConfigured) {
      await supabase
        .from("people_profiles")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
          archived_by: actor.userId,
        })
        .eq("id", profile.id)
        .then(() => {});
    }

    logToolInteraction("ADMIN", `PEOPLE_ARCHIVE:${profile.person_code}`);
    await syncFromStoreAndSupabase();
    setStatusBanner({
      type: "success",
      text: `Archived ${profile.person_code} (Soft-archive preserved record & created PROFILE_ARCHIVE audit log).`,
    });
  };

  const handleAddIntelligenceNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    const targetPerson =
      profiles.find((p) => p.id === intelPersonId) || selectedProfile || profiles[0];
    if (!targetPerson || !intelContent.trim()) return;

    const res = singletonGuardStore.createInternalIntelligence(actor, {
      person_id: targetPerson.id,
      category: intelCategory.trim() || "OPERATIONAL_OBSERVATION",
      content: intelContent.trim(),
      source_type: intelSourceType,
      source_reference: intelReference.trim() || null,
    });

    if (!res.ok) {
      setStatusBanner({ type: "error", text: res.error });
      return;
    }

    if (isSupabaseConfigured) {
      await supabase
        .from("internal_intelligence")
        .insert({
          person_id: targetPerson.id,
          category: intelCategory.trim() || "OPERATIONAL_OBSERVATION",
          content: intelContent.trim(),
          source_type: intelSourceType,
          source_reference: intelReference.trim() || null,
          visibility: "admin_only",
        })
        .then(() => {});
    }

    setIntelContent("");
    setIntelReference("");
    logToolInteraction("ADMIN", `INTEL_NOTE_ADD:${targetPerson.person_code}`);
    await syncFromStoreAndSupabase();
    setStatusBanner({
      type: "success",
      text: `Recorded [${intelSourceType}] intelligence entry for ${targetPerson.person_code}.`,
    });
  };

  const handleCreateInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusBanner(null);
    if (!invTitle.trim()) return;

    const caseRef =
      invCaseRef.trim() ||
      `CASE-${new Date().getFullYear()}-${String(investigations.length + 1).padStart(3, "0")}`;

    const res = singletonGuardStore.createInvestigation(actor, {
      person_id: invPersonId || (selectedProfile ? selectedProfile.id : null),
      case_reference: caseRef,
      title: invTitle.trim(),
      description: invDescription.trim() || null,
      status: invStatus,
      severity: invSeverity,
      evidence: parseStringArray(invEvidence),
      timeline: [`${new Date().toISOString()} — Case opened by Admin (${actor.userId})`],
      resolution: invResolution.trim() || null,
    });

    if (!res.ok) {
      setStatusBanner({ type: "error", text: res.error });
      return;
    }

    if (isSupabaseConfigured) {
      await supabase
        .from("investigations")
        .insert({
          person_id: invPersonId || (selectedProfile ? selectedProfile.id : null),
          case_reference: caseRef,
          title: invTitle.trim(),
          description: invDescription.trim() || null,
          status: invStatus,
          severity: invSeverity,
          evidence: parseStringArray(invEvidence),
          timeline: [`${new Date().toISOString()} — Case opened by Admin`],
          resolution: invResolution.trim() || null,
        })
        .then(() => {});
    }

    setInvCaseRef("");
    setInvTitle("");
    setInvDescription("");
    setInvEvidence("");
    setInvResolution("");
    logToolInteraction("ADMIN", `INVESTIGATION_CREATE:${caseRef}`);
    await syncFromStoreAndSupabase();
    setStatusBanner({
      type: "success",
      text: `Investigation ${caseRef} logged in isolated Investigation Registry (separated from personal evaluations).`,
    });
  };

  const handleAddPartnerFollowUp = async (partner: PartnerProfileRecord) => {
    if (!verifiedAdmin || !newFollowUpText.trim()) return;
    const updatedItems = [...partner.follow_up_items, newFollowUpText.trim()];
    partner.follow_up_items = updatedItems;
    setNewFollowUpText("");

    if (isSupabaseConfigured) {
      await supabase
        .from("partner_profiles")
        .update({ follow_up_items: updatedItems, updated_at: new Date().toISOString() })
        .eq("id", partner.id)
        .then(() => {});
    }

    logToolInteraction("ADMIN", "PARTNER_FOLLOWUP_ADD");
    await syncFromStoreAndSupabase();
    setStatusBanner({
      type: "success",
      text: `Added strategic follow-up item for ${partner.organization}.`,
    });
  };

  const renderDossierCard = (p: PersonProfile, allowAdminActions: boolean) => (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/40 font-bold">
                {p.person_code}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground border border-border uppercase">
                {p.profile_type.replace(/_/g, " ")}
              </span>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded border uppercase ${
                  p.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                {p.status}
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
                {p.security_classification}
              </span>
            </div>
            <CardTitle className="font-display text-lg tracking-wider text-foreground pt-1">
              {p.full_name_zh ? `${p.full_name_zh} (${p.full_name_en})` : p.full_name_en}
              <span className="text-xs font-mono text-muted-foreground ml-2">
                [{p.display_name}]
              </span>
            </CardTitle>
            <p className="text-xs font-mono text-muted-foreground">
              ORGANIZATION: <strong className="text-foreground">{p.organization}</strong> · ROLE:{" "}
              <strong className="text-foreground">{p.job_title || "N/A"}</strong> · ACCESS LEVEL:{" "}
              <strong className="text-primary">L{p.access_level}</strong> · TRUST:{" "}
              <strong className="text-amber-400">{p.trust_level}</strong> · HEALTH:{" "}
              <strong className="text-emerald-400">{p.profile_health}</strong>
            </p>
          </div>

          {allowAdminActions && verifiedAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  populateEditForm(p);
                  setIsCreatingProfile(false);
                  setIsEditingProfile(true);
                }}
                className="font-display tracking-wider text-xs"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" /> EDIT DOSSIER
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowVersionHistory((v) => !v)}
                className="font-display tracking-wider text-xs"
              >
                <History className="w-3.5 h-3.5 mr-1.5" /> VERSIONS (
                {versions.filter((v) => v.person_id === p.id).length})
              </Button>
              {p.status !== "archived" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleArchivePerson(p)}
                  className="font-display tracking-wider text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                >
                  <Archive className="w-3.5 h-3.5 mr-1.5" /> ARCHIVE
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5 font-mono text-xs">
        {/* Executive Summary */}
        {p.executive_summary && (
          <div className="rounded-md bg-secondary/40 border border-border p-3 space-y-1">
            <div className="text-[10px] text-primary font-display tracking-widest">
              EXECUTIVE SUMMARY
            </div>
            <p className="text-foreground leading-relaxed">{p.executive_summary}</p>
          </div>
        )}

        {/* Structured Attribute Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {p.core_responsibilities.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                CORE RESPONSIBILITIES
              </div>
              <ul className="space-y-1 text-foreground">
                {p.core_responsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.expertise.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                DOMAIN EXPERTISE
              </div>
              <ul className="space-y-1 text-foreground">
                {p.expertise.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.working_style.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                WORKING STYLE
              </div>
              <ul className="space-y-1 text-foreground">
                {p.working_style.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.communication_preferences.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                COMMUNICATION PREFERENCES
              </div>
              <ul className="space-y-1 text-foreground">
                {p.communication_preferences.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.leadership_style.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                LEADERSHIP &amp; MANAGEMENT STYLE
              </div>
              <ul className="space-y-1 text-foreground">
                {p.leadership_style.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.contribution_history.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                CONTRIBUTION &amp; COLLABORATION HISTORY
              </div>
              <ul className="space-y-1 text-foreground">
                {p.contribution_history.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">▪</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.good_records.length > 0 && (
            <div className="rounded border border-border bg-emerald-500/5 border-emerald-500/30 p-3 space-y-1.5">
              <div className="text-[10px] text-emerald-400 font-display tracking-widest">
                VERIFIED GOOD RECORDS
              </div>
              <ul className="space-y-1 text-foreground">
                {p.good_records.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.growth_objectives.length > 0 && (
            <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                GROWTH &amp; DEVELOPMENT OBJECTIVES
              </div>
              <ul className="space-y-1 text-foreground">
                {p.growth_objectives.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">→</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.ai_interaction_rules.length > 0 && (
            <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-1.5">
              <div className="text-[10px] text-primary font-display tracking-widest">
                NEXUS AI INTERACTION RULES
              </div>
              <ul className="space-y-1 text-foreground">
                {p.ai_interaction_rules.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary">⚡</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Relationship & Incident Policy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-display tracking-widest">
              ORGANIZATIONAL RELATIONSHIPS
            </div>
            <pre className="text-[11px] bg-secondary/30 border border-border rounded p-2.5 overflow-x-auto text-foreground">
              {JSON.stringify(p.relationship_summary, null, 2)}
            </pre>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-display tracking-widest">
              INCIDENT &amp; INVESTIGATION SEPARATION POLICY
            </div>
            <div className="text-[11px] bg-secondary/30 border border-border rounded p-2.5 text-muted-foreground leading-relaxed">
              {p.incident_policy ||
                "All formal inquiries and disciplinary cases are isolated in the Admin-only Investigation Registry and never silently overwrite personal profile history."}
            </div>
            <div className="text-[10px] text-muted-foreground pt-1">
              AUTH LINK:{" "}
              <span className="text-foreground">
                {p.auth_user_id ? `LINKED (${p.auth_user_id.slice(0, 8)}…)` : "NONE (EXTERNAL / UNLINKED)"}
              </span>{" "}
              · UPDATED: {new Date(p.updated_at).toISOString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Top RBAC & Security Policy Header */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-display text-sm font-bold tracking-widest text-foreground">
                BLACKTOWER™ PEOPLE INTELLIGENCE &amp; ACCESS CONTROL
              </h2>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold ${
                  verifiedAdmin
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {verifiedAdmin ? "ROLE: ADMIN (FULL CRUD & INTEL)" : "ROLE: MEMBER (OWN PROFILE READ-ONLY)"}
              </span>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              ACTIVE OPERATOR: <strong className="text-foreground">{fullName || user?.email}</strong> ·
              EXPLICIT ROLES: <strong className="text-primary">[{roles.join(", ") || "none"}]</strong> ·
              RLS POLICY: {verifiedAdmin ? "public.is_admin(auth.uid()) = TRUE" : "auth.uid() = auth_user_id ONLY"}
            </p>
          </div>

          {/* Role & Identity Verification Switcher for Live RBAC Testing */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground mr-1 flex items-center gap-1">
              <Terminal className="w-3 h-3 text-primary" /> RBAC VERIFICATION MODE:
            </span>
            <Button
              type="button"
              size="sm"
              variant={verifiedAdmin && user?.id === KELVIN_DEFAULT_UID ? "default" : "outline"}
              onClick={() => {
                singletonGuardStore.linkAuthUser("PERSON-0001", KELVIN_DEFAULT_UID);
                setLocalOperatorRoleAndIdentity({
                  userId: KELVIN_DEFAULT_UID,
                  email: "blackmasterong@blacktower.com",
                  fullName: "Kelvin Ong",
                  roles: ["admin", "member"],
                });
              }}
              className="font-mono text-[11px] h-7 px-2.5"
            >
              PERSON-0001 (ADMIN)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!verifiedAdmin && user?.id === ZIXUAN_DEFAULT_UID ? "default" : "outline"}
              onClick={() => {
                singletonGuardStore.linkAuthUser("PERSON-0002", ZIXUAN_DEFAULT_UID);
                setLocalOperatorRoleAndIdentity({
                  userId: ZIXUAN_DEFAULT_UID,
                  email: "lee.zixuan@blacktower.com",
                  fullName: "Lee Zi Xuan",
                  roles: ["member"],
                });
              }}
              className="font-mono text-[11px] h-7 px-2.5"
            >
              PERSON-0002 (NORMAL USER)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!verifiedAdmin && user?.id === KELVIN_DEFAULT_UID ? "default" : "outline"}
              onClick={() => {
                singletonGuardStore.linkAuthUser("PERSON-0001", KELVIN_DEFAULT_UID);
                setLocalOperatorRoleAndIdentity({
                  userId: KELVIN_DEFAULT_UID,
                  email: "blackmasterong@blacktower.com",
                  fullName: "Kelvin Ong (No Admin Role)",
                  roles: ["member"],
                });
              }}
              className="font-mono text-[11px] h-7 px-2.5"
              title="Proves Founder title & Access Level 10 do NOT grant Admin access without user_roles = 'admin'"
            >
              FOUNDER TITLE WITHOUT ADMIN ROLE
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div
          className={`rounded-md border px-4 py-3 font-mono text-xs flex items-center justify-between ${
            statusBanner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              : "bg-destructive/10 border-destructive/40 text-destructive"
          }`}
        >
          <span className="flex items-center gap-2">
            {statusBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            {statusBanner.text}
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[10px] underline ml-4"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Subsystem Navigation Tabs (Normal users ONLY get MY_PROFILE; Admins get all 6 subsystems) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={subTab === "MY_PROFILE" ? "default" : "outline"}
            onClick={() => setSubTab("MY_PROFILE")}
            className="font-display tracking-wider text-xs"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5" /> MY PROFILE
          </Button>

          {verifiedAdmin && (
            <>
              <Button
                type="button"
                size="sm"
                variant={subTab === "DIRECTORY" ? "default" : "outline"}
                onClick={() => setSubTab("DIRECTORY")}
                className="font-display tracking-wider text-xs"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" /> PEOPLE DIRECTORY ({profiles.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={subTab === "INTERNAL_INTEL" ? "default" : "outline"}
                onClick={() => setSubTab("INTERNAL_INTEL")}
                className="font-display tracking-wider text-xs"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" /> INTERNAL INTELLIGENCE (
                {intelligenceNotes.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={subTab === "PARTNERS" ? "default" : "outline"}
                onClick={() => setSubTab("PARTNERS")}
                className="font-display tracking-wider text-xs"
              >
                <Briefcase className="w-3.5 h-3.5 mr-1.5" /> PARTNER REGISTRY ({partners.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={subTab === "INVESTIGATIONS" ? "default" : "outline"}
                onClick={() => setSubTab("INVESTIGATIONS")}
                className="font-display tracking-wider text-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> INVESTIGATIONS (
                {investigations.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={subTab === "AUDIT_LOGS" ? "default" : "outline"}
                onClick={() => setSubTab("AUDIT_LOGS")}
                className="font-display tracking-wider text-xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" /> ACCESS AUDIT LOGS ({auditLogs.length})
              </Button>
            </>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={syncFromStoreAndSupabase}
          className="font-mono text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> SYNC
        </Button>
      </div>

      {/* TAB 1: MY PERSONAL PROFILE (Accessible to Normal Users & Admins for their own linked profile) */}
      {subTab === "MY_PROFILE" && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-secondary/20 px-4 py-2.5 flex items-center justify-between font-mono text-xs">
            <span className="text-muted-foreground flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-primary" />
              PERSONAL DOSSIER SCOPE:{" "}
              <strong className="text-foreground">
                auth.uid() = people_profiles.auth_user_id
              </strong>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {verifiedAdmin ? "ADMIN EDITABLE IN DIRECTORY" : "READ-ONLY PERSONAL VIEW"}
            </span>
          </div>

          {myPersonalProfile ? (
            renderDossierCard(myPersonalProfile, false)
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-6 text-center font-mono text-xs text-muted-foreground space-y-2">
                <ShieldCheck className="w-6 h-6 text-primary mx-auto" />
                <div className="text-foreground font-bold">
                  NO LINKED PERSONAL DOSSIER FOR CURRENT AUTH UID
                </div>
                <p>
                  Your authenticated account ({user?.email}) does not currently have a linked{" "}
                  <code>auth_user_id</code> in <code>public.people_profiles</code>.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: ADMIN PEOPLE DIRECTORY & CRUD */}
      {verifiedAdmin && subTab === "DIRECTORY" && (
        <div className="space-y-6">
          {/* Search, Filter & Create Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search PERSON-0001, name, organization, role..."
                  className="pl-8 font-mono text-xs"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "active" | "archived")
                }
                className="h-9 rounded-md border border-border bg-card px-3 font-mono text-xs text-foreground"
              >
                <option value="active">ACTIVE ONLY</option>
                <option value="all">ALL STATUSES</option>
                <option value="archived">ARCHIVED ONLY</option>
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={startCreatePerson}
              className="font-display tracking-wider text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> CREATE PERSON RECORD
            </Button>
          </div>

          {/* Person Selector Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filteredDirectoryProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPersonCode(p.person_code);
                  setIsEditingProfile(false);
                  setIsCreatingProfile(false);
                }}
                className={`text-left rounded-lg border p-3.5 transition-colors font-mono ${
                  selectedProfile?.id === p.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-primary font-bold">{p.person_code}</span>
                  <span className="text-muted-foreground uppercase">{p.organization}</span>
                </div>
                <div className="text-sm font-bold text-foreground mt-1">
                  {p.full_name_zh ? `${p.full_name_zh} · ${p.full_name_en}` : p.full_name_en}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-between">
                  <span>{p.job_title || p.profile_type}</span>
                  <span className="text-amber-400">{p.trust_level}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Admin Create / Edit Form */}
          {(isCreatingProfile || isEditingProfile) && (
            <Card className="border-primary/50 bg-card">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="font-display text-sm tracking-widest text-primary">
                  {isCreatingProfile
                    ? "ADMIN CREATE NEW PERSON DOSSIER"
                    : `ADMIN EDIT DOSSIER — ${formPersonCode}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSavePerson} className="space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px]">PERSON CODE</Label>
                      <Input
                        value={formPersonCode}
                        onChange={(e) => setFormPersonCode(e.target.value)}
                        required
                        disabled={isEditingProfile}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">CHINESE NAME (中文姓名)</Label>
                      <Input
                        value={formNameZh}
                        onChange={(e) => setFormNameZh(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">ENGLISH NAME</Label>
                      <Input
                        value={formNameEn}
                        onChange={(e) => setFormNameEn(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">DISPLAY NAME</Label>
                      <Input
                        value={formDisplayName}
                        onChange={(e) => setFormDisplayName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">PROFILE TYPE</Label>
                      <select
                        value={formProfileType}
                        onChange={(e) =>
                          setFormProfileType(e.target.value as PersonProfileType)
                        }
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                      >
                        <option value="founder">founder</option>
                        <option value="internal_staff">internal_staff</option>
                        <option value="strategic_external_partner">
                          strategic_external_partner
                        </option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">ORGANIZATION</Label>
                      <Input
                        value={formOrg}
                        onChange={(e) => setFormOrg(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">JOB TITLE / ROLE</Label>
                      <Input
                        value={formJobTitle}
                        onChange={(e) => setFormJobTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">ACCESS LEVEL (0-10)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={formAccessLevel}
                        onChange={(e) => setFormAccessLevel(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">SECURITY CLASSIFICATION</Label>
                      <Input
                        value={formClassification}
                        onChange={(e) => setFormClassification(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">TRUST LEVEL</Label>
                      <Input
                        value={formTrustLevel}
                        onChange={(e) => setFormTrustLevel(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">PROFILE HEALTH</Label>
                      <Input
                        value={formProfileHealth}
                        onChange={(e) => setFormProfileHealth(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px]">EXECUTIVE SUMMARY</Label>
                    <Textarea
                      rows={3}
                      value={formSummary}
                      onChange={(e) => setFormSummary(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px]">
                        CORE RESPONSIBILITIES (1 PER LINE)
                      </Label>
                      <Textarea
                        rows={4}
                        value={formResponsibilities}
                        onChange={(e) => setFormResponsibilities(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">GOOD RECORDS (1 PER LINE)</Label>
                      <Textarea
                        rows={4}
                        value={formGoodRecords}
                        onChange={(e) => setFormGoodRecords(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">
                        GROWTH OBJECTIVES (1 PER LINE)
                      </Label>
                      <Textarea
                        rows={4}
                        value={formGrowthObjectives}
                        onChange={(e) => setFormGrowthObjectives(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px]">
                        AI INTERACTION RULES (1 PER LINE)
                      </Label>
                      <Textarea
                        rows={3}
                        value={formAiRules}
                        onChange={(e) => setFormAiRules(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">INCIDENT POLICY</Label>
                      <Textarea
                        rows={3}
                        value={formIncidentPolicy}
                        onChange={(e) => setFormIncidentPolicy(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCreatingProfile(false);
                        setIsEditingProfile(false);
                      }}
                    >
                      CANCEL
                    </Button>
                    <Button type="submit" size="sm" className="font-display tracking-wider">
                      SAVE &amp; RECORD VERSION SNAPSHOT
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Version History Drawer */}
          {showVersionHistory && selectedProfile && (
            <Card className="border-border bg-secondary/20">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-xs tracking-widest text-primary flex items-center gap-2">
                  <History className="w-4 h-4" /> IMMUTABLE VERSION HISTORY —{" "}
                  {selectedProfile.person_code}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 font-mono text-xs">
                {versions
                  .filter((v) => v.person_id === selectedProfile.id)
                  .map((v) => (
                    <div
                      key={v.id}
                      className="rounded border border-border bg-card p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-primary font-bold">v{v.version_number}</span> ·{" "}
                        <span className="text-foreground">{v.change_reason}</span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {new Date(v.created_at).toISOString()}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Selected Dossier Full View */}
          {selectedProfile && renderDossierCard(selectedProfile, true)}
        </div>
      )}

      {/* TAB 3: INTERNAL INTELLIGENCE (ADMIN ONLY) */}
      {verifiedAdmin && subTab === "INTERNAL_INTEL" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border bg-card lg:col-span-1">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-display text-xs tracking-widest text-primary flex items-center gap-2">
                <Lock className="w-4 h-4" /> RECORD INTERNAL INTELLIGENCE
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAddIntelligenceNote} className="space-y-3 font-mono text-xs">
                <div className="space-y-1">
                  <Label className="text-[10px]">TARGET PERSON</Label>
                  <select
                    value={intelPersonId || selectedProfile?.id || ""}
                    onChange={(e) => setIntelPersonId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.person_code} — {p.full_name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">SOURCE CLASSIFICATION (MANDATORY)</Label>
                  <select
                    value={intelSourceType}
                    onChange={(e) =>
                      setIntelSourceType(e.target.value as IntelligenceSourceType)
                    }
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    <option value="FACT">FACT (Verified Deterministic Evidence)</option>
                    <option value="ADMIN_RECORDED">ADMIN_RECORDED (Executive Observation)</option>
                    <option value="USER_PROVIDED">USER_PROVIDED (Self-Reported)</option>
                    <option value="AI_INFERENCE">AI_INFERENCE (Probabilistic — Non-Truth)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">CATEGORY</Label>
                  <Input
                    value={intelCategory}
                    onChange={(e) => setIntelCategory(e.target.value)}
                    placeholder="OPERATIONAL_OBSERVATION"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">EVIDENCE / SOURCE REFERENCE</Label>
                  <Input
                    value={intelReference}
                    onChange={(e) => setIntelReference(e.target.value)}
                    placeholder="e.g., BT-PROOF-REF or Meeting Date"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">INTELLIGENCE CONTENT</Label>
                  <Textarea
                    rows={4}
                    required
                    value={intelContent}
                    onChange={(e) => setIntelContent(e.target.value)}
                    placeholder="Record objective internal observation..."
                  />
                </div>

                <Button type="submit" size="sm" className="w-full font-display tracking-wider">
                  SAVE ADMIN-ONLY INTELLIGENCE
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-display text-xs tracking-widest text-foreground">
                ADMIN-ONLY INTERNAL INTELLIGENCE LEDGER ({intelligenceNotes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 font-mono text-xs">
              {intelligenceNotes.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  No internal intelligence notes recorded yet. Normal users can never query this table.
                </div>
              ) : (
                intelligenceNotes.map((note) => {
                  const person = profiles.find((p) => p.id === note.person_id);
                  return (
                    <div
                      key={note.id}
                      className="rounded border border-border bg-secondary/20 p-3 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/40 font-bold text-[10px]">
                            {person ? person.person_code : note.person_id}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-secondary border border-border text-[10px]">
                            {note.source_type}
                          </span>
                          <span className="text-muted-foreground font-bold">
                            {note.category}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(note.created_at).toISOString()}
                        </span>
                      </div>
                      <p className="text-foreground leading-relaxed">{note.content}</p>
                      {note.source_reference && (
                        <div className="text-[10px] text-muted-foreground">
                          REF: {note.source_reference}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: PARTNER REGISTRY (ADMIN ONLY) */}
      {verifiedAdmin && subTab === "PARTNERS" && (
        <div className="space-y-4">
          {partners.map((partner) => {
            const linkedPerson = profiles.find((p) => p.id === partner.person_id);
            return (
              <Card key={partner.id} className="border-border bg-card">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-display text-sm tracking-widest text-primary flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {partner.organization} —{" "}
                      {linkedPerson
                        ? `${linkedPerson.full_name_en} (${linkedPerson.display_name})`
                        : partner.person_id}
                    </CardTitle>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                      {partner.relationship_type} · {partner.relationship_status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="rounded border border-border bg-secondary/20 p-3 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                      COLLABORATION HISTORY
                    </div>
                    <ul className="space-y-1 text-foreground">
                      {partner.collaboration_history.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-primary">▪</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded border border-border bg-secondary/20 p-3 space-y-2">
                    <div className="text-[10px] text-muted-foreground font-display tracking-widest">
                      STRATEGIC FOLLOW-UP QUEUE
                    </div>
                    <ul className="space-y-1 text-foreground">
                      {partner.follow_up_items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        value={newFollowUpText}
                        onChange={(e) => setNewFollowUpText(e.target.value)}
                        placeholder="Add strategic follow-up action..."
                        className="h-8 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddPartnerFollowUp(partner)}
                        className="h-8 text-xs font-display"
                      >
                        ADD
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 5: INVESTIGATIONS REGISTRY (ADMIN ONLY — SEPARATED FROM PERSONAL PROFILE) */}
      {verifiedAdmin && subTab === "INVESTIGATIONS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-border bg-card lg:col-span-1">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-display text-xs tracking-widest text-primary flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> OPEN INVESTIGATION CASE
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateInvestigation} className="space-y-3 font-mono text-xs">
                <div className="space-y-1">
                  <Label className="text-[10px]">CASE REFERENCE</Label>
                  <Input
                    value={invCaseRef}
                    onChange={(e) => setInvCaseRef(e.target.value)}
                    placeholder="CASE-2026-001"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">RELATED PERSON (OPTIONAL)</Label>
                  <select
                    value={invPersonId}
                    onChange={(e) => setInvPersonId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                  >
                    <option value="">-- Unassigned / General --</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.person_code} — {p.full_name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">SEVERITY</Label>
                    <select
                      value={invSeverity}
                      onChange={(e) =>
                        setInvSeverity(e.target.value as InvestigationSeverity)
                      }
                      className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">STATUS</Label>
                    <select
                      value={invStatus}
                      onChange={(e) =>
                        setInvStatus(e.target.value as InvestigationStatus)
                      }
                      className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="open">open</option>
                      <option value="review">review</option>
                      <option value="resolved">resolved</option>
                      <option value="closed">closed</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">CASE TITLE</Label>
                  <Input
                    required
                    value={invTitle}
                    onChange={(e) => setInvTitle(e.target.value)}
                    placeholder="Objective case title..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">DESCRIPTION</Label>
                  <Textarea
                    rows={3}
                    value={invDescription}
                    onChange={(e) => setInvDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">EVIDENCE ITEMS (1 PER LINE)</Label>
                  <Textarea
                    rows={3}
                    value={invEvidence}
                    onChange={(e) => setInvEvidence(e.target.value)}
                    placeholder="BT-PROOF-REF..."
                  />
                </div>
                <Button type="submit" size="sm" className="w-full font-display tracking-wider">
                  CREATE ISOLATED CASE RECORD
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="font-display text-xs tracking-widest text-foreground">
                ISOLATED INVESTIGATION DATABASE ({investigations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 font-mono text-xs">
              <div className="rounded border border-primary/30 bg-primary/5 p-2.5 text-[11px] text-muted-foreground">
                ARCHITECTURAL INVARIANT: All investigation records are strictly isolated from{" "}
                <code>people_profiles</code> so unverified incidents or single cases never pollute
                long-term personal growth records.
              </div>
              {investigations.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  No active or historical investigation cases on file.
                </div>
              ) : (
                investigations.map((inv) => {
                  const person = profiles.find((p) => p.id === inv.person_id);
                  return (
                    <div
                      key={inv.id}
                      className="rounded border border-border bg-secondary/20 p-3 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">{inv.case_reference}</span>
                          <span className="px-2 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/30 text-[10px]">
                            {inv.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-secondary border border-border text-[10px] uppercase">
                            {inv.status}
                          </span>
                          {person && (
                            <span className="text-muted-foreground">
                              [{person.person_code}]
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(inv.created_at).toISOString()}
                        </span>
                      </div>
                      <div className="font-bold text-foreground">{inv.title}</div>
                      {inv.description && (
                        <p className="text-muted-foreground">{inv.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: ACCESS AUDIT LOGS (ADMIN ONLY) */}
      {verifiedAdmin && subTab === "AUDIT_LOGS" && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="font-display text-xs tracking-widest text-primary flex items-center gap-2">
              <FileText className="w-4 h-4" /> IMMUTABLE ACCESS &amp; MUTATION AUDIT LEDGER (
              {auditLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 font-mono text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] text-muted-foreground">
                    <th className="py-2 px-2">TIMESTAMP (UTC)</th>
                    <th className="py-2 px-2">ACTION</th>
                    <th className="py-2 px-2">ACTOR UID</th>
                    <th className="py-2 px-2">RESOURCE</th>
                    <th className="py-2 px-2">METADATA / CHANGED FIELDS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-secondary/20">
                      <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">
                        {new Date(log.created_at).toISOString()}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.action === "ACCESS_DENIED"
                              ? "bg-destructive/15 text-destructive border-destructive/40"
                              : log.action.includes("CREATE") || log.action.includes("UPDATE")
                              ? "bg-primary/15 text-primary border-primary/40"
                              : "bg-secondary text-foreground border-border"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">
                        {log.actor_user_id.slice(0, 12)}…
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-foreground">
                        {log.resource_type}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeopleIntelligencePanel;
