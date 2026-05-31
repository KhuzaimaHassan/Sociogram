/**
 * ExpressionCamera.js — Automatic Face Expression Detection
 *
 * HOW IT WORKS (native build):
 *   1. Request camera permission via expo-camera (OS level)
 *   2. Load https://sociogram-rho.vercel.app/expression in a WebView
 *   3. The Vercel-hosted page runs face-api.js with getUserMedia (front cam)
 *   4. face-api.js detects 7 expressions in real-time:
 *      happy | sad | angry | surprised | fearful | disgusted | neutral
 *   5. Results come back via postMessage → onMessage
 *   6. onReaction(emoji, expression) fires and the reaction is posted
 *
 * WHY WEBVIEW INSTEAD OF NATIVE LIBRARY:
 *   - face-api.js gives 7 expression probability scores (vision-camera gives 2)
 *   - Already deployed and working at /expression route on Vercel
 *   - No native module compilation issues
 *   - Works perfectly in native Android builds
 *
 * This preserves the FULL automatic detection feature.
 */

import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { useCameraPermissions } from 'expo-camera';
import { colors, font, spacing, radius } from '../theme';

const EXPRESSION_URL = 'https://sociogram-rho.vercel.app/expression';

export default function ExpressionCamera({ onReaction, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [permAsked, setPermAsked]       = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const webViewRef = useRef(null);

  // Request OS camera permission before WebView loads (required for getUserMedia)
  useEffect(() => {
    if (!permission?.granted && !permAsked) {
      setPermAsked(true);
      requestPermission();
    }
  }, [permission, permAsked]);

  function handleMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'READY':
          setLoading(false);
          break;
        case 'EXPRESSION':
          // face-api.js detected a stable expression automatically
          onReaction?.(data.emoji, data.expression);
          break;
        case 'CLOSE':
          onClose?.();
          break;
        case 'ERROR':
          setError(true);
          setLoading(false);
          break;
      }
    } catch { /* ignore non-JSON bridge noise */ }
  }

  // CRITICAL: grant camera to the WebView on Android
  function handlePermissionRequest(event) {
    event.grant(event.resources);
  }

  // Permission denied UI
  if (permission && !permission.granted) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>📷</Text>
          <Text style={styles.permTitle}>Camera Permission Needed</Text>
          <Text style={styles.permDesc}>
            Sociogram uses your camera to automatically detect your facial expression and react to posts.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.muted, fontSize: font.sm }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Loading overlay — shown until face-api READY fires */}
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingTitle}>Loading expression AI…</Text>
          <Text style={styles.loadingSubText}>
            TinyFaceDetector + FaceExpressionNet{'\n'}
            7 expressions • Powered by face-api.js
          </Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>⚠️</Text>
          <Text style={styles.permTitle}>Could not load detector</Text>
          <Text style={styles.permDesc}>Check your internet connection.{'\n'}The AI runs on our servers.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setError(false); setLoading(true); webViewRef.current?.reload(); }}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.muted, fontSize: font.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* The WebView — face-api.js expression detector */}
      {!error && permission?.granted && (
        <WebView
          ref={webViewRef}
          source={{ uri: EXPRESSION_URL }}
          style={styles.webView}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onMessage={handleMessage}
          onPermissionRequest={handlePermissionRequest}   // Android camera grant
          mediaCapturePermissionGrantType="grant"          // iOS camera grant
          onError={() => { setError(true); setLoading(false); }}
          onHttpError={() => { setError(true); setLoading(false); }}
          originWhitelist={['https://*']}
          mixedContentMode="never"
        />
      )}

      {/* Close button */}
      {!loading && !error && (
        <TouchableOpacity style={styles.floatingClose} onPress={onClose}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#0a0a14' },
  webView:        { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: '#0a0a14', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingTitle:   { color: colors.white, fontSize: font.md, fontWeight: '700' },
  loadingSubText: { color: colors.muted, fontSize: font.xs, textAlign: 'center', lineHeight: 18 },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permTitle:      { color: colors.white, fontSize: font.md, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  permDesc:       { color: colors.muted, fontSize: font.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  primaryBtn:     { backgroundColor: colors.brand, borderRadius: radius.xl, paddingHorizontal: 32, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },
  floatingClose:  { position: 'absolute', top: 52, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
});
