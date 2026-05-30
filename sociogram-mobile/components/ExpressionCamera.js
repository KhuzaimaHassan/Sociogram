/**
 * ExpressionCamera.js — The signature mobile feature!
 *
 * Uses expo-camera + expo-face-detector to detect facial expressions in real-time:
 *   - smilingProbability > 0.7  → 😍 (happy)
 *   - smilingProbability < 0.2 + left/rightEyeOpenProbability < 0.3 → 😢 (sad)
 *   - smilingProbability 0.3-0.6 + both eyes very open → 😮 (surprised)
 *   - Default neutral (no post) → user must hold 2s for a confident result
 *
 * Shows a fullscreen camera with a face bounding box, detected emotion, and countdown.
 */

import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions, Camera } from 'expo-camera';
import { colors, font, spacing, radius } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

const EMOJI_MAP = {
  happy:     { emoji: '😍', label: 'Happy', color: '#ff6b9d' },
  sad:       { emoji: '😢', label: 'Sad',   color: '#64b5f6' },
  surprised: { emoji: '😮', label: 'Wow!',  color: '#ffd54f' },
  neutral:   { emoji: null,  label: 'Neutral', color: colors.muted },
};

function classifyExpression(face) {
  const smile   = face.smilingProbability     ?? 0;
  const leftEye = face.leftEyeOpenProbability  ?? 1;
  const rightEye= face.rightEyeOpenProbability ?? 1;
  const eyes    = (leftEye + rightEye) / 2;

  if (smile > 0.68) return 'happy';
  if (smile < 0.18 && eyes < 0.35) return 'sad';
  if (smile < 0.4 && eyes > 0.85) return 'surprised';
  return 'neutral';
}

export default function ExpressionCamera({ postId, onReaction, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detected, setDetected] = useState(null); // { expression, emoji, label, color }
  const [stable, setStable] = useState(0);        // how many frames same expression
  const [done, setDone] = useState(false);
  const [undo, setUndo] = useState(false);
  const lastExpr = useRef(null);
  const stableCount = useRef(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef(null);
  const REQUIRED_FRAMES = 8; // ~0.8s at 10fps

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleFaces = useCallback(({ faces }) => {
    if (done || !faces || faces.length === 0) {
      stableCount.current = 0;
      lastExpr.current = null;
      setDetected(null);
      setStable(0);
      return;
    }

    const expr = classifyExpression(faces[0]);
    if (expr === lastExpr.current) {
      stableCount.current += 1;
    } else {
      stableCount.current = 1;
      lastExpr.current = expr;
      progressAnim.setValue(0);
    }

    const pct = Math.min(stableCount.current / REQUIRED_FRAMES, 1);
    setStable(Math.round(pct * 100));
    setDetected(EMOJI_MAP[expr] || EMOJI_MAP.neutral);

    if (stableCount.current >= REQUIRED_FRAMES && expr !== 'neutral') {
      setDone(true);
      Animated.timing(progressAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
      fireReaction(EMOJI_MAP[expr].emoji);
    } else {
      Animated.timing(progressAnim, { toValue: pct, duration: 100, useNativeDriver: false }).start();
    }
  }, [done]);

  function fireReaction(emoji) {
    onReaction?.(emoji);
    setUndo(false);
    // Show undo option for 3s then auto-close
    undoTimer.current = setTimeout(() => onClose(), 3000);
    setUndo(true);
  }

  function handleUndo() {
    clearTimeout(undoTimer.current);
    // TODO: call API to delete the reaction
    onClose();
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
        <Text style={{ color: colors.white, fontSize: font.md, textAlign: 'center', paddingHorizontal: 24 }}>
          Camera permission is needed for Expression Reactions
        </Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.closeBtn, { backgroundColor: colors.brand }]}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: colors.muted }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="front"
        onFacesDetected={handleFaces}
        faceDetectorSettings={{
          mode: 'fast',
          detectLandmarks: 'none',
          runClassifications: 'all',
          minDetectionInterval: 100,
          tracking: true,
        }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Close */}
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: colors.white, fontSize: font.lg }}>✕</Text>
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>Expression Reactions</Text>
        <Text style={styles.sub}>Hold a clear expression for 1 second</Text>

        {/* Face guide oval */}
        <View style={styles.ovalGuide} />

        {/* Detected expression */}
        {detected && detected.emoji && (
          <View style={[styles.detectedBubble, { borderColor: detected.color }]}>
            <Text style={styles.detectedEmoji}>{detected.emoji}</Text>
            <Text style={[styles.detectedLabel, { color: detected.color }]}>{detected.label}</Text>
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, {
            width: progressWidth,
            backgroundColor: detected?.color || colors.brand,
          }]} />
        </View>

        {/* Done / Undo */}
        {done && (
          <View style={styles.doneWrap}>
            <Text style={styles.doneText}>
              {detected?.emoji} Reaction posted!
            </Text>
            {undo && (
              <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
                <Text style={styles.undoBtnText}>Undo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!detected && !done && (
          <Text style={styles.hint}>👤 Face the camera</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { position: 'absolute', inset: 0, zIndex: 100, backgroundColor: '#000' },
  overlay:        { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60, paddingHorizontal: spacing.xl, backgroundColor: 'rgba(0,0,0,0.35)' },
  closeBtn:       { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  title:          { color: colors.white, fontSize: font.lg, fontWeight: '800', textAlign: 'center', marginTop: 60 },
  sub:            { color: colors.muted, fontSize: font.sm, textAlign: 'center', marginTop: 4 },
  ovalGuide:      { width: 200, height: 260, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' },
  detectedBubble: { alignItems: 'center', borderWidth: 2, borderRadius: radius.xl, padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.6)', minWidth: 120 },
  detectedEmoji:  { fontSize: 48 },
  detectedLabel:  { fontSize: font.sm, fontWeight: '700', marginTop: 4 },
  progressTrack:  { width: SW - 80, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  progressBar:    { height: '100%', borderRadius: 2 },
  doneWrap:       { alignItems: 'center', gap: spacing.md },
  doneText:       { color: colors.white, fontSize: font.md, fontWeight: '700' },
  undoBtn:        { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full, paddingHorizontal: 24, paddingVertical: 10 },
  undoBtnText:    { color: colors.white, fontWeight: '600', fontSize: font.sm },
  hint:           { color: colors.muted, fontSize: font.sm },
});
