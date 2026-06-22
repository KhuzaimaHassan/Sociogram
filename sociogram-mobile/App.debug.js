/**
 * DEBUG App.js — Minimal test to isolate the PlatformConstants error
 * No external package imports — just core React Native
 */
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.emoji}>🎭</Text>
      <Text style={styles.title}>Sociogram</Text>
      <Text style={styles.sub}>
        SDK Debug Mode{'\n'}
        Platform: {Platform.OS} {Platform.Version}
      </Text>
      <Text style={styles.ok}>✅ Core RN working</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  sub:   { color: '#7070a0', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  ok:    { color: '#34d399', fontSize: 16, fontWeight: '600' },
});
