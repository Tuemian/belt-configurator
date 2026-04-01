from __future__ import annotations

from pathlib import Path
import tempfile

import cadquery as cq
from fastapi import FastAPI, HTTPException
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

    if abs(incline_deg) > 0.0001:
        shape = shape.rotate((0, 0, 0), (0, 0, 1), incline_deg)

    return shape


def shape_to_step_text(shape: cq.Shape) -> str:
    with tempfile.TemporaryDirectory() as tmp_dir:
        output_path = Path(tmp_dir) / "conveyor.step"
        cq.exporters.export(shape, str(output_path), exportType="STEP")
        return output_path.read_text(encoding="utf-8", errors="ignore")


app = FastAPI(title="STEP Solid Service", version="1.0.0")


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
