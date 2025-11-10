import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [attendeesList, setAttendeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);

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

  const fetchAttendees = async () => {
    try {
      if (!event?.id) return;
      
      const { data: signupsData, error: signupsError } = await supabase
        .from('attendance')
        .select(`
          id,
          created_at,
          profiles (
            username,
            school,
            course
          )
        `)
        .eq('event', event.id);

      if (signupsError) throw signupsError;

      setAttendeesList(signupsData || []);
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchEventDetails();
      fetchSignups();
      fetchAttendees();
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

  const formatRegistrationDate = (dateStr) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('DD MMM YYYY, HH:mm');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
                  await fetchAttendees();
                }
              });
            }}
          >
            <Ionicons name="create-outline" size={24} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Event Image - Now Touchable */}
        {evt?.image_url ? (
          <TouchableOpacity onPress={() => setImageModalVisible(true)} activeOpacity={0.9}>
            <Image
              source={{ uri: evt.image_url }}
              style={styles.eventImage}
              resizeMode="cover"
            />
            {/* Touch to Expand Icon Overlay */}
            <View style={styles.expandIconOverlay}>
              <Ionicons name="expand-outline" size={24} color="#FFF" />
              <Text style={styles.expandText}>Tap to expand</Text>
            </View>
          </TouchableOpacity>
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
              {formatDate(evt?.date)}, {formatTime(evt?.time)}
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

          {/* Number of Signups */}
          <View style={styles.signupsHeader}>
            <Text style={styles.signupsTitle}>Number of Signups</Text>
            <View style={styles.signupsCount}>
              <Text style={styles.signupsNumber}>
                {signups.CurrentParticipants || 0}/{signups.MaximumParticipants || 'Unlimited'}
              </Text>
            </View>
          </View>

          {/* Details of Student Signups - Scrollable */}
          <View style={styles.attendeesContainer}>
            <Text style={styles.attendeesTitle}>Details of student signups</Text>
            
            {attendeesList.length > 0 ? (
              <ScrollView 
                style={styles.attendeesScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {attendeesList.map((attendee, index) => (
                  <View key={attendee.id || index} style={styles.attendeeCard}>
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>
                        {attendee.profiles?.username || 'Unknown User'}
                      </Text>
                      <Text style={styles.attendeeDetail}>
                        School: {attendee.profiles?.school || 'N/A'}
                      </Text>
                      <Text style={styles.attendeeDetail}>
                        Course: {attendee.profiles?.course || 'N/A'}
                      </Text>
                      <Text style={styles.attendeeDate}>
                        Registered: {formatRegistrationDate(attendee.created_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noAttendeesContainer}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noAttendeesText}>No attendees yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Image Enlargement Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {evt?.image_url && (
            <Image
              source={{ uri: evt.image_url }}
              style={styles.enlargedImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    fontFamily: 'Baloo2-Bold',
  },
  editButton: {
    padding: 8,
  },
  eventImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  expandIconOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  expandText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Baloo2-SemiBold',
    fontWeight: '600',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Baloo2-Regular',
  },
  contentContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'Baloo2-Bold',
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
    color: '#0055FE',
    fontFamily: 'Baloo2-SemiBold',
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
    fontFamily: 'Baloo2-Regular',
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
    fontFamily: 'Baloo2-SemiBold',
  },
  descriptionText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 24,
    fontFamily: 'Baloo2-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  signupsHeader: {
    marginBottom: 20,
  },
  signupsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'Baloo2-SemiBold',
  },
  signupsCount: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signupsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0055FE',
    fontFamily: 'Baloo2-Bold',
  },
  attendeesContainer: {
    marginTop: 8,
  },
  attendeesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'Baloo2-SemiBold',
  },
  attendeesScrollView: {
    maxHeight: 400,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  attendeeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  attendeeInfo: {
    gap: 4,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Baloo2-SemiBold',
  },
  attendeeDetail: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Baloo2-Regular',
  },
  attendeeDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'Baloo2-Regular',
  },
  noAttendeesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  noAttendeesText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
    fontFamily: 'Baloo2-Regular',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  enlargedImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});