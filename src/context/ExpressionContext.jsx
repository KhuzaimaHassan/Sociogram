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
  const [showConsentModal, setShowConsentModal] = useState(() => {
    const stored = localStorage.getItem('sociogram_expression_consent');
    return stored === null; // show if never answered
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Load models on consent
  useEffect(() => {
    if (hasConsent && isEnabled) {
      loadFaceApiModels().then(loaded => {
        setIsModelLoaded(loaded);
        if (loaded) startCamera();
      });
    }
  }, [hasConsent, isEnabled]);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) return; // Already active

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      console.log('[Sociogram] Camera started');
    } catch (error) {
      console.warn('[Sociogram] Camera access denied:', error.message);
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
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
    localStorage.setItem('sociogram_expression_consent', 'true');
    localStorage.setItem('sociogram_expression_enabled', 'true');
    setHasConsent(true);
    setIsEnabled(true);
    setShowConsentModal(false);
  }, []);

  const denyConsent = useCallback(() => {
    localStorage.setItem('sociogram_expression_consent', 'false');
    localStorage.setItem('sociogram_expression_enabled', 'false');
    setHasConsent(false);
    setIsEnabled(false);
    setShowConsentModal(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    const newState = !isEnabled;
    localStorage.setItem('sociogram_expression_enabled', String(newState));
    setIsEnabled(newState);
    if (!newState) {
      stopCamera();
    } else if (hasConsent) {
      loadFaceApiModels().then(loaded => {
        setIsModelLoaded(loaded);
        if (loaded) startCamera();
      });
    }
  }, [isEnabled, hasConsent, stopCamera, startCamera]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const value = {
    hasConsent,
    isEnabled,
    isModelLoaded,
    isCameraActive,
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
