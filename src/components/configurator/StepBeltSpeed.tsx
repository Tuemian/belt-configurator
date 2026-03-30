import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConveyorPreview } from '@/components/configurator/ConveyorPreview';

interface Props {
  config: ConveyorConfig;
  onChange: (updates: Partial<ConveyorConfig>) => void;
  lang: Language;
}

export const StepBeltSpeed = ({ config, onChange, lang }: Props) => {
  const beltOptions = [
    { value: 'standard' as const, label: t('beltStandard', lang) },
    { value: 'grip' as const, label: t('beltGrip', lang) },
    { value: 'heavy-grip' as const, label: t('beltHeavyGrip', lang) },
    { value: 'food-safe' as const, label: t('beltFoodSafe', lang) },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">{t('beltType', lang)}</Label>
          <Select value={config.beltType} onValueChange={(v) => onChange({ beltType: v as ConveyorConfig['beltType'] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {beltOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('speed', lang)}
            <span className="text-muted-foreground font-normal ml-2 text-xs">({t('speedRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.speed]}
              onValueChange={([v]) => onChange({ speed: v })}
              min={3} max={65} step={1}
              className="flex-1"
            />
            <div className="flex items-center gap-1 min-w-[120px]">
              <Input
                type="number" value={config.speed}
                onChange={(e) => onChange({ speed: Math.min(65, Math.max(3, Number(e.target.value))) })}
                className="w-20 h-9 text-right"
              />
              <span className="text-sm text-muted-foreground">m/min</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('loadCapacity', lang)}
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.loadCapacity]}
              onValueChange={([v]) => onChange({ loadCapacity: v })}
              min={1} max={500} step={1}
              className="flex-1"
            />
            <div className="flex items-center gap-1 min-w-[100px]">
              <Input
                type="number" value={config.loadCapacity}
                onChange={(e) => onChange({ loadCapacity: Math.min(500, Math.max(1, Number(e.target.value))) })}
                className="w-20 h-9 text-right"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border min-h-[380px]">
        <ConveyorPreview config={config} />
      </div>
    </div>
  );
};
