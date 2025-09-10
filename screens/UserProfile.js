import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const user = sessionData.session?.user;
      if (!user) {
        Alert.alert('Not logged in', 'Please log in first.');
        setLoading(false);
        return;
      }

      setEmail(user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, school, course, avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setUsername(data.username ?? '');
        setSchool(data.school ?? '');
        setCourse(data.course ?? '');
        setAvatarUrl(data.avatar_url ?? '');
      } else {
        // Create a profile row if missing
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          role: 'User',
          username: '',
          school: '',
          course: '',
          avatar_url: ''
        });
        if (insertErr) throw insertErr;
      }
    } catch (err) {
      console.log('fetchProfile error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onSave = async () => {
    try {
      setSaving(true);
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const user = sessionData.session?.user;
      if (!user) {
        Alert.alert('Not logged in', 'Please log in first.');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          username: username.trim(),
          school: school.trim(),
          course: course.trim(),
          // avatar_url already updated by upload handler
        },
        { onConflict: 'id' }
      );

      if (error) throw error;
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      console.log('save profile error:', err);
      Alert.alert('Save Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadImage = async () => {
    try {
      // Ask permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow photo library access to upload an avatar.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],   // square crop
        quality: 0.9,
      });

      if (result.canceled) return;

      setUploading(true);

      // Current user
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;
      const user = sessionData.session?.user;
      if (!user) {
        Alert.alert('Not logged in', 'Please log in first.');
        setUploading(false);
        return;
      }

      // Convert local file URI -> Blob
      const localUri = result.assets[0].uri;
      const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      const res = await fetch(localUri);
      const blob = await res.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: blob.type || `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get a public URL
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      // Save to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      Alert.alert('Success', 'Profile photo updated!');
    } catch (err) {
      console.log('avatar upload error:', err);
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Profile</Text>

        <View style={styles.card}>

          {/* Avatar row */}
          <View style={styles.avatarRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#888', fontSize: 12 }}>No photo</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.smallBtn, uploading && { opacity: 0.6 }]}
              onPress={pickAndUploadImage}
              disabled={uploading}
              activeOpacity={0.85}
            >
              <Text style={styles.smallBtnText}>
                {uploading ? 'Uploading…' : 'Upload new photo'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email (read-only)</Text>
          <TextInput style={[styles.input, styles.disabled]} value={email} editable={false} />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. claudia_iem"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>School</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. NTU"
            value={school}
            onChangeText={setSchool}
          />

          <Text style={styles.label}>Course</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Information Engineering & Media"
            value={course}
            onChangeText={setCourse}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator /> : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#333' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eee',
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#4E8EF7',
    borderRadius: 8,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  label: { fontSize: 14, color: '#555', marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabled: { backgroundColor: '#f0f0f0', color: '#777' },
  saveBtn: {
    marginTop: 18,
    height: 52,
    backgroundColor: '#10B981',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
