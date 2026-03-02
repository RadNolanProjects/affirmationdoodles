import type { Database } from '@/lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Affirmation = Database['public']['Tables']['affirmations']['Row'];
export type AffirmationInsert = Database['public']['Tables']['affirmations']['Insert'];
export type AffirmationUpdate = Database['public']['Tables']['affirmations']['Update'];
export type ListeningSession = Database['public']['Tables']['listening_sessions']['Row'];
export type ListeningSessionInsert = Database['public']['Tables']['listening_sessions']['Insert'];
export type PreWrittenScript = Database['public']['Tables']['pre_written_scripts']['Row'];

export type ScriptLine = {
  index: number;
  text: string;
};
