import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ConveyorPreview } from '@/components/configurator/ConveyorPreview';

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
                onClick={() => onChange({ driveType: opt.value })}
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
              <button
                key={angle}
                type="button"
                onClick={() => onChange({ motorAngle: angle })}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all font-medium text-sm',
                  config.motorAngle === angle
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {angle}°
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10]">
        <ConveyorPreview config={config} />
      </div>
    </div>
  );
};
