import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  StyleSheet,
  Text, 
  TextInput, 
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';

const formatEventDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '—';
  const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString(); // device locale
};

export default function UserProfile() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [attendedEvents, setAttendedEvents] = useState([]);
  const [showEvents, setShowEvents] = useState(false);

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
        await supabase.from('profiles').insert({
          id: user.id,
          role: 'User',
          username: '',
          school: '',
          course: '',
          avatar_url: ''
        });
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

  const fetchAttendedEvents = useCallback(async () => {
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

      // 1) Attendance rows
      const { data: rows, error: rowsErr } = await supabase
        .from('attendance')
        .select('id, created_at, event')
        .eq('user', user.id)
        .order('created_at', { ascending: false });

      if (rowsErr) throw rowsErr;

      if (!rows?.length) {
        setAttendedEvents([]);
        return;
      }

      // 2) Events by IDs
      const eventIds = [...new Set(rows.map(r => r.event).filter(Boolean))];
      const { data: events, error: evErr } = await supabase
        .from('Events')
        .select('id, Title, Description, Date, Time')
        .in('id', eventIds);

      if (evErr) throw evErr;

      const eventMap = new Map(events.map(e => [e.id, e]));
      const merged = rows.map(r => ({
        ...r,
        eventData: eventMap.get(r.event) || null,
      }));

      setAttendedEvents(merged);
    } catch (err) {
      console.log('fetchAttendedEvents error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // FIXED LOGOUT FUNCTION
  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', 'Failed to log out');
                return;
              }
              // Fixed navigation - navigate to root stack and reset to Login
              const parentNavigator = navigation.getParent();
              if (parentNavigator) {
                parentNavigator.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
                // Fallback if getParent() doesn't work
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            } catch (err) {
              console.log('Logout error:', err);
              Alert.alert('Error', 'Something went wrong during logout');
            }
          },
        },
      ]
    );
  };

  // Pick image from gallery
const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImageToSupabase(result.assets[0].uri);
    }
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
  }
};

// Take photo with camera
const takePhoto = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImageToSupabase(result.assets[0].uri);
    }
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
  }
};

// Show image options dialog
const showImageOptionsDialog = () => {
  Alert.alert(
    'Select Profile Photo',
    'Choose how you want to add a photo',
    [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Gallery', onPress: pickImage },
      ...(avatarUrl ? [{ text: 'Remove Photo', onPress: removePhoto, style: 'destructive' }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};

// Remove photo
const removePhoto = async () => {
  try {
    setUploading(true);
    
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;
    const user = sessionData.session?.user;
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: '' })
      .eq('id', user.id);

    if (updateError) throw updateError;

    setAvatarUrl('');
    Alert.alert('Success', 'Profile photo removed!');
  } catch (err) {
    console.log('remove photo error:', err);
    Alert.alert('Error', err.message);
  } finally {
    setUploading(false);
  }
};

// Upload image to Supabase (using ArrayBuffer like CreateEvent)
const uploadImageToSupabase = async (imageUri) => {
  if (!imageUri) return;

  try {
    setUploading(true);

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;
    const user = sessionData.session?.user;
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      setUploading(false);
      return;
    }

    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    // Convert file URI → ArrayBuffer (like CreateEvent)
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();

    // Upload as ArrayBuffer
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) throw updateError;

    setAvatarUrl(publicUrl);
    Alert.alert('Success', 'Profile photo updated!');
  } catch (err) {
    console.error('avatar upload error:', err);
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
          {/* Avatar */}
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
              onPress={showImageOptionsDialog}
              disabled={uploading}
              activeOpacity={0.85}
            >
              <Text style={styles.smallBtnText}>
                {uploading ? 'Uploading…' : avatarUrl ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Email (read-only)</Text>
          <TextInput style={[styles.input, styles.disabled]} value={email} editable={false} />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. username"
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

          {/* Attended events toggle */}
          <TouchableOpacity
            style={[styles.smallBtn, { marginTop: 12 }]}
            onPress={() => {
              if (!showEvents) fetchAttendedEvents();
              setShowEvents(!showEvents);
            }}
          >
            <Text style={styles.smallBtnText}>
              {showEvents ? 'Hide Attended Events' : 'Show Attended Events'}
            </Text>
          </TouchableOpacity>

          {showEvents && (
            <View style={{ marginTop: 12 }}>
              {attendedEvents.length > 0 ? (
                attendedEvents.map((row) => {
                  const ev = row.eventData || {};
                  const eventName = ev.Title || `Event #${row.event}`;
                  const eventWhen = formatEventDateTime(ev.Date, ev.Time);

                  return (
                    <View key={row.id} style={styles.eventItem}>
                      <Text style={styles.eventText}>{eventName}</Text>
                      {ev.Description ? <Text style={styles.eventMeta}>{ev.Description}</Text> : null}
                      <Text style={styles.eventDate}>Event date & time: {eventWhen}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: '#888' }}>No events attended yet.</Text>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout} 
            activeOpacity={0.85}
          >
            <Text style={styles.logoutText}>Log Out</Text>
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

  eventItem: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  eventText: { fontWeight: '700', fontSize: 15, color: '#222' },
  eventMeta: { color: '#666', marginTop: 2, fontSize: 13 },
  eventDate: { fontSize: 12, color: '#444', marginTop: 4 },

  logoutBtn: {
    marginTop: 12,
    height: 52,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});