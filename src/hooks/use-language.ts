import { useEffect, useState } from 'react';
import type { Language } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'novamotis-language';
const LANGUAGE_CHANGED_EVENT = 'novamotis-language-changed';

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
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY) {
        return;
      }

      const nextLanguage = isLanguage(event.newValue) ? event.newValue : readStoredLanguage();
      setLang(nextLanguage);
    };

    const onLanguageChanged = () => {
      setLang(readStoredLanguage());
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LANGUAGE_CHANGED_EVENT, onLanguageChanged);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, onLanguageChanged);
    };
  }, []);

  const setLanguage = (next: Language | ((previous: Language) => Language)) => {
    const nextLanguage = typeof next === 'function'
      ? next(readStoredLanguage())
      : next;

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new Event(LANGUAGE_CHANGED_EVENT));
    setLang(nextLanguage);
  };

  return [lang, setLanguage] as const;
}