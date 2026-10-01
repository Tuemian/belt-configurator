import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DoorPreview } from '@/components/configurator/DoorPreview';
import { DOOR_EXTRA_OPTIONS, DoorConfig, calculateDoorPrice } from '@/lib/door-configurator-types';

interface Props {
  config: DoorConfig;
  onReset: () => void;
}

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function buildSummaryText(config: DoorConfig, price: ReturnType<typeof calculateDoorPrice>): string {
  const lines: string[] = [];
  lines.push(`Tortyp: ${config.doorType === 'folie' ? 'Folien-Schnelllauftor' : 'Aluminium-Lamellentor'}`);
  lines.push(`Lichte Breite: ${config.widthMm} mm`);
  lines.push(`Lichte Höhe: ${config.heightMm} mm`);
  lines.push(`Stückzahl: ${config.quantity}`);
  lines.push(`Befestigung: ${config.mounting === 'boden' ? 'Bodenbefestigung' : 'Wandbefestigung'}`);
  lines.push(`Motorverkleidung: ${config.motorCover ? 'Ja' : 'Nein'}`);
  lines.push(`Antriebsausrichtung: ${config.driveOrientation === 'oben' ? 'nach oben' : 'nach unten'}`);
  lines.push(`Anschlussspannung: ${config.voltage}`);
  lines.push(
    `Kabellänge: ${config.cableLength === 'standard' ? '3.000mm (Standard)' : `Sonderlänge +${config.cableExtraMeters}m`}`,
  );
  lines.push(`Lichtschranke: ${config.lightBarrier === 'lichtgitter' ? 'Lichtgitter (Standard)' : 'Lichtschranke + Sicherheitskontaktleiste'}`);
  lines.push(
    `Schienenausführung: ${
      config.railFinish === 'standard' ? 'Natur eloxiert/RAL 7035 (Standard)' : `Pulverbeschichtet RAL ${config.ralCode}`
    }`,
  );
  if (config.doorType === 'folie') {
    lines.push(`Torbehang-Material: ${config.curtainMaterial}`);
  }
  lines.push(`Torbehangfarbe: ${config.curtainColor}`);
  lines.push(
    `Sichtfenster: ${config.windowVariant}${
      config.windowVariant === 'sondergroesse' ? ` (${config.customWindowWidthMm}×${config.customWindowHeightMm}mm)` : ''
    }`,
  );
  if (config.windowVariant !== 'ohne') {
    lines.push(`Ausführung Sichtfenster: ${config.windowFinish === 'klar' ? 'klar' : 'Blendschutz (Schweißarbeiten)'}`);
  }
  if (config.doorType === 'alu') {
    lines.push(`Lichtlamellen: ${config.lightLamellas ? `Ja (Fensterhöhe ${config.lamellaWindowHeightMm}mm)` : 'Nein'}`);
  }
  if (config.extraOptionIds.length > 0) {
    const defs = DOOR_EXTRA_OPTIONS[config.doorType];
    const labels = config.extraOptionIds.map((id) => defs.find((d) => d.id === id)?.label ?? id);
    lines.push(`Zusatzoptionen: ${labels.join(', ')}`);
  }
  lines.push('');
  if (price.status === 'complete') {
    lines.push('--- Richtpreis ---');
    for (const item of price.breakdown ?? []) {
      lines.push(`${item.label}: ${fmt.format(item.amount)}`);
    }
    lines.push(`Zwischensumme je Tor (vor Aufschlag): ${fmt.format(price.aufschlagsbasisProTor ?? 0)}`);
    lines.push(`Standardaufschlag: ×${price.aufschlagFaktor}`);
    lines.push(`Torpreis je Stück: ${fmt.format(price.torpreisProTor ?? 0)}`);
    lines.push(`Verpackung gesamt: ${fmt.format(price.verpackungGesamt ?? 0)}`);
    lines.push(`Transport gesamt: ${fmt.format(price.transportGesamt ?? 0)}`);
    lines.push(`GESAMT (netto, Richtpreis): ${fmt.format(price.gesamt ?? 0)}`);
  } else {
    lines.push('Preis auf Anfrage (Maße außerhalb der Kalkulationsgrundlage).');
  }
  return lines.join('\n');
}

export const StepDoorSummary = ({ config, onReset }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
  const [sending, setSending] = useState(false);

  const price = calculateDoorPrice(config);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy) return;
    setSending(true);
    try {
      const summary = buildSummaryText(config, price);
      const { data, error } = await supabase.functions.invoke('send-inquiry', {
        body: {
          type: 'door',
          lang: 'de',
          form: {
            name: form.name,
            company: form.company,
            email: form.email,
            phone: form.phone,
            message: form.message,
          },
          configuration: config,
          summary,
        },
      });

      if (error) throw new Error(`Inquiry request failed: ${error.message}`);
      if (data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }

      setForm({ name: '', company: '', email: '', phone: '', message: '', privacy: false });
      toast({ title: 'Anfrage gesendet', description: 'Wir melden uns innerhalb von zwei Werktagen bei Ihnen.' });
    } catch (err) {
      console.error('Door inquiry submit error:', err);
      toast({ title: 'Fehler beim Senden', description: 'Bitte versuchen Sie es später erneut.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="w-full min-h-[280px] overflow-hidden rounded-xl border aspect-[16/10] bg-white">
          <DoorPreview config={config} />
        </div>

        <Card className="border">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold text-primary">Richtpreis</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-3">
            {price.status === 'complete' ? (
              <>
                <div className="space-y-1">
                  {(price.breakdown ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{fmt.format(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Torpreis je Stück (inkl. Aufschlag ×{price.aufschlagFaktor})</span>
                  <span className="font-medium">{fmt.format(price.torpreisProTor ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Verpackung gesamt</span>
                  <span className="font-medium">{fmt.format(price.verpackungGesamt ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transport gesamt</span>
                  <span className="font-medium">{fmt.format(price.transportGesamt ?? 0)}</span>
                </div>
                <div className="text-2xl font-bold text-foreground pt-1">{fmt.format(price.gesamt ?? 0)}</div>
                <p className="text-xs text-muted-foreground">
                  Unverbindlicher Richtpreis (netto, zzgl. MwSt.) · Vor-Ort-Montage nicht enthalten, auf Anfrage.
                </p>
              </>
            ) : (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="font-semibold">Preis auf Anfrage</div>
                <div className="text-xs mt-1">
                  Für diese Konfiguration liegt kein vollständiger Richtpreis vor. Bitte senden Sie eine Anfrage –
                  wir melden uns mit einem konkreten Angebot zurück.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={onReset} variant="ghost" className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          Neue Konfiguration
        </Button>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg">Anfrage senden</CardTitle>
          <p className="text-sm text-muted-foreground">
            Wir melden uns innerhalb von maximal zwei Werktagen mit einem konkreten Angebot bei Ihnen.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Name *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Firma</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">E-Mail *</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Nachricht</Label>
              <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={form.privacy}
                onCheckedChange={(v) => setForm({ ...form, privacy: v === true })}
                className="mt-0.5"
              />
              <span>
                Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert und verarbeitet
                werden. *
              </span>
            </label>
            <Button type="submit" disabled={sending || !form.privacy} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Wird gesendet…' : 'Anfrage senden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
