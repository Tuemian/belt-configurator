from __future__ import annotations

import os
from pathlib import Path
import tempfile

import cadquery as cq
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class ConveyorConfig(BaseModel):
    frameWidth: float = Field(..., gt=0)
    beltLength: float = Field(..., gt=0)
    sideGuideHeight: float = Field(30)
    inclineAngle: float = Field(0, ge=-20, le=20)

    beltType: str = Field("standard")
    speed: float = Field(15)
    loadCapacity: float = Field(50)

    driveType: str = Field("direct")
    motorPosition: str = Field("right")
    motorAngle: int = Field(0)

    withStand: bool = Field(True)
    standHeight: float = Field(850)
    floorElement: str = Field("feet")
    heightAdjust: bool = Field(False)
    floorBolts: bool = Field(False)


class ExportRequest(BaseModel):
    config: ConveyorConfig


class ExportResponse(BaseModel):
    filename: str
    content: str


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _build_motor_solid(
    config: ConveyorConfig,
    length: float,
    width: float,
    frame_height: float,
) -> cq.Shape | None:
    motor_w = _clamp(width * 0.28, 60, 240)
    motor_h = _clamp(frame_height * 0.9, 40, 160)
    motor_d = _clamp(width * 0.22, 50, 200)

    gearbox = cq.Workplane("XY").box(motor_d, motor_h, motor_w)

    motor_radius = _clamp(motor_w * 0.28, 18, 90)
    motor_length = _clamp(motor_w * 0.9, 55, 260)
    cylinder = cq.Workplane("XZ").cylinder(motor_length, motor_radius)

    if config.driveType == "direct":
        side = 1.0 if config.motorPosition == "right" else -1.0
        x_pos = -length / 2
        y_pos = 0.0
        z_pos = side * (width / 2 + motor_w / 2 + 10)
        gb = gearbox.translate((x_pos, y_pos, z_pos))
        cyl = cylinder.translate((x_pos, y_pos + motor_h / 2 + motor_radius, z_pos))
        motor_shape = gb.union(cyl)
        if config.motorAngle != 0:
            motor_shape = motor_shape.rotate(
                (x_pos, y_pos, z_pos),
                (x_pos + 1, y_pos, z_pos),
                float(config.motorAngle),
            )
        return motor_shape

    if config.driveType == "indirect":
        x_pos = -length / 2
        y_pos = -(frame_height / 2 + motor_h / 2 + 12)
        z_pos = 0.0
        gb = gearbox.translate((x_pos, y_pos, z_pos))
        cyl = cylinder.translate((x_pos, y_pos - motor_h / 2 - motor_radius, z_pos))
        motor_shape = gb.union(cyl)
        if config.motorAngle != 0:
            motor_shape = motor_shape.rotate(
                (x_pos, y_pos, z_pos),
                (x_pos, y_pos, z_pos + 1),
                float(config.motorAngle),
            )
        return motor_shape

    if config.driveType == "center":
        x_pos = 0.0
        y_pos = -(frame_height / 2 + motor_h / 2 + 12)
        z_pos = 0.0
        gb = gearbox.translate((x_pos, y_pos, z_pos))
        cyl = cylinder.translate((x_pos, y_pos - motor_h / 2 - motor_radius, z_pos))
        motor_shape = gb.union(cyl)
        if config.motorAngle != 0:
            motor_shape = motor_shape.rotate(
                (x_pos, y_pos, z_pos),
                (x_pos, y_pos, z_pos + 1),
                float(config.motorAngle),
            )
        return motor_shape

    return None


def build_conveyor_solid(config: ConveyorConfig) -> cq.Shape:
    length = _clamp(config.beltLength, 500, 12000)
    width = _clamp(config.frameWidth, 40, 1250)
    incline_deg = _clamp(config.inclineAngle, -10, 10)

    frame_height = _clamp(0.12 * width, 35, 140)
    belt_thickness = _clamp(0.008 * width, 3, 12)

    frame = cq.Workplane("XY").box(length, frame_height, width)

    belt = (
        cq.Workplane("XY")
        .box(length * 0.985, belt_thickness, width * 0.92)
        .translate((0, frame_height / 2 + belt_thickness / 2, 0))
    )

    shape = frame.union(belt)

    # Side guides as simple solid rails.
    side_guide_height = _clamp(config.sideGuideHeight, 0, 120)
    if side_guide_height > 0:
        rail_thickness = 4
        rail_length = length * 0.98
        rail_y = frame_height / 2 + side_guide_height / 2
        rail_z = width / 2 - rail_thickness / 2

        left_rail = (
            cq.Workplane("XY")
            .box(rail_length, side_guide_height, rail_thickness)
            .translate((0, rail_y, rail_z))
        )
        right_rail = (
            cq.Workplane("XY")
            .box(rail_length, side_guide_height, rail_thickness)
            .translate((0, rail_y, -rail_z))
        )
        shape = shape.union(left_rail).union(right_rail)

    if config.withStand:
        x_offset = max(length / 2 - 140, 120)
        z_offset = max(width / 2 - 30, 20)
        target_belt_top = _clamp(config.standHeight, 400, 2000)
        current_belt_top = frame_height / 2 + belt_thickness
        leg_length = max(target_belt_top - current_belt_top, 120)

        leg_w = 32
        leg_y = -(frame_height / 2 + leg_length / 2)
        leg_positions = [
            (-x_offset, leg_y, -z_offset),
            (-x_offset, leg_y, z_offset),
            (x_offset, leg_y, -z_offset),
            (x_offset, leg_y, z_offset),
        ]

        for pos in leg_positions:
            leg = cq.Workplane("XY").box(leg_w, leg_length, leg_w).translate(pos)
            shape = shape.union(leg)

            if config.floorElement == "castors":
                wheel = (
                    cq.Workplane("XY")
                    .cylinder(18, 45)
                    .rotate((0, 0, 0), (1, 0, 0), 90)
                    .translate((pos[0], pos[1] - leg_length / 2 - 22, pos[2]))
                )
                shape = shape.union(wheel)
            else:
                foot = (
                    cq.Workplane("XY")
                    .cylinder(8, 44)
                    .translate((pos[0], pos[1] - leg_length / 2 - 8, pos[2]))
                )
                shape = shape.union(foot)

    
    # Placeholder motor geometry is optional and off by default,
    # because GLB preview assets are not directly reused for CAD STEP solids.
    if _env_flag("STEP_INCLUDE_PLACEHOLDER_MOTOR", default=False):
        motor = _build_motor_solid(config, length, width, frame_height)
        if motor is not None:
            shape = shape.union(motor)

    if abs(incline_deg) > 0.0001:
        shape = shape.rotate((0, 0, 0), (0, 0, 1), incline_deg)

    return shape


def shape_to_step_text(shape: cq.Shape) -> str:
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_path = Path(tmp_dir) / "conveyor.step"
        cq.exporters.export(shape, str(output_path), exportType="STEP")
        return output_path.read_text(encoding="utf-8", errors="ignore")


app = FastAPI(title="STEP Solid Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/export-step-solid", response_model=ExportResponse)
def export_step_solid(payload: ExportRequest) -> ExportResponse:
    try:
        shape = build_conveyor_solid(payload.config)
        step_content = shape_to_step_text(shape)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Failed to generate solid STEP: {exc}") from exc

    file_name = f"novamotis-conveyor-solid-W{int(payload.config.frameWidth)}-L{int(payload.config.beltLength)}.step"
    return ExportResponse(filename=file_name, content=step_content)
