import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ConveyorPreview } from '@/components/configurator/ConveyorPreview';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface Props {
  config: ConveyorConfig;
  onChange: (updates: Partial<ConveyorConfig>) => void;
  lang: Language;
}

export const StepDrive = ({ config, onChange, lang }: Props) => {
  const driveOptions = [
    { value: 'direct' as const, label: t('driveDirect', lang), desc: t('driveDirectDesc', lang) },
    { value: 'indirect' as const, label: t('driveIndirect', lang), desc: t('driveIndirectDesc', lang) },
    { value: 'center' as const, label: t('driveCenter', lang), desc: t('driveCenterDesc', lang) },
  ];

  const motorAngles = [0, 90, 180, 270] as const;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">{t('driveType', lang)}</Label>
          <div className="grid grid-cols-1 gap-3">
            {driveOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ driveType: opt.value, centerDriveOffset: opt.value === 'center' ? config.centerDriveOffset : 0 })}
                className={cn(
                  'flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left',
                  config.driveType === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="font-semibold text-sm">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">{t('motorPosition', lang)}</Label>
          <div className="grid grid-cols-2 gap-3">
            {(['left', 'right'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => onChange({ motorPosition: pos })}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all font-medium text-sm',
                  config.motorPosition === pos
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {pos === 'left' ? t('motorLeft', lang) : t('motorRight', lang)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">{t('motorAngle', lang)}</Label>
          <div className="grid grid-cols-4 gap-2">
            {motorAngles.map((angle) => (
              (() => {
                const isDisabled = config.driveType === 'indirect'
                  ? (config.motorPosition === 'left' ? (angle === 90 || angle === 180) : (angle === 180 || angle === 270))
                  : config.driveType === 'center'
                    ? angle === 180
                    : false;
                return (
              <button
                key={angle}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    onChange({ motorAngle: angle });
                  }
                }}
                disabled={isDisabled}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all font-medium text-sm',
                  isDisabled && 'opacity-40 cursor-not-allowed border-border bg-muted/20 text-muted-foreground hover:border-border',
                  config.motorAngle === angle
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {angle}°
              </button>
                );
              })()
            ))}
          </div>
        </div>

        {config.driveType === 'center' && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              {t('centerDriveOffset', lang)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">({t('centerDriveOffsetRange', lang)})</span>
            </Label>
            <div className="flex items-center gap-4">
              {(() => {
                const maxOffset = Math.max(0, Math.floor(config.beltLength / 2 - 300));
                const clampedVal = Math.max(-maxOffset, Math.min(maxOffset, config.centerDriveOffset));
                return (
                  <>
                    <Slider
                      value={[clampedVal]}
                      min={-maxOffset}
                      max={maxOffset}
                      step={5}
                      onValueChange={([v]) => onChange({ centerDriveOffset: v })}
                      className="flex-1"
                    />
                    <div className="flex min-w-[120px] items-center gap-1">
                      <Input
                        type="number"
                        value={clampedVal}
                        min={-maxOffset}
                        max={maxOffset}
                        step={5}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          onChange({ centerDriveOffset: Math.max(-maxOffset, Math.min(maxOffset, raw)) });
                        }}
                        className="h-9 w-24 text-right"
                      />
                      <span className="text-sm text-muted-foreground">mm</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10]">
        <ConveyorPreview config={config} lang={lang} />
      </div>
    </div>
  );
};
