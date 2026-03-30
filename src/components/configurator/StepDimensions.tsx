import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import conveyorDimensions from '@/assets/conveyor-dimensions.jpg';

interface Props {
  config: ConveyorConfig;
  onChange: (updates: Partial<ConveyorConfig>) => void;
  lang: Language;
}

export const StepDimensions = ({ config, onChange, lang }: Props) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('frameWidth', lang)}
            <span className="text-muted-foreground font-normal ml-2 text-xs">({t('frameWidthRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.frameWidth]}
              onValueChange={([v]) => onChange({ frameWidth: v })}
              min={40} max={1250} step={10}
              className="flex-1"
            />
            <div className="flex items-center gap-1 min-w-[100px]">
              <Input
                type="number" value={config.frameWidth}
                onChange={(e) => onChange({ frameWidth: Math.min(1250, Math.max(40, Number(e.target.value))) })}
                className="w-20 h-9 text-right"
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('beltLength', lang)}
            <span className="text-muted-foreground font-normal ml-2 text-xs">({t('beltLengthRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.beltLength]}
              onValueChange={([v]) => onChange({ beltLength: v })}
              min={500} max={12000} step={50}
              className="flex-1"
            />
            <div className="flex items-center gap-1 min-w-[100px]">
              <Input
                type="number" value={config.beltLength}
                onChange={(e) => onChange({ beltLength: Math.min(12000, Math.max(500, Number(e.target.value))) })}
                className="w-20 h-9 text-right"
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('sideGuideHeight', lang)}
            <span className="text-muted-foreground font-normal ml-2 text-xs">({t('sideGuideHeightRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.sideGuideHeight]}
              onValueChange={([v]) => onChange({ sideGuideHeight: v })}
              min={0} max={100} step={5}
              className="flex-1"
            />
            <div className="flex items-center gap-1 min-w-[100px]">
              <Input
                type="number" value={config.sideGuideHeight}
                onChange={(e) => onChange({ sideGuideHeight: Math.min(100, Math.max(0, Number(e.target.value))) })}
                className="w-20 h-9 text-right"
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('inclineAngle', lang)}
            <span className="text-muted-foreground font-normal ml-2 text-xs">({t('inclineAngleRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.inclineAngle]}
              onValueChange={([v]) => onChange({ inclineAngle: v })}
              min={-15} max={15} step={1}
              className="flex-1"
            />
            <div className="flex items-center gap-1 min-w-[100px]">
              <Input
                type="number" value={config.inclineAngle}
                onChange={(e) => onChange({ inclineAngle: Math.min(15, Math.max(-15, Number(e.target.value))) })}
                className="w-20 h-9 text-right"
              />
              <span className="text-sm text-muted-foreground">°</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center rounded-xl bg-muted/50 p-6">
        <img
          src={conveyorDimensions}
          alt="Belt conveyor dimensions"
          className="max-w-full h-auto rounded-lg"
          loading="lazy"
          width={800} height={512}
        />
      </div>
    </div>
  );
};
