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

function isStepFile(filename) {
  const lower = filename.toLowerCase();
  return lower.endsWith('.step') || lower.endsWith('.stp');
}

async function main() {
  const rootDir = process.cwd();
  const argFolder = process.argv[2];
  const componentFolder = argFolder
    ? path.resolve(rootDir, argFolder)
    : path.join(rootDir, 'public', 'models', 'components');

  if (!fs.existsSync(componentFolder) || !fs.statSync(componentFolder).isDirectory()) {
    throw new Error(`Component folder not found: ${componentFolder}`);
  }

  const entries = fs.readdirSync(componentFolder, { withFileTypes: true });
  const stepFiles = [];

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      const nestedDir = path.join(componentFolder, entry.name);
      fs.readdirSync(nestedDir)
        .filter(isStepFile)
        .forEach((filename) => stepFiles.push(path.join(nestedDir, filename)));
      return;
    }

    if (entry.isFile() && isStepFile(entry.name)) {
      stepFiles.push(path.join(componentFolder, entry.name));
    }
  });

  if (stepFiles.length === 0) {
    throw new Error(`No .step/.stp files found in ${componentFolder}`);
  }

  const occt = await occtimportjs;

  for (const inputFile of stepFiles) {
    const outPath = inputFile.replace(/\.(step|stp)$/i, '.glb');
    await convertOneStep(occt, inputFile, outPath);
    const size = fs.statSync(outPath).size;
    console.log(`Converted ${path.basename(inputFile)} -> ${path.basename(outPath)} (${size} bytes)`);
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
