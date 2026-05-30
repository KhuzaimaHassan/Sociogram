/**
 * ExploreScreen.js — Search users + discover posts grid
 */

import { View, Text, TextInput, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, mediaUrl } from '../services/api';
import { colors, font, spacing, radius } from '../theme';

const { width: SW } = Dimensions.get('window');
const CELL = (SW - 2) / 3;

export default function ExploreScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.get('/api/posts/explore?limit=30')
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setUserResults([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) setUserResults(res || []);
      } catch { if (!cancelled) setUserResults([]); }
      finally { if (!cancelled) setSearching(false); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const showSearch = query.trim().length >= 2;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search creators…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={{ color: colors.muted, fontSize: 16, paddingRight: 8 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSearch ? (
        <FlatList
          data={userResults}
          keyExtractor={(u) => u.id}
          renderItem={({ item: u }) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => navigation.navigate('Profile', { username: u.username })}
              activeOpacity={0.7}
            >
              <Text style={styles.userAvatar}>{u.avatar || '😎'}</Text>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.userName}>{u.username}</Text>
                {u.displayName && <Text style={styles.userDisplay}>{u.displayName}</Text>}
              </View>
              <FollowBtn userId={u.id} initial={u.isFollowing} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !searching && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>No creators found</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={posts}
          numColumns={3}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          renderItem={({ item: p }) => {
            const url = mediaUrl(p.mediaUrl);
            return (
              <TouchableOpacity style={[styles.cell, { width: CELL, height: CELL }]} activeOpacity={0.85}>
                {url ? (
                  <Image source={{ uri: url }} style={{ width: CELL, height: CELL }} resizeMode="cover" />
                ) : (
                  <View style={[styles.cell, { width: CELL, height: CELL, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 30 }}>✨</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🌌</Text>
                <Text style={styles.emptyText}>Nothing here yet</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function FollowBtn({ userId, initial }) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (following) { await api.delete(`/api/users/${userId}/follow`); setFollowing(false); }
      else { await api.post(`/api/users/${userId}/follow`); setFollowing(true); }
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <TouchableOpacity onPress={toggle} style={[styles.followBtn, following && styles.followingBtn]}>
      <Text style={[styles.followText, following && { color: colors.muted }]}>
        {busy ? '…' : following ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.elevated, borderRadius: radius.md, margin: spacing.base, paddingHorizontal: spacing.sm },
  searchIcon:   { fontSize: 16, marginRight: 4 },
  searchInput:  { flex: 1, color: colors.white, fontSize: font.sm, paddingVertical: 10 },
  userRow:      { flexDirection: 'row', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  userAvatar:   { fontSize: 28 },
  userName:     { color: colors.white, fontWeight: '700', fontSize: font.sm },
  userDisplay:  { color: colors.muted, fontSize: font.xs, marginTop: 2 },
  followBtn:    { backgroundColor: colors.brand, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 6 },
  followingBtn: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border },
  followText:   { color: colors.white, fontSize: font.xs, fontWeight: '700' },
  cell:         { overflow: 'hidden' },
  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyIcon:    { fontSize: 40, marginBottom: spacing.md },
  emptyText:    { color: colors.muted, fontSize: font.sm },
});
