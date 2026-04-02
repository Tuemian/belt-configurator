const fs = require('fs');
const path = require('path');
const occtimportjs = require('occt-import-js')();
const { Document, NodeIO } = require('@gltf-transform/core');

function toFloat32(values) {
  return values instanceof Float32Array ? values : new Float32Array(values);
}

function toIndexArray(values) {
  const max = values.reduce((acc, v) => (v > acc ? v : acc), 0);
  if (max <= 65535) {
    return new Uint16Array(values);
  }
  return new Uint32Array(values);
}

function createMaterial(doc, meshDef) {
  const rgb = Array.isArray(meshDef.color) && meshDef.color.length === 3 ? meshDef.color : [0.7, 0.7, 0.7];
  return doc.createMaterial(meshDef.name || 'material').setBaseColorFactor([rgb[0], rgb[1], rgb[2], 1]);
}

async function convertResultToGlb(result, outPath) {
  if (!result || !result.success || !Array.isArray(result.meshes) || result.meshes.length === 0) {
    throw new Error('STEP import did not produce any meshes.');
  }

  const doc = new Document();
  const root = doc.getRoot();
  const scene = doc.createScene('Scene');
  const buffer = doc.createBuffer('buffer');

  result.meshes.forEach((meshDef, index) => {
    const pos = meshDef?.attributes?.position?.array;
    const ind = meshDef?.index?.array;

    if (!Array.isArray(pos) || !Array.isArray(ind) || pos.length === 0 || ind.length === 0) {
      return;
    }

    const mesh = doc.createMesh(meshDef.name || `mesh-${index}`);
    const prim = doc.createPrimitive();

    const positionAccessor = doc
      .createAccessor(`${meshDef.name || `mesh-${index}`}-positions`)
      .setType('VEC3')
      .setBuffer(buffer)
      .setArray(toFloat32(pos));
    prim.setAttribute('POSITION', positionAccessor);

    const normalValues = meshDef?.attributes?.normal?.array;
    if (Array.isArray(normalValues) && normalValues.length === pos.length) {
      const normalAccessor = doc
        .createAccessor(`${meshDef.name || `mesh-${index}`}-normals`)
        .setType('VEC3')
        .setBuffer(buffer)
        .setArray(toFloat32(normalValues));
      prim.setAttribute('NORMAL', normalAccessor);
    }

    const indexAccessor = doc
      .createAccessor(`${meshDef.name || `mesh-${index}`}-indices`)
      .setType('SCALAR')
      .setBuffer(buffer)
      .setArray(toIndexArray(ind));
    prim.setIndices(indexAccessor);
    prim.setMaterial(createMaterial(doc, meshDef));

    mesh.addPrimitive(prim);
    scene.addChild(doc.createNode(meshDef.name || `node-${index}`).setMesh(mesh));
  });

  if (scene.listChildren().length === 0) {
    throw new Error('No valid mesh primitives created from STEP.');
  }

  root.setDefaultScene(scene);

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(outPath, Buffer.from(glb));
}

async function convertOneStep(occt, inPath, outPath) {
  const stepBuffer = fs.readFileSync(inPath);
  const result = occt.ReadStepFile(stepBuffer, {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.001,
    angularDeflection: 0.5,
  });
  await convertResultToGlb(result, outPath);
}

async function main() {
  const rootDir = process.cwd();
  const floorDir = path.join(rootDir, 'public', 'models', 'floor-elements');

  const mappings = [
    { input: path.join(floorDir, 'stellfuss.STEP'), output: path.join(floorDir, 'foot.glb') },
    { input: path.join(floorDir, 'rolle.STEP'), output: path.join(floorDir, 'castor.glb') },
  ];

  const occt = await occtimportjs;

  for (const entry of mappings) {
    if (!fs.existsSync(entry.input)) {
      throw new Error(`Input file missing: ${entry.input}`);
    }

    await convertOneStep(occt, entry.input, entry.output);
    const size = fs.statSync(entry.output).size;
    console.log(`Converted ${path.basename(entry.input)} -> ${path.basename(entry.output)} (${size} bytes)`);
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
