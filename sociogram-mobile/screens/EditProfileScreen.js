import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api, mediaUrl } from '../services/api';
import { colors, font, spacing, radius } from '../theme';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUri, setAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      if (displayName !== user?.displayName) formData.append('displayName', displayName);
      if (bio !== user?.bio) formData.append('bio', bio);
      
      if (avatarUri) {
        const ext = avatarUri.split('.').pop() || 'jpeg';
        formData.append('media', {
          uri: avatarUri,
          name: `avatar.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
      }

      const updatedUser = await api.put('/api/users/me', formData, { isForm: true });
      updateUser(updatedUser); // Context update
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const currentAvatar = avatarUri || (user?.avatar?.startsWith('http') || user?.avatar?.startsWith('/uploads') ? mediaUrl(user.avatar) : null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.brand} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickImage}>
            {currentAvatar ? (
              <Image source={{ uri: currentAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarImage, { backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 40 }}>{user?.avatar || '😎'}</Text>
              </View>
            )}
            <View style={styles.avatarEditIcon}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelp}>Tap to change avatar</Text>
        </View>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter display name"
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={150}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: font.md, fontWeight: '700' },
  saveBtn: { color: colors.brand, fontSize: font.md, fontWeight: '700', padding: 4 },
  form: { padding: spacing.base },
  avatarSection: { alignItems: 'center', marginVertical: spacing.lg },
  avatarWrap: { position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarEditIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.brand, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.bg },
  avatarHelp: { color: colors.brand, marginTop: spacing.sm, fontWeight: '600' },
  label: { color: colors.muted, fontSize: font.sm, marginBottom: 8, marginTop: spacing.md },
  input: { backgroundColor: colors.elevated, color: colors.white, padding: spacing.base, borderRadius: radius.md, fontSize: font.base },
});
