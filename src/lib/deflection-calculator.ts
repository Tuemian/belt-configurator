// ---------------------------------------------------------------------------
// Durchbiegungsrechner — Balkenformeln
// ---------------------------------------------------------------------------

import { E_MODULUS_ALU_N_MM2, type Orientation, type DeflectionProfile } from '@/lib/deflection-profiles';

export type { Orientation } from '@/lib/deflection-profiles';

export type LoadCase = 'point-simple' | 'udl-simple' | 'point-cantilever';

export const KG_TO_N = 9.81;

export interface DeflectionResult {
  deflectionMm: number;
}

/**
 * δ(a) = P·a²·b² / (3·E·I·L)   Einfeldträger, Einzellast bei a (b = L-a), Durchbiegung an der Lastposition
 * δ    = 5·F·L³ / (384·E·I)    Einfeldträger, Streckenlast (F = Gesamtlast)
 * δ(a) = P·a³ / (3·E·I)        Kragarm, Einzellast bei Abstand a von der Einspannung
 */
export function calculateDeflection(
  profile: DeflectionProfile,
  lengthMm: number,
  loadN: number,
  loadCase: LoadCase,
  orientation: Orientation,
  loadPositionMm: number
): DeflectionResult {
  const momentOfInertiaMm4 = orientation === 'upright' ? profile.iUprightMm4 : profile.iFlatMm4;
  const ei = E_MODULUS_ALU_N_MM2 * momentOfInertiaMm4;

  let deflectionMm: number;
  switch (loadCase) {
    case 'point-simple': {
      const a = Math.min(Math.max(loadPositionMm, 0), lengthMm);
      const b = lengthMm - a;
      deflectionMm = (loadN * a ** 2 * b ** 2) / (3 * ei * lengthMm);
      break;
    }
    case 'udl-simple':
      deflectionMm = (5 * loadN * lengthMm ** 3) / (384 * ei);
      break;
    case 'point-cantilever': {
      const a = Math.min(Math.max(loadPositionMm, 0), lengthMm);
      deflectionMm = (loadN * a ** 3) / (3 * ei);
      break;
    }
  }

  return { deflectionMm };
}
