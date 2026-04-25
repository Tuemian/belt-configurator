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

## Component STEP Drop Workflow

Use `public/models/components/` to add own STEP components:

- `deflection-unit/`
- `direct-drive/`
- `indirect-drive/`
- `center-drive/`
- `drum-motor/`

Convert dropped files (`.step` / `.stp`) to GLB:

`npm run convert:step public/models/components`

Then reference generated GLB paths in `public/models/library.json`.
Fallback geometry remains active for missing models.

See full instructions in `public/models/components/README.md`.

## Indicative Pricing (Excel)

The summary step reads prices from:

- `public/pricing/price-list.xlsx`

Rules:

- Sheet name must be `Components`.
- If all required keys for a configuration have valid prices, total estimate is shown.
- If at least one key is missing, UI switches to `Price on request` and marks missing items.
- If Excel file is unavailable/invalid, UI shows `Price on request`.

Replacing `public/pricing/price-list.xlsx` updates prices without code changes.
Schema details are documented in `public/pricing/README.md`.

## Solid STEP Setup (Local)

1. Start the solid service from `step-solid-service/`.
2. Use either Python + uvicorn or Docker (see `step-solid-service/README.md`).
3. Add this variable to your local env:

`STEP_SOLID_SERVICE_URL=http://127.0.0.1:8001/export-step-solid`

4. Start your frontend/API runtime.
5. Use STEP download in the configurator summary.

If the solid service is offline, the application still downloads a wireframe STEP as fallback.

## Inquiry Mail Setup

The contact form in the summary step posts to `POST /api/send-inquiry`.

It sends:
- the inquiry to `office@novamotis.com` (or `INQUIRY_TO_EMAIL`)
- a confirmation email to the sender address entered in the form

Set these environment variables in your runtime (local and production):

- `SMTP_HOST`
- `SMTP_PORT` (for example `587`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE` (`true` for SMTPS/465, otherwise `false`)

Optional:

- `INQUIRY_TO_EMAIL` (default: `office@novamotis.com`)
- `INQUIRY_FROM_EMAIL` (default: `SMTP_USER`)

## Monitoring Setup (Optional)

The project supports optional Sentry-based error monitoring.

- Frontend DSN: `VITE_SENTRY_DSN`
- API DSN: `SENTRY_DSN`

If these variables are not set, monitoring remains disabled.

### Uptime Endpoint

Use `GET /api/health` for uptime checks.

Expected response:

```json
{
	"ok": true,
	"service": "ft-configurator",
	"timestamp": "2026-01-01T00:00:00.000Z"
}
```
