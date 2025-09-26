import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export default function AdminEventPage({ route, navigation }) {
  const { event } = route.params;
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSignups();
  }, []);

  const fetchSignups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('Events')
        .select('CurrentParticipants, MaximumParticipants')
        .eq('id', event.id)
        .single();

      if (error) throw error;
      setSignups(data || { CurrentParticipants: 0, MaximumParticipants: 0 });
    } catch (error) {
      console.error('Error fetching signups:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date, time) => {
    if (!date) return '';
    const formattedDate = dayjs(date).format('DD MMM YYYY');
    return time ? `${formattedDate}, ${time}` : formattedDate;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >

        </TouchableOpacity>
        <Text style={styles.headerTitle}>TRACKER</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Event Title and Date */}
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDate}>
          {formatDate(event.date, event.time)}
        </Text>
      </View>

      {/* Image */}
      <View style={styles.statsCard}>
        <Image
                source={{ uri: event.image_url }}
                style={styles.image}
              />
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Number of Signups</Text>
        <View style={styles.statsNumbers}>
          <Text style={styles.currentNumber}>{signups.CurrentParticipants || 0}</Text>
          <Text style={styles.divider}>/</Text>
          <Text style={styles.maxNumber}>{signups.MaximumParticipants || event.MaximumParticipants}</Text>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 8,
  },
  eventHeader: {
    backgroundColor: '#e6f3ff',
    padding: 16,
    borderRadius: 8,
    margin: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  eventDate: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
   image: {
    width: '100%',    // Takes full width of parent container
    height: 150,      // Fixed height
    borderRadius: 10,
    resizeMode: 'cover',  // Ensures image fills the space
},
  statsNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  divider: {
    fontSize: 32,
    color: '#666',
    marginHorizontal: 8,
  },
  maxNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  signupsList: {
    flex: 1,
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  signupCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4E8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  studentInfo: {
    fontSize: 14,
    color: '#666',
  },
});