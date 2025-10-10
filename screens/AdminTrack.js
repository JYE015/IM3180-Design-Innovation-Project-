import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function EventsTrackingScreen({ route }) {
  const { eventId } = route.params; // Get the eventId passed from the event page
  const [event, setEvent] = useState(null);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the details for the specific event
      const { data: eventData, error: eventError } = await supabase
        .from('Events')
        .select('*')
        .eq('id', eventId)
        .single(); // Fetch one event based on the eventId

      if (eventError) throw eventError;

      // Fetch signups for this event
      const { data: signupsData, error: signupsError } = await supabase
        .from('attendance')
        .select('*')
        .eq('event', eventId);

      if (signupsError) throw signupsError;

      setEvent(eventData);
      setSignups(signupsData || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >

      {/* Event Details */}
      {event && (
        <View style={styles.eventCard}>
          {/* Event Image */}
          {event.image_url && (
            <Image
              source={{ uri: event.image_url }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>{event.Title}</Text>
            <Text style={styles.eventDescription}>{event.Description}</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>
                {formatDate(event.Date)} at {formatTime(event.Time)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{event.Location}</Text>
            </View>

            {event.Tags && (
              <View style={styles.tagsContainer}>
                {event.Tags.split(',').map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.trim()}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.deadline}>
              Deadline: {formatDate(event.Deadline)}
            </Text>

            {/* Admin Tracking Badge */}
            <View style={styles.adminTrackingContainer}>
                <Text style={styles.adminTrackingText}>No. of Attendees: ({signups.length})</Text>
            </View>

            {/* Attendees List */}
            <View style={styles.attendeesSection}>
              <Text style={styles.attendeesTitle}>Attendees</Text>
              {signups.length > 0 ? (
                <View style={styles.attendeesList}>
                  {signups.map((signup,index) => (
                    <View key={signup.id} style={styles.attendeeRow}>
                      <Text style={styles.attendeeUser}>
                        {index +1}) User: {signup.user.substring(0, 8)}...
                      </Text>
                      <Text style={styles.attendeeDate}>
                        {new Date(signup.created_at).toLocaleDateString()}
                      </Text>
                      <Text style={styles.attendeeSchool}>
                        School: {signup.school ? signup.school.substring(0, 8) : 'Not provided'}...
                      </Text>
                      <Text style={styles.attendeeCourse}>
                        Course: {signup.course ? signup.course.substring(0, 8) : 'Not provided'}...
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noAttendees}>No signups yet</Text>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  errorText: {
    color: '#92400E',
    fontSize: 16,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  adminTrackingContainer: {
    backgroundColor: '#3B82F6', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15, 
    marginBottom: 12, 
    maxWidth: 200, 
  },

  adminTrackingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', 
    textAlign: 'center',
  },

  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  deadline: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
  },
  attendeesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attendeesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  attendeesList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  // Row for each individual attendee
  attendeeRow: {
    flexDirection: 'column',  // Stack each piece of info vertically
    marginBottom: 12,  // Space between rows
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  attendeeDetail: {
    flexDirection: 'column',  
    paddingLeft: 8,
    paddingRight: 8,
  },
  // Styling for attendee's name
  attendeeUser: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,  
    fontWeight: 'bold',
  },
  // Styling for the date of registration
  attendeeDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,  
  },
  // Styling for the school info
  attendeeSchool: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  // Styling for the course info
  attendeeCourse: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  // Text for when no attendees are present
  noAttendees: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  
});
