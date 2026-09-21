import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, Scissors, MousePointerClick, Mail } from 'lucide-react';

const STORAGE_KEY = 'profile-configurator.onboarding-dismissed';

interface Step {
  icon: typeof Settings2;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Settings2,
    title: '1. Profil wählen',
    body: 'Wählen Sie links unter „Basis-Konfiguration“ die Nutreihe (A5 / A6 / A8), den Querschnitt (z. B. 40 × 40), die Variante (ECO, Leicht, Schwer), die Länge (50–6000 mm) und die Stückzahl.',
  },
  {
    icon: Scissors,
    title: '2. Enden bearbeiten',
    body: 'Unter „Enden-Bearbeitung“ stellen Sie Schrägschnitte von −60° bis +60° ein und legen fest, ob die Stirnseiten ein Gewinde erhalten.',
  },
  {
    icon: MousePointerClick,
    title: '3. Bohrungen & Verbinder setzen',
    body: 'In der 2D-Werkbank wählen Sie im Querschnitt die Nut (rot nummeriert, Shift-Klick für mehrere). Mit „+ Bohrung“ (Taste B) oder „+ Verbinder“ (Taste V) setzen Sie per Klick auf das Profil Bohrungen bzw. Verbinder — Verbinder rasten am Profilanfang oder -ende ein. Per Maus verschieben, mit „Entf“ löschen.',
  },
  {
    icon: Mail,
    title: '4. In den Warenkorb & Anfrage senden',
    body: 'Mit „In den Warenkorb“ übernehmen Sie die Konfiguration als Position. Über „Anfrage senden“ geht sie per E-Mail an NOVAMOTIS — Sie erhalten eine Bestätigung mit PDF-Datenblatt, NOVAMOTIS bekommt eine Kopie.',
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
            In vier Schritten zum maßgeschneiderten Aluminium-Profil. Die Preise stammen aus der Preisliste des NOVAMOTIS-Webshops; ist dort keiner hinterlegt, nennen wir ihn mit dem Angebot zu Ihrer Anfrage.
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
