import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve(process.argv[2] || 'public/models');
const integrity = JSON.parse(await readFile(path.join(directory, 'integrity.json'), 'utf8'));
const manifests = [
  'tiny_face_detector_model-weights_manifest.json',
  'face_expression_model-weights_manifest.json',
];
let assetCount = 0;
for (const name of manifests) {
  const groups = JSON.parse(await readFile(path.join(directory, name), 'utf8'));
  if (!Array.isArray(groups) || !groups.length) throw new Error(`Invalid manifest: ${name}`);
  const files = [name, ...groups.flatMap(group => group.paths)];
  for (const file of files) {
    if (path.basename(file) !== file) throw new Error(`Unexpected asset path: ${file}`);
    const bytes = await readFile(path.join(directory, file));
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== integrity.files[file]) throw new Error(`Model integrity mismatch: ${file}`);
    assetCount += 1;
  }
  for (const group of groups) {
    let actual = 0;
    for (const file of group.paths) actual += (await readFile(path.join(directory, file))).length;
    const expected = group.weights.reduce((sum, weight) => {
      const bytes = { uint8: 1, uint16: 2, float32: 4 }[weight.quantization?.dtype || weight.dtype];
      if (!bytes) throw new Error(`Unsupported model dtype in ${name}`);
      return sum + weight.shape.reduce((a, b) => a * b, 1) * bytes;
    }, 0);
    if (actual !== expected) throw new Error(`Model shard length mismatch: ${name}`);
  }
}
console.log(`Verified ${assetCount} model assets in ${directory}`);
