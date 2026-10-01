import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { NumericInput } from '@/components/configurator/NumericInput';
import { DoorPreview } from '@/components/configurator/DoorPreview';
import { DoorConfig, lamellenAnzahlAusHoehe } from '@/lib/door-configurator-types';

interface Props {
  config: DoorConfig;
  onChange: (updates: Partial<DoorConfig>) => void;
}

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onSelect,
  cols = 2,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onSelect: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <div className={cn('grid gap-2', cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
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

const FOLIE_COLORS = ['Blau (ähnlich RAL 5010)', 'Grau (ähnlich RAL 7035)', 'Orange (ähnlich RAL 2004)'];
const ALU_COLORS = ['Weißaluminium (ähnlich RAL9006)', 'Anthrazitgrau (ähnlich RAL7016)', 'Verkehrsweiß (ähnlich RAL9016)'];

export const StepDoorMaterial = ({ config, onChange }: Props) => {
  const isAlu = config.doorType === 'alu';
  const colorOptions = isAlu ? ALU_COLORS : FOLIE_COLORS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <ChoiceRow
          label="Ausführung Führungs-/Abschlussschiene"
          value={config.railFinish}
          onSelect={(railFinish) => onChange({ railFinish })}
          options={[
            { value: 'standard', label: 'Natur eloxiert / RAL 7035', hint: 'Standard' },
            { value: 'ral', label: 'Pulverbeschichtet in RAL nach Wahl' },
          ]}
        />

        {!isAlu && (
          <ChoiceRow
            label="Torbehang-Material"
            value={config.curtainMaterial}
            onSelect={(curtainMaterial) => onChange({ curtainMaterial })}
            cols={1}
            options={[
              { value: 'standard', label: 'Polyester-Monofil, PVC beschichtet', hint: 'Standard' },
              { value: 'monofil', label: 'Monofilament-Material 2mm', hint: '+60€/m²' },
              { value: 'pvc_leicht', label: 'PVC-Behang ca. 1mm/900gr. mit Fenster', hint: 'günstiger, −25€/m²' },
              { value: 'pvc_transparent', label: 'PVC transparent 2mm mit Gewebestreifen', hint: '+15€/m²' },
            ]}
          />
        )}

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Torbehangfarbe</Label>
          <div className="grid grid-cols-1 gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ curtainColor: color })}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all font-medium text-sm text-left',
                  config.curtainColor === color ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                {color}
                {!isAlu && color.toLowerCase().includes('orange') && (
                  <span className="block text-xs text-muted-foreground font-normal">Zusatzaufschlag +20€/m²</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <ChoiceRow
          label="Sichtfenster"
          value={config.windowVariant}
          onSelect={(windowVariant) => onChange({ windowVariant })}
          cols={1}
          options={[
            { value: 'standard', label: '1 Stk. 500×700mm', hint: 'Standard' },
            { value: 'zusatz', label: '2 Stk. 500×700mm', hint: '+45€' },
            { value: 'sondergroesse', label: 'Sondergröße' },
            { value: 'ohne', label: 'Ohne Sichtfenster' },
          ]}
        />
        {config.windowVariant === 'sondergroesse' && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Fläche:</Label>
            <NumericInput
              min={0.1}
              max={10}
              step={0.05}
              value={config.customWindowM2}
              onCommit={(v) => onChange({ customWindowM2: Math.max(0.1, v) })}
              className="h-9 w-24"
            />
            <span className="text-sm text-muted-foreground">m² (+110€/m²)</span>
          </div>
        )}
        {config.windowVariant !== 'ohne' && (
          <ChoiceRow
            label="Ausführung Sichtfenster"
            value={config.windowFinish}
            onSelect={(windowFinish) => onChange({ windowFinish })}
            options={[
              { value: 'klar', label: 'Klares Sichtfenster', hint: 'Standard' },
              { value: 'schweisserschutz', label: 'Roter Blendschutz', hint: 'Schweißarbeiten, +85€' },
            ]}
          />
        )}

        {isAlu && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Lichtlamellen</Label>
              <div className="grid grid-cols-2 gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => onChange({ lightLamellas: val })}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all font-medium text-sm',
                      config.lightLamellas === val ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                    )}
                  >
                    {val ? 'Ja' : 'Nein'}
                  </button>
                ))}
              </div>
            </div>
            {config.lightLamellas && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Höhe des lichtdurchlässigen Fensters</Label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    min={77}
                    max={2500}
                    step={77}
                    value={config.lamellaWindowHeightMm}
                    onCommit={(v) => onChange({ lamellaWindowHeightMm: Math.max(77, v) })}
                    className="h-9 w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    mm · ca. {lamellenAnzahlAusHoehe(config.lamellaWindowHeightMm)} Sichtlamellen
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Position und genaue Ausführung werden im Auftragsfall final geklärt.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10] bg-white">
        <DoorPreview config={config} />
      </div>
    </div>
  );
};
