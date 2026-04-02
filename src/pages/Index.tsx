import { useState, useCallback } from 'react';
import { ConveyorConfig, defaultConfig } from '@/lib/configurator-types';
import { Language, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StepDimensions } from '@/components/configurator/StepDimensions';
import { StepBeltSpeed } from '@/components/configurator/StepBeltSpeed';
import { StepDrive } from '@/components/configurator/StepDrive';
import { StepStand } from '@/components/configurator/StepStand';
import { StepSummary } from '@/components/configurator/StepSummary';
import { ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import conveyorHero from '@/assets/conveyor-hero.jpg';
import logo from '@/assets/logo.svg';

const TOTAL_STEPS = 5;

const Index = () => {
  const [lang, setLang] = useState<Language>('de');
  const [step, setStep] = useState(0); // 0 = hero, 1-5 = config steps
  const [config, setConfig] = useState<ConveyorConfig>(defaultConfig);

  const handleChange = useCallback((updates: Partial<ConveyorConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => {
    setConfig(defaultConfig);
    setStep(0);
  }, []);

  const stepTitles = [
    '',
    t('step1Title', lang),
    t('step2Title', lang),
    t('step3Title', lang),
    t('step4Title', lang),
    t('step5Title', lang),
  ];

  const stepDescs = [
    '',
    t('step1Desc', lang),
    t('step2Desc', lang),
    t('step3Desc', lang),
    t('step4Desc', lang),
    '',
  ];

  // Hero / Landing
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="NOVAMOTIS Logo" className="h-20 w-auto" />
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="gap-1.5"
            >
              <Globe className="w-4 h-4" />
              {t('langSwitch', lang)}
            </Button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-2">{t('onlineConfigurator', lang)}</p>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
                  {t('configuratorTitle', lang)}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                {t('configuratorSubtitle', lang)}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {t('stepOf', lang, { current: TOTAL_STEPS, total: TOTAL_STEPS })}
              </div>
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
                width={1200} height={600}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Configurator steps
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between">
          <button
            onClick={() => setStep(0)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img src={logo} alt="NOVAMOTIS Logo" className="h-20 w-auto" />
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {t('stepOf', lang, { current: step, total: TOTAL_STEPS })}
            </span>
            <Button
              variant="ghost" size="sm"
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="gap-1.5"
            >
              <Globe className="w-4 h-4" />
              {t('langSwitch', lang)}
            </Button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        <div className="flex justify-between mt-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <button
              key={i}
              onClick={() => setStep(i + 1)}
              className={`text-xs font-medium transition-colors ${
                i + 1 <= step ? 'text-primary' : 'text-muted-foreground'
              } ${i + 1 === step ? 'font-bold' : ''}`}
            >
              {i + 1}. {[t('step1Title', lang), t('step2Title', lang), t('step3Title', lang), t('step4Title', lang), t('step5Title', lang)][i]}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
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

      {/* Navigation */}
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

export default Index;
