import { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ShoppingCart, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.svg';
import {
  PROFILE_SECTIONS,
  PROFILE_SIZES,
  HOLE_TYPES,
  calculateProfilePrice,
  PRICE_MITER_CUT,
  PRICE_HOLE,
  type ProfileConfig,
  type ProfileHole,
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
  quantity: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</span>
      <div className="flex-1 h-px bg-slate-700" />
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
  const [newHoleZ, setNewHoleZ] = useState(250);
  const [newHoleType, setNewHoleType] = useState<ProfileHole['type']>('d55');

  const section = PROFILE_SECTIONS.find((s) => s.id === config.sectionId)!;
  const price = calculateProfilePrice(config);

  const update = useCallback((partial: Partial<ProfileConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  // Holes
  const addHole = () => {
    const typeDef = HOLE_TYPES.find((t) => t.id === newHoleType)!;
    const hole: ProfileHole = {
      id: crypto.randomUUID(),
      zPosition: Math.min(config.length - 5, Math.max(5, newHoleZ)),
      diameter: typeDef.diameter,
      face: 'top',
      type: newHoleType,
      label: typeDef.label,
    };
    update({ holes: [...config.holes, hole] });
  };

  const removeHole = (id: string) => {
    update({ holes: config.holes.filter((h) => h.id !== id) });
  };

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
    <div className="min-h-screen bg-[#0d1520] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700 bg-[#0a1018]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <a href="https://www.novamotis.com/" target="_blank" rel="noreferrer">
              <img src={logo} alt="NOVAMOTIS" className="h-10 w-auto brightness-[5] contrast-50 opacity-80" />
            </a>
            <span className="text-slate-500 text-lg font-light">|</span>
            <span className="text-sm font-semibold tracking-wide text-slate-300 uppercase">Profil-Konfigurator</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCartOpen((v) => !v)}
              className="gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-slate-400"
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
        {/* ---------------------------------------------------------------- */}
        {/* Sidebar                                                          */}
        {/* ---------------------------------------------------------------- */}
        <aside className="w-80 shrink-0 border-r border-slate-700 bg-[#0d1520] overflow-y-auto flex flex-col">
          <div className="p-4 space-y-4 flex-1">

            {/* Profile selection */}
            <div>
              <SectionDivider label="Profil" />
              <div className="mt-3 space-y-4">

                {/* Step 1: Size */}
                <div>
                  <Label className="text-xs text-slate-400 mb-2 block">Größe</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PROFILE_SIZES.map((sz) => {
                      const isActive = section.sizeKey === sz.key;
                      return (
                        <button
                          key={sz.key}
                          onClick={() => {
                            // keep current variant if available for new size, else fallback
                            const next =
                              PROFILE_SECTIONS.find((s) => s.sizeKey === sz.key && s.variant === section.variant) ??
                              PROFILE_SECTIONS.find((s) => s.sizeKey === sz.key && s.variant === 'leicht') ??
                              PROFILE_SECTIONS.find((s) => s.sizeKey === sz.key)!;
                            update({ sectionId: next.id, holes: [] });
                          }}
                          className={`rounded-md px-2 py-2 text-xs font-mono border transition-colors ${
                            isActive
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'
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
                  <Label className="text-xs text-slate-400 mb-2 block">Variante</Label>
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
                              ? 'opacity-25 cursor-not-allowed border-slate-700 text-slate-600'
                              : isActive
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {v === 'eco' ? 'ECO' : v === 'leicht' ? 'Leicht' : 'Schwer'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price indicator */}
                <div className="flex justify-between text-[11px] text-slate-500 px-0.5">
                  <span>{section.label}</span>
                  <span className="text-slate-400 font-medium">{fmt.format(section.pricePerMeter)}/m</span>
                </div>

              </div>
            </div>

            {/* Length */}
            <div>
              <SectionDivider label="Länge" />
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Länge (mm)</Label>
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
                      className="h-8 w-24 text-right bg-slate-800 border-slate-600 text-slate-100 text-sm"
                    />
                    <span className="text-slate-500 text-xs">mm</span>
                  </div>
                </div>
                <Slider
                  min={50}
                  max={3000}
                  step={5}
                  value={[config.length]}
                  onValueChange={([v]) => update({ length: v, holes: config.holes.map((h) => ({ ...h, zPosition: Math.min(h.zPosition, v - 5) })) })}
                  className="[&_[role=slider]]:bg-primary"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>50 mm</span><span>3000 mm</span>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <SectionDivider label="Menge" />
              <div className="mt-3 flex items-center gap-3">
                <Label className="text-xs text-slate-400 shrink-0">Stückzahl</Label>
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={config.quantity}
                  onChange={(e) => update({ quantity: Math.max(1, Number(e.target.value)) })}
                  className="h-8 w-24 text-right bg-slate-800 border-slate-600 text-slate-100"
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
                      <Label className="text-xs text-slate-400">{end}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={45}
                          step={1}
                          value={val}
                          onChange={(e) => update({ [key]: Math.max(0, Math.min(45, Number(e.target.value))) })}
                          className="h-8 w-16 text-right bg-slate-800 border-slate-600 text-slate-100 text-sm"
                        />
                        <span className="text-slate-500 text-xs">°</span>
                      </div>
                      <Slider
                        min={0}
                        max={45}
                        step={1}
                        value={[val]}
                        onValueChange={([v]) => update({ [key]: v })}
                        className="[&_[role=slider]]:bg-primary"
                      />
                      {val !== 0 && (
                        <span className="text-[10px] text-amber-400">+{fmt.format(PRICE_MITER_CUT)}</span>
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
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                      <div className="flex gap-4 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <Checkbox
                            checked={val.thread}
                            onCheckedChange={(v) => update({ [endKey]: { ...val, thread: !!v } })}
                            className="border-slate-600 data-[state=checked]:bg-primary"
                          />
                          Gewinde M8
                          {val.thread && <span className="text-amber-400 text-[10px]">+{fmt.format(PRICE_HOLE)}</span>}
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <Checkbox
                            checked={val.coreHole}
                            onCheckedChange={(v) => update({ [endKey]: { ...val, coreHole: !!v } })}
                            className="border-slate-600 data-[state=checked]:bg-primary"
                          />
                          Kernloch
                          {val.coreHole && <span className="text-amber-400 text-[10px]">+{fmt.format(PRICE_HOLE)}</span>}
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
                    <Label className="text-xs text-slate-400 mb-1 block">Typ</Label>
                    <Select value={newHoleType} onValueChange={(v) => setNewHoleType(v as ProfileHole['type'])}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-slate-100">
                        {HOLE_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs focus:bg-slate-700">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400 mb-1 block">Position (mm)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={config.length - 5}
                      step={5}
                      value={newHoleZ}
                      onChange={(e) => setNewHoleZ(Number(e.target.value))}
                      className="h-8 bg-slate-800 border-slate-600 text-slate-100 text-xs"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addHole}
                  className="w-full gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-primary text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Bohrung hinzufügen
                  <span className="text-amber-400 ml-auto">+{fmt.format(PRICE_HOLE)}</span>
                </Button>

                {config.holes.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {config.holes.map((hole) => (
                      <div key={hole.id} className="flex items-center justify-between bg-slate-800/60 rounded px-2 py-1 text-xs">
                        <span className="text-slate-300 truncate">{hole.label}</span>
                        <span className="text-slate-500 ml-2 shrink-0">@ {hole.zPosition} mm</span>
                        <button onClick={() => removeHole(hole.id)} className="ml-2 text-slate-600 hover:text-red-400">
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
          <div className="p-4 border-t border-slate-700">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfig(DEFAULT_CONFIG)}
              className="w-full gap-2 text-slate-500 hover:text-slate-300 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Konfiguration zurücksetzen
            </Button>
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* 3D Viewer                                                        */}
        {/* ---------------------------------------------------------------- */}
        <main className="flex-1 relative flex flex-col">
          <div className="flex-1">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">
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
              />
            </Suspense>
          </div>

          {/* Profile info overlay */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2 text-xs space-y-0.5">
              <div className="font-semibold text-slate-200">{section.label}</div>
              <div className="text-slate-400">{config.length} mm Länge</div>
              {config.angleStart !== 0 && <div className="text-amber-300">Schrägschnitt Start {config.angleStart}°</div>}
              {config.angleEnd !== 0   && <div className="text-amber-300">Schrägschnitt Ende {config.angleEnd}°</div>}
              {config.holes.length > 0 && <div className="text-slate-400">{config.holes.length} Bohrung{config.holes.length !== 1 ? 'en' : ''}</div>}
            </div>
          </div>

          {/* Price bar */}
          <div className="border-t border-slate-700 bg-[#0a1018]/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-6">
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div>
                <div className="text-slate-500">Material</div>
                <div className="text-slate-200 font-medium">{fmt.format(price.material)}</div>
              </div>
              <div>
                <div className="text-slate-500">Schrägschnitte</div>
                <div className="text-slate-200 font-medium">{fmt.format(price.miterCuts)}</div>
              </div>
              <div>
                <div className="text-slate-500">Bohrungen / Gewinde</div>
                <div className="text-slate-200 font-medium">{fmt.format(price.holes)}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <div className="text-xs text-slate-500">Gesamtpreis (netto)</div>
                <div className="text-2xl font-bold text-primary">{fmt.format(price.total)}</div>
                <div className="text-[10px] text-slate-600">Richtpreis · {config.quantity} Stk.</div>
              </div>
              <Button onClick={addToCart} size="lg" className="gap-2 px-6 font-semibold">
                <ShoppingCart className="h-4 w-4" />
                In den Warenkorb
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Cart drawer                                                         */}
      {/* ------------------------------------------------------------------ */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative z-10 w-[420px] bg-[#0d1520] border-l border-slate-700 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-slate-200">Warenkorb</h2>
                <span className="text-slate-500 text-sm">({cart.length} Position{cart.length !== 1 ? 'en' : ''})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCartOpen(false)} className="text-slate-500 hover:text-white text-xs">
                Schließen
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 && (
                <p className="text-slate-600 text-sm text-center py-8">Keine Positionen</p>
              )}
              {cart.map((item, idx) => {
                const s = PROFILE_SECTIONS.find((p) => p.id === item.config.sectionId)!;
                return (
                  <Card key={item.id} className="bg-slate-800/60 border-slate-700">
                    <CardHeader className="py-2 px-3 flex flex-row items-start justify-between">
                      <CardTitle className="text-sm text-slate-200 font-medium">
                        Pos. {idx + 1} – {s.label}
                      </CardTitle>
                      <button onClick={() => removeCartItem(item.id)} className="text-slate-600 hover:text-red-400 mt-0.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </CardHeader>
                    <CardContent className="py-2 px-3 text-xs space-y-0.5 text-slate-400">
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
              <div className="border-t border-slate-700 px-5 py-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Gesamtbetrag (netto)</span>
                  <span className="text-xl font-bold text-primary">{fmt.format(cartTotal)}</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
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
