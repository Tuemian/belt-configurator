import { useEffect, useState } from 'react';
import { Language, t } from '@/lib/i18n';
import { ConveyorConfig } from '@/lib/configurator-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConveyorPreview } from '@/components/configurator/ConveyorPreview';

interface Props {
  config: ConveyorConfig;
  onChange: (updates: Partial<ConveyorConfig>) => void;
  lang: Language;
}

const ALLOWED_FRAME_WIDTHS = [40, 80, 120, ...Array.from({ length: 88 }, (_, i) => 130 + i * 10)];
const MIN_BELT_LENGTH = 500;
const MAX_BELT_LENGTH = 12000;
const SIDE_GUIDE_MIN = 0;
const SIDE_GUIDE_MAX = 50;
const SIDE_GUIDE_ACTIVE_MIN = 8; // When side guides are on, minimum meaningful height

// Snap helper: 0 = off; 1-7 snaps up to 8; above 8 is kept as-is
function snapSideGuide(v: number): number {
  if (v <= 0) return 0;
  if (v < SIDE_GUIDE_ACTIVE_MIN) return SIDE_GUIDE_ACTIVE_MIN;
  return Math.min(SIDE_GUIDE_MAX, v);
}
const INCLINE_MIN = -10;
const INCLINE_MAX = 10;

const nearestFrameWidth = (value: number): number => {
  return ALLOWED_FRAME_WIDTHS.reduce((prev, curr) => {
    return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
  }, ALLOWED_FRAME_WIDTHS[0]);
};

function FrameWidthInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [internal, setInternal] = useState(value.toString());

  useEffect(() => {
    setInternal(value.toString());
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    const safe = Number.isFinite(parsed) ? parsed : value;
    const snapped = nearestFrameWidth(safe);
    setInternal(snapped.toString());
    if (snapped !== value) {
      onChange(snapped);
    }
  };

  return (
    <Input
      type="number"
      min={40}
      max={1000}
      step={1}
      value={internal}
      onChange={(e) => setInternal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit((e.target as HTMLInputElement).value);
        }
      }}
      className="w-20 h-9 text-right"
    />
  );
}

function BeltLengthInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [internal, setInternal] = useState(value.toString());

  useEffect(() => {
    setInternal(value.toString());
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    const safe = Number.isFinite(parsed) ? parsed : value;
    const clamped = Math.max(min, Math.min(max, Math.round(safe / 5) * 5));
    setInternal(clamped.toString());
    if (clamped !== value) {
      onChange(clamped);
    }
  };

  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={5}
      value={internal}
      onChange={(e) => setInternal(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit((e.target as HTMLInputElement).value);
        }
      }}
      className="w-20 h-9 text-right"
    />
  );
}

export const StepDimensions = ({ config, onChange, lang }: Props) => {
  const frameWidthIndex = ALLOWED_FRAME_WIDTHS.findIndex((v) => v === config.frameWidth);
  const selectedFrameWidthIndex = frameWidthIndex === -1 ? 0 : frameWidthIndex;
  const minLengthFromWidth = Math.max(MIN_BELT_LENGTH, Math.ceil(config.frameWidth * 1.5));

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground">
              {t('frameWidth', lang)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">({t('frameWidthRange', lang)})</span>
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-pointer rounded-full border border-muted-foreground px-2 py-0.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-primary/10">
                    i
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('frameWidthInfo', lang)}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-4">
            <Slider
              value={[selectedFrameWidthIndex]}
              min={0}
              max={ALLOWED_FRAME_WIDTHS.length - 1}
              step={1}
              onValueChange={([idx]) => {
                const next = ALLOWED_FRAME_WIDTHS[idx];
                onChange({
                  frameWidth: next,
                  beltLength: Math.max(config.beltLength, Math.round(next * 1.5)),
                });
              }}
              className="flex-1"
            />
            <div className="flex min-w-[100px] items-center gap-1">
              <FrameWidthInput
                value={config.frameWidth}
                onChange={(next) =>
                  onChange({
                    frameWidth: next,
                    beltLength: Math.max(config.beltLength, Math.round(next * 1.5)),
                  })
                }
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-foreground">
              {t('beltLength', lang)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">({t('beltLengthRange', lang)})</span>
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-pointer rounded-full border border-muted-foreground px-2 py-0.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-primary/10">
                    i
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('beltLengthInfo', lang)}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-4">
            <Slider
              value={[config.beltLength]}
              min={minLengthFromWidth}
              max={MAX_BELT_LENGTH}
              step={5}
              onValueChange={([next]) => onChange({ beltLength: Math.max(minLengthFromWidth, next) })}
              className="flex-1"
            />
            <div className="flex min-w-[100px] items-center gap-1">
              <BeltLengthInput
                value={config.beltLength}
                min={minLengthFromWidth}
                max={MAX_BELT_LENGTH}
                onChange={(next) => onChange({ beltLength: next })}
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('sideGuideHeight', lang)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">({t('sideGuideHeightRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.sideGuideHeight]}
              onValueChange={([v]) => onChange({ sideGuideHeight: snapSideGuide(v) })}
              min={SIDE_GUIDE_MIN}
              max={SIDE_GUIDE_MAX}
              step={1}
              className="flex-1"
            />
            <div className="flex min-w-[100px] items-center gap-1">
              <Input
                type="number"
                value={config.sideGuideHeight}
                min={SIDE_GUIDE_MIN}
                max={SIDE_GUIDE_MAX}
                step={1}
                onChange={(e) => onChange({ sideGuideHeight: snapSideGuide(Number(e.target.value)) })}
                className="h-9 w-20 text-right"
              />
              <span className="text-sm text-muted-foreground">mm</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">
            {t('inclineAngle', lang)}
            <span className="ml-2 text-xs font-normal text-muted-foreground">({t('inclineAngleRange', lang)})</span>
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.inclineAngle]}
              onValueChange={([v]) => onChange({ inclineAngle: v })}
              min={INCLINE_MIN}
              max={INCLINE_MAX}
              step={1}
              className="flex-1"
            />
            <div className="flex min-w-[100px] items-center gap-1">
              <Input
                type="number"
                value={config.inclineAngle}
                min={INCLINE_MIN}
                max={INCLINE_MAX}
                onChange={(e) => onChange({ inclineAngle: Math.min(INCLINE_MAX, Math.max(INCLINE_MIN, Number(e.target.value))) })}
                className="h-9 w-20 text-right"
              />
              <span className="text-sm text-muted-foreground">°</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full min-h-[380px] overflow-hidden rounded-xl border aspect-[16/10]">
        <ConveyorPreview config={config} lang={lang} />
      </div>
    </div>
  );
};
