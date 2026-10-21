export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      proof_records: {
        Row: {
          accuracy: number | null
          anti_cheat_flags: string[]
          anti_cheat_score: number
          captured_at: string
          created_at: string
          device_info: string | null
          hash: string | null
          id: string
          latitude: number | null
          location_details: Json | null
          location_name: string | null
          longitude: number | null
          ref_number: string
          unix_time: number | null
          user_id: string
          verdict: string | null
        }
        Insert: {
          accuracy?: number | null
          anti_cheat_flags?: string[]
          anti_cheat_score?: number
          captured_at?: string
          created_at?: string
          device_info?: string | null
          hash?: string | null
          id?: string
          latitude?: number | null
          location_details?: Json | null
          location_name?: string | null
          longitude?: number | null
          ref_number: string
          unix_time?: number | null
          user_id: string
          verdict?: string | null
        }
        Update: {
          accuracy?: number | null
          anti_cheat_flags?: string[]
          anti_cheat_score?: number
          captured_at?: string
          created_at?: string
          device_info?: string | null
          hash?: string | null
          id?: string
          latitude?: number | null
          location_details?: Json | null
          location_name?: string | null
          longitude?: number | null
          ref_number?: string
          unix_time?: number | null
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
      forensic_verifications: {
        Row: {
          id: string
          proof_record_id: string | null
          user_id: string
          ref_number: string
          sha256_hash: string
          image_sha256_hash: string | null
          cryptographic_status: string
          temporal_status: string
          gps_status: string
          device_status: string
          visual_forensics_status: string
          visual_risk_score: number | null
          ai_confidence: number | null
          signals: Json
          limitations: string[]
          summary: string | null
          final_verdict: string
          model_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proof_record_id?: string | null
          user_id: string
          ref_number: string
          sha256_hash: string
          image_sha256_hash?: string | null
          cryptographic_status?: string
          temporal_status?: string
          gps_status?: string
          device_status?: string
          visual_forensics_status?: string
          visual_risk_score?: number | null
          ai_confidence?: number | null
          signals?: Json
          limitations?: string[]
          summary?: string | null
          final_verdict?: string
          model_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proof_record_id?: string | null
          user_id?: string
          ref_number?: string
          sha256_hash?: string
          image_sha256_hash?: string | null
          cryptographic_status?: string
          temporal_status?: string
          gps_status?: string
          device_status?: string
          visual_forensics_status?: string
          visual_risk_score?: number | null
          ai_confidence?: number | null
          signals?: Json
          limitations?: string[]
          summary?: string | null
          final_verdict?: string
          model_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      temporal_analyses: {
        Row: {
          id: string
          user_id: string
          source_record_ids: string[]
          deterministic_metrics: Json
          risk_level: string
          risk_score: number
          anomalies: Json
          summary: string | null
          recommended_action: string | null
          model_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source_record_ids?: string[]
          deterministic_metrics?: Json
          risk_level?: string
          risk_score?: number
          anomalies?: Json
          summary?: string | null
          recommended_action?: string | null
          model_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source_record_ids?: string[]
          deterministic_metrics?: Json
          risk_level?: string
          risk_score?: number
          anomalies?: Json
          summary?: string | null
          recommended_action?: string | null
          model_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      geospatial_events: {
        Row: {
          id: string
          user_id: string
          proof_record_id: string | null
          prev_proof_record_id: string | null
          from_ref: string | null
          to_ref: string
          distance_km: number | null
          elapsed_minutes: number | null
          estimated_speed_kmh: number | null
          plausibility_status: string
          ai_interpretation: string | null
          model_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          proof_record_id?: string | null
          prev_proof_record_id?: string | null
          from_ref?: string | null
          to_ref: string
          distance_km?: number | null
          elapsed_minutes?: number | null
          estimated_speed_kmh?: number | null
          plausibility_status?: string
          ai_interpretation?: string | null
          model_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          proof_record_id?: string | null
          prev_proof_record_id?: string | null
          from_ref?: string | null
          to_ref?: string
          distance_km?: number | null
          elapsed_minutes?: number | null
          estimated_speed_kmh?: number | null
          plausibility_status?: string
          ai_interpretation?: string | null
          model_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      time_sessions: {
        Row: {
          id: string
          user_id: string
          category: string
          activity_label: string
          source_type: string
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category?: string
          activity_label: string
          source_type?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          activity_label?: string
          source_type?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      people_profiles: {
        Row: {
          id: string
          person_code: string
          auth_user_id: string | null
          full_name_zh: string | null
          full_name_en: string
          display_name: string
          profile_type: string
          organization: string
          job_title: string | null
          status: string
          access_level: number
          security_classification: string
          executive_summary: string | null
          core_responsibilities: Json
          expertise: Json
          working_style: Json
          communication_preferences: Json
          leadership_style: Json
          contribution_history: Json
          good_records: Json
          growth_objectives: Json
          trust_level: string
          ai_interaction_rules: Json
          relationship_summary: Json
          incident_policy: string | null
          profile_health: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          archived_at: string | null
          archived_by: string | null
        }
        Insert: {
          id?: string
          person_code: string
          auth_user_id?: string | null
          full_name_zh?: string | null
          full_name_en: string
          display_name: string
          profile_type: string
          organization?: string
          job_title?: string | null
          status?: string
          access_level?: number
          security_classification?: string
          executive_summary?: string | null
          core_responsibilities?: Json
          expertise?: Json
          working_style?: Json
          communication_preferences?: Json
          leadership_style?: Json
          contribution_history?: Json
          good_records?: Json
          growth_objectives?: Json
          trust_level?: string
          ai_interaction_rules?: Json
          relationship_summary?: Json
          incident_policy?: string | null
          profile_health?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Update: {
          id?: string
          person_code?: string
          auth_user_id?: string | null
          full_name_zh?: string | null
          full_name_en?: string
          display_name?: string
          profile_type?: string
          organization?: string
          job_title?: string | null
          status?: string
          access_level?: number
          security_classification?: string
          executive_summary?: string | null
          core_responsibilities?: Json
          expertise?: Json
          working_style?: Json
          communication_preferences?: Json
          leadership_style?: Json
          contribution_history?: Json
          good_records?: Json
          growth_objectives?: Json
          trust_level?: string
          ai_interaction_rules?: Json
          relationship_summary?: Json
          incident_policy?: string | null
          profile_health?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Relationships: []
      }
      internal_intelligence: {
        Row: {
          id: string
          person_id: string
          category: string
          content: string
          source_type: string
          source_reference: string | null
          visibility: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          archived_at: string | null
          archived_by: string | null
        }
        Insert: {
          id?: string
          person_id: string
          category: string
          content: string
          source_type?: string
          source_reference?: string | null
          visibility?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Update: {
          id?: string
          person_id?: string
          category?: string
          content?: string
          source_type?: string
          source_reference?: string | null
          visibility?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          id: string
          person_id: string
          organization: string
          relationship_type: string
          collaboration_history: Json
          follow_up_items: Json
          relationship_status: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          archived_at: string | null
          archived_by: string | null
        }
        Insert: {
          id?: string
          person_id: string
          organization: string
          relationship_type: string
          collaboration_history?: Json
          follow_up_items?: Json
          relationship_status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Update: {
          id?: string
          person_id?: string
          organization?: string
          relationship_type?: string
          collaboration_history?: Json
          follow_up_items?: Json
          relationship_status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Relationships: []
      }
      investigations: {
        Row: {
          id: string
          person_id: string | null
          case_reference: string
          title: string
          description: string | null
          status: string
          severity: string
          evidence: Json
          timeline: Json
          resolution: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          closed_at: string | null
          closed_by: string | null
          archived_at: string | null
          archived_by: string | null
        }
        Insert: {
          id?: string
          person_id?: string | null
          case_reference: string
          title: string
          description?: string | null
          status?: string
          severity?: string
          evidence?: Json
          timeline?: Json
          resolution?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Update: {
          id?: string
          person_id?: string | null
          case_reference?: string
          title?: string
          description?: string | null
          status?: string
          severity?: string
          evidence?: Json
          timeline?: Json
          resolution?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          closed_at?: string | null
          closed_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
        }
        Relationships: []
      }
      access_audit_logs: {
        Row: {
          id: string
          actor_user_id: string
          action: string
          resource_type: string
          resource_id: string | null
          target_person_id: string | null
          metadata: Json
          created_at: string
          ip_hash: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          actor_user_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          target_person_id?: string | null
          metadata?: Json
          created_at?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          actor_user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          target_person_id?: string | null
          metadata?: Json
          created_at?: string
          ip_hash?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profile_versions: {
        Row: {
          id: string
          person_id: string
          version_number: number
          snapshot: Json
          changed_by: string | null
          change_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          person_id: string
          version_number: number
          snapshot: Json
          changed_by?: string | null
          change_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          version_number?: number
          snapshot?: Json
          changed_by?: string | null
          change_reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: {
          _user_id?: string
        }
        Returns: boolean
      }
      log_people_audit_event: {
        Args: {
          _action: string
          _resource_type: string
          _resource_id?: string | null
          _target_person_id?: string | null
          _metadata?: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
