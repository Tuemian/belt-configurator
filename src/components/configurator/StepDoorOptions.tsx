import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DOOR_EXTRA_OPTIONS, DoorConfig } from '@/lib/door-configurator-types';

interface Props {
  config: DoorConfig;
  onChange: (updates: Partial<DoorConfig>) => void;
}

const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export const StepDoorOptions = ({ config, onChange }: Props) => {
  const options = DOOR_EXTRA_OPTIONS[config.doorType];

  const toggle = (id: string, checked: boolean) => {
    const set = new Set(config.extraOptionIds);
    if (checked) set.add(id);
    else set.delete(id);
    onChange({ extraOptionIds: Array.from(set) });
  };

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-muted-foreground">
        Zusätzliche Sonderausstattung, unabhängig von den bisherigen Auswahlfeldern. Alle Angaben als Richtpreis.
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const checked = config.extraOptionIds.includes(opt.id);
          return (
            <label
              key={opt.id}
              className="flex items-center justify-between gap-4 rounded-lg border p-3 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={checked} onCheckedChange={(v) => toggle(opt.id, v === true)} />
                <Label className="text-sm font-medium cursor-pointer">{opt.label}</Label>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">
                +{fmt.format(opt.price)} {opt.unit === 'kiste' ? '/ Kiste' : '/ Stk.'}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
