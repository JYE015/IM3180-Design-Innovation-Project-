import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  Alert, StyleSheet, ActivityIndicator, 
  KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [school, setSchool] = useState('');
  const [course, setCourse] = useState('');

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
        .select('username, school, course')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setUsername(data.username ?? '');
        setSchool(data.school ?? '');
        setCourse(data.course ?? '');
      } else {
        // Create a profile row if missing
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          role: 'User',
          username: '',
          school: '',
          course: '',
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
          <Text style={styles.label}>Email (read-only)</Text>
          <TextInput style={[styles.input, styles.disabled]} value={email} editable={false} />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. DIP_girlie"
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
