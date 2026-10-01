import { Language, t } from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Globe, Lock, LogOut } from 'lucide-react';
import heroImage from '@/assets/hero-modular-systems.webp';
import pictoFoerdertechnik from '@/assets/pictograms/icon_foerdertechnik.png';
import pictoProfiltechnik from '@/assets/pictograms/icon_aluminiumprofiltechnik.png';
import pictoCadEngineering from '@/assets/pictograms/icon_cad-engineering.png';
import pictoSchnelllauftore from '@/assets/pictograms/icon_schnelllauftore.png';
import logo from '@/assets/logo.svg';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

type ToolIconProps = { className?: string };

// Piktogramme aus dem NOVAMOTIS-CD (dieselben wie im Webshop, src/assets/pictograms)
// statt der bisherigen schlanken Lucide-artigen Linien-Icons — für optische
// Konsistenz zwischen Webshop und Konfigurator.
const BeltConveyorIcon = ({ className }: ToolIconProps) => (
  <img src={pictoFoerdertechnik} alt="" className={className} />
);

const DeflectionIcon = ({ className }: ToolIconProps) => (
  <img src={pictoCadEngineering} alt="" className={className} />
);

const DoorConfiguratorIcon = ({ className }: ToolIconProps) => (
  <img src={pictoSchnelllauftore} alt="" className={className} />
);

// Kein eigenes Piktogramm im CD-Set für Rollenbahnen vorhanden — nutzt bis dahin
// dasselbe Fördertechnik-Piktogramm wie beim Gurtförderer (beide sind Fördertechnik).
const RollerConveyorIcon = ({ className }: ToolIconProps) => (
  <img src={pictoFoerdertechnik} alt="" className={className} />
);

const ProfileIcon = ({ className }: ToolIconProps) => (
  <img src={pictoProfiltechnik} alt="" className={className} />
);

type TKey = Parameters<typeof t>[0];
type Tool = {
  slug: string;
  titleKey: TKey;
  descKey: TKey;
  statusKey: TKey;
  available: boolean;
  requiresAuth?: boolean;
  icon: (p: ToolIconProps) => JSX.Element;
};

const tools: Tool[] = [
  { slug: 'belt-conveyor', titleKey: 'hubToolBeltTitle', descKey: 'hubToolBeltDesc', statusKey: 'hubAvailableNow', available: true, icon: BeltConveyorIcon },
  { slug: 'profile-configurator', titleKey: 'hubToolProfileTitle', descKey: 'hubToolProfileDesc', statusKey: 'hubAvailableNow', available: true, icon: ProfileIcon },
  { slug: 'deflection', titleKey: 'hubToolDeflectionTitle', descKey: 'hubToolDeflectionDesc', statusKey: 'hubAvailableNow', available: true, icon: DeflectionIcon },
  { slug: 'high-speed-door', titleKey: 'hubToolDoorTitle', descKey: 'hubToolDoorDesc', statusKey: 'hubPlanned', available: false, icon: DoorConfiguratorIcon },
  { slug: 'roller-conveyor', titleKey: 'hubToolRollerTitle', descKey: 'hubToolRollerDesc', statusKey: 'hubPlanned', available: false, icon: RollerConveyorIcon },
];

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
  { value: 'it', label: 'IT' },
];

const Index = () => {
  const [lang, setLang] = useLanguage();
  const { session, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,148,204,0.18),_transparent_35%),linear-gradient(180deg,_#f8fcff_0%,_#eef6fb_48%,_#ffffff_100%)]">
      <Helmet>
        <title>NOVAMOTIS Configurator – Industrielle Komponenten online konfigurieren</title>
        <meta name="description" content="Konfigurieren Sie Förderbänder, Profilzuschnitte und industrielle Komponenten von NOVAMOTIS online. Maße, Antrieb und Optionen wählen, Preis berechnen und Anfrage senden." />
        <link rel="canonical" href="https://konfigurator.novamotis.com/" />
        <meta property="og:title" content="NOVAMOTIS Configurator – Industrielle Komponenten online konfigurieren" />
        <meta property="og:description" content="Förderbänder, Profilzuschnitte und industrielle Komponenten von NOVAMOTIS online konfigurieren und anfragen." />
        <meta property="og:url" content="https://konfigurator.novamotis.com/" />
      </Helmet>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-28 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="https://www.novamotis.com/" target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="NOVAMOTIS Logo" className="h-20 w-auto" width={142} height={80} />
            </a>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            )}
            <Select value={lang} onValueChange={(value) => setLang(value as Language)}>
              <SelectTrigger className="h-9 w-[90px] gap-2">
                <Globe className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — full-width image with overlaid card (item24-style, wie im Webshop) */}
        <section className="relative">
          <div className="relative w-full overflow-hidden md:h-[480px]">
            <img
              src={heroImage}
              alt="NOVAMOTIS Modulare Systeme"
              width={2100}
              height={700}
              className="h-[200px] w-full object-cover object-[85%_center] sm:h-[260px] md:absolute md:inset-0 md:h-full md:object-[center_60%]"
              fetchPriority="high"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-background/40 to-transparent md:block" />
            <div className="relative mx-auto md:h-full md:max-w-7xl md:px-6 lg:px-8">
              <div className="bg-background px-6 py-8 sm:py-10 md:absolute md:left-6 md:top-1/2 md:w-[560px] md:-translate-y-1/2 md:bg-background/95 md:p-10 md:shadow-xl md:backdrop-blur lg:left-8">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-foreground">
                  {t('hubTitle', lang)}
                </h1>
                <div className="mt-4 h-0.5 w-12 bg-primary" />
                <p className="mt-5 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {t('hubSubtitle', lang)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t('hubSectionTitle', lang)}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isBeta = !!tool.requiresAuth;
              const target = `/${tool.slug}`;

              return (
                <Card key={tool.slug} className="group relative overflow-hidden border-white/70 bg-white/85 shadow-[0_20px_50px_rgba(15,52,74,0.08)] backdrop-blur transition-transform duration-200 hover:-translate-y-1 flex flex-col">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-sky-400 to-cyan-300" />
                  <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                        <Icon className="h-10 w-10 object-contain" />
                      </div>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm shadow-sm ring-1 ring-black/5 ${
                        isBeta
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-white/80 text-muted-foreground'
                      }`}>
                        {isBeta
                          ? <Lock className="h-3 w-3" />
                          : <span className={`h-2 w-2 rounded-full ${tool.available ? 'bg-emerald-500' : 'bg-amber-500'}`} />}
                        {isBeta ? t('hubBeta', lang) : t(tool.statusKey, lang)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{t(tool.titleKey, lang)}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {t(tool.descKey, lang)}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    {tool.available ? (
                      isBeta ? (
                        <Button asChild variant="outline" className="w-full justify-between border-violet-200 text-violet-700 hover:bg-violet-50">
                          <Link to={target}>
                            <span className="flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5" />
                              {t('hubOpenWithPassword', lang)}
                            </span>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild className="w-full justify-between">
                          <Link to={`/${tool.slug}`}>
                            {t('hubOpenTool', lang)}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      )
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
