import { useState } from 'react';
import { Language, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Globe } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { Link } from 'react-router-dom';

type ToolIconProps = {
  className?: string;
};

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
                  <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                    {t('hubSubtitle', lang)}
                  </p>
                </div>
              </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-sky-200/10 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(10,47,76,0.12)] backdrop-blur">
                <svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" aria-hidden="true">
                  <defs>
                    <radialGradient id="bg-grad" cx="30%" cy="30%" r="75%">
                      <stop offset="0%" stopColor="#e8f4fb" />
                      <stop offset="100%" stopColor="#f0f8ff" />
                    </radialGradient>
                    <radialGradient id="circle-grad" cx="40%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#0273ac" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#0273ac" stopOpacity="0.04" />
                    </radialGradient>
                  </defs>
                  <rect width="420" height="320" fill="url(#bg-grad)" />
                  <circle cx="340" cy="60" r="110" fill="url(#circle-grad)" />
                  <circle cx="60" cy="280" r="90" fill="#0273ac" fillOpacity="0.06" />
                  <circle cx="210" cy="160" r="55" fill="#0273ac" fillOpacity="0.05" />
                  <line x1="60" y1="0" x2="60" y2="320" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="120" y1="0" x2="120" y2="320" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="180" y1="0" x2="180" y2="320" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="240" y1="0" x2="240" y2="320" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="300" y1="0" x2="300" y2="320" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="360" y1="0" x2="360" y2="320" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="0" y1="60" x2="420" y2="60" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="0" y1="120" x2="420" y2="120" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="0" y1="180" x2="420" y2="180" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <line x1="0" y1="240" x2="420" y2="240" stroke="#0273ac" strokeOpacity="0.05" strokeWidth="1" />
                  <rect x="38" y="40" width="60" height="60" rx="14" fill="#0273ac" fillOpacity="0.10" />
                  <rect x="44" y="46" width="48" height="48" rx="10" fill="#0273ac" fillOpacity="0.10" />
                  <rect x="290" y="190" width="80" height="80" rx="18" fill="#0273ac" fillOpacity="0.08" />
                  <rect x="298" y="198" width="64" height="64" rx="13" fill="#0273ac" fillOpacity="0.08" />
                  <circle cx="350" cy="80" r="26" fill="none" stroke="#0273ac" strokeOpacity="0.20" strokeWidth="2.5" />
                  <circle cx="350" cy="80" r="14" fill="#0273ac" fillOpacity="0.12" />
                  <circle cx="90" cy="230" r="20" fill="none" stroke="#0273ac" strokeOpacity="0.18" strokeWidth="2" />
                  <circle cx="90" cy="230" r="10" fill="#0273ac" fillOpacity="0.10" />
                  <polygon points="210,95 248,117 248,161 210,183 172,161 172,117" fill="none" stroke="#0273ac" strokeOpacity="0.22" strokeWidth="2" />
                  <polygon points="210,111 234,125 234,153 210,167 186,153 186,125" fill="#0273ac" fillOpacity="0.08" />
                  <circle cx="210" cy="139" r="10" fill="#0273ac" fillOpacity="0.22" />
                  <line x1="172" y1="139" x2="108" y2="70" stroke="#0273ac" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="248" y1="139" x2="332" y2="235" stroke="#0273ac" strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="210" y1="183" x2="210" y2="260" stroke="#0273ac" strokeOpacity="0.10" strokeWidth="1.5" strokeDasharray="4 4" />
                  <rect x="60" y="262" width="70" height="8" rx="4" fill="#0273ac" fillOpacity="0.13" />
                  <rect x="60" y="276" width="44" height="8" rx="4" fill="#0273ac" fillOpacity="0.08" />
                  <rect x="200" y="262" width="50" height="8" rx="4" fill="#0273ac" fillOpacity="0.13" />
                  <rect x="200" y="276" width="80" height="8" rx="4" fill="#0273ac" fillOpacity="0.08" />
                </svg>
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
