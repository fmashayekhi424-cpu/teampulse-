// Hand-authored to match supabase/migrations/*.sql exactly.
// Safe to replace with the output of `supabase gen types typescript` once
// the project is linked — the shape is intentionally identical.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: never; // there is exactly one team (Visual Optics); it's seeded by migration
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          team_id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: never; // created by the handle_new_user() trigger on signup
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      status_types: {
        Row: {
          id: string;
          team_id: string | null;
          key: string;
          label: string;
          icon: string;
          color: string;
          allows_comment: boolean;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          key: string;
          label: string;
          icon: string;
          color: string;
          allows_comment?: boolean;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["status_types"]["Insert"]>;
        Relationships: [];
      };
      schedule_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          period: "morning" | "afternoon";
          status_type_id: string;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          period: "morning" | "afternoon";
          status_type_id: string;
          comment?: string | null;
        };
        Update: {
          status_type_id?: string;
          comment?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      my_team_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type StatusType = Database["public"]["Tables"]["status_types"]["Row"];
export type ScheduleEntry = Database["public"]["Tables"]["schedule_entries"]["Row"];
