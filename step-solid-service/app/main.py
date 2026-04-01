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
    centerDriveOffset: float = Field(0)

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


PROFILE_DIR = Path(__file__).resolve().parent.parent / "profile"
PROFILE_40_FILE = PROFILE_DIR / "1108038_profil_a8_40x40_leicht.step"
PROFILE_80_FILE = PROFILE_DIR / "1108055_profil_a8_80x40_leicht.step"
MOTOR_STEP_DIR = Path(__file__).resolve().parent.parent / "motor-step"


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _try_profile_outer_dims(profile_file: Path) -> tuple[float, float] | None:
    if not profile_file.exists():
        return None

    try:
        wp = cq.importers.importStep(str(profile_file))
        bb = wp.val().BoundingBox()
    except Exception:
        return None

    dims = sorted([float(bb.xlen), float(bb.ylen), float(bb.zlen)])
    # Two smallest extents are treated as profile cross-section dimensions.
    a, b = dims[0], dims[1]
    return a, b


def _frame_profile_dims(frame_width: float) -> tuple[float, float]:
    # Mirrors requested profile mapping: 40x40 for narrower belts, 80x40 (high) for wider.
    use_gf80 = frame_width > 500

    if use_gf80:
        dims = _try_profile_outer_dims(PROFILE_80_FILE)
        if dims:
            low, high = min(dims), max(dims)
            return low, high
        return 40.0, 80.0

    dims = _try_profile_outer_dims(PROFILE_40_FILE)
    if dims:
        low, high = min(dims), max(dims)
        return low, high
    return 40.0, 40.0


def _get_profile_step_file(frame_width: float) -> Path | None:
    """Select appropriate profile STEP file based on frame width."""
    use_gf80 = frame_width > 500
    profile_file = PROFILE_80_FILE if use_gf80 else PROFILE_40_FILE
    return profile_file if profile_file.exists() else None


def _import_profile_rail(profile_file: Path, length: float) -> cq.Shape | None:
    """Import and scale profile STEP to specified length."""
    try:
        wp = cq.importers.importStep(str(profile_file))
        base_shape = wp.val()
        bb = base_shape.BoundingBox()
        base_length = max(float(bb.xlen), 1.0)
        
        # Scale to desired length along X axis
        scale_factor = length / base_length if base_length > 0 else 1.0
        scaled = base_shape.scale(scale_factor)
        
        # Center the scaled profile at origin
        bb_scaled = scaled.BoundingBox()
        cx = (float(bb_scaled.xmin) + float(bb_scaled.xmax)) / 2.0
        cy = (float(bb_scaled.ymin) + float(bb_scaled.ymax)) / 2.0
        cz = (float(bb_scaled.zmin) + float(bb_scaled.zmax)) / 2.0
        
        return scaled.translate((-cx, -cy, -cz))
    except Exception:
        return None


def _find_motor_step_asset(config: ConveyorConfig, width: float) -> Path | None:
    variant = "large" if width > 500 else "compact"

    if config.driveType == "direct":
        prefix = f"direct-{config.motorPosition}"
        candidates = [
            f"{prefix}-{variant}.step",
            f"{prefix}.step",
            f"{prefix}-{variant}.stp",
            f"{prefix}.stp",
        ]
    elif config.driveType == "indirect":
        candidates = [
            f"indirect-{variant}.step",
            "indirect.step",
            f"indirect-{variant}.stp",
            "indirect.stp",
        ]
    elif config.driveType == "center":
        candidates = [
            f"center-{variant}.step",
            "center.step",
            f"center-{variant}.stp",
            "center.stp",
        ]
    else:
        return None

    for name in candidates:
        path = MOTOR_STEP_DIR / name
        if path.exists():
            return path

    return None


def _import_step_shape(step_file: Path) -> cq.Shape | None:
    try:
        wp = cq.importers.importStep(str(step_file))
        shape = wp.val()
    except Exception:
        return None

    bb = shape.BoundingBox()
    cx = (float(bb.xmin) + float(bb.xmax)) / 2.0
    cy = (float(bb.ymin) + float(bb.ymax)) / 2.0
    cz = (float(bb.zmin) + float(bb.zmax)) / 2.0
    return shape.translate((-cx, -cy, -cz))


def _build_motor_from_step_asset(
    config: ConveyorConfig,
    length: float,
    width: float,
    frame_height: float,
) -> cq.Shape | None:
    asset = _find_motor_step_asset(config, width)
    if asset is None:
        return None

    base = _import_step_shape(asset)
    if base is None:
        return None

    bb = base.BoundingBox()
    sx = max(float(bb.xlen), 1.0)
    sy = max(float(bb.ylen), 1.0)
    sz = max(float(bb.zlen), 1.0)

    if config.driveType == "direct":
        side = 1.0 if config.motorPosition == "right" else -1.0
        x_pos = length / 2 - _clamp(sx * 0.30, 10, 60)
        y_pos = -(frame_height / 2 + _clamp(sy * 0.20, 10, 45))
        z_pos = side * (width / 2 + sz / 2 + _clamp(width * 0.03, 10, 30))
        shape = base.translate((x_pos, y_pos, z_pos))
        if config.motorAngle != 0:
            shape = shape.rotate((x_pos, y_pos, z_pos), (x_pos, y_pos, z_pos + 1), float(config.motorAngle))
        return shape

    if config.driveType == "indirect":
        x_pos = -length / 2
        y_pos = -(frame_height / 2 + sy / 2 + 12)
        z_pos = 0.0
        shape = base.translate((x_pos, y_pos, z_pos))
        if config.motorAngle != 0:
            shape = shape.rotate((x_pos, y_pos, z_pos), (x_pos, y_pos, z_pos + 1), float(config.motorAngle))
        return shape

    if config.driveType == "center":
        x_pos = 0.0
        y_pos = -(frame_height / 2 + sy / 2 + 12)
        z_pos = _clamp(config.centerDriveOffset, -300, 300)
        shape = base.translate((x_pos, y_pos, z_pos))
        if config.motorAngle != 0:
            shape = shape.rotate((x_pos, y_pos, z_pos), (x_pos, y_pos, z_pos + 1), float(config.motorAngle))
        return shape

    return None


def _motor_variant_dims(width: float, frame_height: float) -> tuple[float, float, float, float, float, float]:
    # Mirrors the compact/large split used in models/library.json.
    compact = width <= 500

    if compact:
        gearbox_d = _clamp(width * 0.20, 50, 95)
        gearbox_h = _clamp(frame_height * 0.88, 40, 90)
        gearbox_w = _clamp(width * 0.24, 55, 120)
        motor_radius = _clamp(gearbox_w * 0.22, 14, 32)
        motor_len = _clamp(gearbox_w * 0.95, 40, 120)
        flange_t = _clamp(gearbox_d * 0.12, 4, 12)
    else:
        gearbox_d = _clamp(width * 0.24, 95, 220)
        gearbox_h = _clamp(frame_height * 1.00, 70, 170)
        gearbox_w = _clamp(width * 0.30, 120, 260)
        motor_radius = _clamp(gearbox_w * 0.24, 28, 75)
        motor_len = _clamp(gearbox_w * 1.00, 95, 260)
        flange_t = _clamp(gearbox_d * 0.10, 8, 18)

    return gearbox_d, gearbox_h, gearbox_w, motor_radius, motor_len, flange_t


def _build_motor_solid(
    config: ConveyorConfig,
    length: float,
    width: float,
    frame_height: float,
) -> cq.Shape | None:
    gearbox_d, gearbox_h, gearbox_w, motor_radius, motor_length, flange_t = _motor_variant_dims(
        width,
        frame_height,
    )

    # Simplified geared motor assembly: gearbox + flange + motor can + shaft.
    gearbox = cq.Workplane("XY").box(gearbox_d, gearbox_h, gearbox_w)
    flange = cq.Workplane("XY").box(flange_t, gearbox_h * 0.92, gearbox_w * 0.92)
    motor_can = cq.Workplane("YZ").cylinder(motor_length, motor_radius)
    shaft = cq.Workplane("YZ").cylinder(_clamp(gearbox_d * 0.35, 12, 45), _clamp(motor_radius * 0.22, 4, 14))

    local_shape = (
        gearbox
        .union(flange.translate((gearbox_d / 2 + flange_t / 2, 0, 0)))
        .union(motor_can.translate((-(gearbox_d / 2 + motor_length / 2), 0, 0)))
        .union(shaft.translate((gearbox_d / 2 + flange_t + 6, 0, 0)))
    )

    if config.driveType == "direct":
        side = 1.0 if config.motorPosition == "right" else -1.0
        # Direct drive should point to the side drum (axis along Z), not along conveyor length.
        y_axis_rot = 90.0 if side > 0 else -90.0
        direct_shape = local_shape.rotate((0, 0, 0), (0, 1, 0), y_axis_rot)

        # Position: near drive drum, outside the side frame, hanging below top frame edge.
        x_pos = length / 2 - _clamp(gearbox_d * 0.30, 10, 50)
        y_pos = -(frame_height / 2 + _clamp(gearbox_h * 0.30, 14, 52))
        z_pos = side * (width / 2 + gearbox_d / 2 + _clamp(width * 0.04, 14, 34))

        motor_shape = direct_shape.translate((x_pos, y_pos, z_pos))
        if config.motorAngle != 0:
            motor_shape = motor_shape.rotate(
                (x_pos, y_pos, z_pos),
                (x_pos, y_pos, z_pos + 1),
                float(config.motorAngle),
            )
        return motor_shape

    if config.driveType == "indirect":
        x_pos = -length / 2
        y_pos = -(frame_height / 2 + gearbox_h / 2 + 12)
        z_pos = 0.0
        motor_shape = local_shape.translate((x_pos, y_pos, z_pos))
        if config.motorAngle != 0:
            motor_shape = motor_shape.rotate(
                (x_pos, y_pos, z_pos),
                (x_pos, y_pos, z_pos + 1),
                float(config.motorAngle),
            )
        return motor_shape

    if config.driveType == "center":
        x_pos = 0.0
        y_pos = -(frame_height / 2 + gearbox_h / 2 + 12)
        z_pos = _clamp(config.centerDriveOffset, -300, 300)
        motor_shape = local_shape.translate((x_pos, y_pos, z_pos))
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

    profile_w, profile_h = _frame_profile_dims(width)
    frame_height = _clamp(profile_h, 35, 140)
    belt_thickness = _clamp(0.008 * width, 3, 12)

    # Try to use actual profile geometry, fall back to box if unavailable
    profile_file = _get_profile_step_file(width)
    if profile_file:
        left_profile = _import_profile_rail(profile_file, length)
        right_profile = _import_profile_rail(profile_file, length)
    else:
        left_profile = None
        right_profile = None

    rail_z = max(width / 2 - profile_w / 2, 0)
    
    if left_profile and right_profile:
        # Use actual profile geometry
        left_rail = left_profile.translate((0, 0, rail_z))
        right_rail = right_profile.translate((0, 0, -rail_z))
    else:
        # Fallback to box-based construction
        left_rail = cq.Workplane("XY").box(length, frame_height, profile_w).translate((0, 0, rail_z))
        right_rail = cq.Workplane("XY").box(length, frame_height, profile_w).translate((0, 0, -rail_z))

    # End cross-members between both side rails.
    inner_span = max(width - 2 * profile_w, 5)
    cross_depth = _clamp(profile_w, 20, 80)
    front_cross = cq.Workplane("XY").box(cross_depth, frame_height, inner_span).translate((length / 2 - cross_depth / 2, 0, 0))
    rear_cross = cq.Workplane("XY").box(cross_depth, frame_height, inner_span).translate((-length / 2 + cross_depth / 2, 0, 0))

    frame = left_rail.union(right_rail).union(front_cross).union(rear_cross)

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

    
    # Motor strategy:
    # 1) Prefer direct STEP motor assets from step-solid-service/motor-step/
    # 2) Optional parametric fallback can be enabled via STEP_INCLUDE_PARAMETRIC_MOTOR=true
    if _env_flag("STEP_INCLUDE_MOTOR", default=True):
        motor = _build_motor_from_step_asset(config, length, width, frame_height)
        if motor is None and _env_flag("STEP_INCLUDE_PARAMETRIC_MOTOR", default=False):
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
