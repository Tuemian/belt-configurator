import { useState, useEffect } from 'react';
import { Language, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Globe } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { Link } from 'react-router-dom';

type ToolIconProps = {
  className?: string;
};

const LogoIconSvg = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask id="nm-ring-mask">
        <circle cx="50" cy="50" r="44" fill="white" />
        <circle cx="50" cy="50" r="26" fill="black" />
        <rect x="-6" y="43" width="112" height="14" transform="rotate(-44 50 50)" fill="black" />
        <rect x="-6" y="43" width="112" height="14" transform="rotate(44 50 50)" fill="black" />
      </mask>
    </defs>
    <circle cx="50" cy="50" r="50" fill="#0273ac" mask="url(#nm-ring-mask)" />
    <circle cx="50" cy="50" r="8" fill="#0273ac" />
  </svg>
);

const BeltConveyorIcon = ({ className }: ToolIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="2" y="9" width="20" height="6" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M14.5 10.3L17.2 12l-2.7 1.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeflectionIcon = ({ className }: ToolIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3 8.5h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M4.2 8.5c3.4 6.2 12.2 6.2 15.6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M4 18.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M8 16.8v3.4M12 16.8v3.4M16 16.8v3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const DoorConfiguratorIcon = ({ className }: ToolIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8 20V8h8v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M12 14V9.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M10.3 10.8 12 9.1l1.7 1.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RollerConveyorIcon = ({ className }: ToolIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="2.2" y="7.6" width="19.6" height="8.8" rx="4.4" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="6" cy="12" r="1.95" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10.4" cy="12" r="1.95" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="14.8" cy="12" r="1.95" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="19.2" cy="12" r="1.95" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const tools = [
  {
    slug: 'belt-conveyor',
    titleKey: 'hubToolBeltTitle',
    descKey: 'hubToolBeltDesc',
    statusKey: 'hubAvailableNow',
    available: true,
    icon: BeltConveyorIcon,
  },
  {
    slug: 'deflection',
    titleKey: 'hubToolDeflectionTitle',
    descKey: 'hubToolDeflectionDesc',
    statusKey: 'hubPlanned',
    available: false,
    icon: DeflectionIcon,
  },
  {
    slug: 'high-speed-door',
    titleKey: 'hubToolDoorTitle',
    descKey: 'hubToolDoorDesc',
    statusKey: 'hubPlanned',
    available: false,
    icon: DoorConfiguratorIcon,
  },
  {
    slug: 'roller-conveyor',
    titleKey: 'hubToolRollerTitle',
    descKey: 'hubToolRollerDesc',
    statusKey: 'hubPlanned',
    available: false,
    icon: RollerConveyorIcon,
  },
] as const;

const Index = () => {
  const [lang, setLang] = useState<Language>('de');
  const [activeToolIndex, setActiveToolIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveToolIndex(i => (i + 1) % tools.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,148,204,0.18),_transparent_35%),linear-gradient(180deg,_#f8fcff_0%,_#eef6fb_48%,_#ffffff_100%)]">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="NOVAMOTIS Logo" className="h-20 w-auto" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="gap-1.5"
          >
            <Globe className="w-4 h-4" />
            {t('langSwitch', lang)}
          </Button>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                  {t('hubTitle', lang)}
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
                  {t('hubSubtitle', lang)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-black/5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t('hubAvailableNow', lang)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-sm ring-1 ring-black/5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {t('hubGrowingLibrary', lang)}
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-sky-200/10 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 sm:p-8 shadow-[0_24px_80px_rgba(10,47,76,0.12)] backdrop-blur">
                <div className="absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />
                <div className="absolute -bottom-14 right-8 h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl" />

                {/* Logo centered */}
                <div className="relative mb-5 flex justify-center">
                  <LogoIconSvg className="h-14 w-14 drop-shadow-sm" />
                </div>

                {/* Animated tool tiles */}
                <div className="relative grid grid-cols-2 gap-3">
                  {tools.map((tool, idx) => {
                    const HeroIcon = tool.icon;
                    const isActive = activeToolIndex === idx;

                    return (
                      <div
                        key={`hero-${tool.slug}`}
                        className={`rounded-2xl border p-3.5 transition-all duration-500 ${
                          isActive
                            ? 'border-primary/30 bg-primary/5 shadow-md ring-1 ring-primary/20 scale-[1.03]'
                            : 'border-slate-200/80 bg-white/90 shadow-sm scale-100'
                        }`}
                      >
                        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-500 ${
                          isActive ? 'bg-primary text-white' : 'bg-secondary text-primary'
                        }`}>
                          <HeroIcon className="h-5 w-5" />
                        </div>
                        <p className={`mt-2.5 text-xs font-semibold leading-tight transition-colors duration-500 ${
                          isActive ? 'text-primary' : 'text-foreground/70'
                        }`}>
                          {t(tool.titleKey, lang)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t('hubSectionTitle', lang)}</h2>
              <p className="mt-2 text-muted-foreground">{t('hubSectionSubtitle', lang)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Card
                  key={tool.slug}
                  className="group relative overflow-hidden border-white/70 bg-white/85 shadow-[0_20px_50px_rgba(15,52,74,0.08)] backdrop-blur transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky-400 to-cyan-300" />
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                        <Icon className="h-8 w-8" />
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm ring-1 ring-black/5">
                        <span className={`h-2 w-2 rounded-full ${tool.available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {t(tool.statusKey, lang)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t(tool.titleKey, lang)}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t(tool.descKey, lang)}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tool.available ? (
                      <Button asChild className="w-full justify-between">
                        <Link to="/belt-conveyor">
                          {t('hubOpenTool', lang)}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                        {t('hubPlannedHint', lang)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
