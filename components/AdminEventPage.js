import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';


export default function AdminEventPage({ route, navigation }) {
  const { event } = route.params;
  
  console.log("event:", event);
  console.log("event.id:", event?.id);

  const [evt, setEvt] = useState(event);
  const [signups, setSignups] = useState({
    CurrentParticipants: 0,
    MaximumParticipants: event?.MaximumParticipants ?? 0,
  });
  const [loading, setLoading] = useState(true);

  
  const fetchEventDetails = async () => {
    if (!event?.id) return;
    try {
      const { data, error } = await supabase
        .from('Events')
        .select('id, Title, Date, Time, image_url, MaximumParticipants')
        .eq('id', event.id)
        .single();

      if (error) throw error;

      setEvt({
        id: data.id,
        title: data.Title,
        date: data.Date,
        time: data.Time,
        image_url: data.image_url,
        MaximumParticipants: data.MaximumParticipants,
      });

      setSignups((prev) => ({
        CurrentParticipants: prev.CurrentParticipants ?? 0,
        MaximumParticipants:
          data.MaximumParticipants ?? prev.MaximumParticipants ?? 0,
      }));
    } catch (err) {
      console.error('Error fetching event details:', err);
    }
  };

  const fetchSignups = async () => {
    try {
      if (!event?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('Events')
        .select('CurrentParticipants, MaximumParticipants')
        .eq('id', event.id)   // ← use event.id from props
        .single();  

      if (error) throw error;
      setSignups(data || { CurrentParticipants: 0, MaximumParticipants: 0 });
    } catch (error) {
      console.error('Error fetching signups:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchEventDetails();
      fetchSignups();
    }, [event?.id])
  );

  const formatDate = (date, time) => {
    if (!date) return '';
    const formattedDate = dayjs(date).format('DD MMM YYYY');
    
    if (!time) return formattedDate;
    
    // Handle time with or without seconds (HH:MM:SS or HH:MM)
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    return `${formattedDate}, ${formattedTime}`;
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
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => {
            if (!evt?.id) return;
            navigation.navigate('EditEvent', { 
              eventId: evt.id,
              onUpdated: async () => {       
                await fetchEventDetails();
                await fetchSignups();
              }
            });
          }}
        >
          <Ionicons name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Event Title and Date */}
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{evt?.title}</Text>
        <Text style={styles.eventDate}>
          {formatDate(evt?.date, evt?.time)}
        </Text>
      </View>


      {/* Image */}
      <View style={styles.statsCard}>
        {evt?.image_url ? (
          <Image
            source={{ uri: evt.image_url }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#999' }}>No image</Text>
          </View>
        )}
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Number of Signups</Text>
        <View style={styles.statsNumbers}>
          <Text style={styles.currentNumber}>{signups.CurrentParticipants || 0}</Text>
          <Text style={styles.divider}>/</Text>
          <Text style={styles.maxNumber}>
            {signups.MaximumParticipants || evt?.MaximumParticipants || 0}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.trackingButton}
        onPress={() => navigation.navigate('AdminTrack', { eventId: event.id })}  // Pass eventId to AdminTrack screen
      >
        <Text style={styles.trackingButtonIcon}>📊</Text>
        <Text style={styles.trackingButtonText}>View Events Tracking</Text>
      </TouchableOpacity>
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

  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4E8EF7',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackingButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});