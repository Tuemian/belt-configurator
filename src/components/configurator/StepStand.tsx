import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ConveyorPreview } from '@/components/configurator/ConveyorPreview';

interface Props {
  config: ConveyorConfig;
  onChange: (updates: Partial<ConveyorConfig>) => void;
  lang: Language;
}

export const StepStand = ({ config, onChange, lang }: Props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <Label className="text-sm font-semibold text-foreground">{t('withStand', lang)}</Label>
          <Switch
            checked={config.withStand}
            onCheckedChange={(v) => onChange({ withStand: v })}
          />
        </div>

        {config.withStand && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                {t('standHeight', lang)}
                <span className="text-muted-foreground font-normal ml-2 text-xs">({t('standHeightRange', lang)})</span>
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[config.standHeight]}
                  onValueChange={([v]) => onChange({ standHeight: v })}
                  min={400} max={2000} step={10}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 min-w-[100px]">
                  <Input
                    type="number" value={config.standHeight}
                    onChange={(e) => onChange({ standHeight: Math.min(2000, Math.max(400, Number(e.target.value))) })}
                    className="w-20 h-9 text-right"
                  />
                  <span className="text-sm text-muted-foreground">mm</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">{t('floorElement', lang)}</Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'feet' as const, label: t('adjustableFeet', lang) },
                  { value: 'castors' as const, label: t('castorWheels', lang) },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({
                      floorElement: opt.value,
                      floorBolts: opt.value === 'feet' ? config.floorBolts : false,
                    })}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all font-medium text-sm text-left',
                      config.floorElement === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {config.floorElement === 'feet' && (
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <Label className="text-sm font-semibold text-foreground">{t('floorBolts', lang)}</Label>
                  <Switch
                    checked={config.floorBolts}
                    onCheckedChange={(v) => onChange({ floorBolts: v })}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10]">
        <ConveyorPreview config={config} lang={lang} />
      </div>
    </div>
  );
};
