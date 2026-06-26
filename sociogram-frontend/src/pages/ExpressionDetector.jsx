/**
 * ExpressionDetector.jsx
 *
 * Standalone page loaded in a React Native WebView.
 * - Accesses front camera via getUserMedia
 * - Runs face-api.js TinyFaceDetector + FaceExpressionNet
 * - Detects expression for 8 stable frames (~1.6s), then posts result
 * - Communicates with React Native via window.ReactNativeWebView.postMessage
 *
 * Messages sent to RN:
 *   { type: 'EXPRESSION', expression: 'happy' }
 *   { type: 'CLOSE' }
 *   { type: 'READY' }
 *   { type: 'ERROR', message: '...' }
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';
const DETECTION_INTERVAL = 200; // ms between frames
const REQUIRED_STABLE_FRAMES = 8; // must hold expression for ~1.6s
const CONFIDENCE_THRESHOLD = 0.65;

// Map face-api expression names to our emoji
const EXPRESSION_MAP = {
  happy:     '😍',
  surprised: '😮',
  angry:     '😠',
  disgusted: '😠',
  fearful:   '😮',
  sad:       '😢',
};

function postToRN(data) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }
}

export default function ExpressionDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const stableCountRef = useRef(0);
  const lastExprRef = useRef(null);
  const progressAnim = useRef(null);

  const [status, setStatus] = useState('loading'); // loading | ready | detecting | done | error
  const [currentExpr, setCurrentExpr] = useState(null);
  const [progress, setProgress] = useState(0);
  const [doneEmoji, setDoneEmoji] = useState(null);

  // Load models and start camera
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus('loading');
        // Load models
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        if (cancelled) return;

        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 320, height: 240 },
          audio: false,
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('detecting');
        postToRN({ type: 'READY' });
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          postToRN({ type: 'ERROR', message: err.message });
        }
      }
    }

    init();
    return () => { cancelled = true; clearInterval(intervalRef.current); };
  }, []);

  // Run detection loop when status is detecting
  useEffect(() => {
    if (status !== 'detecting') return;

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const detection = await faceapi
          .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({
            inputSize: 128,
            scoreThreshold: 0.4,
          }))
          .withFaceExpressions();

        if (!detection) {
          stableCountRef.current = 0;
          lastExprRef.current = null;
          setCurrentExpr(null);
          setProgress(0);
          return;
        }

        const exprs = detection.expressions;
        // Find top expression excluding neutral
        let top = null, topConf = 0;
        for (const [k, v] of Object.entries(exprs)) {
          if (k !== 'neutral' && v > topConf) { top = k; topConf = v; }
        }

        if (!top || topConf < CONFIDENCE_THRESHOLD) {
          stableCountRef.current = 0;
          lastExprRef.current = null;
          setCurrentExpr(null);
          setProgress(0);
          return;
        }

        if (top === lastExprRef.current) {
          stableCountRef.current += 1;
        } else {
          stableCountRef.current = 1;
          lastExprRef.current = top;
        }

        const pct = Math.min(stableCountRef.current / REQUIRED_STABLE_FRAMES, 1);
        setProgress(pct);
        setCurrentExpr(top);

        if (stableCountRef.current >= REQUIRED_STABLE_FRAMES) {
          clearInterval(intervalRef.current);
          const emoji = EXPRESSION_MAP[top] || '😊';
          setDoneEmoji(emoji);
          setStatus('done');
          postToRN({ type: 'EXPRESSION', expression: top, emoji });

          // Auto close after 2.5s
          setTimeout(() => postToRN({ type: 'CLOSE' }), 2500);
        }
      } catch { /* silent */ }
    }, DETECTION_INTERVAL);

    return () => clearInterval(intervalRef.current);
  }, [status]);

  function handleClose() {
    clearInterval(intervalRef.current);
    postToRN({ type: 'CLOSE' });
  }

  const exprEmoji = currentExpr ? (EXPRESSION_MAP[currentExpr] || '🤔') : null;

  return (
    <div style={styles.root}>
      {/* Single video element — visible as camera preview, also used for face detection */}
      <video
        ref={videoRef}
        style={{
          ...styles.cameraPreview,
          display: status === 'loading' ? 'none' : 'block',
        }}
        playsInline
        muted
        autoPlay
      />
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={styles.hiddenMedia} />

      {/* Overlay UI */}
      <div style={styles.overlay}>
        {/* Close button */}
        <button style={styles.closeBtn} onClick={handleClose}>✕</button>

        {/* Title */}
        <div style={styles.topSection}>
          <p style={styles.title}>🎭 Expression Reactions</p>
          <p style={styles.subtitle}>
            {status === 'loading' ? 'Loading models…' :
             status === 'done' ? 'Reaction posted!' :
             status === 'error' ? 'Camera unavailable' :
             'Hold your expression steady'}
          </p>
        </div>

        {/* Face guide oval */}
        {status === 'detecting' && <div style={styles.ovalGuide} />}

        {/* Detected expression display */}
        {status === 'detecting' && (
          <div style={{
            ...styles.exprBubble,
            borderColor: exprEmoji ? '#ff6b9d' : 'rgba(255,255,255,0.15)',
          }}>
            {exprEmoji ? (
              <>
                <span style={styles.bigEmoji}>{exprEmoji}</span>
                <p style={styles.exprLabel}>{currentExpr}</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: 32 }}>👤</span>
                <p style={styles.hintText}>Look at the camera</p>
              </>
            )}
          </div>
        )}

        {/* Progress bar */}
        {status === 'detecting' && progress > 0 && (
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressBar,
              width: `${progress * 100}%`,
              background: exprEmoji ? '#ff6b9d' : '#7c3aed',
            }} />
          </div>
        )}

        {/* Done state */}
        {status === 'done' && (
          <div style={styles.doneBox}>
            <span style={styles.doneEmoji}>{doneEmoji}</span>
            <p style={styles.doneTitle}>Reaction posted!</p>
            <p style={styles.doneSub}>Closing in a moment…</p>
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div style={styles.loaderBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading AI models…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={styles.errorBox}>
            <span style={{ fontSize: 40 }}>📷</span>
            <p style={{ color: '#fff', fontWeight: 700 }}>Camera not available</p>
            <button style={styles.retryBtn} onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline styles (no CSS classes — works in any context)
const styles = {
  root:          { position: 'fixed', inset: 0, background: '#0a0a14', overflow: 'hidden' },
  hiddenMedia:   { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
  cameraPreview: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
  overlay:       { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', padding: '20px 24px', boxSizing: 'border-box' },
  closeBtn:      { position: 'absolute', top: 52, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  topSection:    { textAlign: 'center', marginTop: 40 },
  title:         { color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 },
  subtitle:      { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 6 },
  ovalGuide:     { width: 180, height: 240, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.3)' },
  exprBubble:    { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 28px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.6)', minWidth: 130, gap: 6 },
  bigEmoji:      { fontSize: 52 },
  exprLabel:     { color: '#ff6b9d', fontWeight: 700, fontSize: 14, margin: 0, textTransform: 'capitalize' },
  hintText:      { color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 },
  progressTrack: { width: '80%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBar:   { height: '100%', borderRadius: 3, transition: 'width 0.15s ease' },
  doneBox:       { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  doneEmoji:     { fontSize: 80 },
  doneTitle:     { color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 },
  doneSub:       { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  loaderBox:     { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 },
  spinner:       { width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(124,58,237,0.3)', borderTopColor: '#7c3aed', animation: 'spin 1s linear infinite' },
  loadingText:   { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  errorBox:      { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  retryBtn:      { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 15 },
};
