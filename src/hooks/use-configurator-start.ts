import { useCallback, useRef } from 'react';
import { trackConfigurator, type ConfiguratorId } from '@/lib/analytics';

/** Liefert Handler für den Wurzel-Container; sendet configurator_start max. 1× pro Tool-Aufruf. */
export function useConfiguratorStart(id: ConfiguratorId) {
  const started = useRef(false);
  const onInteract = useCallback(() => {
    if (started.current) return;
    started.current = true;
    trackConfigurator(id, 'configurator_start');
  }, [id]);
  return { onPointerDownCapture: onInteract, onKeyDownCapture: onInteract, startedRef: started };
}
