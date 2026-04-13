import { Language, t } from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Globe } from 'lucide-react';
import conveyorHero from '@/assets/conveyor-hero.jpg';
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
  const [lang, setLang] = useLanguage();
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
                <img
                  src={conveyorHero}
                  alt="Fördertechnik"
                  className="w-full h-auto"
                  width={1200}
                  height={600}
                />
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
