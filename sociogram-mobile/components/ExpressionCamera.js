/**
 * ExpressionCamera.js — Expression detection using expo-camera SDK 56
 *
 * Uses CameraView with onFacesDetected (built-in, no separate package needed).
 * Detects: happy (smile), sad (closed eyes + no smile), surprised (eyes wide open).
 */

import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, font, spacing, radius } from '../theme';

const { width: SW } = Dimensions.get('window');

const EXPRESSIONS = {
  happy:     { emoji: '😍', label: 'Happy 😊',    color: '#ff6b9d' },
  sad:       { emoji: '😢', label: 'Sad 😢',      color: '#64b5f6' },
  surprised: { emoji: '😮', label: 'Surprised!',  color: '#ffd54f' },
  neutral:   { emoji: null,  label: 'Neutral',     color: colors.muted },
};

function classify(face) {
  const smile = face.smilingProbability    ?? 0;
  const lEye  = face.leftEyeOpenProbability  ?? 1;
  const rEye  = face.rightEyeOpenProbability ?? 1;
  const eyes  = (lEye + rEye) / 2;
  if (smile > 0.65)            return 'happy';
  if (smile < 0.2 && eyes < 0.35) return 'sad';
  if (smile < 0.45 && eyes > 0.82) return 'surprised';
  return 'neutral';
}

const REQUIRED = 8; // stable frames before posting

export default function ExpressionCamera({ postId, onReaction, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [detected, setDetected] = useState(null);
  const [done, setDone]    = useState(false);
  const [showUndo, setShowUndo] = useState(false);

  const stableRef  = useRef(0);
  const lastExpr   = useRef(null);
  const undoTimer  = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    return () => clearTimeout(undoTimer.current);
  }, []);

  const handleFaces = useCallback(({ faces }) => {
    if (done || !faces?.length) {
      stableRef.current = 0;
      lastExpr.current  = null;
      setDetected(null);
      progressAnim.setValue(0);
      return;
    }

    const expr = classify(faces[0]);

    if (expr === lastExpr.current) {
      stableRef.current += 1;
    } else {
      stableRef.current = 1;
      lastExpr.current  = expr;
      progressAnim.setValue(0);
    }

    const pct = Math.min(stableRef.current / REQUIRED, 1);
    Animated.timing(progressAnim, { toValue: pct, duration: 80, useNativeDriver: false }).start();
    setDetected(EXPRESSIONS[expr] ?? EXPRESSIONS.neutral);

    if (stableRef.current >= REQUIRED && expr !== 'neutral') {
      setDone(true);
      onReaction?.(EXPRESSIONS[expr].emoji);
      setShowUndo(true);
      undoTimer.current = setTimeout(() => { setShowUndo(false); onClose(); }, 3500);
    }
  }, [done]);

  function handleUndo() {
    clearTimeout(undoTimer.current);
    onClose();
  }

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={styles.permBox}>
        <Text style={styles.permTitle}>📷 Camera Permission</Text>
        <Text style={styles.permDesc}>Sociogram needs your camera to detect facial expressions and post reactions automatically.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted, fontSize: font.sm }}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.root}>
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

      <View style={styles.overlay}>
        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={{ color: colors.white, fontSize: font.md, fontWeight: '700' }}>✕</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.topText}>
          <Text style={styles.title}>🎭 Expression Reactions</Text>
          <Text style={styles.sub}>Hold an expression steady for ~1 second</Text>
        </View>

        {/* Oval face guide */}
        <View style={styles.ovalGuide} />

        {/* Detected expression */}
        {detected?.emoji ? (
          <View style={[styles.bubble, { borderColor: detected.color }]}>
            <Text style={{ fontSize: 52 }}>{detected.emoji}</Text>
            <Text style={[styles.exprLabel, { color: detected.color }]}>{detected.label}</Text>
          </View>
        ) : (
          <View style={styles.bubble}>
            <Text style={{ fontSize: 28 }}>👤</Text>
            <Text style={styles.hintText}>Face the camera</Text>
          </View>
        )}

        {/* Progress bar */}
        {!done && (
          <View style={styles.progressTrack}>
            <Animated.View style={[
              styles.progressBar,
              { width: progressWidth, backgroundColor: detected?.color || colors.brand }
            ]} />
          </View>
        )}

        {/* Done / Undo */}
        {done && (
          <View style={styles.doneWrap}>
            <Text style={styles.doneText}>{detected?.emoji} Reaction posted!</Text>
            {showUndo && (
              <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
                <Text style={styles.undoText}>Undo (tap)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: spacing.xl },
  closeBtn:     { position: 'absolute', top: 54, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  topText:      { alignItems: 'center', marginTop: 48 },
  title:        { color: colors.white, fontSize: font.lg, fontWeight: '800', textAlign: 'center' },
  sub:          { color: colors.muted, fontSize: font.xs, textAlign: 'center', marginTop: 4 },
  ovalGuide:    { width: 190, height: 250, borderRadius: 95, borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)', borderStyle: 'dashed' },
  bubble:       { alignItems: 'center', minWidth: 130, padding: spacing.md, borderRadius: radius.xl, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(0,0,0,0.55)' },
  exprLabel:    { fontSize: font.sm, fontWeight: '700', marginTop: 6 },
  hintText:     { color: colors.muted, fontSize: font.xs, marginTop: 6 },
  progressTrack:{ width: SW - 80, height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' },
  progressBar:  { height: '100%', borderRadius: 3 },
  doneWrap:     { alignItems: 'center', gap: spacing.sm },
  doneText:     { color: colors.white, fontSize: font.md, fontWeight: '800' },
  undoBtn:      { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.full, paddingHorizontal: 28, paddingVertical: 10 },
  undoText:     { color: colors.white, fontWeight: '600', fontSize: font.sm },
  // Permission screen
  permBox:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  permTitle:    { color: colors.white, fontSize: font.lg, fontWeight: '800', marginBottom: spacing.md },
  permDesc:     { color: colors.muted, fontSize: font.sm, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  permBtn:      { backgroundColor: colors.brand, borderRadius: radius.xl, paddingHorizontal: 32, paddingVertical: 14 },
  permBtnText:  { color: colors.white, fontWeight: '700', fontSize: font.base },
});
