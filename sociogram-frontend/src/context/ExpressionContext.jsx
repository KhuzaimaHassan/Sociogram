import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { loadFaceApiModels, detectFaceExpression } from '../utils/faceApiLoader';

const ExpressionContext = createContext(null);

export function ExpressionProvider({ children }) {
  const [hasConsent, setHasConsent] = useState(() => {
    const stored = localStorage.getItem('sociogram_expression_consent');
    return stored === 'true';
  });
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem('sociogram_expression_enabled');
    return stored !== 'false'; // default true if consented
  });
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [expressionError, setExpressionError] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(() => {
    const stored = localStorage.getItem('sociogram_expression_consent');
    return stored === null; // show if never answered
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const cameraRequestRef = useRef(0);

  const startCamera = useCallback(async () => {
    const request = ++cameraRequestRef.current;
    try {
      if (streamRef.current) return; // Already active

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });

      // Permission can resolve after the feature is disabled or unmounted.
      if (request !== cameraRequestRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (request !== cameraRequestRef.current) return;
      setIsCameraActive(true);
      console.log('[Sociogram] Camera started');
    } catch (error) {
      if (request !== cameraRequestRef.current) return;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      console.warn('[Sociogram] Camera access denied:', error.message);
      setIsCameraActive(false);
      setExpressionError('Camera unavailable. You can still use manual reactions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    console.log('[Sociogram] Camera stopped');
  }, []);

  // One owner for model loading and camera lifetime, including slow requests.
  useEffect(() => {
    let cancelled = false;
    if (!hasConsent || !isEnabled) return;
    loadFaceApiModels().then(loaded => {
      if (cancelled) return;
      setIsModelLoaded(loaded);
      if (loaded) {
        startCamera();
      } else {
        setExpressionError('Expression models could not load. You can still use manual reactions.');
      }
    });
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [hasConsent, isEnabled, startCamera, stopCamera]);

  const detectExpression = useCallback(async () => {
    if (!isCameraActive || !videoRef.current || !isModelLoaded) return null;

    // Draw current frame to canvas
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const video = videoRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Detect expression
    const expression = await detectFaceExpression(canvas);
    return expression;
  }, [isCameraActive, isModelLoaded]);

  const grantConsent = useCallback(() => {
    setExpressionError(null);
    localStorage.setItem('sociogram_expression_consent', 'true');
    localStorage.setItem('sociogram_expression_enabled', 'true');
    setHasConsent(true);
    setIsEnabled(true);
    setShowConsentModal(false);
  }, []);

  const denyConsent = useCallback(() => {
    setExpressionError(null);
    localStorage.setItem('sociogram_expression_consent', 'false');
    localStorage.setItem('sociogram_expression_enabled', 'false');
    setHasConsent(false);
    setIsEnabled(false);
    setShowConsentModal(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    setExpressionError(null);
    const newState = !isEnabled;
    localStorage.setItem('sociogram_expression_enabled', String(newState));
    setIsEnabled(newState);
    if (!newState) {
      stopCamera();
    }
  }, [isEnabled, stopCamera]);

  const value = {
    hasConsent,
    isEnabled,
    isModelLoaded,
    isCameraActive,
    expressionError,
    showConsentModal,
    videoRef,
    canvasRef,
    detectExpression,
    startCamera,
    stopCamera,
    grantConsent,
    denyConsent,
    toggleEnabled,
    setShowConsentModal,
  };

  return (
    <ExpressionContext.Provider value={value}>
      {children}
      {/* Hidden video element for camera feed */}
      <video
        ref={videoRef}
        className="camera-hidden"
        playsInline
        muted
        autoPlay
      />
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="camera-hidden" />
    </ExpressionContext.Provider>
  );
}

export function useExpression() {
  const context = useContext(ExpressionContext);
  if (!context) {
    throw new Error('useExpression must be used within ExpressionProvider');
  }
  return context;
}

export default ExpressionContext;
