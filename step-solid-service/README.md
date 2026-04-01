# STEP Solid Service

This service generates real solid STEP models from the belt configurator payload.

## Endpoints

- GET /health
- POST /export-step-solid

Request format:

```json
{
  "config": {
    "frameWidth": 400,
    "beltLength": 2000,
    "sideGuideHeight": 30,
    "inclineAngle": 5,
    "beltType": "standard",
    "speed": 15,
    "loadCapacity": 50,
    "driveType": "direct",
    "motorPosition": "right",
    "motorAngle": 0,
    "withStand": true,
    "standHeight": 850,
    "floorElement": "feet",
    "heightAdjust": false,
    "floorBolts": false
  }
}
```

Response format:

```json
{
  "filename": "novamotis-conveyor-solid-W400-L2000.step",
  "content": "ISO-10303-21;..."
}
```

## Local run without Docker

1. Create and activate a virtual environment.
2. Install dependencies from requirements.txt.
3. Run:

uvicorn app.main:app --host 0.0.0.0 --port 8001

## Docker run

Build image:

docker build -t novamotis-step-solid-service .

Run container:

docker run --rm -p 8001:8001 novamotis-step-solid-service

## Deploy on Render

Use the Render dashboard with a Docker web service.

1. New + -> Web Service
2. Connect your Git repository
3. Root directory: `FT-config/step-solid-service`
4. Environment: Docker
5. Dockerfile path: `./Dockerfile`
6. Health check path: `/health`

After deploy, test:

GET `https://<your-render-domain>/health`

Then set in your app environment:

`STEP_SOLID_SERVICE_URL=https://<your-render-domain>/export-step-solid`
