import { useCallback, useEffect, useRef } from 'react';
import { trackConfigurator, type ConfiguratorId } from '@/lib/analytics';

const INTERACTION_EVENTS = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'input', 'change', 'wheel'] as const;

/**
 * Sendet configurator_start bei der ERSTEN Interaktion jeder Art (Klick, Tippen,
 * Eingabe, Dropdown, Slider) – max. 1× pro Tool-Aufruf. Lauscht global am
 * document, damit auch Portale (Dropdowns, Dialoge) und Slider erfasst werden.
 * trackStep sendet configurator_step je Schritt nur einmal pro Tool-Aufruf.
 */
export function useConfiguratorStart(id: ConfiguratorId) {
  const started = useRef(false);
  const steps = useRef(new Set<number>());

  const onInteract = useCallback(() => {
    if (started.current) return;
    started.current = true;
    trackConfigurator(id, 'configurator_start');
  }, [id]);

  useEffect(() => {
    const handler = (e: Event) => {
      if (e.type === 'keydown' && ['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes((e as KeyboardEvent).key)) return;
      onInteract();
      if (started.current) INTERACTION_EVENTS.forEach((t) => document.removeEventListener(t, handler, true));
    };
    INTERACTION_EVENTS.forEach((t) => document.addEventListener(t, handler, { capture: true, passive: true }));
    return () => INTERACTION_EVENTS.forEach((t) => document.removeEventListener(t, handler, true));
  }, [onInteract]);

  const trackStep = useCallback(
    (stepNumber: number, stepName: string) => {
      if (steps.current.has(stepNumber)) return;
      steps.current.add(stepNumber);
      trackConfigurator(id, 'configurator_step', { step_number: stepNumber, step_name: stepName });
    },
    [id],
  );

  return { onPointerDownCapture: onInteract, onKeyDownCapture: onInteract, startedRef: started, trackStep };
}
