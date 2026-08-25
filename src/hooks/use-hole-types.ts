import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { HOLE_TYPES as HOLE_TYPES_FALLBACK, type ProfileHole } from '@/lib/profile-configurator-types';

export interface HoleTypeOption {
  id: ProfileHole['type'];
  label: string;
  diameter: number;
}

const CUSTOM_OPTION: HoleTypeOption = HOLE_TYPES_FALLBACK.find((t) => t.id === 'custom') as HoleTypeOption;
const FALLBACK_FIXED: HoleTypeOption[] = HOLE_TYPES_FALLBACK.filter((t) => t.id !== 'custom') as HoleTypeOption[];

/**
 * Bohrungstypen für den Zuschnittskonfigurator — admin-editierbar über die
 * `hole_types`-Tabelle (Supabase). Fällt auf die im Code hinterlegten Werte
 * zurück, solange die Tabelle noch nicht angelegt ist oder die Abfrage
 * fehlschlägt, damit das Tool nie ohne Bohrungstypen dasteht.
 * "Benutzerdefiniert" wird immer clientseitig angehängt (kein fester
 * Durchmesser, daher nicht admin-verwaltet).
 */
export function useHoleTypes(): HoleTypeOption[] {
  const [fixed, setFixed] = useState<HoleTypeOption[]>(FALLBACK_FIXED);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('hole_types')
      .select('id, label_de, diameter_mm')
      .eq('active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (cancelled || error || !data || data.length === 0) return;
        setFixed(
          data.map((row) => ({
            id: row.id as ProfileHole['type'],
            label: row.label_de,
            diameter: row.diameter_mm,
          })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return [...fixed, CUSTOM_OPTION];
}
