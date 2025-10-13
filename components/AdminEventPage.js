import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export default function AdminEventPage({ route, navigation }) {
  const { event } = route.params;
  
  console.log("event:", event);
  console.log("event.id:", event?.id);

  const [evt, setEvt] = useState(event);
  const [fullEventData, setFullEventData] = useState(null);
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
        .select('*')
        .eq('id', event.id)
        .single();

      if (error) throw error;

      setFullEventData(data);
      setEvt({
        id: data.id,
        title: data.Title,
        date: data.Date,
        time: data.Time,
        image_url: data.image_url,
        MaximumParticipants: data.MaximumParticipants,
        description: data.Description,
        location: data.Location,
        tags: data.Tags,
        deadline: data.Deadline,
      });

      setSignups((prev) => ({
        CurrentParticipants: data.CurrentParticipants ?? 0,
        MaximumParticipants: data.MaximumParticipants ?? 0,
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

  useFocusEffect(
    React.useCallback(() => {
      fetchEventDetails();
      fetchSignups();
    }, [event?.id])
  );

  const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).format('DD MMM YYYY');
  };

  const formatTime = (time) => {
    if (!time) return '';
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Details</Text>
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
            <Ionicons name="create-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Event Image */}
        {evt?.image_url ? (
          <Image
            source={{ uri: evt.image_url }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.eventImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}

        {/* Event Content */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.eventTitle}>{evt?.title}</Text>

          {/* Tags */}
          {evt?.tags && (
            <View style={styles.tagsContainer}>
              {evt.tags.split(',').map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Date & Time */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.detailText}>
              {formatDate(evt?.date)} at {formatTime(evt?.time)}
            </Text>
          </View>

          {/* Location */}
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text style={styles.detailText}>{evt?.location}</Text>
          </View>

          {/* Deadline */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.detailText}>
              Deadline: {formatDate(evt?.deadline)}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this event</Text>
            <Text style={styles.descriptionText}>{evt?.description || 'No description available'}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Signup Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Registration Status</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{signups.CurrentParticipants || 0}</Text>
                <Text style={styles.statLabel}>Registered</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{signups.MaximumParticipants || 'Unlimited'}</Text>
                <Text style={styles.statLabel}>Max Capacity</Text>
              </View>
            </View>
          </View>

          {/* View Attendees Button */}
          <TouchableOpacity
            style={styles.attendeesButton}
            onPress={() => navigation.navigate('AdminTrack', { eventId: event.id })}
          >
            <Ionicons name="people" size={24} color="#fff" />
            <Text style={styles.attendeesButtonText}>View Attendees</Text>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  editButton: {
    padding: 8,
  },
  eventImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  contentContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  descriptionContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  statsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  attendeesButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  attendeesButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});