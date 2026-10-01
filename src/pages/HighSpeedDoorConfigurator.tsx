import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import SiteHeader from '@/components/SiteHeader';
import { StepDoorTypeAndSize } from '@/components/configurator/StepDoorTypeAndSize';
import { StepDoorMounting } from '@/components/configurator/StepDoorMounting';
import { StepDoorMaterial } from '@/components/configurator/StepDoorMaterial';
import { StepDoorOptions } from '@/components/configurator/StepDoorOptions';
import { StepDoorSummary } from '@/components/configurator/StepDoorSummary';
import { DEFAULT_DOOR_CONFIG, DoorConfig } from '@/lib/door-configurator-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const TOTAL_STEPS = 5;

const STEP_TITLES = [
  '',
  'Torart & Maße',
  'Befestigung & Antrieb',
  'Behang, Farbe & Sichtfenster',
  'Zusatzoptionen',
  'Zusammenfassung',
];

const STEP_DESCS = [
  '',
  'Wählen Sie den Tortyp und die lichte Breite/Höhe der Öffnung.',
  'Befestigung, Antriebsausrichtung, Anschlussspannung und Lichtschranke.',
  'Ausführung von Führungsschiene, Torbehang und Sichtfenster.',
  'Optionale Zusatzausstattung nach Wunsch.',
  '',
];

const HighSpeedDoorConfigurator = () => {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<DoorConfig>(DEFAULT_DOOR_CONFIG);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const handleChange = useCallback((updates: Partial<DoorConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_DOOR_CONFIG);
    setStep(0);
  }, []);

  const stepNavTitles = STEP_TITLES.slice(1);

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Helmet>
          <title>Tortechnik-Konfigurator – NOVAMOTIS</title>
          <meta
            name="description"
            content="Schnelllauftore (Folien-Schnelllauftor, Aluminium-Lamellentor) konfigurieren, Richtpreis berechnen und Anfrage an NOVAMOTIS senden."
          />
          <link rel="canonical" href="https://konfigurator.novamotis.com/high-speed-door" />
        </Helmet>
        <SiteHeader title="Tortechnik">
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link to="/">Zur Tool-Übersicht</Link>
          </Button>
        </SiteHeader>

        <main className="flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">Online-Konfigurator</p>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                  Schnelllauftore konfigurieren
                </h1>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Folien-Schnelllauftor oder Aluminium-Lamellentor: Maße, Ausführung und Zusatzoptionen wählen,
                Richtpreis berechnen und Anfrage direkt an NOVAMOTIS senden.
              </p>
              <Button size="lg" onClick={() => setStep(1)} className="text-base px-8 py-6">
                Konfiguration starten
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-md aspect-[4/3] rounded-2xl border bg-muted/30 flex items-center justify-center">
                <span className="text-sm text-muted-foreground px-6 text-center">
                  Folien-Schnelllauftore &amp; Aluminium-Lamellentore für effiziente Produktionsprozesse
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Tortechnik-Konfigurator – NOVAMOTIS</title>
        <meta
          name="description"
          content="Schnelllauftore (Folien-Schnelllauftor, Aluminium-Lamellentor) konfigurieren, Richtpreis berechnen und Anfrage an NOVAMOTIS senden."
        />
        <link rel="canonical" href="https://konfigurator.novamotis.com/high-speed-door" />
      </Helmet>
      <SiteHeader title="Tortechnik">
        <span className="text-sm text-muted-foreground hidden sm:block mr-2">
          Schritt {step} von {TOTAL_STEPS}
        </span>
      </SiteHeader>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        <div className="sm:hidden mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Schritt {step} von {TOTAL_STEPS}</span>
            <span className="max-w-[62%] truncate text-right font-semibold text-foreground">
              {stepNavTitles[step - 1]}
            </span>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const isActive = i + 1 === step;
              const isCompleted = i + 1 < step;
              return (
                <button
                  key={`mobile-step-${i}`}
                  onClick={() => setStep(i + 1)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-primary/40 text-primary'
                        : 'border-slate-200 text-muted-foreground'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary-foreground' : isCompleted ? 'bg-primary' : 'bg-slate-300'}`} />
                    <span>{i + 1}. {stepNavTitles[i]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 hidden justify-between sm:flex">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const isActive = i + 1 === step;
            const isCompleted = i + 1 < step;
            return (
              <button
                key={i}
                onClick={() => setStep(i + 1)}
                className={`inline-flex items-center gap-2 text-xs font-medium transition-colors ${
                  i + 1 <= step ? 'text-primary' : 'text-muted-foreground'
                } ${isActive ? 'font-bold' : ''}`}
              >
                <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary' : isCompleted ? 'bg-primary/60' : 'bg-slate-300'}`} />
                <span>{i + 1}. {stepNavTitles[i]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {step < TOTAL_STEPS && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">{STEP_TITLES[step]}</h2>
            <p className="text-muted-foreground mt-1">{STEP_DESCS[step]}</p>
          </div>
        )}

        {step === 1 && <StepDoorTypeAndSize config={config} onChange={handleChange} />}
        {step === 2 && <StepDoorMounting config={config} onChange={handleChange} />}
        {step === 3 && <StepDoorMaterial config={config} onChange={handleChange} />}
        {step === 4 && <StepDoorOptions config={config} onChange={handleChange} />}
        {step === 5 && <StepDoorSummary config={config} onReset={handleReset} />}
      </main>

      <footer className="border-t bg-background/95 backdrop-blur sticky bottom-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step <= 1}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Zurück
          </Button>
          {step < TOTAL_STEPS && (
            <Button onClick={() => setStep(step + 1)}>
              Weiter
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default HighSpeedDoorConfigurator;
