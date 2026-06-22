import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '../theme';

export default function NotificationsScreen() {
  // Currently mock data as backend notifications endpoint isn't fully implemented
  const notifications = [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={64} color={colors.muted} style={{ marginBottom: spacing.md }} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyDesc}>You don't have any notifications right now.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.white, fontSize: font.lg, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.white, fontSize: font.md, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { color: colors.muted, fontSize: font.sm, textAlign: 'center' },
});
