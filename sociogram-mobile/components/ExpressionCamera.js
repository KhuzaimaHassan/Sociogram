/**
 * ExpressionCamera.js — Expression Reaction Picker (SDK 54 compatible)
 *
 * Since expo-camera 16 removed onFacesDetected, this component uses
 * expo-camera for a LIVE PREVIEW (so the user can see themselves) while
 * showing an emoji picker overlay. The user sees their own face and taps
 * the emoji that matches their expression — same UX, works everywhere.
 *
 * On devices/permissions where camera is unavailable, falls back to
 * a pure emoji picker sheet.
 */

import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Platform,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, font, spacing, radius } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

const REACTIONS = [
  { emoji: '😍', label: 'Love it!' },
  { emoji: '😮', label: 'Wow!'    },
  { emoji: '😂', label: 'Haha!'   },
  { emoji: '😢', label: 'Sad'     },
  { emoji: '😠', label: 'Angry'   },
  { emoji: '👏', label: 'Clap!'   },
];

export default function ExpressionCamera({ postId, onReaction, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const scaleAnims = useRef(REACTIONS.map(() => new Animated.Value(1))).current;
  const doneAnim = useRef(new Animated.Value(0)).current;

  function handlePick(idx) {
    const { emoji } = REACTIONS[idx];
    setSelected(idx);

    // Bounce animation on selected emoji
    Animated.sequence([
      Animated.spring(scaleAnims[idx], { toValue: 1.5, useNativeDriver: true, speed: 30 }),
      Animated.spring(scaleAnims[idx], { toValue: 1,   useNativeDriver: true, speed: 20 }),
    ]).start();

    // Fade in done overlay
    Animated.timing(doneAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    setDone(true);
    onReaction?.(emoji);

    // Auto close after 2.5s
    setTimeout(() => onClose(), 2500);
  }

  const cameraReady = permission?.granted;

  return (
    <View style={styles.root}>
      {/* Camera preview or dark background */}
      {cameraReady ? (
        <CameraView style={StyleSheet.absoluteFill} facing="front" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a0a14' }]} />
      )}

      {/* Dark overlay */}
      <View style={styles.overlay}>

        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.top}>
          <Text style={styles.title}>🎭 How does this post make you feel?</Text>
          <Text style={styles.sub}>Tap the emoji that matches your expression</Text>
        </View>

        {/* Emoji grid */}
        {!done ? (
          <View style={styles.grid}>
            {REACTIONS.map(({ emoji, label }, idx) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handlePick(idx)}
                activeOpacity={0.7}
                style={styles.reactionCell}
              >
                <Animated.Text style={[styles.reactionEmoji, { transform: [{ scale: scaleAnims[idx] }] }]}>
                  {emoji}
                </Animated.Text>
                <Text style={styles.reactionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Animated.View style={[styles.doneBox, { opacity: doneAnim }]}>
            <Text style={styles.doneEmoji}>{REACTIONS[selected]?.emoji}</Text>
            <Text style={styles.doneTitle}>Reaction posted!</Text>
            <Text style={styles.doneSub}>{REACTIONS[selected]?.label}</Text>
          </Animated.View>
        )}

        {/* Camera permission hint */}
        {!cameraReady && (
          <TouchableOpacity onPress={requestPermission} style={styles.camHint}>
            <Text style={styles.camHintText}>📷 Enable camera to see yourself</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 48 },
  closeBtn:      { position: 'absolute', top: 52, right: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:      { color: colors.white, fontSize: 16, fontWeight: '700' },
  top:           { alignItems: 'center', paddingTop: 40 },
  title:         { color: colors.white, fontSize: font.md, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  sub:           { color: colors.muted, fontSize: font.xs, textAlign: 'center', marginTop: 8 },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, width: SW - 40 },
  reactionCell:  { alignItems: 'center', width: (SW - 80) / 3, paddingVertical: spacing.md, borderRadius: radius.xl, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  reactionEmoji: { fontSize: 44 },
  reactionLabel: { color: colors.muted, fontSize: font.xs, marginTop: 6, fontWeight: '600' },
  doneBox:       { alignItems: 'center', gap: spacing.sm },
  doneEmoji:     { fontSize: 80 },
  doneTitle:     { color: colors.white, fontSize: font.lg, fontWeight: '800' },
  doneSub:       { color: colors.muted, fontSize: font.sm },
  camHint:       { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.08)' },
  camHintText:   { color: colors.muted, fontSize: font.xs },
});
