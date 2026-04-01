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
