import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise = null;

export async function loadFaceApiModels() {
  if (modelsLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log('[Sociogram] Face-api models loaded successfully');
      return true;
    } catch (error) {
      console.warn('[Sociogram] Failed to load face-api models:', error.message);
      loadingPromise = null;
      return false;
    }
  })();

  return loadingPromise;
}

export function areModelsLoaded() {
  return modelsLoaded;
}

export async function detectFaceExpression(videoOrCanvas) {
  if (!modelsLoaded) return null;

  try {
    const detection = await faceapi
      .detectSingleFace(videoOrCanvas, new faceapi.TinyFaceDetectorOptions({
        inputSize: 128,
        scoreThreshold: 0.4,
      }))
      .withFaceExpressions();

    if (!detection) return null;

    const expressions = detection.expressions;
    let topExpression = null;
    let topConfidence = 0;

    for (const [expression, confidence] of Object.entries(expressions)) {
      if (confidence > topConfidence) {
        topExpression = expression;
        topConfidence = confidence;
      }
    }

    // Confidence threshold: 0.65
    if (topConfidence < 0.65) return null;
    // Skip neutral
    if (topExpression === 'neutral') return null;

    return topExpression;
  } catch (error) {
    console.warn('[Sociogram] Face detection error:', error.message);
    return null;
  }
}

export { faceapi };
