// Lightweight client-side access gate for configurator tools.
// NOTE: Passwords live in the JS bundle and are NOT real security — this is a
// soft gate to prevent accidental/direct-link access. For real protection,
// move to backend auth.

export const TOOL_PASSWORDS: Record<string, string> = {
  'profile-configurator': 'nova2025',
  deflection: 'nova2025',
};

const storageKey = (slug: string) => `tool-access:${slug}`;

export const isToolProtected = (slug: string): boolean =>
  Boolean(TOOL_PASSWORDS[slug]);

export const getToolPassword = (slug: string): string | undefined =>
  TOOL_PASSWORDS[slug];

export const isToolUnlocked = (slug: string): boolean => {
  if (!isToolProtected(slug)) return true;
  try {
    return sessionStorage.getItem(storageKey(slug)) === '1';
  } catch {
    return false;
  }
};

export const unlockTool = (slug: string): void => {
  try {
    sessionStorage.setItem(storageKey(slug), '1');
  } catch {
    /* ignore */
  }
};
