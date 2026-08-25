# STEP components workflow

Drop your STEP files into one of these folders:

- deflection-unit/
- direct-drive/
- indirect-drive/
- center-drive/
- drum-motor/

## Naming convention

Use lowercase kebab-case file names. Example:

- deflection-unit.step
- direct-drive.step
- drum-motor.stp

## Convert STEP to GLB

Run from project root:

```bash
npm run convert:step public/models/components
```

You can also convert a single folder:

```bash
npm run convert:step public/models/components/drum-motor
```

Each `.step` / `.stp` file is converted to a `.glb` with the same base name in the same folder.

## Link file in library

Add the generated GLB path in `public/models/library.json`.

Example snippet:

```json
{
  "components": {
    "deflectionUnit": [
      {
        "id": "deflection-unit-default",
        "url": "/models/components/deflection-unit/deflection-unit.glb"
      }
    ]
  }
}
```

If a model file is missing, the configurator falls back to parametric geometry.
