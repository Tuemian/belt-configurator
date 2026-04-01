# Welcome to your Lovable project

TODO: Document your project here

## STEP Export

- The configurator supports STEP download in the summary step.
- Primary path: `POST /api/export-step` with `mode: "solid"`.
- If solid generation is unavailable, the API falls back to wireframe when `allowFallback` is `true`.
- If the API is not reachable (for example local `vite` dev without function runtime), the frontend falls back to local wireframe generation.

Current implementation returns a valid STEP wireframe model based on key conveyor dimensions.

For production-grade solids, provide an external service URL via `STEP_SOLID_SERVICE_URL`.
The endpoint is expected to return JSON:

```json
{
	"filename": "novamotis-conveyor-solid.step",
	"content": "ISO-10303-21;..."
}
```

## Solid STEP Setup (Local)

1. Start the solid service from `step-solid-service/`.
2. Use either Python + uvicorn or Docker (see `step-solid-service/README.md`).
3. Add this variable to your local env:

`STEP_SOLID_SERVICE_URL=http://127.0.0.1:8001/export-step-solid`

4. Start your frontend/API runtime.
5. Use STEP download in the configurator summary.

If the solid service is offline, the application still downloads a wireframe STEP as fallback.
