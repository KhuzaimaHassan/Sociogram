/**
 * PostCard.js — Mobile post card component
 * Shows: avatar, username, media/emoji, caption, like/comment counts, reaction bar
 */

import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useRef } from 'react';
import { Video, ResizeMode } from 'expo-av';
import { colors, font, spacing, radius } from '../theme';
import { api, mediaUrl } from '../services/api';

const { width: SW } = Dimensions.get('window');

const EMOJIS = ['😍', '😮', '😢', '😂', '😠', '👏'];
const GRADIENTS = [
  '#1a1a2e, #16213e',
  '#0f3460, #533483',
  '#1b262c, #0a3d62',
  '#2c1654, #4a1a8c',
  '#1a2744, #0d7377',
];

function postVisual(post) {
  const seed = post.id?.charCodeAt(0) || 0;
  return {
    emoji: post.caption?.match(/[\u{1F300}-\u{1F9FF}]/gu)?.[0] || '✨',
    gradient: GRADIENTS[seed % GRADIENTS.length],
  };
}

export default function PostCard({ post, onPress }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [myReaction, setMyReaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const url = mediaUrl(post.mediaUrl);
  const visual = postVisual(post);

  async function toggleLike() {
    setLiked((l) => !l);
    setLikeCount((c) => liked ? c - 1 : c + 1);
    try {
      if (liked) {
        await api.delete(`/api/posts/${post.id}/like`);
      } else {
        await api.post(`/api/posts/${post.id}/like`);
      }
    } catch { /* revert */ setLiked((l) => !l); setLikeCount((c) => liked ? c + 1 : c - 1); }
  }

  async function sendReaction(emoji) {
    setMyReaction(emoji);
    setShowReactions(false);
    try {
      await api.post(`/api/posts/${post.id}/react`, { emoji, source: 'manual' });
    } catch { /* silent */ }
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity style={styles.header} activeOpacity={0.7} onPress={() => {}}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{post.user?.avatar || '😎'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.username}>{post.user?.username}</Text>
          {post.location ? <Text style={styles.location}>{post.location}</Text> : null}
        </View>
        {post.isReel && (
          <View style={styles.reelBadge}><Text style={styles.reelText}>Reel</Text></View>
        )}
      </TouchableOpacity>

      {/* Media */}
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} onLongPress={() => setShowReactions(true)}>
        {url ? (
          post.mediaType === 'video' ? (
            <Video
              source={{ uri: url }}
              style={[styles.media, { height: SW }]}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={false}
              useNativeControls={false}
            />
          ) : (
            <Image source={{ uri: url }} style={[styles.media, { height: SW }]} resizeMode="cover" />
          )
        ) : (
          <View style={[styles.media, styles.textPost, { height: SW * 0.7 }]}>
            <Text style={styles.emoji}>{visual.emoji}</Text>
            {post.caption ? <Text style={styles.captionInCard} numberOfLines={4}>{post.caption}</Text> : null}
          </View>
        )}

        {/* My reaction badge */}
        {myReaction && (
          <View style={styles.myReactionBadge}>
            <Text style={{ fontSize: 22 }}>{myReaction}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Reactions picker */}
      {showReactions && (
        <View style={styles.reactionPicker}>
          {EMOJIS.map((e) => (
            <TouchableOpacity key={e} onPress={() => sendReaction(e)} style={styles.reactionBtn}>
              <Text style={{ fontSize: 26 }}>{e}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowReactions(false)} style={styles.reactionBtn}>
            <Text style={styles.cancelReact}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionLeft}>
          <TouchableOpacity onPress={toggleLike} style={styles.actionBtn}>
            <Text style={[styles.actionIcon, liked && { color: '#ff4d6d' }]}>
              {liked ? '❤️' : '🤍'}
            </Text>
            <Text style={styles.actionCount}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionCount}>{post._count?.comments || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onLongPress={() => setShowReactions(true)}>
            <Text style={styles.actionIcon}>😊</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Caption */}
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
  card:           { backgroundColor: colors.bg, marginBottom: 8 },
  header:         { flexDirection: 'row', alignItems: 'center', padding: spacing.base, paddingBottom: spacing.sm },
  avatar:         { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji:    { fontSize: 20 },
  username:       { color: colors.white, fontWeight: '700', fontSize: font.sm },
  location:       { color: colors.muted, fontSize: font.xs, marginTop: 1 },
  reelBadge:      { backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  reelText:       { color: colors.white, fontSize: font.xs, fontWeight: '700' },
  media:          { width: SW, backgroundColor: colors.elevated },
  textPost:       { alignItems: 'center', justifyContent: 'center', backgroundColor: '#12121e', paddingHorizontal: spacing.xl },
  emoji:          { fontSize: 72, marginBottom: spacing.base },
  captionInCard:  { color: colors.text, fontSize: font.md, textAlign: 'center', lineHeight: 24 },
  myReactionBadge:{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full, padding: 6 },
  reactionPicker: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: colors.elevated, gap: 4 },
  reactionBtn:    { padding: spacing.sm },
  cancelReact:    { color: colors.muted, fontSize: font.md, fontWeight: '600' },
  actions:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  actionLeft:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon:     { fontSize: 22 },
  actionCount:    { color: colors.text, fontSize: font.sm, fontWeight: '600' },
  captionWrap:    { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  captionUser:    { color: colors.white, fontWeight: '700', fontSize: font.sm },
  captionTxt:     { color: colors.text, fontSize: font.sm },
});
