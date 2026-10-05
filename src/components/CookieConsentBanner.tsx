import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/use-language';
import { t } from '@/lib/i18n';
import { getConsent, setConsent, subscribeConsent, type ConsentChoice } from '@/lib/cookie-consent';

export function CookieConsentBanner() {
  const [lang] = useLanguage();
  const [consent, setConsentState] = useState<ConsentChoice | null>(getConsent());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stats, setStats] = useState(false);

  useEffect(() => subscribeConsent(() => setConsentState(getConsent())), []);

  if (consent) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background/95 backdrop-blur shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3">
          <p className="flex-1 text-sm text-muted-foreground">
            {t('cookieBannerText', lang)}{' '}
            <a href="https://www.novamotis.com/protection" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
              {t('privacyPolicyLink', lang)}
            </a>
            .
          </p>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              {t('cookieBannerSettings', lang)}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConsent('necessary')}>
              {t('cookieBannerNecessaryOnly', lang)}
            </Button>
            <Button size="sm" onClick={() => setConsent('all')}>
              {t('cookieBannerAcceptAll', lang)}
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="z-[110]">
          <DialogHeader>
            <DialogTitle>{t('cookieDialogTitle', lang)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('cookieNecessary', lang)}</span>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('cookieStatistics', lang)}</span>
              <Switch checked={stats} onCheckedChange={setStats} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setConsent(stats ? 'all' : 'necessary'); setSettingsOpen(false); }}>
              {t('cookieSave', lang)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
