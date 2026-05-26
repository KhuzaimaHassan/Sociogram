const https = require('https');
const fs = require('fs');
const path = require('path');

const base = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const outDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
];

let done = 0;

function download(filename) {
  const url = base + filename;
  const outPath = path.join(outDir, filename);
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          const file = fs.createWriteStream(outPath);
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
        }).on('error', reject);
      } else {
        const file = fs.createWriteStream(outPath);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }
    }).on('error', reject);
  });
}

(async () => {
  for (const f of files) {
    try {
      await download(f);
      console.log('Downloaded:', f);
    } catch (e) {
      console.error('Failed:', f, e.message);
    }
  }
  console.log('All models downloaded!');
})();
