import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Affirmation } from '@/types';

export function useAffirmations() {
  const { user } = useAuth();
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAffirmations = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('affirmations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<Affirmation[]>();

    if (!error && data) setAffirmations(data);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAffirmations();
  }, [fetchAffirmations]);

  const createAffirmation = async (input: {
    title: string;
    script: string;
    audio_url?: string | null;
    audio_duration_seconds?: number | null;
  }) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('affirmations')
      .insert({ ...input, user_id: user.id })
      .select()
      .single<Affirmation>();
    if (error) throw error;
    setAffirmations((prev) => [data, ...prev]);
    return data;
  };

  const updateAffirmation = async (
    id: string,
    updates: Partial<Pick<Affirmation, 'title' | 'script' | 'audio_url' | 'audio_duration_seconds' | 'is_active'>>
  ) => {
    const { data, error } = await supabase
      .from('affirmations')
      .update(updates)
      .eq('id', id)
      .select()
      .single<Affirmation>();
    if (error) throw error;
    setAffirmations((prev) => prev.map((a) => (a.id === id ? data : a)));
    return data;
  };

  const deleteAffirmation = async (id: string) => {
    const { error } = await supabase.from('affirmations').delete().eq('id', id);
    if (error) throw error;
    setAffirmations((prev) => prev.filter((a) => a.id !== id));
  };

  return {
    affirmations,
    isLoading,
    fetchAffirmations,
    createAffirmation,
    updateAffirmation,
    deleteAffirmation,
  };
}
