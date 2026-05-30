/**
 * AuthScreen.js — Login & Register
 */

import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, font, spacing, radius } from '../theme';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function field(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'login') {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        if (!form.username || form.username.length < 3) {
          setError('Username must be at least 3 characters'); setLoading(false); return;
        }
        await register({ username: form.username.trim().toLowerCase(), email: form.email.trim(), password: form.password, displayName: form.displayName.trim() || form.username });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0a0a0f', '#0e0e1c', '#0a0a14']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>Sociogram</Text>
            <Text style={styles.logoSub}>Connect · Create · Express 🎭</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {['login', 'register'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => { setTab(t); setError(null); }}
                style={[styles.tab, tab === t && styles.tabActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'login' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fields */}
          <View style={styles.form}>
            {tab === 'register' && (
              <>
                <Field label="Username" value={form.username} onChangeText={(v) => field('username', v)}
                  placeholder="e.g. alex.wanderer" autoCapitalize="none" autoCorrect={false} />
                <Field label="Display Name" value={form.displayName} onChangeText={(v) => field('displayName', v)}
                  placeholder="Your name (optional)" />
              </>
            )}
            <Field label="Email" value={form.email} onChangeText={(v) => field('email', v)}
              placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Field label="Password" value={form.password} onChangeText={(v) => field('password', v)}
              placeholder="Min. 6 characters" secureTextEntry />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.85} style={styles.btnWrap}>
            <LinearGradient colors={[colors.brand, colors.accent]} start={[0, 0]} end={[1, 0]} style={styles.btn}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>{tab === 'login' ? '🚀 Sign In' : '✨ Create Account'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.hint}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: colors.brand, fontWeight: '700' }} onPress={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(null); }}>
              {tab === 'login' ? 'Sign up' : 'Sign in'}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:        { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingTop: 60 },
  logoWrap:      { alignItems: 'center', marginBottom: spacing.xxl },
  logo:          { fontSize: 36, fontWeight: '900', color: colors.brand, letterSpacing: -1 },
  logoSub:       { fontSize: font.sm, color: colors.muted, marginTop: 6 },
  tabs:          { flexDirection: 'row', backgroundColor: colors.elevated, borderRadius: radius.lg, padding: 4, marginBottom: spacing.xl },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.md },
  tabActive:     { backgroundColor: colors.surface },
  tabText:       { fontSize: font.sm, color: colors.muted, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  form:          { marginBottom: spacing.sm },
  label:         { fontSize: font.xs, color: colors.muted, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input:         { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, color: colors.white, fontSize: font.sm },
  errorBox:      { backgroundColor: 'rgba(255,77,109,0.1)', borderWidth: 1, borderColor: 'rgba(255,77,109,0.25)', borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  errorText:     { color: colors.rose, fontSize: font.xs },
  btnWrap:       { borderRadius: radius.xl, overflow: 'hidden', marginTop: spacing.sm },
  btn:           { paddingVertical: 16, alignItems: 'center' },
  btnText:       { color: colors.white, fontSize: font.base, fontWeight: '800', letterSpacing: 0.3 },
  hint:          { textAlign: 'center', color: colors.muted, fontSize: font.xs, marginTop: spacing.lg },
});
