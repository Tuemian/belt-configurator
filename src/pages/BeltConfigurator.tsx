import { useState, useCallback, useEffect } from 'react';
import { clampInclineAngleForConfig, ConveyorConfig, defaultConfig } from '@/lib/configurator-types';
import {
  clearSharedConfiguratorStateFromUrl,
  readSharedConfiguratorState,
} from '@/lib/configurator-share';
import { Language, t } from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StepDimensions } from '@/components/configurator/StepDimensions';
import { StepBeltSpeed } from '@/components/configurator/StepBeltSpeed';
import { StepDrive } from '@/components/configurator/StepDrive';
import { StepStand } from '@/components/configurator/StepStand';
import { StepSummary } from '@/components/configurator/StepSummary';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import conveyorHero from '@/assets/conveyor-hero.jpg';
import logo from '@/assets/logo.svg';
import { Link } from 'react-router-dom';

const TOTAL_STEPS = 5;

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
  { value: 'it', label: 'IT' },
];

const BeltConfigurator = () => {
  const [lang, setLang] = useLanguage();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<ConveyorConfig>(defaultConfig);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const sharedState = readSharedConfiguratorState(window.location.search);
    if (!sharedState) {
      return;
    }

    setConfig(sharedState.config);
    setStep(sharedState.step);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  const handleChange = useCallback((updates: Partial<ConveyorConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      const safeIncline = clampInclineAngleForConfig(next);

      if (safeIncline !== next.inclineAngle) {
        next.inclineAngle = safeIncline;
      }

      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setConfig(defaultConfig);
    setStep(0);
    clearSharedConfiguratorStateFromUrl();
    void reserveNewCurrentConfiguratorId(defaultConfig);
  }, []);

  const stepTitles = [
    '',
    t('step1Title', lang),
    t('step2Title', lang),
    t('step3Title', lang),
    t('step4Title', lang),
    t('step5Title', lang),
  ];

  const stepNavTitles = stepTitles.slice(1);

  const stepDescs = [
    '',
    t('step1Desc', lang),
    t('step2Desc', lang),
    t('step3Desc', lang),
    t('step4Desc', lang),
    '',
  ];

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img src={logo} alt="NOVAMOTIS Logo" className="h-20 w-auto" />
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/">{t('toolOverviewBack', lang)}</Link>
              </Button>
              <Select value={lang} onValueChange={(value) => setLang(value as Language)}>
                <SelectTrigger className="h-9 w-[90px] gap-2">
                  <Globe className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">{t('onlineConfigurator', lang)}</p>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                  {t('landingTitle', lang)}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                {t('configuratorSubtitle', lang)}
              </p>
              <Button size="lg" onClick={() => setStep(1)} className="text-base px-8 py-6">
                {t('startConfig', lang)}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="flex justify-center">
              <img
                src={conveyorHero}
                alt="Belt conveyor"
                className="max-w-full h-auto rounded-2xl shadow-2xl"
                width={1200}
                height={600}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logo} alt="NOVAMOTIS Logo" className="h-20 w-auto" />
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {t('stepOf', lang, { current: step, total: TOTAL_STEPS })}
            </span>
            <Select value={lang} onValueChange={(value) => setLang(value as Language)}>
              <SelectTrigger className="h-9 w-[90px] gap-2">
                <Globe className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        <div className="sm:hidden mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{t('stepOf', lang, { current: step, total: TOTAL_STEPS })}</span>
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
            <h2 className="text-2xl font-bold text-foreground">{stepTitles[step]}</h2>
            <p className="text-muted-foreground mt-1">{stepDescs[step]}</p>
          </div>
        )}

        {step === 1 && <StepDimensions config={config} onChange={handleChange} lang={lang} />}
        {step === 2 && <StepBeltSpeed config={config} onChange={handleChange} lang={lang} />}
        {step === 3 && <StepDrive config={config} onChange={handleChange} lang={lang} />}
        {step === 4 && <StepStand config={config} onChange={handleChange} lang={lang} />}
        {step === 5 && <StepSummary config={config} lang={lang} onReset={handleReset} />}
      </main>

      <footer className="border-t bg-background/95 backdrop-blur sticky bottom-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('back', lang)}
          </Button>
          {step < TOTAL_STEPS && (
            <Button onClick={() => setStep(step + 1)}>
              {t('next', lang)}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default BeltConfigurator;