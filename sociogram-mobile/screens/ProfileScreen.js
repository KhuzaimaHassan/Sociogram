/**
 * ProfileScreen.js — User profile (own + others)
 */

import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, mediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, font, spacing, radius } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const CELL = (SW - 2) / 3;

export default function ProfileScreen({ route, navigation }) {
  const { username: routeUsername } = route?.params || {};
  const { user: me, logout } = useAuth();
  const username = routeUsername || me?.username;
  const isOwn = !routeUsername || routeUsername === me?.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    api.get(`/api/users/${username}`)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  async function toggleFollow() {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      if (profile.isFollowing) {
        await api.delete(`/api/users/${profile.id}/follow`);
        setProfile((p) => ({ ...p, isFollowing: false, _count: { ...p._count, followers: Math.max(0, (p._count.followers || 0) - 1) } }));
      } else {
        await api.post(`/api/users/${profile.id}/follow`);
        setProfile((p) => ({ ...p, isFollowing: true, _count: { ...p._count, followers: (p._count.followers || 0) + 1 } }));
      }
    } catch { /* silent */ } finally { setFollowBusy(false); }
  }

  async function handleMessage() {
    try {
      const conv = await api.post('/api/conversations', { recipientId: profile.id });
      navigation.navigate('Chat', { conversationId: conv.id, username: profile.username });
    } catch { /* silent */ }
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color={colors.brand} size="large" /></View>;
  if (!profile) return (
    <View style={styles.centered}>
      <Ionicons name="person-outline" size={64} color={colors.muted} style={{ marginBottom: spacing.sm }} />
      <Text style={styles.notFoundText}>User not found</Text>
    </View>
  );

  const posts = profile.posts || [];
  const counts = profile._count || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerUsername}>{profile.username}</Text>
          {isOwn && (
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {/* Profile info */}
        <View style={styles.infoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{profile.avatar || '😎'}</Text>
          </View>
          <View style={styles.stats}>
            {[['Posts', counts.posts], ['Followers', counts.followers], ['Following', counts.following]].map(([label, val]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.statVal}>{val || 0}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.base, marginBottom: spacing.md }}>
          <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>
          {isOwn ? (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Text style={styles.actionBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={() => { logout(); }}>
                <Text style={[styles.actionBtnText, { color: colors.rose }]}>Log out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, profile.isFollowing && styles.followingBtn]}
                onPress={toggleFollow}
                disabled={followBusy}
              >
                <Text style={[styles.actionBtnText, profile.isFollowing && { color: colors.muted }]}>
                  {followBusy ? '…' : profile.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleMessage}>
                <Text style={styles.actionBtnText}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Posts grid */}
        <View style={styles.gridWrap}>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="camera-outline" size={48} color={colors.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {posts.map((p) => {
                const url = mediaUrl(p.mediaUrl);
                const isVideo = p.mediaType === 'video';
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={{ width: CELL, height: CELL }}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('PostDetail', { postId: p.id })}
                  >
                    {url ? (
                      <>
                        <Image source={{ uri: url }} style={{ width: CELL, height: CELL }} resizeMode="cover" />
                        {isVideo && (
                          <View style={{ position: 'absolute', top: 8, right: 8 }}>
                            <Ionicons name="play" size={20} color="rgba(255,255,255,0.9)" />
                          </View>
                        )}
                      </>
                    ) : (
                      <View style={{ width: CELL, height: CELL, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="image-outline" size={32} color={colors.muted} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  notFoundEmoji: { fontSize: 48, marginBottom: 12 },
  notFoundText:  { color: colors.muted, fontSize: font.md },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.base },
  backBtn:       { padding: 4 },
  headerUsername:{ color: colors.white, fontWeight: '700', fontSize: font.md },
  infoRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, marginBottom: spacing.md },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xl },
  avatarEmoji:   { fontSize: 42 },
  stats:         { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat:          { alignItems: 'center' },
  statVal:       { color: colors.white, fontWeight: '800', fontSize: font.lg },
  statLabel:     { color: colors.muted, fontSize: font.xs, marginTop: 2 },
  displayName:   { color: colors.white, fontWeight: '700', fontSize: font.sm },
  bio:           { color: colors.text, fontSize: font.sm, marginTop: 4, lineHeight: 20 },
  btnRow:        { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, marginBottom: spacing.md },
  actionBtn:     { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  actionBtnText: { color: colors.white, fontWeight: '700', fontSize: font.sm },
  followingBtn:  { backgroundColor: 'rgba(255,255,255,0.04)' },
  dangerBtn:     { borderColor: 'rgba(255,77,109,0.3)' },
  gridWrap:      { borderTopWidth: 1, borderTopColor: colors.border },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  emptyPosts:    { alignItems: 'center', paddingTop: 48 },
  emptyText:     { color: colors.muted, fontSize: font.sm },
});
