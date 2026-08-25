import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/logo.svg';
import { NumericInput } from '@/components/configurator/NumericInput';
import { RealisticProfileCrossSection } from '@/components/configurator/RealisticProfileCrossSection';
import { LoadCaseDiagram } from '@/components/configurator/LoadCaseDiagram';
import { DEFLECTION_PROFILES, toProfileSection, type ProfileSeries } from '@/lib/deflection-profiles';
import { calculateDeflection, KG_TO_N, type LoadCase, type Orientation } from '@/lib/deflection-calculator';

const LOAD_CASES: { id: LoadCase; label: string; description: string }[] = [
  { id: 'point-simple', label: 'Einzellast', description: 'Beidseitig aufliegend, Last an frei wählbarer Position' },
  { id: 'udl-simple', label: 'Streckenlast', description: 'Beidseitig aufliegend, Last gleichmäßig verteilt' },
  { id: 'point-cantilever', label: 'Kragarm', description: 'Einseitig eingespannt, Last an frei wählbarer Position' },
];

const SERIES_ORDER: { series: ProfileSeries; label: string }[] = [
  { series: 'A5', label: 'Profil A5 · Nut 5' },
  { series: 'A6', label: 'Profil A6 · Nut 6' },
  { series: 'A8', label: 'Profil A8 · Nut 8' },
  { series: 'A10', label: 'Profil A10 · Nut 10' },
];

type LoadUnit = 'kg' | 'N';

const bigInput = 'h-11 w-28 text-right text-base font-semibold border-2 border-slate-300 focus-visible:border-primary';

export default function DeflectionCalculator() {
  const navigate = useNavigate();

  const [series, setSeries] = useState<ProfileSeries>(DEFLECTION_PROFILES[0].series);
  const [articleNumber, setArticleNumber] = useState(DEFLECTION_PROFILES[0].articleNumber);

  const profilesInSeries = useMemo(() => DEFLECTION_PROFILES.filter((p) => p.series === series), [series]);

  const changeSeries = (nextSeries: ProfileSeries) => {
    setSeries(nextSeries);
    const firstInSeries = DEFLECTION_PROFILES.find((p) => p.series === nextSeries);
    if (firstInSeries) setArticleNumber(firstInSeries.articleNumber);
  };
  const [orientation, setOrientation] = useState<Orientation>('flat');
  const [length, setLength] = useState(1000);
  const [loadValue, setLoadValue] = useState(10);
  const [loadUnit, setLoadUnit] = useState<LoadUnit>('kg');
  const [loadCase, setLoadCase] = useState<LoadCase>('point-simple');
  const [loadPositionMm, setLoadPositionMm] = useState(500);

  const profile = DEFLECTION_PROFILES.find((p) => p.articleNumber === articleNumber)!;
  const section = useMemo(() => toProfileSection(profile), [profile]);
  const isSquare = profile.w === profile.h;
  const loadN = loadUnit === 'kg' ? loadValue * KG_TO_N : loadValue;
  const effectiveOrientation: Orientation = isSquare ? 'flat' : orientation;

  const result = useMemo(
    () => calculateDeflection(profile, length, loadN, loadCase, effectiveOrientation, loadPositionMm),
    [profile, length, loadN, loadCase, effectiveOrientation, loadPositionMm]
  );

  const switchLoadUnit = (unit: LoadUnit) => {
    if (unit === loadUnit) return;
    const nextValue = unit === 'N' ? loadValue * KG_TO_N : loadValue / KG_TO_N;
    setLoadValue(+nextValue.toFixed(2));
    setLoadUnit(unit);
  };

  const changeLoadCase = (lc: LoadCase) => {
    setLoadCase(lc);
    setLoadPositionMm(lc === 'point-cantilever' ? length : Math.round(length / 2));
  };

  const changeLength = (v: number) => {
    setLength(v);
    setLoadPositionMm((prev) => Math.min(prev, v));
  };

  const activeLoadCase = LOAD_CASES.find((lc) => lc.id === loadCase)!;
  const positionRatio = loadCase === 'udl-simple' ? 0.5 : loadPositionMm / length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Durchbiegungsrechner – NOVAMOTIS</title>
        <meta name="description" content="Schnelle Vorprüfung der Durchbiegung von NOVAMOTIS Aluminiumprofilen bei Profillänge und Last." />
        <link rel="canonical" href="https://konfigurator.novamotis.com/deflection" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 md:h-28 flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground" aria-label="Zurück zur Startseite">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logo} alt="NOVAMOTIS Logo" className="h-12 md:h-20 w-auto" />
          <span className="text-slate-300 text-xl font-light hidden md:block">|</span>
          <h1 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase hidden md:block">Durchbiegungsrechner</h1>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          {/* Inputs */}
          <Card className="border-slate-200 print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Profil, Profillänge und Last</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Nut</Label>
                <div className="grid grid-cols-4 gap-2">
                  {SERIES_ORDER.map(({ series: s, label }) => (
                    <button
                      key={s}
                      onClick={() => changeSeries(s)}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold border-2 transition-all ${
                        series === s ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-foreground hover:border-primary/40'
                      }`}
                      title={label}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Querschnitt</Label>
                <Select value={articleNumber} onValueChange={setArticleNumber}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profilesInSeries.map((p) => (
                      <SelectItem key={p.articleNumber} value={p.articleNumber}>{p.label} · {p.articleNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">
                  Ausrichtung {isSquare && <span className="normal-case font-normal">(bei quadratischem Profil ohne Wirkung)</span>}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isSquare}
                    onClick={() => setOrientation('flat')}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      effectiveOrientation === 'flat' ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-foreground hover:border-primary/40'
                    }`}
                  >
                    Flach ({profile.w}×{profile.h}, {profile.h} mm hoch)
                  </button>
                  <button
                    disabled={isSquare}
                    onClick={() => setOrientation('upright')}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      effectiveOrientation === 'upright' ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-slate-200 text-foreground hover:border-primary/40'
                    }`}
                  >
                    Hochkant ({profile.h}×{profile.w}, {profile.w} mm hoch)
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Lastfall</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {LOAD_CASES.map((lc) => (
                    <button
                      key={lc.id}
                      onClick={() => changeLoadCase(lc.id)}
                      className={`text-left rounded-lg p-3 border-2 transition-all ${
                        loadCase === lc.id
                          ? 'bg-primary/10 border-primary shadow-sm'
                          : 'bg-white border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                      }`}
                    >
                      <LoadCaseDiagram loadCase={lc.id} className={`h-10 w-full mb-1 ${loadCase === lc.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className={`text-xs font-semibold ${loadCase === lc.id ? 'text-primary' : 'text-foreground'}`}>{lc.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{lc.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-foreground">Profillänge</Label>
                  <div className="flex items-center gap-1.5">
                    <NumericInput min={100} max={6000} step={10} value={length} onCommit={changeLength} className={bigInput} />
                    <span className="text-muted-foreground text-sm">mm</span>
                  </div>
                </div>
              </div>

              {loadCase !== 'udl-simple' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Lastposition {loadCase === 'point-cantilever' ? '(ab Einspannung)' : '(ab linkem Auflager)'}
                    </Label>
                    <div className="flex items-center gap-1">
                      <NumericInput min={0} max={length} step={10} value={loadPositionMm} onCommit={setLoadPositionMm} className="h-8 w-24 text-right text-sm" />
                      <span className="text-muted-foreground text-xs">mm</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-foreground">Last</Label>
                  <div className="flex items-center gap-1.5">
                    <NumericInput
                      min={0.1}
                      max={loadUnit === 'kg' ? 5000 : 50000}
                      step={0.5}
                      value={loadValue}
                      onCommit={setLoadValue}
                      className={bigInput}
                    />
                    <div className="flex rounded-md border border-slate-300 overflow-hidden">
                      {(['kg', 'N'] as const).map((unit) => (
                        <button
                          key={unit}
                          onClick={() => switchLoadUnit(unit)}
                          className={`px-2.5 h-11 text-sm font-medium transition-colors ${
                            loadUnit === unit ? 'bg-primary text-primary-foreground' : 'bg-white text-muted-foreground hover:bg-slate-50'
                          }`}
                        >
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result */}
          <div className="space-y-6">
            <div className="hidden print:block text-sm space-y-1 mb-2">
              <p className="font-semibold text-base">Durchbiegungsrechner – Vorprüfung</p>
              <p>Profil: {profile.label} ({profile.articleNumber}), Ausrichtung: {effectiveOrientation === 'upright' ? 'Hochkant' : 'Flach'}</p>
              <p>Lastfall: {activeLoadCase.label}, Profillänge: {length} mm{loadCase !== 'udl-simple' ? `, Lastposition: ${loadPositionMm} mm` : ''}</p>
              <p>Last: {loadValue} {loadUnit} ({loadN.toFixed(1)} N)</p>
            </div>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{activeLoadCase.label} – Durchbiegung</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <LoadCaseDiagram
                  loadCase={loadCase}
                  positionRatio={positionRatio}
                  deflected
                  deflectionLabel={`${result.deflectionMm.toFixed(2)} mm`}
                  className="w-full h-24 text-primary"
                />
                <p className="text-[11px] text-muted-foreground text-center mt-1">{activeLoadCase.description} (Biegelinie nicht maßstäblich)</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="pt-6 flex flex-col items-center">
                <RealisticProfileCrossSection
                  section={section}
                  size={140}
                  rotate90={effectiveOrientation === 'upright'}
                />
                <span className="text-xs text-muted-foreground mt-2 font-mono">{profile.label}</span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-primary/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Durchbiegung</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 print:hidden">
                  <Printer className="h-3.5 w-3.5" />
                  Drucken
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary leading-tight">
                  {result.deflectionMm.toFixed(2)} <span className="text-xl font-medium">mm</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                  Alle Angaben sind unverbindliche Richtwerte ohne Gewähr.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
