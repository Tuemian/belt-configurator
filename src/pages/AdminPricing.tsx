import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Upload, Plus, Trash2, RefreshCw, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { buildPricingWorkbook, parsePricingWorkbook, calculatePrice, invalidatePricingCache } from '@/lib/pricing';
import type { ConveyorConfig } from '@/lib/configurator-types';
import { validateFormula } from '@/lib/formula-engine';

type Tool = 'belt' | 'profile';

type Component = {
  id: string;
  tool: string;
  key: string;
  label_de: string;
  label_en: string;
  label_it: string;
  unit: string;
  price_eur: number | null;
  active: boolean;
  article_number: string | null;
  price_source: string;
  erp_synced_at: string | null;
};

type Rule = {
  id: string;
  component_id: string;
  tool: string;
  condition: Record<string, unknown> | null;
  quantity_formula: string;
  priority: number;
};

const UNITS = ['per_unit', 'per_meter', 'per_m2', 'per_mm_width', 'per_kg'];

const DEFAULT_TEST_CONFIG: ConveyorConfig = {
  frameWidth: 400,
  beltLength: 2000,
  sideGuideHeight: 0,
  inclineAngle: 0,
  beltType: 'standard',
  speed: 0.5,
  loadCapacity: 50,
  driveType: 'direct',
  motorPosition: 'left',
  motorAngle: 0,
  centerDriveOffset: 0,
  withStand: true,
  standHeight: 800,
  floorElement: 'feet',
  heightAdjust: false,
  floorBolts: false,
};

export default function AdminPricing() {
  const [tool, setTool] = useState<Tool>('belt');
  const [components, setComponents] = useState<Component[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null); // component id or 'all'
  const [testConfig, setTestConfig] = useState<ConveyorConfig>(DEFAULT_TEST_CONFIG);
  const [previewResult, setPreviewResult] = useState<Awaited<ReturnType<typeof calculatePrice>> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const load = async () => {
    setLoading(true);
    const [c, r] = await Promise.all([
      supabase.from('pricing_components').select('*').eq('tool', tool).order('key'),
      supabase.from('pricing_rules').select('*').eq('tool', tool).order('priority'),
    ]);
    if (c.error || r.error) {
      toast({ title: 'Fehler beim Laden', description: c.error?.message ?? r.error?.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    setComponents((c.data as Component[]) ?? []);
    setRules((r.data as Rule[]) ?? []);
    setLoading(false);
    invalidatePricingCache();
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tool]);

  const ruleByComponent = useMemo(() => {
    const m = new Map<string, Rule>();
    for (const r of rules) m.set(r.component_id, r);
    return m;
  }, [rules]);

  const updatePreview = async () => {
    if (tool !== 'belt') { setPreviewResult(null); return; }
    const result = await calculatePrice(testConfig);
    setPreviewResult(result);
  };
  useEffect(() => { void updatePreview(); /* eslint-disable-next-line */ }, [components, rules, testConfig, tool]);

  const saveComponent = async (comp: Component) => {
    const { id, ...rest } = comp;
    const { error } = await supabase.from('pricing_components').update(rest).eq('id', id);
    if (error) {
      toast({ title: 'Speichern fehlgeschlagen', description: error.message, variant: 'destructive' });
      return;
    }
    invalidatePricingCache();
    toast({ title: 'Gespeichert' });
  };

  const saveRule = async (rule: Rule) => {
    const check = validateFormula(rule.quantity_formula);
    if (!check.ok) {
      toast({ title: 'Formel ungültig', description: check.error, variant: 'destructive' });
      return;
    }
    const { id, ...rest } = rule;
    const { error } = await supabase.from('pricing_rules').update(rest as never).eq('id', id);
    if (error) {
      toast({ title: 'Speichern fehlgeschlagen', description: error.message, variant: 'destructive' });
      return;
    }
    invalidatePricingCache();
    toast({ title: 'Regel gespeichert' });
  };

  const addComponent = async () => {
    const key = window.prompt('Eindeutiger Key (z.B. screw_m6):')?.trim();
    if (!key) return;
    const { data, error } = await supabase
      .from('pricing_components')
      .insert({ tool, key, label_de: key, label_en: key, label_it: key, unit: 'per_unit' })
      .select('*')
      .single();
    if (error || !data) {
      toast({ title: 'Fehler', description: error?.message, variant: 'destructive' });
      return;
    }
    await supabase.from('pricing_rules').insert({
      component_id: (data as Component).id,
      tool,
      condition: {},
      quantity_formula: '1',
      priority: 100,
    });
    void load();
  };

  const deleteComponent = async (comp: Component) => {
    if (!window.confirm(`Bauteil "${comp.key}" wirklich löschen?`)) return;
    const { error } = await supabase.from('pricing_components').delete().eq('id', comp.id);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    void load();
  };

  const exportExcel = () => {
    const rows = components.map((c) => ({
      key: c.key,
      label_de: c.label_de, label_en: c.label_en, label_it: c.label_it,
      unit: c.unit,
      price_eur: c.price_eur,
      article_number: c.article_number,
      active: c.active,
    }));
    const ruleRows = rules.map((r) => ({
      component_key: components.find((c) => c.id === r.component_id)?.key ?? '',
      condition: r.condition,
      quantity_formula: r.quantity_formula,
      priority: r.priority,
    })).filter((r) => r.component_key);
    const buf = buildPricingWorkbook(rows, ruleRows);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preise-${tool}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const { components: importComps, rules: importRules } = parsePricingWorkbook(buf);
      if (!window.confirm(`Import: ${importComps.length} Bauteile, ${importRules.length} Regeln. Vorhandene Einträge mit gleichem Key werden aktualisiert. Fortfahren?`)) return;

      // Bauteile upserten (per tool+key)
      const compPayload = importComps.map((c) => ({
        tool,
        key: c.key,
        label_de: c.label_de || c.key,
        label_en: c.label_en || c.key,
        label_it: c.label_it || c.key,
        unit: c.unit || 'per_unit',
        price_eur: c.price_eur === '' ? null : Number(c.price_eur),
        article_number: c.article_number || null,
        active: c.active,
      }));
      const upsert = await supabase.from('pricing_components').upsert(compPayload, { onConflict: 'tool,key' }).select('id, key');
      if (upsert.error) throw new Error(upsert.error.message);

      // ID-Mapping
      const idByKey = new Map<string, string>();
      for (const row of (upsert.data ?? []) as Array<{ id: string; key: string }>) idByKey.set(row.key, row.id);

      // Regeln: alle alten Regeln für betroffene Komponenten entfernen, neue anlegen
      const componentIds = Array.from(idByKey.values());
      if (componentIds.length > 0) {
        await supabase.from('pricing_rules').delete().in('component_id', componentIds);
      }
      const rulePayload = importRules
        .map((r) => {
          const cid = idByKey.get(r.component_key);
          if (!cid) return null;
          let cond: Record<string, unknown> = {};
          try { cond = JSON.parse(r.condition || '{}'); } catch { cond = {}; }
          const v = validateFormula(r.quantity_formula);
          if (!v.ok) throw new Error(`Formel-Fehler bei ${r.component_key}: ${v.error}`);
          return { component_id: cid, tool, condition: cond, quantity_formula: r.quantity_formula, priority: r.priority };
        })
        .filter((x): x is NonNullable<typeof x> => !!x);
      if (rulePayload.length > 0) {
        const ins = await supabase.from('pricing_rules').insert(rulePayload as never);
        if (ins.error) throw new Error(ins.error.message);
      }
      toast({ title: 'Import erfolgreich' });
      void load();
    } catch (e) {
      toast({ title: 'Import fehlgeschlagen', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  const syncFromErp = async (componentId?: string) => {
    setSyncing(componentId ?? 'all');
    try {
      const targets = componentId ? components.filter((c) => c.id === componentId) : components.filter((c) => c.article_number);
      const articleNumbers = targets.map((c) => c.article_number).filter((x): x is string => !!x);
      if (articleNumbers.length === 0) {
        toast({ title: 'Keine Artikelnummern hinterlegt' });
        return;
      }
      const { data, error } = await supabase.functions.invoke('sync-erp-prices', { body: { article_numbers: articleNumbers } });
      if (error) throw new Error(error.message);
      const results = (data?.results ?? []) as Array<{ article_number: string; price_eur: number | null }>;
      let updated = 0;
      for (const r of results) {
        if (r.price_eur === null || r.price_eur === undefined) continue;
        const target = targets.find((c) => c.article_number === r.article_number);
        if (!target) continue;
        const { error: upErr } = await supabase
          .from('pricing_components')
          .update({ price_eur: r.price_eur, price_source: 'erp', erp_synced_at: new Date().toISOString() })
          .eq('id', target.id);
        if (!upErr) updated++;
      }
      toast({ title: `${updated} Preise aus ERP aktualisiert` });
      void load();
    } catch (e) {
      toast({ title: 'ERP-Sync fehlgeschlagen', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
            <h1 className="text-xl font-semibold">Preisverwaltung</h1>
            {!isAdmin && <Badge variant="destructive">Kein Admin</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => syncFromErp()} disabled={syncing !== null}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing === 'all' ? 'animate-spin' : ''}`} />
              Alle ERP-Preise aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-4 h-4 mr-2" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Import</Button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) void importExcel(f);
              e.target.value = '';
            }} />
            <Link to="/admin/users"><Button variant="ghost" size="sm">Nutzer</Button></Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Tabs value={tool} onValueChange={(v) => setTool(v as Tool)}>
          <TabsList>
            <TabsTrigger value="belt">Förderband</TabsTrigger>
            <TabsTrigger value="profile">Profilzuschnitte</TabsTrigger>
          </TabsList>

          {(['belt', 'profile'] as Tool[]).map((t) => (
            <TabsContent key={t} value={t} className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>Bauteile</CardTitle>
                  <Button size="sm" onClick={addComponent}><Plus className="w-4 h-4 mr-2" />Neues Bauteil</Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Lädt …</p>
                  ) : components.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Noch keine Bauteile angelegt.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground uppercase">
                          <tr>
                            <th className="text-left py-2 pr-2">Key</th>
                            <th className="text-left py-2 pr-2">Bezeichnung DE</th>
                            <th className="text-left py-2 pr-2">EN</th>
                            <th className="text-left py-2 pr-2">IT</th>
                            <th className="text-left py-2 pr-2">Einheit</th>
                            <th className="text-left py-2 pr-2">Preis €</th>
                            <th className="text-left py-2 pr-2">ArtikelNr.</th>
                            <th className="text-left py-2 pr-2">Quelle</th>
                            <th className="text-left py-2 pr-2">Aktiv</th>
                            <th className="text-left py-2 pr-2">Bedingung (JSON)</th>
                            <th className="text-left py-2 pr-2">Mengenformel</th>
                            <th className="text-left py-2 pr-2">Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {components.map((c) => {
                            const r = ruleByComponent.get(c.id);
                            return (
                              <ComponentRow
                                key={c.id}
                                comp={c}
                                rule={r}
                                syncing={syncing === c.id}
                                onSaveComp={saveComponent}
                                onSaveRule={saveRule}
                                onDelete={deleteComponent}
                                onSync={() => syncFromErp(c.id)}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {t === 'belt' && (
                <Card>
                  <CardHeader><CardTitle>Live-Vorschau</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Field label="Länge (mm)"><Input type="number" value={testConfig.beltLength} onChange={(e) => setTestConfig({ ...testConfig, beltLength: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Breite (mm)"><Input type="number" value={testConfig.frameWidth} onChange={(e) => setTestConfig({ ...testConfig, frameWidth: Number(e.target.value) || 0 })} /></Field>
                      <Field label="Gurttyp">
                        <Select value={testConfig.beltType} onValueChange={(v) => setTestConfig({ ...testConfig, beltType: v as ConveyorConfig['beltType'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">standard</SelectItem>
                            <SelectItem value="grip">grip</SelectItem>
                            <SelectItem value="heavy-grip">heavy-grip</SelectItem>
                            <SelectItem value="food-safe">food-safe</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Antrieb">
                        <Select value={testConfig.driveType} onValueChange={(v) => setTestConfig({ ...testConfig, driveType: v as ConveyorConfig['driveType'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="direct">direct</SelectItem>
                            <SelectItem value="indirect">indirect</SelectItem>
                            <SelectItem value="center">center</SelectItem>
                            <SelectItem value="drum">drum</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Untergestell"><Switch checked={testConfig.withStand} onCheckedChange={(v) => setTestConfig({ ...testConfig, withStand: v })} /></Field>
                      <Field label="Fußelement">
                        <Select value={testConfig.floorElement ?? 'feet'} onValueChange={(v) => setTestConfig({ ...testConfig, floorElement: v as ConveyorConfig['floorElement'] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feet">feet</SelectItem>
                            <SelectItem value="castors">castors</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Höhenverstellung"><Switch checked={testConfig.heightAdjust} onCheckedChange={(v) => setTestConfig({ ...testConfig, heightAdjust: v })} /></Field>
                      <Field label="Bodenverdübelung"><Switch checked={testConfig.floorBolts} onCheckedChange={(v) => setTestConfig({ ...testConfig, floorBolts: v })} /></Field>
                      <Field label="Seitenführung (mm)"><Input type="number" value={testConfig.sideGuideHeight} onChange={(e) => setTestConfig({ ...testConfig, sideGuideHeight: Number(e.target.value) || 0 })} /></Field>
                    </div>
                    {previewResult && (
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span>Status: {previewResult.status === 'complete' ? 'Komplett' : previewResult.status === 'partial' ? 'Preise fehlen' : 'Nicht verfügbar'}</span>
                          {previewResult.total !== undefined && <span>Total: € {previewResult.total.toFixed(2)}</span>}
                        </div>
                        <table className="w-full text-sm">
                          <tbody>
                            {previewResult.breakdown.map((b) => (
                              <tr key={b.key} className="border-t">
                                <td className="py-1">{b.labelDe}</td>
                                <td className="py-1 text-right text-muted-foreground">{b.quantity.toFixed(3)} {b.unit}</td>
                                <td className="py-1 text-right">{b.available ? `€ ${b.total?.toFixed(2)}` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ComponentRow({
  comp, rule, syncing, onSaveComp, onSaveRule, onDelete, onSync,
}: {
  comp: Component;
  rule: Rule | undefined;
  syncing: boolean;
  onSaveComp: (c: Component) => void;
  onSaveRule: (r: Rule) => void;
  onDelete: (c: Component) => void;
  onSync: () => void;
}) {
  const [c, setC] = useState(comp);
  const [r, setR] = useState<Rule | undefined>(rule);
  const [conditionText, setConditionText] = useState(JSON.stringify(rule?.condition ?? {}));
  useEffect(() => { setC(comp); }, [comp]);
  useEffect(() => { setR(rule); setConditionText(JSON.stringify(rule?.condition ?? {})); }, [rule]);

  const dirty = JSON.stringify(c) !== JSON.stringify(comp) ||
    (r && rule && (r.quantity_formula !== rule.quantity_formula || JSON.stringify(r.condition) !== JSON.stringify(rule.condition) || r.priority !== rule.priority));

  return (
    <tr className="border-t align-top">
      <td className="py-2 pr-2 font-mono text-xs">{c.key}</td>
      <td className="py-2 pr-2"><Input value={c.label_de} onChange={(e) => setC({ ...c, label_de: e.target.value })} className="h-8 min-w-[140px]" /></td>
      <td className="py-2 pr-2"><Input value={c.label_en} onChange={(e) => setC({ ...c, label_en: e.target.value })} className="h-8 min-w-[140px]" /></td>
      <td className="py-2 pr-2"><Input value={c.label_it} onChange={(e) => setC({ ...c, label_it: e.target.value })} className="h-8 min-w-[140px]" /></td>
      <td className="py-2 pr-2">
        <Select value={c.unit} onValueChange={(v) => setC({ ...c, unit: v })}>
          <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="py-2 pr-2"><Input type="number" step="0.01" value={c.price_eur ?? ''} onChange={(e) => setC({ ...c, price_eur: e.target.value === '' ? null : Number(e.target.value) })} className="h-8 w-24" /></td>
      <td className="py-2 pr-2"><Input value={c.article_number ?? ''} onChange={(e) => setC({ ...c, article_number: e.target.value || null })} className="h-8 w-28" /></td>
      <td className="py-2 pr-2">
        {c.price_source === 'erp' ? (
          <Badge variant="secondary" className="text-xs">ERP {c.erp_synced_at ? new Date(c.erp_synced_at).toLocaleDateString('de-DE') : ''}</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">manuell</Badge>
        )}
      </td>
      <td className="py-2 pr-2"><Switch checked={c.active} onCheckedChange={(v) => setC({ ...c, active: v })} /></td>
      <td className="py-2 pr-2">
        {r && (
          <Textarea value={conditionText} onChange={(e) => {
            setConditionText(e.target.value);
            try { setR({ ...r, condition: JSON.parse(e.target.value || '{}') }); } catch { /* invalid yet */ }
          }} className="font-mono text-xs h-8 min-h-8 w-48" />
        )}
      </td>
      <td className="py-2 pr-2">
        {r && <Input value={r.quantity_formula} onChange={(e) => setR({ ...r, quantity_formula: e.target.value })} className="h-8 font-mono text-xs w-44" />}
      </td>
      <td className="py-2 pr-2">
        <div className="flex gap-1">
          {dirty && (
            <Button size="icon" variant="default" className="h-8 w-8" onClick={() => {
              onSaveComp(c);
              if (r) onSaveRule(r);
            }}><Save className="w-4 h-4" /></Button>
          )}
          {c.article_number && (
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onSync} disabled={syncing} title="Aus ERP holen">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(c)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </td>
    </tr>
  );
}
