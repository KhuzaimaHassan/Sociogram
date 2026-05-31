/**
 * ExpressionCamera.js — Automatic Face Expression Reactions (Expo Go SDK 54)
 *
 * ARCHITECTURE:
 *   1. Request OS camera permission via expo-camera (required before WebView can use it)
 *   2. Load https://sociogram-rho.vercel.app/expression in a react-native-webview
 *   3. The hosted page runs face-api.js (same as the web app) with getUserMedia
 *   4. Results come back via window.ReactNativeWebView.postMessage → onMessage
 *   5. We fire onReaction(emoji, expression) and onClose() accordingly
 *
 * WHY WEBVIEW:
 *   - expo-face-detector is REMOVED from expo-camera SDK 54
 *   - @tensorflow/tfjs-react-native requires expo-gl (not in Expo Go)
 *   - react-native-webview IS bundled in Expo Go
 *   - HTTPS pages can access camera via getUserMedia inside WebView
 *   - face-api.js models are already deployed at /models on Vercel
 *
 * This preserves 100% of the original automatic detection feature.
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

  // Step 1: Request OS camera permission before the WebView loads
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
          // Models loaded, camera streaming — hide loading indicator
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
          console.warn('[ExpressionCamera] page error:', data.message);
          setError(true);
          setLoading(false);
          break;

        default:
          break;
      }
    } catch {
      // Not JSON — ignore bridge noise
    }
  }

  // Grant camera permission when WebView's web page asks for it
  // This is the CRITICAL step for Android getUserMedia to work
  function handlePermissionRequest(event) {
    event.grant(event.resources);
  }

  function handleWebViewError() {
    setError(true);
    setLoading(false);
  }

  // Show permission request UI if denied
  if (permission && !permission.granted) {
    return (
      <View style={styles.root}>
        <View style={styles.centeredBox}>
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
      {/* Loading overlay — shown until face-api READY message arrives */}
      {loading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingTitle}>Loading expression AI…</Text>
          <Text style={styles.loadingSubText}>
            TinyFaceDetector + FaceExpressionNet{'\n'}Powered by face-api.js
          </Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.centeredBox}>
          <Text style={{ fontSize: 48, marginBottom: spacing.md }}>⚠️</Text>
          <Text style={styles.permTitle}>Could not load detector</Text>
          <Text style={styles.permDesc}>
            Check your internet connection.{'\n'}The expression AI runs on our servers.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setError(false);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.muted, fontSize: font.sm }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* The WebView — loads face-api.js expression detector page */}
      {!error && permission?.granted && (
        <WebView
          ref={webViewRef}
          source={{ uri: EXPRESSION_URL }}
          style={styles.webView}
          // Enable JS and media
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // Handle messages from the page
          onMessage={handleMessage}
          // CRITICAL: Grant camera/mic to the web page on Android
          onPermissionRequest={handlePermissionRequest}
          // iOS camera grant
          mediaCapturePermissionGrantType="grant"
          // Error handling
          onError={handleWebViewError}
          onHttpError={handleWebViewError}
          // Allow our Vercel domain
          originWhitelist={['https://*']}
          mixedContentMode="never"
        />
      )}

      {/* Close button — always visible */}
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
  centeredBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  permTitle:      { color: colors.white, fontSize: font.md, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  permDesc:       { color: colors.muted, fontSize: font.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  primaryBtn:     { backgroundColor: colors.brand, borderRadius: radius.xl, paddingHorizontal: 32, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: font.base },
  floatingClose:  { position: 'absolute', top: 52, right: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
});
