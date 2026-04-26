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
  endStart: { thread: false, coreHole: false },
  endEnd: { thread: false, coreHole: false },
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

  // Inquiry
  const sendInquiry = () => {
    const subject = encodeURIComponent('Anfrage Aluminium-Systemprofile – NOVAMOTIS Konfigurator');
    const lines = cart.map((item, idx) => {
      const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
      return [
        `Position ${idx + 1}: ${s.label}`,
        `  Länge: ${item.config.length} mm`,
        `  Menge: ${item.config.quantity} Stk.`,
        item.config.angleStart !== 0 ? `  Schrägschnitt Start: ${item.config.angleStart}°` : '',
        item.config.angleEnd !== 0   ? `  Schrägschnitt Ende:  ${item.config.angleEnd}°` : '',
        item.config.endStart.thread  ? '  Gewinde Start: M8' : '',
        item.config.endEnd.thread    ? '  Gewinde Ende: M8' : '',
        item.config.holes.length > 0
          ? `  Bohrungen: ${item.config.holes.map((h) => `${h.label} @ ${h.zPosition}mm`).join(', ')}`
          : '',
        `  Positionspreis: ${fmt.format(item.price.total)}`,
      ].filter(Boolean).join('\n');
    });
    const body = encodeURIComponent(
      `Sehr geehrtes NOVAMOTIS-Team,\n\nhiermit übermittle ich folgende Konfiguration:\n\n${lines.join('\n\n')}\n\nGesamtpreis (Richtwert): ${fmt.format(cartTotal)}\n\nBitte um Rückmeldung mit konkretem Angebot.\n\nMit freundlichen Grüßen`
    );
    window.location.href = `mailto:info@novamotis.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
              <div className="mt-3 grid grid-cols-2 gap-4">
                {(['Start', 'Ende'] as const).map((end) => {
                  const key = end === 'Start' ? 'angleStart' : 'angleEnd';
                  const val = config[key];
                  return (
                    <div key={end} className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{end}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={45}
                          step={1}
                          value={val}
                          onChange={(e) => update({ [key]: Math.max(0, Math.min(45, Number(e.target.value))) })}
                          className="h-8 w-16 text-right text-sm"
                        />
                        <span className="text-muted-foreground text-xs">°</span>
                      </div>
                      <Slider
                        min={0}
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

            {/* End treatments */}
            <div>
              <SectionDivider label="Stirnseitenbearbeitung" />
              <div className="mt-3 space-y-2">
                {(['endStart', 'endEnd'] as const).map((endKey) => {
                  const label = endKey === 'endStart' ? 'Start' : 'Ende';
                  const val = config[endKey];
                  return (
                    <div key={endKey} className="space-y-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                      <div className="flex gap-4 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                          <Checkbox
                            checked={val.thread}
                            onCheckedChange={(v) => update({ [endKey]: { ...val, thread: !!v } })}
                          />
                          Gewinde M8
                          {val.thread && <span className="text-amber-600 text-[10px] font-medium">+{fmt.format(PRICE_HOLE)}</span>}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                          <Checkbox
                            checked={val.coreHole}
                            onCheckedChange={(v) => update({ [endKey]: { ...val, coreHole: !!v } })}
                          />
                          Kernloch
                          {val.coreHole && <span className="text-amber-600 text-[10px] font-medium">+{fmt.format(PRICE_HOLE)}</span>}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Holes */}
            <div>
              <SectionDivider label="Bohrungen" />
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Typ</Label>
                    <Select value={newHoleType} onValueChange={(v) => setNewHoleType(v as ProfileHole['type'])}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOLE_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Position (mm)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={config.length - 5}
                      step={5}
                      value={newHoleZ}
                      onChange={(e) => setNewHoleZ(Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addHole}
                  className="w-full gap-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Bohrung hinzufügen
                  <span className="text-amber-600 font-medium ml-auto">+{fmt.format(PRICE_HOLE)}</span>
                </Button>

                {config.holes.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {config.holes.map((hole) => (
                      <div key={hole.id} className="flex items-center justify-between bg-slate-50 rounded border border-slate-100 px-2 py-1 text-xs">
                        <span className="text-foreground truncate">{hole.label}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">@ {hole.zPosition} mm</span>
                        <button onClick={() => removeHole(hole.id)} className="ml-2 text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connectors */}
            <div>
              <SectionDivider label="Verbinder" />
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Typ</Label>
                    <Select value={newConnectorType} onValueChange={(v) => setNewConnectorType(v as ConnectorType)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONNECTOR_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Seite</Label>
                    <Select value={newConnectorFace} onValueChange={(v) => { setNewConnectorFace(v as ProfileConnector['face']); setNewConnectorModule(0); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top" className="text-xs">Oben</SelectItem>
                        <SelectItem value="bottom" className="text-xs">Unten</SelectItem>
                        <SelectItem value="left" className="text-xs">Links</SelectItem>
                        <SelectItem value="right" className="text-xs">Rechts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {numModulesOnFace > 1 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Nut-Position</Label>
                      <Select value={String(newConnectorModule)} onValueChange={(v) => setNewConnectorModule(Number(v))}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: numModulesOnFace }, (_, i) => (
                            <SelectItem key={i} value={String(i)} className="text-xs">Nut {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className={numModulesOnFace > 1 ? '' : 'col-span-2'}>
                    <Label className="text-xs text-muted-foreground mb-1 block">Position (mm)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={config.length - 5}
                      step={5}
                      value={newConnectorZ}
                      onChange={(e) => setNewConnectorZ(Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={addConnector} className="w-full gap-2 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Verbinder einsetzen
                  <span className="text-amber-600 font-medium ml-auto">+{fmt.format(PRICE_CONNECTOR)}</span>
                </Button>
                {config.connectors.length > 0 && (
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {config.connectors.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between bg-slate-50 rounded border border-slate-100 px-2 py-1 text-xs">
                        <span className="text-foreground truncate">{conn.label}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">{conn.face} @ {conn.zPosition} mm</span>
                        <button onClick={() => removeConnector(conn.id)} className="ml-2 text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
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

        {/* 3D Viewer */}
        <main className="flex-1 relative flex flex-col bg-slate-50">
          <div className="flex-1">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
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

          {/* Profile info overlay */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg px-3 py-2 text-xs space-y-0.5">
              <div className="font-semibold text-foreground">{section.label}</div>
              <div className="text-muted-foreground">{config.length} mm Länge</div>
              {config.angleStart !== 0 && <div className="text-amber-600">Schrägschnitt Start {config.angleStart}°</div>}
              {config.angleEnd !== 0   && <div className="text-amber-600">Schrägschnitt Ende {config.angleEnd}°</div>}
              {config.holes.length > 0 && <div className="text-muted-foreground">{config.holes.length} Bohrung{config.holes.length !== 1 ? 'en' : ''}</div>}
            </div>
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
                      {item.config.angleStart !== 0 && <div>Schrägschnitt Start {item.config.angleStart}°</div>}
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
                <Button onClick={sendInquiry} className="w-full gap-2 font-semibold" size="lg">
                  <ShoppingCart className="h-4 w-4" />
                  Anfrage per E-Mail senden
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
