import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { NumericInput } from '@/components/configurator/NumericInput';
import { DoorPreview } from '@/components/configurator/DoorPreview';
import { DoorConfig, DoorType, lookupGrundpreis } from '@/lib/door-configurator-types';

interface Props {
  config: DoorConfig;
  onChange: (updates: Partial<DoorConfig>) => void;
}

const DOOR_TYPE_OPTIONS: Array<{ value: DoorType; label: string; desc: string }> = [
  { value: 'folie', label: 'Folien-Schnelllauftor', desc: 'Polyester-Monofil-Behang, PVC beschichtet – hoher Durchsatz, viel Lichteinfall.' },
  { value: 'alu', label: 'Aluminium-Lamellentor', desc: 'Hohlkammerlamellen aus Aluminium – robust, hohe Isolationswerte.' },
];

export const StepDoorTypeAndSize = ({ config, onChange }: Props) => {
  const grundpreis = lookupGrundpreis(config.doorType, config.widthMm, config.heightMm);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">Tortyp</Label>
          <div className="grid grid-cols-1 gap-3">
            {DOOR_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ doorType: opt.value })}
                className={cn(
                  'flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left',
                  config.doorType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Lichte Breite</Label>
            <div className="flex items-center gap-2">
              <NumericInput
                min={500}
                max={5000}
                step={10}
                value={config.widthMm}
                onCommit={(v) => onChange({ widthMm: v })}
                className="h-10"
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Lichte Höhe</Label>
            <div className="flex items-center gap-2">
              <NumericInput
                min={500}
                max={5000}
                step={10}
                value={config.heightMm}
                onCommit={(v) => onChange({ heightMm: v })}
                className="h-10"
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Stückzahl</Label>
          <NumericInput
            min={1}
            max={100}
            step={1}
            value={config.quantity}
            onCommit={(v) => onChange({ quantity: Math.max(1, Math.round(v)) })}
            className="h-10 w-32"
          />
        </div>

        {grundpreis === null ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div className="font-semibold">Preis auf Anfrage</div>
            <div className="text-xs mt-1">
              Für diese Maße liegt kein vollständiger Richtpreis vor (unter 1000mm, über 5000mm oder — bei sehr
              großen Aluminium-Lamellentoren — außerhalb des Kalkulationsbereichs). Bitte Anfrage senden, wir
              melden uns mit einem konkreten Angebot.
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Grundpreis für diese Maße: {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(grundpreis)}{' '}
            (vor Aufpreisen, Optionen und Aufschlag)
          </p>
        )}
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10] bg-white">
        <DoorPreview config={config} />
      </div>
    </div>
  );
};
