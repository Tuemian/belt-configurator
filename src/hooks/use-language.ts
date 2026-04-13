import { useEffect, useState } from 'react';
import type { Language } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'novamotis-language';

function isLanguage(value: string | null): value is Language {
  return value === 'de' || value === 'en';
}

function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return 'de';
  }

  const browserLanguages = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  return browserLanguages.some((language) => language.toLowerCase().startsWith('de')) ? 'de' : 'en';
}

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'de';
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(storedLanguage) ? storedLanguage : detectBrowserLanguage();
}

export function useLanguage() {
  const [lang, setLang] = useState<Language>(() => readStoredLanguage());

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, [lang]);

  return [lang, setLang] as const;
}