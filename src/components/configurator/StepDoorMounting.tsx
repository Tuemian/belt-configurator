import type { ReactNode } from 'react';
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
  options: Array<{ value: T; label: string; hint?: string; icon?: ReactNode }>;
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
            {opt.icon && <div className="mb-1.5 text-muted-foreground">{opt.icon}</div>}
            <span className="font-medium text-sm">{opt.label}</span>
            {opt.hint && <span className="text-xs text-muted-foreground">{opt.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Kleine schematische Icons, damit auf einen Blick klar ist, was gemeint ist — kein Foto
// verfügbar, daher an die Darstellung in DoorPreview angelehnt.
function MountingBodenIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9">
      <rect x={14} y={4} width={4} height={22} fill="currentColor" />
      <rect x={30} y={4} width={4} height={22} fill="currentColor" />
      <rect x={9} y={25} width={14} height={5} rx={1} fill="currentColor" />
      <rect x={25} y={25} width={14} height={5} rx={1} fill="currentColor" />
      <line x1={2} y1={30} x2={46} y2={30} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}
function MountingWandIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9">
      <rect x={14} y={4} width={4} height={22} fill="currentColor" />
      <rect x={30} y={4} width={4} height={22} fill="currentColor" />
      <rect x={6} y={9} width={9} height={5} rx={1} fill="currentColor" />
      <rect x={33} y={9} width={9} height={5} rx={1} fill="currentColor" />
      <line x1={2} y1={2} x2={2} y2={30} stroke="currentColor" strokeWidth={2} />
      <line x1={46} y1={2} x2={46} y2={30} stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}
function DriveUntenIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9">
      <rect x={4} y={4} width={40} height={7} rx={3} fill="currentColor" />
      <rect x={30} y={12} width={12} height={9} rx={2} fill="currentColor" opacity={0.7} />
    </svg>
  );
}
function DriveObenIcon() {
  return (
    <svg viewBox="0 0 48 32" className="h-6 w-9">
      <rect x={30} y={2} width={12} height={9} rx={2} fill="currentColor" opacity={0.7} />
      <rect x={4} y={12} width={40} height={7} rx={3} fill="currentColor" />
    </svg>
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
            { value: 'boden', label: 'Bodenbefestigung', hint: 'Mit Fußplatte & Nivellierplatte', icon: <MountingBodenIcon /> },
            { value: 'wand', label: 'Wandbefestigung', icon: <MountingWandIcon /> },
          ]}
        />

        <ChoiceRow
          label="Antriebsausrichtung"
          value={config.driveOrientation}
          onSelect={(driveOrientation) => onChange({ driveOrientation })}
          options={[
            { value: 'unten', label: 'Nach unten', hint: 'Standard — Motor unter der Welle', icon: <DriveUntenIcon /> },
            { value: 'oben', label: 'Nach oben', hint: 'Motor über der Welle, Aufpreis 180°-Schwenkbarkeit', icon: <DriveObenIcon /> },
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
