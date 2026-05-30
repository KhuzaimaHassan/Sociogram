/**
 * HomeScreen.js — Feed screen
 * - Loads posts from /api/posts
 * - FlatList with pull-to-refresh
 * - PostCard per item
 * - Expression camera floating button
 */

import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { colors, font, spacing } from '../theme';
import PostCard from '../components/PostCard';
import ExpressionCamera from '../components/ExpressionCamera';

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [camVisible, setCamVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);

  const loadFeed = useCallback(async (reset = false) => {
    try {
      const params = reset || !cursor ? '' : `?cursor=${cursor}`;
      const data = await api.get(`/api/posts${params}`);
      const newPosts = data.posts || [];
      setPosts((prev) => reset ? newPosts : [...prev, ...newPosts]);
      setCursor(data.nextCursor || null);
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.warn('Feed error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cursor]);

  useEffect(() => { loadFeed(true); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCursor(null);
    loadFeed(true);
  }, []);

  function handleViewPost(post) {
    setCurrentPostId(post.id);
    setCamVisible(true);
    // navigate to comments or just show it
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Sociogram</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerBtn}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Messages')} style={styles.headerBtn}>
            <Text style={{ fontSize: 22 }}>✉️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && posts.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => handleViewPost(item)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          onEndReached={() => hasMore && !loading && loadFeed(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌌</Text>
              <Text style={styles.emptyTitle}>Nothing in your feed yet</Text>
              <Text style={styles.emptyDesc}>Follow people to see their posts here</Text>
            </View>
          }
          ListFooterComponent={hasMore ? <ActivityIndicator color={colors.brand} style={{ padding: 20 }} /> : null}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
        />
      )}

      {/* Expression Camera FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCamVisible(true)} activeOpacity={0.85}>
        <Text style={{ fontSize: 24 }}>🎭</Text>
      </TouchableOpacity>

      {camVisible && (
        <ExpressionCamera
          postId={currentPostId || posts[0]?.id}
          onClose={() => { setCamVisible(false); setCurrentPostId(null); }}
          onReaction={async (emoji) => {
            const id = currentPostId || posts[0]?.id;
            if (!id) return;
            try { await api.post(`/api/posts/${id}/react`, { emoji, source: 'expression' }); }
            catch { /* silent */ }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo:        { fontSize: font.lg, fontWeight: '800', color: colors.brand, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  headerBtn:   { padding: 4 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:       { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIcon:   { fontSize: 48, marginBottom: spacing.md },
  emptyTitle:  { color: colors.white, fontSize: font.md, fontWeight: '700', marginBottom: 6 },
  emptyDesc:   { color: colors.muted, fontSize: font.sm, textAlign: 'center' },
  fab:         { position: 'absolute', bottom: 100, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
});
