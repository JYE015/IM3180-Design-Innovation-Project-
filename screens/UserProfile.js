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
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';

// ✅ NEW: Import useTinderView
import { useTinderView } from '../context/TinderViewContext';

const formatEventDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '—';
  const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString();
};

const isPastEvent = (dateStr, timeStr) => {
  if (!dateStr) return false;
  const iso = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
  const eventDate = new Date(iso);
  return eventDate < new Date();
};

export default function UserProfile() {
  const navigation = useNavigation();
  
  // ✅ NEW: Get reset function from context
  const { resetTinderView } = useTinderView();
  
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
              
              // ✅ NEW: Reset TinderView position on logout
              resetTinderView();
              
              const parentNavigator = navigation.getParent();
              if (parentNavigator) {
                parentNavigator.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              } else {
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

      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

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
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>UPDATE PROFILE</Text>
          <View style={styles.headerLogo}>
            <Image 
              source={require('../assets/hall1logo.png')} 
              style={styles.headerLogoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Avatar positioned to overlap */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarBorderTop} />
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarLarge} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <TouchableOpacity 
          style={styles.editIconContainer}
          onPress={showImageOptionsDialog} 
          disabled={uploading}
          >
            <Feather name="edit-2" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {/* Space for avatar overlap */}
          <View style={styles.avatarSpace} />

          <Text style={styles.label}>Email</Text>
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
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                <Text style={styles.saveText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smallBtn}
            onPress={() => {
              if (!showEvents) fetchAttendedEvents();
              setShowEvents(!showEvents);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AntDesign name="unordered-list" size={18} color="white" />
              <Text style={styles.smallBtnText}>
              {showEvents ? 'Hide Attended Events' : 'Show Attended Events'}
              </Text>
            </View>
          </TouchableOpacity>

          {showEvents && (
            <View style={styles.attendedSection}>
              {attendedEvents.length > 0 ? (
                attendedEvents
                  .filter(row => {
                    const ev = row.eventData || {};
                    return isPastEvent(ev.Date, ev.Time);
                  })
                  .map((row) => {
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
                <Text style={styles.attendedEmpty}>No past events attended.</Text>
              )}
            </View>
          )}

          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout} 
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  container: { 
    flexGrow: 1, 
    backgroundColor: '#ffffff',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#B8C4FE',
    paddingHorizontal: 20,
    paddingTop: 75,
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-ExtraBold',
    color: '#333',
  },
  headerLogo: {
    width: 45,
    height: 45,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
  },
  headerLogoImage: {
    width: '90%',
    height: '90%',
  },  
  
  // Avatar wrapper - positioned to overlap
  avatarWrapper: {
    alignItems: 'center',
    marginTop: 20,
    zIndex: 10,
  },
  avatarBorderTop: {
    position: 'absolute',
    top: -5,
    width: 130,
    height: 70,
    borderTopLeftRadius: 63,
    borderTopRightRadius: 63,
    borderWidth: 6,
    borderBottomWidth: 0,
    borderColor: '#B8C4FE',
    backgroundColor: 'transparent',
  },

  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D3D3D3',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D3D3D3',
  },

  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    padding: 16,
    marginTop: -60,
    marginBottom: 0, 
    paddingTop: 50,
    paddingBottom: 40,
    borderWidth: 6,
    borderColor: '#B8C4FE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: '100%', 
  },

  avatarSpace: {
    height: 0,
  },

  smallBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#4E8EF7',
    borderRadius: 10,
    alignItems: 'center',   
    justifyContent: 'center',
    height: 52,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
    fontFamily: 'Baloo2-ExtraBold',
    textAlign: 'center', 
  },

  label: { 
    fontSize: 14, 
    color: '#555', 
    marginTop: 8, 
    marginBottom: 2, 
    fontWeight: '600',
    fontFamily: 'Baloo2-SemiBold',
  },
  input: {
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontFamily: 'Baloo2-Regular',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  saveText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 18,
    fontFamily: 'Baloo2-ExtraBold',
  },
  attendedSection: {
    marginTop: 12,
    padding: 12,
    paddingLeft: 14,          
    backgroundColor: '#DBE7FF', 
    borderRadius: 14,
    borderLeftWidth: 5,
    borderLeftColor: '#2563eb',
  },
  attendedEmpty: {
    color: '#666',
    fontFamily: 'Baloo2-Regular',
  },
  eventItem: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventText: { fontFamily: 'Baloo2-ExtraBold', fontSize: 15, color: '#222' },
  eventMeta: { fontFamily: 'Baloo2-Regular',color: '#666', fontSize: 13 },
  eventDate: { fontFamily: 'Baloo2-SemiBold',fontSize: 12, color: '#444', marginTop: 4 },

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
    fontSize: 18,
    fontFamily: 'Baloo2-ExtraBold',
  },
});