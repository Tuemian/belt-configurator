import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, MousePointerClick, Wrench, Mail } from 'lucide-react';

const STORAGE_KEY = 'profile-configurator.onboarding-dismissed';

interface Step {
  icon: typeof Settings2;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Settings2,
    title: '1. Profil & Länge wählen',
    body: 'Wähle links Größe (z. B. 40 × 40), Variante, Länge und Stückzahl. Schrägschnitte können positiv oder negativ sein.',
  },
  {
    icon: MousePointerClick,
    title: '2. Nut auswählen',
    body: 'Im Querschnitt links oben siehst du die vier Nuten A / B / C / D. Klicke darauf — die gewählte Nut wird in der 2D-Werkbank angezeigt.',
  },
  {
    icon: Wrench,
    title: '3. Bohrungen & Verbinder per Drag-and-Drop',
    body: 'Klicke direkt auf die Nut-Spur, um eine Bohrung zu setzen. Verbinder rasten automatisch an Anfang oder Ende ein. Per Maus verschiebbar, „Entf“ löscht.',
  },
  {
    icon: Mail,
    title: '4. In den Warenkorb & Anfrage senden',
    body: 'Jede Konfiguration landet im Warenkorb. Versende die Anfrage am Ende per E-Mail — du erhältst eine Bestätigung, NOVAMOTIS bekommt eine Kopie.',
  },
];

export function ProfileOnboarding() {
  const [open, setOpen] = useState(false);
  const [hideForever, setHideForever] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const handleClose = () => {
    if (hideForever) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Willkommen im Profilzuschnitt-Konfigurator</DialogTitle>
          <DialogDescription>
            In nur vier Schritten zum maßgeschneiderten Aluminium-Profil — mit Live-Preis und direktem Anfrage-Versand.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 space-y-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className="flex gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{s.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <DialogFooter className="!justify-between sm:!justify-between mt-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox checked={hideForever} onCheckedChange={(v) => setHideForever(!!v)} />
            Nicht mehr anzeigen
          </label>
          <Button onClick={handleClose} size="sm" className="font-semibold">Verstanden, los geht’s</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
