export type ConveyorConfig = {
  frameWidth: number;
  beltLength: number;
  sideGuideHeight: number;
  inclineAngle: number;
  beltType: 'standard' | 'grip' | 'heavy-grip' | 'food-safe';
  speed: number;
  loadCapacity: number;
  driveType: 'direct' | 'indirect' | 'center';
  motorPosition: 'left' | 'right';
  motorAngle: 0 | 90 | 180 | 270;
  withStand: boolean;
  standHeight: number;
  floorElement: 'feet' | 'castors';
  heightAdjust: boolean;
  floorBolts: boolean;
};

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.';
  }

  const rounded = Math.round(value * 1000) / 1000;
  const text = rounded.toString();
  return text.includes('.') ? text : `${text}.`;
}

function sanitizePositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function toStepPolyline(id: number, pointIds: number[]): string {
  const refs = pointIds.map((pointId) => `#${pointId}`).join(',');
  return `#${id}=POLYLINE('',(${refs}));`;
}

export function generateStepWireframe(config: ConveyorConfig): string {
  const width = sanitizePositive(config.frameWidth, 400);
  const length = sanitizePositive(config.beltLength, 2000);
  const frameHeight = 80;
  const inclineRad = (config.inclineAngle * Math.PI) / 180;
  const rise = Math.tan(inclineRad) * length;

  const w2 = width / 2;
  const l2 = length / 2;

  const p1: [number, number, number] = [-l2, 0, -w2];
  const p2: [number, number, number] = [-l2, 0, w2];
  const p3: [number, number, number] = [l2, rise, w2];
  const p4: [number, number, number] = [l2, rise, -w2];
  const p5: [number, number, number] = [-l2, frameHeight, -w2];
  const p6: [number, number, number] = [-l2, frameHeight, w2];
  const p7: [number, number, number] = [l2, rise + frameHeight, w2];
  const p8: [number, number, number] = [l2, rise + frameHeight, -w2];

  const points = [p1, p2, p3, p4, p5, p6, p7, p8];
  const pointStartId = 100;
  const polylineStartId = 200;

  const pointLines = points.map(([x, y, z], index) => {
    const id = pointStartId + index;
    return `#${id}=CARTESIAN_POINT('',(${formatNumber(x)},${formatNumber(y)},${formatNumber(z)}));`;
  });

  const polylineDefs = [
    [100, 101, 102, 103, 100],
    [104, 105, 106, 107, 104],
    [100, 104],
    [101, 105],
    [102, 106],
    [103, 107],
  ];

  const polylineLines = polylineDefs.map((polylinePoints, index) =>
    toStepPolyline(polylineStartId + index, polylinePoints),
  );

  const geometricSetIds = polylineLines
    .map((_, index) => `#${polylineStartId + index}`)
    .join(',');

  const timestamp = new Date().toISOString();

  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('NOVAMOTIS belt conveyor wireframe export'),'2;1');
FILE_NAME('novamotis-conveyor.step','${timestamp}',('NOVAMOTIS'),('NOVAMOTIS'),'GitHub Copilot','FT-configurator','');
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN'));
ENDSEC;
DATA;
#10=APPLICATION_CONTEXT('configuration controlled 3d designs of mechanical parts and assemblies');
#11=APPLICATION_PROTOCOL_DEFINITION('international standard','config_control_design',1994,#10);
#12=DESIGN_CONTEXT('',#10,'design');
#13=MECHANICAL_CONTEXT('',#10,'mechanical');
#14=PRODUCT('BELT_CONVEYOR','BELT_CONVEYOR','Generated from configurator',(#13));
#15=PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('1','',#14,.NOT_KNOWN.);
#16=PRODUCT_CATEGORY('part','');
#17=PRODUCT_RELATED_PRODUCT_CATEGORY('detail','',(#14));
#18=PRODUCT_DEFINITION_CONTEXT('part definition',#10,'design');
#19=PRODUCT_DEFINITION('design','',#15,#18);
#20=PRODUCT_DEFINITION_SHAPE('','',#19);
#21=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));
#22=(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.));
#23=(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT());
#24=UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.01),#21,'distance_accuracy_value','');
#25=(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((#24))GLOBAL_UNIT_ASSIGNED_CONTEXT((#21,#22,#23))REPRESENTATION_CONTEXT('Context #1','3D Context with UNIT and UNCERTAINTY'));
${pointLines.join('\n')}
${polylineLines.join('\n')}
#300=GEOMETRIC_CURVE_SET('',(${geometricSetIds}));
#301=GEOMETRICALLY_BOUNDED_WIREFRAME_SHAPE_REPRESENTATION('',(#300),#25);
#302=SHAPE_DEFINITION_REPRESENTATION(#20,#301);
ENDSEC;
END-ISO-10303-21;
`;
}

export function buildStepFilename(config: ConveyorConfig): string {
  const width = Math.round(config.frameWidth);
  const length = Math.round(config.beltLength);
  return `novamotis-conveyor-W${width}-L${length}.step`;
}