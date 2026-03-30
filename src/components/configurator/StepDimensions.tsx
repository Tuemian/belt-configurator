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
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold text-foreground">
                  {t('frameWidth', lang)}
                  <span className="text-muted-foreground font-normal ml-2 text-xs">({t('frameWidthRange', lang)})</span>
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-1 cursor-pointer text-muted-foreground text-xs border border-muted-foreground rounded-full px-2 py-0.5">i</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>
                        Mögliche Breiten: 40, 80, 120 mm und ab 130 mm bis 1000 mm in 10er-Schritten.
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-4">
                {/* Custom-Slider: Index → Wert Mapping */}
                {(() => {
                  const allowed = [40, 80, 120, ...Array.from({length: 88}, (_, i) => 130 + i * 10)];
                  const valueIndex = allowed.findIndex(v => v === config.frameWidth);
                  return (
                    <Slider
                      value={[valueIndex === -1 ? 0 : valueIndex]}
                      min={0}
                      max={allowed.length - 1}
                      step={1}
                      onValueChange={([idx]) => {
                        const val = allowed[idx];
                        onChange({ frameWidth: val, beltLength: Math.max(config.beltLength, Math.round(val * 1.5)) });
                      }}
                      className="flex-1"
                    />
                  );
                })()}
                <div className="flex items-center gap-1 min-w-[100px]">
                  <Input
                    type="number" value={config.frameWidth}
                    onChange={(e) => {
                      let v = Number(e.target.value);
                      let allowed = [40, 80, 120];
                      for (let i = 130; i <= 1000; i += 10) allowed.push(i);
                      // Finde den nächsten erlaubten Wert
                      let nearest = allowed.reduce((prev, curr) => Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev, allowed[0]);
                      onChange({ frameWidth: nearest, beltLength: Math.round(nearest * 1.5) });
                    }}
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
                <Input
                  type="number"
                  min={Math.ceil(config.frameWidth * 1.5)}
                  value={config.beltLength}
                  onChange={e => {
                    let min = Math.ceil(config.frameWidth * 1.5);
                    let v = Math.max(min, Number(e.target.value));
                    onChange({ beltLength: v });
                  }}
                  className="w-20 h-9 text-right"
                />
                <span className="text-sm text-muted-foreground">mm (mind. 1,5 × Breite)</span>
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
