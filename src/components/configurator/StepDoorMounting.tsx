import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { NumericInput } from '@/components/configurator/NumericInput';
import { DoorPreview } from '@/components/configurator/DoorPreview';
import { DoorConfig } from '@/lib/door-configurator-types';

interface Props {
  config: DoorConfig;
  onChange: (updates: Partial<DoorConfig>) => void;
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              'flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left',
              value === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            )}
          >
            <span className="font-medium text-sm">{opt.label}</span>
            {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export const StepDoorMounting = ({ config, onChange }: Props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <ChoiceRow
          label="Befestigungsausführung"
          value={config.mounting}
          onSelect={(mounting) => onChange({ mounting })}
          options={[
            { value: 'boden', label: 'Bodenbefestigung', hint: 'Mit Fußplatte & Nivellierplatte' },
            { value: 'wand', label: 'Wandbefestigung' },
          ]}
        />

        <ChoiceRow
          label="Antriebsausrichtung"
          value={config.driveOrientation}
          onSelect={(driveOrientation) => onChange({ driveOrientation })}
          options={[
            { value: 'unten', label: 'Nach unten', hint: 'Standard' },
            { value: 'oben', label: 'Nach oben', hint: 'Aufpreis für 180°-Schwenkbarkeit' },
          ]}
        />

        <ChoiceRow
          label="Anschlussspannung"
          value={config.voltage}
          onSelect={(voltage) => onChange({ voltage })}
          options={[
            { value: '230V', label: '230V', hint: 'Standard' },
            { value: '400V', label: '400V', hint: 'Etme/Feig-Steuerung (3-phasig)' },
          ]}
        />

        <ChoiceRow
          label="Kabellänge Motor zu Steuerung"
          value={config.cableLength}
          onSelect={(cableLength) => onChange({ cableLength })}
          options={[
            { value: 'standard', label: '3.000mm', hint: 'Standard' },
            { value: 'sonderlaenge', label: 'Sonderlänge' },
          ]}
        />
        {config.cableLength === 'sonderlaenge' && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Zusätzliche Länge:</Label>
            <NumericInput
              min={0}
              max={50}
              step={1}
              value={config.cableExtraMeters}
              onCommit={(v) => onChange({ cableExtraMeters: Math.max(0, v) })}
              className="h-9 w-20"
            />
            <span className="text-sm text-muted-foreground">m</span>
          </div>
        )}

        <ChoiceRow
          label="Lichtschrankenausführung"
          value={config.lightBarrier}
          onSelect={(lightBarrier) => onChange({ lightBarrier })}
          options={[
            { value: 'lichtgitter', label: 'Lichtgitter', hint: 'Standard' },
            { value: 'lichtschranke', label: 'Lichtschranke + Sicherheitskontaktleiste' },
          ]}
        />

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Motorverkleidung</Label>
          <div className="grid grid-cols-2 gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => onChange({ motorCover: val })}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all font-medium text-sm',
                  config.motorCover === val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                {val ? 'Ja (Standard)' : 'Nein'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10] bg-white">
        <DoorPreview config={config} />
      </div>
    </div>
  );
};
