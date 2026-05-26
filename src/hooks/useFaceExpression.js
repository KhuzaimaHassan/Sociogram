import { useExpression } from '../context/ExpressionContext';

export function useFaceExpression() {
  const {
    isEnabled,
    isModelLoaded,
    isCameraActive,
    detectExpression,
    startCamera,
    stopCamera,
    hasConsent,
  } = useExpression();

  return {
    isEnabled: hasConsent && isEnabled && isCameraActive,
    isModelLoaded,
    isCameraActive,
    detectExpression,
    startCamera,
    stopCamera,
  };
}

export default useFaceExpression;
