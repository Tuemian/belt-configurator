import { lazy, Suspense, useEffect, useState } from 'react';
import { ConveyorConfig } from '@/lib/configurator-types';
import {
  getSelectedConveyorAssetUrls,
  loadConveyor3DLibraryFromPublic,
} from '@/lib/conveyor-3d-library';

const ConveyorViewer3D = lazy(() =>
  import('./ConveyorViewer3D').then((m) => ({ default: m.ConveyorViewer3D }))
);

const fileAvailabilityCache = new Map<string, boolean>();

async function fileExists(url: string): Promise<boolean> {
  if (fileAvailabilityCache.has(url)) {
    return fileAvailabilityCache.get(url) ?? false;
  }

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      fileAvailabilityCache.set(url, true);
      return true;
    }

    if (response.status !== 405) {
      fileAvailabilityCache.set(url, false);
      return false;
    }
  } catch {
    fileAvailabilityCache.set(url, false);
    return false;
  }

  try {
    const fallbackResponse = await fetch(url, { method: 'GET' });
    const exists = fallbackResponse.ok;
    fileAvailabilityCache.set(url, exists);
    return exists;
  } catch {
    fileAvailabilityCache.set(url, false);
    return false;
  }
}

export function ConveyorPreview({ config }: { config: ConveyorConfig }) {
  const [missingFiles, setMissingFiles] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const validateAssets = async () => {
      await loadConveyor3DLibraryFromPublic();
      const urls = getSelectedConveyorAssetUrls(config);
      const missing: string[] = [];

      for (const url of urls) {
        const exists = await fileExists(url);
        if (!exists) {
          missing.push(url);
        }
      }

      if (active) {
        setMissingFiles(missing);
      }
    };

    void validateAssets();

    return () => {
      active = false;
    };
  }, [config]);

  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex h-full min-h-[380px] items-center justify-center rounded-xl bg-muted/40">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <svg
                className="h-8 w-8 animate-spin text-primary"
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
              <span className="text-sm font-medium">3D-Vorschau wird geladen...</span>
            </div>
          </div>
        }
      >
        <ConveyorViewer3D config={config} />
      </Suspense>

      {missingFiles.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-semibold">Hinweis: Einige 3D-Dateien fehlen. Parametrischer Fallback ist aktiv.</div>
          <div className="mt-1 break-all">{missingFiles.join(' | ')}</div>
        </div>
      )}
    </div>
  );
}
