/**
 * HomeScreen.js — Feed with posts + expression camera FAB
 */

import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { colors, font, spacing } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../components/PostCard';
import ExpressionCamera from '../components/ExpressionCamera';

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [camVisible, setCamVisible] = useState(false);
  const [currentPostId, setCurrentPostId] = useState(null);

  async function fetchPosts(reset = false) {
    try {
      const skip = reset ? 0 : posts.length;
      const data = await api.get(`/api/posts?skip=${skip}&limit=10`);
      const newPosts = data.posts || [];
      if (reset) setPosts(newPosts);
      else setPosts((p) => [...p, ...newPosts]);
      setHasMore(newPosts.length === 10);
    } catch (err) {
      console.warn('Feed error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { fetchPosts(true); }, []);

  function onRefresh() {
    setRefreshing(true);
    fetchPosts(true);
  }

  function onEndReached() {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    fetchPosts(false);
  }

  function handleOpenPost(post) {
    setCurrentPostId(post.id);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Sociogram</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={26} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Messages')}>
            <Ionicons name="chatbubbles-outline" size={26} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && posts.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.brand} size="large" />
          <Text style={styles.loadingText}>Loading feed…</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PostCard post={item} onPress={() => handleOpenPost(item)} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="planet-outline" size={64} color={colors.muted} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyTitle}>Nothing in your feed</Text>
              <Text style={styles.emptyDesc}>Follow people to see their posts here</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={colors.brand} style={{ padding: 20 }} />
              : null
          }
        />
      )}

      {/* Expression Camera FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCamVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="happy-outline" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Expression Camera Modal */}
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
  logo:        { fontSize: font.lg, fontWeight: '900', color: colors.brand, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  headerBtn:   { padding: 6 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.muted, fontSize: font.sm },
  empty:       { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyIcon:   { fontSize: 48, marginBottom: spacing.md },
  emptyTitle:  { color: colors.white, fontSize: font.md, fontWeight: '700', marginBottom: 6 },
  emptyDesc:   { color: colors.muted, fontSize: font.sm, textAlign: 'center' },
  fab:         { position: 'absolute', bottom: 90, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
});
