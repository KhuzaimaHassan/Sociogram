import { useState, useEffect, useRef, useCallback } from 'react';

export function useDwell({ postId, onDwellComplete, dwellDuration = 5000, threshold = 0.6 }) {
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isDwelling, setIsDwelling] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const animFrameRef = useRef(null);
  const completedRef = useRef(false);

  const resetDwell = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startTimeRef.current = null;
    setDwellProgress(0);
    setIsDwelling(false);
  }, []);

  const updateProgress = useCallback(() => {
    if (!startTimeRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min((elapsed / dwellDuration) * 100, 100);
    setDwellProgress(progress);

    if (progress < 100) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [dwellDuration]);

  const startDwell = useCallback(() => {
    if (completedRef.current) return;

    startTimeRef.current = Date.now();
    setIsDwelling(true);
    animFrameRef.current = requestAnimationFrame(updateProgress);

    timerRef.current = setTimeout(() => {
      setDwellProgress(100);
      setIsDwelling(false);
      completedRef.current = true;
      if (onDwellComplete) {
        onDwellComplete();
      }
    }, dwellDuration);
  }, [dwellDuration, onDwellComplete, updateProgress]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Reset completed state when postId changes
    completedRef.current = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          startDwell();
        } else {
          resetDwell();
        }
      },
      { threshold: [threshold] }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      resetDwell();
    };
  }, [postId, threshold, startDwell, resetDwell]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return { dwellProgress, isDwelling, ref };
}

export default useDwell;
