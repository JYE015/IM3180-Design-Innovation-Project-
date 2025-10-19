import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AdminAnnouncements({ navigation }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handlePost = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Please fill in both fields.');
      return;
    }

    const { error } = await supabase
      .from('Announcements')
      .insert([{ title, message }]);

    if (error) {
      console.error('Insert error:', error);
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Announcement posted!');
      setTitle('');
      setMessage('');
      navigation.goBack();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Post New Announcement</Text>

      <TextInput
        style={styles.input}
        placeholder="Announcement Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Write your announcement here..."
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={6}
      />

      <TouchableOpacity style={styles.button} onPress={handlePost}>
        <Text style={styles.buttonText}>Publish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-Bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Baloo2-Regular',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#0055FF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Baloo2-ExtraBold',
  },
});