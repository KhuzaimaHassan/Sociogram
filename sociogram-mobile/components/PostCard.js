/**
 * PostCard.js — Mobile post card
 */

import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { useState } from 'react';
import { colors, font, spacing, radius } from '../theme';
import { api, mediaUrl } from '../services/api';

const { width: SW } = Dimensions.get('window');

const EMOJIS = ['😍', '😮', '😢', '😂', '😠', '👏'];
const GRADIENTS = ['#1a1a2e', '#0f3460', '#1b262c', '#2c1654', '#1a2744'];

function postVisual(post) {
  const seed = post.id?.charCodeAt(0) || 0;
  return {
    emoji: post.caption?.match(/\p{Emoji}/u)?.[0] || '✨',
    bg: GRADIENTS[seed % GRADIENTS.length],
  };
}

export default function PostCard({ post, onPress }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(null);

  const url = mediaUrl(post.mediaUrl);
  const visual = postVisual(post);

  async function toggleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? c - 1 : c + 1);
    try {
      if (wasLiked) await api.delete(`/api/posts/${post.id}/like`);
      else await api.post(`/api/posts/${post.id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : c - 1);
    }
  }

  async function sendReaction(emoji) {
    setMyReaction(emoji);
    setShowReactions(false);
    try { await api.post(`/api/posts/${post.id}/react`, { emoji, source: 'manual' }); }
    catch { /* silent */ }
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{post.user?.avatar || '😎'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.username}>{post.user?.username}</Text>
          {post.location ? <Text style={styles.location}>{post.location}</Text> : null}
        </View>
        {post.isReel ? <View style={styles.reelBadge}><Text style={styles.reelText}>Reel</Text></View> : null}
      </View>

      {/* Media */}
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} onLongPress={() => setShowReactions(true)}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={[styles.media, { height: SW }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.textPost, { height: SW * 0.65, backgroundColor: visual.bg }]}>
            <Text style={styles.textPostEmoji}>{visual.emoji}</Text>
            {post.caption ? (
              <Text style={styles.textPostCaption} numberOfLines={5}>{post.caption}</Text>
            ) : null}
          </View>
        )}
        {myReaction ? (
          <View style={styles.myReactionBadge}>
            <Text style={{ fontSize: 22 }}>{myReaction}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Reaction picker */}
      {showReactions && (
        <View style={styles.reactionPicker}>
          {EMOJIS.map((e) => (
            <TouchableOpacity key={e} onPress={() => sendReaction(e)} style={styles.reactionBtn}>
              <Text style={{ fontSize: 26 }}>{e}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowReactions(false)} style={styles.reactionBtn}>
            <Text style={{ color: colors.muted, fontSize: 18, fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
          <Text style={[styles.actionIcon, liked && { color: '#ff4d6d' }]}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post._count?.comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onLongPress={() => setShowReactions(true)}>
          <Text style={styles.actionIcon}>😊</Text>
          {myReaction ? <Text style={styles.actionCount}>{myReaction}</Text> : null}
        </TouchableOpacity>
      </View>

      {/* Caption (for media posts) */}
      {url && post.caption ? (
        <View style={styles.captionWrap}>
          <Text style={styles.captionUser}>{post.user?.username} </Text>
          <Text style={styles.captionTxt}>{post.caption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card:             { backgroundColor: colors.bg, marginBottom: 2 },
  header:           { flexDirection: 'row', alignItems: 'center', padding: spacing.base, paddingBottom: spacing.sm },
  avatar:           { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji:      { fontSize: 20 },
  username:         { color: colors.white, fontWeight: '700', fontSize: font.sm },
  location:         { color: colors.muted, fontSize: font.xs, marginTop: 1 },
  reelBadge:        { backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  reelText:         { color: colors.white, fontSize: font.xs, fontWeight: '700' },
  media:            { width: SW, backgroundColor: colors.elevated },
  textPost:         { width: SW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  textPostEmoji:    { fontSize: 72, marginBottom: spacing.base },
  textPostCaption:  { color: colors.text, fontSize: font.md, textAlign: 'center', lineHeight: 24 },
  myReactionBadge:  { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full, padding: 6 },
  reactionPicker:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: colors.elevated, gap: 4 },
  reactionBtn:      { padding: spacing.sm },
  actions:          { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  actionBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionIcon:       { fontSize: 22 },
  actionCount:      { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  captionWrap:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  captionUser:      { color: colors.white, fontWeight: '700', fontSize: font.sm },
  captionTxt:       { color: colors.text, fontSize: font.sm },
});
