/**
 * MessagesScreen.js — Conversation list
 */

import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, font, spacing, radius } from '../theme';

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

export default function MessagesScreen({ navigation }) {
  const { user: me } = useAuth();
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/conversations')
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getOther(conv) {
    if (!conv.participantA || !conv.participantB) return null;
    return conv.participantA.id === me?.id ? conv.participantB : conv.participantA;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Explore')} style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brand} /></View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => c.id}
          renderItem={({ item: conv }) => {
            const other = getOther(conv);
            if (!other) return null;
            const last = conv.messages?.[conv.messages.length - 1];
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('Chat', { conversationId: conv.id, username: other.username })}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 26 }}>{other.avatar || '😎'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{other.username}</Text>
                    {last && <Text style={styles.rowTime}>{timeAgo(last.createdAt)}</Text>}
                  </View>
                  {last && <Text style={styles.rowMsg} numberOfLines={1}>{last.text}</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>✉️</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptyDesc}>Search for people to start a conversation</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:     { color: colors.white, fontWeight: '800', fontSize: font.lg },
  newBtn:    { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  newBtnText:{ color: colors.white, fontSize: font.xs, fontWeight: '700' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row:       { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar:    { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  rowTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName:   { color: colors.white, fontWeight: '700', fontSize: font.sm },
  rowTime:   { color: colors.muted, fontSize: font.xs },
  rowMsg:    { color: colors.muted, fontSize: font.xs, marginTop: 2 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: colors.white, fontWeight: '700', fontSize: font.md, marginBottom: 6 },
  emptyDesc: { color: colors.muted, fontSize: font.sm, textAlign: 'center', paddingHorizontal: 32 },
});
