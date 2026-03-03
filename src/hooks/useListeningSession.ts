import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ListeningSession } from '@/types';

export function useListeningSession() {
  const { user } = useAuth();

  const createSession = async (affirmationId: string) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('listening_sessions')
      .insert({
        user_id: user.id,
        affirmation_id: affirmationId,
      })
      .select()
      .single<ListeningSession>();
    if (error) throw error;
    return data;
  };

  const completeSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('listening_sessions')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  };

  const saveDoodle = async (sessionId: string, doodleData: string) => {
    const { error } = await supabase
      .from('listening_sessions')
      .update({
        doodle_data: doodleData,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
    if (error) throw error;
  };

  const getSessionsForMonth = async (year: number, month: number) => {
    if (!user) return [];
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('listening_sessions')
      .select('*, affirmations(title)')
      .eq('user_id', user.id)
      .gte('listened_at', startDate)
      .lt('listened_at', endDate)
      .not('completed_at', 'is', null)
      .returns<(ListeningSession & { affirmations: { title: string } | null })[]>();

    if (error) throw error;
    return data ?? [];
  };

  return { createSession, completeSession, saveDoodle, getSessionsForMonth };
}
