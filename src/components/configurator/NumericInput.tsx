import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (n: number) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Number input that buffers free typing as a string and only clamps the value
 * on blur / Enter / wheel-step. Avoids the frustrating "I typed 1 but it
 * snapped to 50" behaviour of clamping inside onChange.
 */
export function NumericInput({ value, min, max, step = 1, onCommit, className, ariaLabel }: Props) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (draft.trim() === '' || draft === '-' ) {
      setDraft(String(value));
      return;
    }
    const n = Number(draft);
    if (Number.isNaN(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    onCommit(clamped);
    setDraft(String(clamped));
  };

  return (
    <Input
      aria-label={ariaLabel}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn(className)}
    />
  );
}
