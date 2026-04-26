import { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShoppingCart, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.svg';
import { ProfileWorkbench2D } from '@/components/configurator/ProfileWorkbench2D';
import { ProfileOnboarding } from '@/components/configurator/ProfileOnboarding';
import { ProfileInquiryDialog } from '@/components/configurator/ProfileInquiryDialog';
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

const ProfileViewer3D = lazy(() =>
  import('@/components/configurator/ProfileViewer3D').then((m) => ({ default: m.ProfileViewer3D }))
);

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
  const [show3D, setShow3D] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileOnboarding />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-28 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logo} alt="NOVAMOTIS" className="h-20 w-auto" />
            <span className="text-slate-300 text-xl font-light hidden sm:block">|</span>
            <span className="text-sm font-semibold tracking-wide text-muted-foreground uppercase hidden sm:block">Profilzuschnitte</span>
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
        {/* Sidebar */}
        <aside className="w-80 shrink-0 border-r border-slate-200 bg-white overflow-y-auto flex flex-col">
          <div className="p-4 space-y-4 flex-1">

            {/* Profile selection */}
            <div>
              <SectionDivider label="Profil" />
              <div className="mt-3 space-y-4">

                {/* Step 1: Size */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Größe</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PROFILE_SIZES.map((sz) => {
                      const isActive = section.sizeKey === sz.key;
                      return (
                        <button
                          key={sz.key}
                          onClick={() => {
                            const next =
                              PROFILE_SECTIONS.find((s) => s.sizeKey === sz.key && s.variant === section.variant) ??
                              PROFILE_SECTIONS.find((s) => s.sizeKey === sz.key && s.variant === 'leicht') ??
                              PROFILE_SECTIONS.find((s) => s.sizeKey === sz.key)!;
                            update({ sectionId: next.id, holes: [] });
                          }}
                          className={`rounded-md px-2 py-2 text-xs font-mono border transition-colors ${
                            isActive
                              ? 'bg-primary/10 border-primary text-primary font-semibold'
                              : 'bg-white border-slate-200 text-foreground hover:border-primary/50 hover:bg-slate-50'
                          }`}
                        >
                          {sz.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Variant */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Variante</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['eco', 'leicht', 'schwer'] as const).map((v) => {
                      const available = PROFILE_SECTIONS.find((s) => s.sizeKey === section.sizeKey && s.variant === v);
                      const isActive = section.variant === v;
                      return (
                        <button
                          key={v}
                          disabled={!available}
                          onClick={() => available && update({ sectionId: available.id, holes: [] })}
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
                </div>

                {/* Price indicator */}
                <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
                  <span>{section.label}</span>
                  <span className="font-medium">{fmt.format(section.pricePerMeter)}/m</span>
                </div>

              </div>
            </div>

            {/* Length */}
            <div>
              <SectionDivider label="Länge" />
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Länge (mm)</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={50}
                      max={3000}
                      step={5}
                      value={config.length}
                      onChange={(e) => {
                        const v = Math.max(50, Math.min(3000, Number(e.target.value)));
                        update({ length: v, holes: config.holes.map((h) => ({ ...h, zPosition: Math.min(h.zPosition, v - 5) })) });
                      }}
                      className="h-8 w-24 text-right text-sm"
                    />
                    <span className="text-muted-foreground text-xs">mm</span>
                  </div>
                </div>
                <Slider
                  min={50}
                  max={3000}
                  step={5}
                  value={[config.length]}
                  onValueChange={([v]) => update({ length: v, holes: config.holes.map((h) => ({ ...h, zPosition: Math.min(h.zPosition, v - 5) })) })}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50 mm</span><span>3000 mm</span>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <SectionDivider label="Menge" />
              <div className="mt-3 flex items-center gap-3">
                <Label className="text-xs text-muted-foreground shrink-0">Stückzahl</Label>
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={config.quantity}
                  onChange={(e) => update({ quantity: Math.max(1, Number(e.target.value)) })}
                  className="h-8 w-24 text-right"
                />
              </div>
            </div>

            {/* Miter cuts */}
            <div>
              <SectionDivider label="Schrägschnitte" />
              <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                Negative Werte schneiden in die andere Richtung.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                {(['Anfang', 'Ende'] as const).map((end) => {
                  const key = end === 'Anfang' ? 'angleStart' : 'angleEnd';
                  const val = config[key];
                  return (
                    <div key={end} className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{end}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={-45}
                          max={45}
                          step={1}
                          value={val}
                          onChange={(e) => update({ [key]: Math.max(-45, Math.min(45, Number(e.target.value))) })}
                          className="h-8 w-16 text-right text-sm"
                        />
                        <span className="text-muted-foreground text-xs">°</span>
                      </div>
                      <Slider
                        min={-45}
                        max={45}
                        step={1}
                        value={[val]}
                        onValueChange={([v]) => update({ [key]: v })}
                      />
                      {val !== 0 && (
                        <span className="text-[10px] text-amber-600 font-medium">+{fmt.format(PRICE_MITER_CUT)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* End treatments with Kernzug-Auswahl */}
            <div>
              <SectionDivider label="Stirnseitenbearbeitung" />
              <div className="mt-3 space-y-3">
                {(['endStart', 'endEnd'] as const).map((endKey) => {
                  const label = endKey === 'endStart' ? 'Anfang' : 'Ende';
                  const val = config[endKey];
                  const scope = val.scope ?? 'all';
                  return (
                    <div key={endKey} className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                      <div className="flex flex-col gap-1.5 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                          <Checkbox
                            checked={val.thread}
                            onCheckedChange={(v) => update({ [endKey]: { ...val, thread: !!v, scope: val.scope ?? 'all' } })}
                          />
                          Gewinde M8
                          {val.thread && <span className="text-amber-600 text-[10px] font-medium">+{fmt.format(PRICE_HOLE)}</span>}
                        </label>
                        {val.thread && (
                          <div className="pl-6">
                            <Label className="text-[10px] text-muted-foreground mb-1 block">Kernzug</Label>
                            <select
                              value={scope}
                              onChange={(e) => update({ [endKey]: { ...val, scope: e.target.value as typeof scope } })}
                              className="h-7 w-full rounded border border-slate-200 bg-white px-2 text-xs text-foreground"
                            >
                              <option value="all">Alle Kernzüge</option>
                              <option value="center">Nur Zentrumsbohrung</option>
                              <option value="A">Nut A (oben)</option>
                              <option value="B">Nut B (rechts)</option>
                              <option value="C">Nut C (unten)</option>
                              <option value="D">Nut D (links)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bohrungen & Verbinder Status (Bearbeitung erfolgt direkt in der 2D-Werkbank) */}
            <div>
              <SectionDivider label="Bearbeitung" />
              <div className="mt-3 rounded-md bg-primary/5 border border-primary/20 px-3 py-2.5 text-xs text-foreground space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  Drag &amp; Drop in der 2D-Werkbank
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Klicke direkt auf das Profil rechts, um Bohrungen oder Verbinder zu setzen. Ziehe sie zum Verschieben, klicke zum Bearbeiten.
                </p>
                <div className="flex items-center justify-between pt-1.5 border-t border-primary/10 text-[11px]">
                  <span className="text-muted-foreground">Bohrungen</span>
                  <span className="font-mono font-semibold text-foreground">{config.holes.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Verbinder</span>
                  <span className="font-mono font-semibold text-foreground">{config.connectors.length}</span>
                </div>
                {(config.holes.length > 0 || config.connectors.length > 0) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update({ holes: [], connectors: [] })}
                    className="w-full h-7 text-[11px] text-muted-foreground hover:text-red-600 mt-1"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Alle entfernen
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Reset */}
          <div className="p-4 border-t border-slate-200">
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
        </aside>

        {/* Main stage: 2D Workbench (primary) + 3D Viewer (collapsible) */}
        <main className="flex-1 relative flex flex-col bg-slate-100 overflow-hidden">
          <div className="flex-1 p-3 min-h-0">
            <ProfileWorkbench2D
              section={section}
              length={config.length}
              angleStart={config.angleStart}
              angleEnd={config.angleEnd}
              holes={config.holes}
              connectors={config.connectors}
              onUpdateHoles={setHoles}
              onUpdateConnectors={setConnectors}
            />
          </div>

          {/* Collapsible 3D preview */}
          <div className={`border-t border-slate-200 bg-white transition-all duration-300 ${show3D ? 'h-[280px]' : 'h-9'} shrink-0 flex flex-col`}>
            <button
              onClick={() => setShow3D((v) => !v)}
              className="flex items-center justify-between px-4 h-9 text-xs font-medium text-muted-foreground hover:text-foreground border-b border-slate-100"
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider">3D-Vorschau</span>
                <span className="text-[10px] text-muted-foreground/60">{section.label} · {config.length} mm</span>
              </span>
              {show3D ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
            {show3D && (
              <div className="flex-1 min-h-0">
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                      3D-Ansicht wird geladen…
                    </div>
                  }
                >
                  <ProfileViewer3D
                    section={section}
                    length={config.length}
                    angleStart={config.angleStart}
                    angleEnd={config.angleEnd}
                    holes={config.holes}
                    connectors={config.connectors}
                  />
                </Suspense>
              </div>
            )}
          </div>


          {/* Price bar */}
          <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-6">
            <div className="grid grid-cols-4 gap-6 text-xs">
              <div>
                <div className="text-muted-foreground">Material</div>
                <div className="text-foreground font-medium">{fmt.format(price.material)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Schrägschnitte</div>
                <div className="text-foreground font-medium">{fmt.format(price.miterCuts)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Bohrungen / Gewinde</div>
                <div className="text-foreground font-medium">{fmt.format(price.holes)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Verbinder</div>
                <div className="text-foreground font-medium">{fmt.format(price.connectors)}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Gesamtpreis (netto)</div>
                <div className="text-2xl font-bold text-primary">{fmt.format(price.total)}</div>
                <div className="text-[10px] text-muted-foreground">Richtpreis · {config.quantity} Stk.</div>
              </div>
              <Button onClick={addToCart} size="lg" className="gap-2 px-6 font-semibold">
                <ShoppingCart className="h-4 w-4" />
                In den Warenkorb
              </Button>
            </div>
          </div>
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
                  Unverbindlicher Richtpreis. Finaler Preis nach technischer Prüfung durch NOVAMOTIS.
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
