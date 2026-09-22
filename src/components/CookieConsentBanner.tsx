import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { t } from '@/lib/i18n';
import {
  getConsent,
  setConsent,
  subscribeConsent,
  type ConsentChoice,
} from '@/lib/cookie-consent';
import { loadGoogleAnalytics } from '@/lib/google-analytics';

export function CookieConsentBanner() {
  const [lang] = useLanguage();
  const [consent, setConsentState] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    setConsentState(getConsent());
    if (getConsent() === 'all') loadGoogleAnalytics();
    return subscribeConsent(() => {
      const c = getConsent();
      setConsentState(c);
      if (c === 'all') loadGoogleAnalytics();
    });
  }, []);

  if (consent) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-slate-200 bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3">
        <p className="flex-1 text-sm text-muted-foreground">
          {t('cookieBannerText', lang)}{' '}
          <a
            href="https://www.novamotis.com/protection"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t('privacyPolicyLink', lang)}
          </a>
          .
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setConsent('necessary')}>
            {t('cookieBannerNecessaryOnly', lang)}
          </Button>
          <Button size="sm" onClick={() => setConsent('all')}>
            {t('cookieBannerAcceptAll', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
}
