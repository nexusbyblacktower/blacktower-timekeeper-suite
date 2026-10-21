import { describe, it, expect, beforeEach } from "vitest";
import {
  INITIAL_PARTNER_PROFILES,
  INITIAL_PEOPLE_PROFILES,
  PeopleSecurityGuardStore,
  isActorAdmin,
  canReadPersonProfile,
} from "../lib/people/peopleSecurityEngine";
import type { ActorIdentity } from "../lib/people/peopleTypes";

describe("BLACKTOWER™ People Intelligence — Security, RLS, CRUD, Versioning & Audit Verification (Tests 1–13)", () => {
  const KELVIN_UID = "00000000-0000-4000-8000-000000000001";
  const ZIXUAN_UID = "00000000-0000-4000-8000-000000000002";

  const adminActor: ActorIdentity = {
    userId: KELVIN_UID,
    roles: ["admin", "member"],
  };

  const normalMemberActor: ActorIdentity = {
    userId: ZIXUAN_UID,
    roles: ["member"],
  };

  let store: PeopleSecurityGuardStore;

  beforeEach(() => {
    const linkedSeeds = INITIAL_PEOPLE_PROFILES.map((p) => {
      if (p.person_code === "PERSON-0001") return { ...p, auth_user_id: KELVIN_UID };
      if (p.person_code === "PERSON-0002") return { ...p, auth_user_id: ZIXUAN_UID };
      return { ...p, auth_user_id: null }; // PERSON-0003 external partner
    });
    store = new PeopleSecurityGuardStore(linkedSeeds, INITIAL_PARTNER_PROFILES);
  });

  it("Test 1: Normal user reads own profile -> PASS", () => {
    const visible = store.selectProfiles(normalMemberActor);
    expect(visible).toHaveLength(1);
    expect(visible[0].person_code).toBe("PERSON-0002");
    expect(visible[0].full_name_en).toBe("Lee Zi Xuan");

    const ownRes = store.selectProfileByCode(normalMemberActor, "PERSON-0002");
    expect(ownRes.ok).toBe(true);
    if (ownRes.ok) {
      expect(ownRes.data.person_code).toBe("PERSON-0002");
    }
  });

  it("Test 2: Normal user reads another user's profile -> FAIL (ACCESS_DENIED)", () => {
    const readFounder = store.selectProfileByCode(normalMemberActor, "PERSON-0001");
    expect(readFounder.ok).toBe(false);

    const readPartner = store.selectProfileByCode(normalMemberActor, "PERSON-0003");
    expect(readPartner.ok).toBe(false);

    // Verify ACCESS_DENIED was recorded in audit logs (visible to Admin)
    const audits = store.selectAuditLogs(adminActor);
    expect(audits.ok).toBe(true);
    if (audits.ok) {
      expect(
        audits.data.some(
          (l) =>
            l.actor_user_id === ZIXUAN_UID &&
            l.action === "ACCESS_DENIED" &&
            l.metadata.person_code === "PERSON-0001"
        )
      ).toBe(true);
    }
  });

  it("Test 3: Normal user updates own profile -> FAIL (ACCESS_DENIED)", () => {
    const ownProfile = store.selectProfiles(normalMemberActor)[0];
    const updateRes = store.updateProfile(normalMemberActor, ownProfile.id, {
      trust_level: "★★★★★",
      access_level: 10,
    });
    expect(updateRes.ok).toBe(false);

    // Ensure profile was not mutated
    const afterProfile = store.selectProfiles(normalMemberActor)[0];
    expect(afterProfile.trust_level).toBe("Dynamic");
    expect(afterProfile.access_level).toBe(5);
  });

  it("Test 4: Normal user inserts profile -> FAIL (ACCESS_DENIED)", () => {
    const createRes = store.createProfile(normalMemberActor, {
      person_code: "PERSON-0099",
      auth_user_id: null,
      full_name_zh: null,
      full_name_en: "Unauthorized Person",
      display_name: "Unauthorized",
      profile_type: "internal_staff",
      organization: "BLACKTOWER",
      job_title: "Staff",
      status: "active",
      access_level: 5,
      security_classification: "BLACKTOWER INTERNAL",
      executive_summary: null,
      core_responsibilities: [],
      expertise: [],
      working_style: [],
      communication_preferences: [],
      leadership_style: [],
      contribution_history: [],
      good_records: [],
      growth_objectives: [],
      trust_level: "Dynamic",
      ai_interaction_rules: [],
      relationship_summary: {},
      incident_policy: null,
      profile_health: "Standard",
    });
    expect(createRes.ok).toBe(false);
    expect(store.selectProfiles(adminActor)).toHaveLength(3);
  });

  it("Test 5: Normal user deletes/archives profile -> FAIL (ACCESS_DENIED)", () => {
    const ownProfile = store.selectProfiles(normalMemberActor)[0];
    const archiveRes = store.archiveProfile(normalMemberActor, ownProfile.id);
    expect(archiveRes.ok).toBe(false);
    expect(store.selectProfiles(normalMemberActor)[0].status).toBe("active");
  });

  it("Test 6: Normal user reads internal intelligence -> FAIL (ACCESS_DENIED)", () => {
    // Admin creates an internal intelligence note first
    const ownProfile = store.selectProfiles(normalMemberActor)[0];
    store.createInternalIntelligence(adminActor, {
      person_id: ownProfile.id,
      category: "PERFORMANCE_REVIEW",
      content: "Admin-only internal review note",
      source_type: "ADMIN_RECORDED",
      source_reference: "BT-INTERNAL-01",
    });

    const memberReadIntel = store.selectInternalIntelligence(normalMemberActor);
    expect(memberReadIntel.ok).toBe(false);

    const memberCreateIntel = store.createInternalIntelligence(normalMemberActor, {
      person_id: ownProfile.id,
      category: "SELF_NOTE",
      content: "Attempted unauthorized insert",
      source_type: "USER_PROVIDED",
      source_reference: null,
    });
    expect(memberCreateIntel.ok).toBe(false);
  });

  it("Test 7: Normal user reads investigation records -> FAIL (ACCESS_DENIED)", () => {
    const ownProfile = store.selectProfiles(normalMemberActor)[0];
    store.createInvestigation(adminActor, {
      person_id: ownProfile.id,
      case_reference: "CASE-2026-001",
      title: "Confidential Inquiry",
      description: "Admin-only case",
      status: "open",
      severity: "MEDIUM",
      evidence: ["BT-PROOF-01"],
      timeline: ["Opened"],
      resolution: null,
    });

    const memberReadInv = store.selectInvestigations(normalMemberActor);
    expect(memberReadInv.ok).toBe(false);

    const memberReadPartners = store.selectPartners(normalMemberActor);
    expect(memberReadPartners.ok).toBe(false);

    const memberReadAudit = store.selectAuditLogs(normalMemberActor);
    expect(memberReadAudit.ok).toBe(false);
  });

  it("Test 8: Admin reads all profiles (PERSON-0001, PERSON-0002, PERSON-0003) -> PASS", () => {
    const allProfiles = store.selectProfiles(adminActor);
    expect(allProfiles).toHaveLength(3);
    expect(allProfiles.map((p) => p.person_code)).toEqual([
      "PERSON-0001",
      "PERSON-0002",
      "PERSON-0003",
    ]);
  });

  it("Test 9: Admin creates profile -> PASS", () => {
    const createRes = store.createProfile(adminActor, {
      person_code: "PERSON-0004",
      auth_user_id: null,
      full_name_zh: "新成员",
      full_name_en: "New Tactical Operator",
      display_name: "Operator 4",
      profile_type: "internal_staff",
      organization: "BLACKTOWER",
      job_title: "Operations Specialist",
      status: "active",
      access_level: 4,
      security_classification: "BLACKTOWER INTERNAL",
      executive_summary: "New operator dossier.",
      core_responsibilities: ["Field Operations"],
      expertise: ["Reconnaissance"],
      working_style: ["Structured"],
      communication_preferences: ["Direct"],
      leadership_style: [],
      contribution_history: [],
      good_records: [],
      growth_objectives: ["System Mastery"],
      trust_level: "Dynamic",
      ai_interaction_rules: ["Objective reporting"],
      relationship_summary: { manager: "王虢宏（Founder）" },
      incident_policy: null,
      profile_health: "Standard",
    });

    expect(createRes.ok).toBe(true);
    expect(store.selectProfiles(adminActor)).toHaveLength(4);
  });

  it("Test 10 & Test 12: Admin updates profile -> PASS, creates profile_versions snapshot & audit log with changed_fields", () => {
    const target = store.selectProfiles(adminActor).find((p) => p.person_code === "PERSON-0002")!;
    const updateRes = store.updateProfile(
      adminActor,
      target.id,
      {
        job_title: "Senior Operations Member",
        profile_health: "Excellent",
      },
      "ANNUAL_REVIEW_UPGRADE"
    );

    expect(updateRes.ok).toBe(true);
    if (updateRes.ok) {
      expect(updateRes.data.job_title).toBe("Senior Operations Member");
      expect(updateRes.data.profile_health).toBe("Excellent");
    }

    // Check version snapshot v2
    const vers = store.selectProfileVersions(adminActor, target.id);
    expect(vers.ok).toBe(true);
    if (vers.ok) {
      expect(vers.data).toHaveLength(2);
      expect(vers.data[1].version_number).toBe(2);
      expect(vers.data[1].change_reason).toBe("ANNUAL_REVIEW_UPGRADE");
    }

    // Check audit log entry
    const audits = store.selectAuditLogs(adminActor);
    expect(audits.ok).toBe(true);
    if (audits.ok) {
      const updateLog = audits.data.find(
        (l) => l.action === "PROFILE_UPDATE" && l.target_person_id === target.id
      );
      expect(updateLog).toBeDefined();
      expect(updateLog?.metadata.changed_fields).toEqual(
        expect.arrayContaining(["job_title", "profile_health"])
      );
    }
  });

  it("Test 11: Admin archives profile -> PASS (soft-archive sets status='archived' without hard deleting)", () => {
    const target = store.selectProfiles(adminActor).find((p) => p.person_code === "PERSON-0003")!;
    const archiveRes = store.archiveProfile(adminActor, target.id);
    expect(archiveRes.ok).toBe(true);
    if (archiveRes.ok) {
      expect(archiveRes.data.status).toBe("archived");
      expect(archiveRes.data.archived_at).not.toBeNull();
      expect(archiveRes.data.archived_by).toBe(KELVIN_UID);
    }

    // Record still exists in store (never hard deleted)
    const allProfiles = store.selectProfiles(adminActor);
    expect(allProfiles).toHaveLength(3);
  });

  it("Test 13: External partner has no login access AND Founder/CEO title without user_roles='admin' NEVER grants admin access", () => {
    // 1. External partner (PERSON-0003, auth_user_id = null)
    const unauthenticatedPartner: ActorIdentity = {
      userId: null,
      roles: [],
    };
    const partnerProfile = store
      .selectProfiles(adminActor)
      .find((p) => p.person_code === "PERSON-0003")!;
    expect(partnerProfile.auth_user_id).toBeNull();
    expect(canReadPersonProfile(unauthenticatedPartner, partnerProfile)).toBe(false);
    expect(store.selectProfiles(unauthenticatedPartner)).toHaveLength(0);

    // 2. Founder PERSON-0001 (Founder & CEO, Access Level 10, Trust ★★★★★) WITHOUT 'admin' in user_roles
    const founderWithoutAdminRole: ActorIdentity = {
      userId: KELVIN_UID,
      roles: ["member"], // No 'admin' role!
    };
    expect(isActorAdmin(founderWithoutAdminRole)).toBe(false);
    // Can only read their own PERSON-0001 profile, CANNOT read PERSON-0002 or PERSON-0003, CANNOT edit
    const readableByNonAdminFounder = store.selectProfiles(founderWithoutAdminRole);
    expect(readableByNonAdminFounder).toHaveLength(1);
    expect(readableByNonAdminFounder[0].person_code).toBe("PERSON-0001");

    const attemptEdit = store.updateProfile(
      founderWithoutAdminRole,
      readableByNonAdminFounder[0].id,
      { job_title: "Self Edited Title" }
    );
    expect(attemptEdit.ok).toBe(false);
  });
});
