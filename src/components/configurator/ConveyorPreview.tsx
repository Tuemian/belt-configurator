import { lazy, Suspense } from 'react';
import { ConveyorConfig } from '@/lib/configurator-types';

const ConveyorViewer3D = lazy(() =>
  import('./ConveyorViewer3D').then((m) => ({ default: m.ConveyorViewer3D }))
);

export function ConveyorPreview({ config }: { config: ConveyorConfig }) {
  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex h-full min-h-[380px] items-center justify-center rounded-xl bg-muted/40">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <svg
                className="animate-spin h-8 w-8 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span className="text-sm font-medium">3D-Vorschau wird geladen…</span>
            </div>
          </div>
        }
      >
        <ConveyorViewer3D config={config} />
      </Suspense>
    </div>
  );
}
