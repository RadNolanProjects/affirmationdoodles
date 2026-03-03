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
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      affirmations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          script: string;
          audio_url: string | null;
          audio_duration_seconds: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          script: string;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          script?: string;
          audio_url?: string | null;
          audio_duration_seconds?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'affirmations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      listening_sessions: {
        Row: {
          id: string;
          user_id: string;
          affirmation_id: string;
          listened_at: string;
          completed_at: string | null;
          doodle_url: string | null;
          doodle_data: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          affirmation_id: string;
          listened_at?: string;
          completed_at?: string | null;
          doodle_url?: string | null;
          doodle_data?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          affirmation_id?: string;
          listened_at?: string;
          completed_at?: string | null;
          doodle_url?: string | null;
          doodle_data?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'listening_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listening_sessions_affirmation_id_fkey';
            columns: ['affirmation_id'];
            isOneToOne: false;
            referencedRelation: 'affirmations';
            referencedColumns: ['id'];
          },
        ];
      };
      pre_written_scripts: {
        Row: {
          id: string;
          title: string;
          script: string;
          category: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          title: string;
          script: string;
          category?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          title?: string;
          script?: string;
          category?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
