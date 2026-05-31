/**
 * ExpressionCamera.js — Real-time Face Expression Detection
 *
 * Uses react-native-vision-camera + vision-camera-face-detector for
 * AUTOMATIC facial expression detection running at 30fps on the device.
 *
 * This is the FULL original feature — no WebView, no emoji picker.
 * Face landmarks (smile probability, eye openness, etc.) are detected
 * directly on the camera frame using Google ML Kit.
 *
 * Requires native build (Android Studio) — not Expo Go.
 */

import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useFaceDetector } from 'vision-camera-face-detector';
import { colors, font, spacing, radius } from '../theme';

// Map face landmarks → expression → emoji
function classifyExpression(face) {
  if (!face) return null;

  const smileProb       = face.smilingProbability ?? 0;
  const leftEyeOpen    = face.leftEyeOpenProbability ?? 1;
  const rightEyeOpen   = face.rightEyeOpenProbability ?? 1;
  const eyeOpenAvg     = (leftEyeOpen + rightEyeOpen) / 2;

  // Smile detected
  if (smileProb > 0.75) return { expression: 'happy',     emoji: '😍', label: 'Happy!',    confidence: smileProb };

  // Eyes nearly closed (winking or sleepy) with not smiling
  if (eyeOpenAvg < 0.25 && smileProb < 0.4) return { expression: 'fearful', emoji: '😢', label: 'Sad',       confidence: 1 - eyeOpenAvg };

  // Mouth open + not smiling = surprised
  // (Vision Camera face detector includes headEulerAngleY for head tilt)
  if (smileProb < 0.2 && eyeOpenAvg > 0.8) return { expression: 'surprised', emoji: '😮', label: 'Surprised!', confidence: eyeOpenAvg };

  // Strong smile → love
  if (smileProb > 0.5) return { expression: 'happy', emoji: '😊', label: 'Smiling!', confidence: smileProb };

  return null;
}

const STABLE_REQUIRED = 20; // frames at ~30fps = ~0.66s

export default function ExpressionCamera({ onReaction, onClose }) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  const [status, setStatus]       = useState('idle'); // idle | detecting | done
  const [current, setCurrent]     = useState(null);   // { expression, emoji, label, confidence }
  const [progress, setProgress]   = useState(0);
  const [doneResult, setDone]     = useState(null);

  const stableCountRef  = useRef(0);
  const lastExprRef     = useRef(null);
  const progressAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim       = useRef(new Animated.Value(1)).current;

  // Start pulsing the face oval
  useEffect(() => {
    if (status === 'detecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => pulseAnim.stopAnimation();
  }, [status]);

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  // Start detecting once permission granted
  useEffect(() => {
    if (hasPermission) setStatus('detecting');
  }, [hasPermission]);

  const { detectFaces } = useFaceDetector({
    performanceMode: 'fast',
    classifyFaces: true,  // enables smilingProbability, eyeOpenProbability
    trackingEnabled: true,
  });

  // Frame processor — called on every camera frame
  const frameProcessor = useCallback((frame) => {
    'worklet';
    const faces = detectFaces(frame);
    if (!faces || faces.length === 0) {
      stableCountRef.current = 0;
      lastExprRef.current    = null;
      return;
    }

    const result = classifyExpression(faces[0]);
    if (!result) {
      stableCountRef.current = 0;
      lastExprRef.current    = null;
      return;
    }

    if (result.expression === lastExprRef.current) {
      stableCountRef.current += 1;
    } else {
      stableCountRef.current = 1;
      lastExprRef.current    = result.expression;
    }

    const pct = stableCountRef.current / STABLE_REQUIRED;
    // Note: worklet can't call setState directly — use runOnJS
    runOnJS(handleDetection)(result, Math.min(pct, 1));
  }, []);

  function handleDetection(result, pct) {
    if (status === 'done') return;

    setCurrent(result);
    setProgress(pct);

    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 80,
      useNativeDriver: false,
    }).start();

    if (pct >= 1 && stableCountRef.current >= STABLE_REQUIRED) {
      setStatus('done');
      setDone(result);
      onReaction?.(result.emoji, result.expression);
      setTimeout(() => onClose(), 2500);
    }
  }

  // Permission not granted
  if (!hasPermission) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={styles.bigText}>Camera Permission Needed</Text>
          <Text style={styles.subText}>
            Sociogram uses your camera to automatically detect your expression and react to posts.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.muted }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={styles.bigText}>Front camera not available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Live camera feed */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={status !== 'done'}
        frameProcessor={frameProcessor}
        fps={30}
      />

      {/* Dark overlay */}
      <View style={styles.overlay}>

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>🎭 Expression Reactions</Text>
          <Text style={styles.subtitle}>
            {status === 'done' ? 'Reaction posted!' : 'Hold your expression steady'}
          </Text>
        </View>

        {/* Face oval guide */}
        {status === 'detecting' && (
          <Animated.View style={[styles.oval, {
            borderColor: current ? colors.brand : 'rgba(255,255,255,0.25)',
            transform: [{ scale: pulseAnim }],
          }]} />
        )}

        {/* Expression badge */}
        {status === 'detecting' && current && (
          <View style={styles.exprBadge}>
            <Text style={styles.exprEmoji}>{current.emoji}</Text>
            <Text style={styles.exprLabel}>{current.label}</Text>
            <Text style={styles.exprConf}>{Math.round(current.confidence * 100)}%</Text>
          </View>
        )}

        {/* No face hint */}
        {status === 'detecting' && !current && (
          <View style={styles.hintBox}>
            <Text style={{ fontSize: 32 }}>👤</Text>
            <Text style={styles.hintText}>Look at the camera</Text>
          </View>
        )}

        {/* Progress bar */}
        {status === 'detecting' && progress > 0 && (
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, {
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
        )}

        {/* Done state */}
        {status === 'done' && doneResult && (
          <View style={styles.doneBox}>
            <Text style={styles.doneEmoji}>{doneResult.emoji}</Text>
            <Text style={styles.doneTitle}>Reaction Posted!</Text>
            <Text style={styles.doneSub}>{doneResult.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#000' },
  overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: spacing.xl, paddingVertical: 48 },
  closeBtn:      { position: 'absolute', top: 52, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  titleBox:      { alignItems: 'center', marginTop: 40 },
  title:         { color: '#fff', fontSize: font.md, fontWeight: '800', textAlign: 'center' },
  subtitle:      { color: 'rgba(255,255,255,0.55)', fontSize: font.xs, marginTop: 6 },
  oval:          { width: 200, height: 270, borderRadius: 100, borderWidth: 2.5, borderStyle: 'dashed' },
  exprBadge:     { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.xl, padding: spacing.md, borderWidth: 1.5, borderColor: colors.brand, minWidth: 120 },
  exprEmoji:     { fontSize: 52 },
  exprLabel:     { color: colors.brand, fontWeight: '700', fontSize: font.sm, marginTop: 4 },
  exprConf:      { color: colors.muted, fontSize: font.xs },
  hintBox:       { alignItems: 'center', gap: spacing.sm },
  hintText:      { color: 'rgba(255,255,255,0.45)', fontSize: font.sm },
  progressTrack: { width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBar:   { height: '100%', backgroundColor: colors.brand, borderRadius: 3 },
  doneBox:       { alignItems: 'center', gap: spacing.sm },
  doneEmoji:     { fontSize: 90 },
  doneTitle:     { color: '#fff', fontSize: font.lg, fontWeight: '800' },
  doneSub:       { color: colors.muted, fontSize: font.sm },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  bigText:       { color: '#fff', fontSize: font.md, fontWeight: '800', textAlign: 'center', marginTop: spacing.md },
  subText:       { color: colors.muted, fontSize: font.sm, textAlign: 'center', lineHeight: 20, marginVertical: spacing.md },
  btn:           { backgroundColor: colors.brand, borderRadius: radius.xl, paddingHorizontal: 32, paddingVertical: 14, marginTop: spacing.md },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: font.base },
});
