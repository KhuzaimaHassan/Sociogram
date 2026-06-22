import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import PostCard from '../components/PostCard';
import { colors, font, spacing } from '../theme';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params || {};
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    api.get(`/api/posts/${postId}`)
      .then(setPost)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.brand} /></View>
      ) : post ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <PostCard post={post} />
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} style={{ marginBottom: spacing.sm }} />
          <Text style={{ color: colors.white }}>Post not found</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: font.md, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
