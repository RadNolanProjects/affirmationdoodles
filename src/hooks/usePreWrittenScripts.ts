import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PreWrittenScript } from '@/types';

export function usePreWrittenScripts() {
  const [scripts, setScripts] = useState<PreWrittenScript[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('pre_written_scripts')
      .select('*')
      .order('sort_order')
      .returns<PreWrittenScript[]>()
      .then(({ data, error }) => {
        if (!error && data) setScripts(data);
        setIsLoading(false);
      });
  }, []);

  return { scripts, isLoading };
}
