import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Plus, Trash2, ShoppingCart, RotateCcw, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.svg';
import { ProfileWorkbench2D } from '@/components/configurator/ProfileWorkbench2D';
import { ProfileViewer3D } from '@/components/configurator/ProfileViewer3D';
import { ProfileOnboarding } from '@/components/configurator/ProfileOnboarding';
import { ProfileInquiryDialog } from '@/components/configurator/ProfileInquiryDialog';
import { NumericInput } from '@/components/configurator/NumericInput';
import { ProfileCrossSection2D } from '@/components/configurator/ProfileCrossSection2D';
import {
  PROFILE_SECTIONS,
  PROFILE_SIZES,
  calculateProfilePrice,
  PRICE_MITER_CUT,
  PRICE_HOLE,
  type ProfileConfig,
  type ProfileHole,
  type ProfileConnector,
} from '@/lib/profile-configurator-types';


// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: ProfileConfig = {
  sectionId: '40x40-leicht',
  length: 500,
  angleStart: 0,
  angleEnd: 0,
  endStart: { thread: false },
  endEnd: { thread: false },
  holes: [],
  connectors: [],
  quantity: 1,
};


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart item type
// ---------------------------------------------------------------------------

interface CartItem {
  id: string;
  config: ProfileConfig;
  price: ReturnType<typeof calculateProfilePrice>;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProfileConfigurator() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [config, setConfig] = useState<ProfileConfig>(DEFAULT_CONFIG);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  // A10 hat kein Referenzbild vom Alvaris-Blatt und bleibt daher ein Hinweis statt der
  // Werkbank (siehe unten). A5 hat eigene Katalogeinträge (section.nut==='A5'); A6
  // nutzt exakt dieselben Einträge wie A8s 30er-Untervariante (modulePitch 30, kein
  // eigenes nut-Tag) — gleiche Nutbreite bei Alvaris, siehe Kommentar bei getAlvarisImage.
  const [nut, setNut] = useState<'A5' | 'A6' | 'A8' | 'A10'>('A8');

  const sizesForNut = (n: typeof nut) =>
    n === 'A5' ? PROFILE_SIZES.filter((s) => s.nut === 'A5')
    : n === 'A6' ? PROFILE_SIZES.filter((s) => !s.nut && ['30x30', '30x60', '60x60'].includes(s.key))
    : PROFILE_SIZES.filter((s) => !s.nut);
  const sectionsForNut = (n: typeof nut) =>
    n === 'A5' ? PROFILE_SECTIONS.filter((s) => s.nut === 'A5')
    : n === 'A6' ? PROFILE_SECTIONS.filter((s) => !s.nut && s.modulePitch === 30)
    : PROFILE_SECTIONS.filter((s) => !s.nut);

  const changeNut = (n: typeof nut) => {
    setNut(n);
    if (n === 'A10') return;
    const options = sectionsForNut(n);
    const first = options.find((s) => s.variant === 'leicht') ?? options[0];
    if (first) update({ sectionId: first.id });
  };

  const section = PROFILE_SECTIONS.find((s) => s.id === config.sectionId)!;
  const price = calculateProfilePrice(config);

  const update = useCallback((partial: Partial<ProfileConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const setHoles = useCallback((holes: ProfileHole[]) => {
    setConfig((prev) => ({ ...prev, holes }));
  }, []);
  const setConnectors = useCallback((connectors: ProfileConnector[]) => {
    setConfig((prev) => ({ ...prev, connectors }));
  }, []);

  // Cart
  const addToCart = () => {
    const item: CartItem = {
      id: crypto.randomUUID(),
      config: { ...config, holes: [...config.holes] },
      price: calculateProfilePrice(config),
    };
    setCart((prev) => [...prev, item]);
    setCartOpen(true);
    toast({ title: 'Position hinzugefügt', description: `${section.label} × ${config.quantity} — ${fmt.format(item.price.total)}` });
  };

  const removeCartItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const cartTotal = cart.reduce((sum, i) => sum + i.price.total, 0);

  const [inquiryOpen, setInquiryOpen] = useState(false);
  const openInquiry = () => {
    if (cart.length === 0) {
      toast({ title: 'Warenkorb ist leer', description: 'Bitte fügen Sie zuerst eine Konfiguration hinzu.' });
      return;
    }
    setInquiryOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Sidebar body — wiederverwendet für Desktop-Aside und Mobile-Drawer
  // ---------------------------------------------------------------------------
  const sidebarBody = (
    <div className="flex flex-col h-full">
      <div className="p-5 md:p-6 flex-1 overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={['basis']}
          className="w-full space-y-2"
        >
          {/* 1. Basis-Konfiguration */}
          <AccordionItem value="basis" className="border border-slate-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              1. Basis-Konfiguration
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-5">
              <div className="space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground mb-3 block uppercase tracking-wider">Nut</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['A5', 'A6', 'A8', 'A10'] as const).map((n) => (
                      <button
                        key={n}
                        disabled={n === 'A10'}
                        onClick={() => changeNut(n)}
                        title={n === 'A10' ? 'Bald verfügbar' : undefined}
                        className={`rounded-lg px-2 py-2 text-xs font-semibold border-2 transition-all ${
                          n === 'A10'
                            ? 'bg-white border-slate-200 text-muted-foreground opacity-40 cursor-not-allowed'
                            : nut === n
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white border-slate-200 text-foreground hover:border-primary/40'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {nut === 'A10' ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-foreground mb-1">Nut 10 · in Vorbereitung</div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Für Nut 10 liegt noch kein Referenzquerschnitt vor — für eine Anfrage bitte direkt kontaktieren.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-3 block uppercase tracking-wider">Querschnitt</Label>
                      <Select
                        value={section.sizeKey}
                        onValueChange={(sizeKey) => {
                          const options = sectionsForNut(nut);
                          const next =
                            options.find((s) => s.sizeKey === sizeKey && s.variant === section.variant) ??
                            options.find((s) => s.sizeKey === sizeKey && s.variant === 'leicht') ??
                            options.find((s) => s.sizeKey === sizeKey)!;
                          update({ sectionId: next.id });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sizesForNut(nut).map((sz) => (
                            <SelectItem key={sz.key} value={sz.key}>{sz.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Variante</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['eco', 'leicht', 'schwer'] as const).map((v) => {
                          const available = sectionsForNut(nut).find((s) => s.sizeKey === section.sizeKey && s.variant === v);
                          const isActive = section.variant === v;
                          return (
                            <button
                              key={v}
                              disabled={!available}
                              onClick={() => available && update({ sectionId: available.id })}
                              className={`rounded-md px-2 py-2.5 text-xs font-semibold border transition-colors ${
                                !available
                                  ? 'opacity-30 cursor-not-allowed border-slate-200 text-muted-foreground'
                                  : isActive
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-white border-slate-200 text-foreground hover:border-primary/50 hover:bg-slate-50'
                              }`}
                            >
                              {v === 'eco' ? 'ECO' : v === 'leicht' ? 'Leicht' : 'Schwer'}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
                        <span>{section.label}</span>
                        <span className="font-medium">{fmt.format(section.pricePerMeter)}/m</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Länge</Label>
                        <div className="flex items-center gap-1">
                          <NumericInput
                            min={50}
                            max={6000}
                            step={5}
                            value={config.length}
                            onCommit={(v) => update({
                              length: v,
                              holes: config.holes.map((h) => ({ ...h, zPosition: Math.min(h.zPosition, v - 5) })),
                            })}
                            className="h-8 w-24 text-right text-sm"
                          />
                          <span className="text-muted-foreground text-xs">mm</span>
                        </div>
                      </div>
                      <Slider
                        min={50}
                        max={6000}
                        step={5}
                        value={[config.length]}
                        onValueChange={([v]) => update({ length: v, holes: config.holes.map((h) => ({ ...h, zPosition: Math.min(h.zPosition, v - 5) })) })}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>50 mm</span><span>6000 mm</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stückzahl</Label>
                      <NumericInput
                        min={1}
                        max={9999}
                        value={config.quantity}
                        onCommit={(v) => update({ quantity: v })}
                        className="h-8 w-24 text-right"
                      />
                    </div>
                  </>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Enden-Bearbeitung */}
          <AccordionItem value="enden" className="border border-slate-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              2. Enden-Bearbeitung
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-5">
              <div className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Schrägschnitte (0–45°)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {(['Anfang', 'Ende'] as const).map((end) => {
                      const key = end === 'Anfang' ? 'angleStart' : 'angleEnd';
                      const val = config[key];
                      return (
                        <div key={end} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{end}</span>
                            <div className="flex items-center gap-1">
                              <NumericInput
                                min={0}
                                max={45}
                                step={1}
                                value={val}
                                onCommit={(v) => update({ [key]: Math.max(0, Math.min(45, v)) })}
                                className="h-8 w-14 text-right text-sm"
                              />
                              <span className="text-muted-foreground text-xs">°</span>
                            </div>
                          </div>
                          <Slider
                            min={0}
                            max={45}
                            step={1}
                            value={[val]}
                            onValueChange={([v]) => update({ [key]: v })}
                          />
                          {val > 0 && (
                            <span className="text-[10px] text-amber-600 font-medium">+{fmt.format(PRICE_MITER_CUT)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Ausrichtung des Schrägschnitts</Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                    Welche Nuten diagonal auslaufen, hängt vom Anschluss ab (z. B. an welche Nut ein anderes Profil stößt).
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['AC', 'BD'] as const).map((axis) => {
                      const isActive = (config.angleAxis ?? 'AC') === axis;
                      return (
                        <button
                          key={axis}
                          onClick={() => update({ angleAxis: axis })}
                          className={`rounded-md px-2 py-2 text-xs font-semibold border transition-colors ${
                            isActive
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-white border-slate-200 text-foreground hover:border-primary/50 hover:bg-slate-50'
                          }`}
                        >
                          Nut {axis === 'AC' ? '1 / 3' : '2 / 4'} diagonal
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block uppercase tracking-wider">Stirnseiten-Gewinde</Label>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                    Detail-Auswahl direkt im 2D-Editor (Klick auf Kernzug = M8-Gewinde).
                  </p>
                  <div className="space-y-2">
                    {(['endStart', 'endEnd'] as const).map((endKey) => {
                      const label = endKey === 'endStart' ? 'Anfang' : 'Ende';
                      const val = config[endKey];
                      const scope = val.scope ?? 'all';
                      const scopeText = !val.thread
                        ? 'kein Gewinde'
                        : scope === 'all' ? 'alle Kernzüge'
                        : scope === 'center' ? 'nur Mitte'
                        : 'Auswahl';
                      return (
                        <div key={endKey} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                          <div>
                            <div className="text-[11px] font-medium text-foreground">{label}</div>
                            <div className="text-[10px] text-muted-foreground">{scopeText}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {val.thread && <span className="text-amber-600 text-[10px] font-medium">+{fmt.format(PRICE_HOLE)}</span>}
                            <Checkbox
                              checked={val.thread}
                              onCheckedChange={(v) => update({ [endKey]: { ...val, thread: !!v, scope: val.scope ?? 'all' } })}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Übersicht Bearbeitungen */}
          <AccordionItem value="bearbeitungen" className="border border-slate-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="text-sm font-semibold text-foreground py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                3. Übersicht Bearbeitungen
                {(config.holes.length + config.connectors.length) > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-semibold">
                    {config.holes.length + config.connectors.length}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pb-5">
              <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-3 text-xs text-foreground space-y-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  Drag &amp; Drop in der 2D-Werkbank
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Klicke direkt auf das Profil, um Bohrungen oder Verbinder zu setzen.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/10">
                  <div className="text-center bg-white rounded p-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Bohrungen</div>
                    <div className="font-mono font-bold text-base text-foreground">{config.holes.length}</div>
                  </div>
                  <div className="text-center bg-white rounded p-2">
                    <div className="text-[10px] text-muted-foreground uppercase">Verbinder</div>
                    <div className="font-mono font-bold text-base text-foreground">{config.connectors.length}</div>
                  </div>
                </div>
                {(config.holes.length > 0 || config.connectors.length > 0) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update({ holes: [], connectors: [] })}
                    className="w-full h-8 text-[11px] text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Alle entfernen
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      <div className="p-4 border-t border-slate-200 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfig(DEFAULT_CONFIG)}
          className="w-full gap-2 text-muted-foreground text-xs"
        >
          <RotateCcw className="h-3 w-3" />
          Konfiguration zurücksetzen
        </Button>
      </div>
    </div>
  );

  // VAT 19 % zur Anzeige in der Floating-Card
  const tax = +(price.total * 0.19).toFixed(2);
  const grossTotal = +(price.total + tax).toFixed(2);
  const processingTotal = +(price.miterCuts + price.holes + price.endThreads + price.connectors).toFixed(2);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Profilzuschnitte Konfigurator – NOVAMOTIS</title>
        <meta name="description" content="Profilzuschnitte online konfigurieren: Profilgröße, Länge, Bohrungen und Endenbearbeitung wählen. Preis sofort kalkulieren und Anfrage an NOVAMOTIS senden." />
        <link rel="canonical" href="https://konfigurator.novamotis.com/profile-configurator" />
        <meta property="og:title" content="Profilzuschnitte Konfigurator – NOVAMOTIS" />
        <meta property="og:description" content="Profilzuschnitte online konfigurieren – Größe, Länge, Bohrungen, Endenbearbeitung. Preis berechnen und anfragen." />
        <meta property="og:url" content="https://konfigurator.novamotis.com/profile-configurator" />
      </Helmet>
      <ProfileOnboarding />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 md:h-28 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden shrink-0" aria-label="Menü öffnen">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm p-0 bg-white">
                {sidebarBody}
              </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground hidden sm:inline-flex" aria-label="Zurück zur Startseite">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="NOVAMOTIS Logo" className="h-12 md:h-20 w-auto" />
            <span className="text-slate-300 text-xl font-light hidden md:block">|</span>
            <h1 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase hidden md:block">Profilzuschnitte Konfigurator</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCartOpen((v) => !v)}
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{cart.length}</span>
              {cart.length > 0 && (
                <span className="text-primary font-semibold">{fmt.format(cartTotal)}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — desktop only (mobile uses Sheet from header) */}
        <aside className="hidden lg:flex w-[340px] shrink-0 border-r border-slate-200 bg-slate-50/40 overflow-hidden flex-col">
          {sidebarBody}
        </aside>

        {/* Main stage: 2D Workbench (Bearbeiten) + 3D Viewer (Vorschau) */}
        <main className="flex-1 relative flex flex-col bg-slate-100 overflow-hidden">
          {nut === 'A10' ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <Card className="max-w-sm border-slate-200 shadow-sm">
                <CardContent className="pt-6 text-center space-y-2">
                  <div className="text-sm font-semibold text-foreground">Nut 10 · in Vorbereitung</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Für Nut 10 liegt noch kein Referenzquerschnitt vor — für eine individuelle Anfrage kontaktiere uns bitte direkt.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => changeNut('A8')} className="mt-2">
                    Zurück zu Nut 8
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center justify-between px-3 md:px-5 pt-3 md:pt-5 pb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ansicht</span>
                <div className="inline-flex items-center bg-white rounded-md border border-slate-200 p-0.5 shadow-sm">
                  <button
                    onClick={() => setViewMode('2d')}
                    className={`px-3 py-1 text-xs rounded ${viewMode === '2d' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                  >
                    2D bearbeiten
                  </button>
                  <button
                    onClick={() => setViewMode('3d')}
                    className={`px-3 py-1 text-xs rounded ${viewMode === '3d' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                  >
                    3D-Vorschau
                  </button>
                </div>
              </div>

              <div className="flex-1 px-3 md:px-5 min-h-0 pb-[280px] lg:pb-5">
                {viewMode === '2d' ? (
                  <ProfileWorkbench2D
                    section={section}
                    length={config.length}
                    angleStart={config.angleStart}
                    angleEnd={config.angleEnd}
                    angleAxis={config.angleAxis}
                    holes={config.holes}
                    connectors={config.connectors}
                    endStart={config.endStart}
                    endEnd={config.endEnd}
                    onUpdateHoles={setHoles}
                    onUpdateConnectors={setConnectors}
                    onUpdateEndStart={(e) => update({ endStart: e })}
                    onUpdateEndEnd={(e) => update({ endEnd: e })}
                  />
                ) : (
                  <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <ProfileViewer3D
                      section={section}
                      length={config.length}
                      angleStart={config.angleStart}
                      angleEnd={config.angleEnd}
                      angleAxis={config.angleAxis}
                      holes={config.holes}
                      connectors={config.connectors}
                    />
                  </div>
                )}
              </div>

              {/* Floating Price Card */}
              <div className="absolute z-30 left-3 right-3 bottom-3 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[340px]">
                <Card className="shadow-2xl border-slate-200/80 bg-white/95 backdrop-blur">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center justify-between">
                      <span>Preis-Übersicht</span>
                      <span className="text-[10px] normal-case tracking-normal text-muted-foreground">{config.quantity} Stk.</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Material</span>
                        <span className="font-mono text-foreground">{fmt.format(price.material)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Bearbeitung</span>
                        <span className="font-mono text-foreground">{fmt.format(processingTotal)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>MwSt. (19 %)</span>
                        <span className="font-mono text-foreground">{fmt.format(tax)}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Gesamt (netto)</div>
                        <div className="text-2xl font-bold text-primary leading-tight">{fmt.format(price.total)}</div>
                      </div>
                      <div className="text-[9px] text-muted-foreground text-right leading-tight max-w-[110px]">
                        Richtpreis · zzgl. Versand
                        <br />
                        inkl. MwSt.: {fmt.format(grossTotal)}
                      </div>
                    </div>
                    <Button onClick={addToCart} size="lg" className="w-full gap-2 font-semibold mt-1">
                      <ShoppingCart className="h-4 w-4" />
                      In den Warenkorb
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative z-10 w-[420px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Warenkorb</h2>
                <span className="text-muted-foreground text-sm">({cart.length} Position{cart.length !== 1 ? 'en' : ''})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCartOpen(false)} className="text-muted-foreground text-xs">
                Schließen
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">Keine Positionen</p>
              )}
              {cart.map((item, idx) => {
                const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
                return (
                  <Card key={item.id} className="border-slate-200">
                    <CardHeader className="py-2 px-3 flex flex-row items-start justify-between">
                      <CardTitle className="text-sm text-foreground font-medium">
                        Pos. {idx + 1} – {s.label}
                      </CardTitle>
                      <button onClick={() => removeCartItem(item.id)} className="text-muted-foreground hover:text-red-500 mt-0.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </CardHeader>
                    <CardContent className="py-2 px-3 text-xs space-y-0.5 text-muted-foreground">
                      <div>{item.config.length} mm · {item.config.quantity} Stk.</div>
                      {item.config.angleStart !== 0 && <div>Schrägschnitt Anfang {item.config.angleStart}°</div>}
                      {item.config.angleEnd !== 0   && <div>Schrägschnitt Ende {item.config.angleEnd}°</div>}
                      {item.config.holes.length > 0 && <div>{item.config.holes.length} Bohrung{item.config.holes.length !== 1 ? 'en' : ''}</div>}
                      <div className="text-primary font-semibold pt-1">{fmt.format(item.price.total)}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-200 px-5 py-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gesamtbetrag (netto)</span>
                  <span className="text-xl font-bold text-primary">{fmt.format(cartTotal)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Unverbindlicher Richtpreis · zzgl. Versandkosten &amp; MwSt. Finaler Preis nach technischer Prüfung durch NOVAMOTIS.
                </p>
                <Button onClick={openInquiry} className="w-full gap-2 font-semibold" size="lg">
                  <ShoppingCart className="h-4 w-4" />
                  Anfrage senden
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <ProfileInquiryDialog
        open={inquiryOpen}
        onOpenChange={setInquiryOpen}
        cart={cart}
        onSubmitted={() => { setCart([]); setCartOpen(false); }}
      />
    </div>
  );
}
