import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import Timer from './Timer';

// Initialize dayjs duration plugin
dayjs.extend(duration);

type Event = {
  id: number;
  created_at: string;
  Title: string;
  Description: string;
  Date: string;
  Time?: string | null;
  Location: string;
  image_url?: string | null;
  Deadline: string;
  Tags?: string | null;
  MaximumParticipants?: number | null;
  CurrentParticipants?: number | null;
};

// Define the route param types
type RootStackParamList = {
  EventPage: { id: number };
};

type EventPageRoute = RouteProp<RootStackParamList, 'EventPage'>;


export default function EventPage() {
  const route = useRoute<EventPageRoute>();
  const { id } = route.params;

  const [event, setEvent] = useState<Event | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isEventFull, setIsEventFull] = useState(false);

  // Fetch the current user
  const fetchCurrentUser = useCallback(async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (user) {
        setCurrentUser(user);
        // Check if user is already registered for this event
        if (id) checkRegistration(user.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  }, [id]);

  // Check if user is already registered
  const checkRegistration = async (userId: string) => {
    if (!id || !userId) return;
    
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('event', id)
        .eq('user', userId);
      
      if (error) {
        console.error('Error checking registration:', error);
      } else {
        setAttendance(data && data.length > 0 ? data[0] : null);
        setIsRegistered(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  // Fetch the current user when component mounts
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Create fetchOne as a reusable function with useCallback
  const fetchOne = useCallback(async () => {
    setLoading(true);
    if (typeof id !== 'number' || Number.isNaN(id)) {
      setEvent(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch event data
      const { data, error } = await supabase
        .from('Events')
        .select(
          'id,created_at,Title,Description,Date,Time,Location,image_url,Deadline,Tags,MaximumParticipants,CurrentParticipants'
        )
        .eq('id', id)
        .single();

      if (error) {
        console.log('detail fetch error:', error.message);
        setEvent(null);
      } else {
        const normalized = data
          ? { ...data, Date: typeof data.Date === 'string' ? data.Date.replace(' ', 'T') : data.Date }
          : null;
        setEvent(normalized as Event | null);
        
        // Check if the event is at capacity
        if (normalized && 
            normalized.MaximumParticipants !== null && 
            normalized.CurrentParticipants !== null &&
            normalized.CurrentParticipants >= normalized.MaximumParticipants) {
          console.log('Event is at capacity:', normalized.CurrentParticipants, '/', normalized.MaximumParticipants);
          setIsEventFull(true);
        } else {
          setIsEventFull(false);
        }
      }

      // Check attendance if user is logged in
      if (currentUser && currentUser.id) {
        console.log('Checking attendance for user:', currentUser.id, 'and event:', id);
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('user', currentUser.id)
          .eq('event', id);

        if (attendanceError) {
          console.error('Error checking attendance:', attendanceError);
        } else {
          console.log('Attendance data:', JSON.stringify(attendanceData));
          if (attendanceData && attendanceData.length > 0) {
            console.log('Setting attendance to:', JSON.stringify(attendanceData[0]));
            setAttendance(attendanceData[0]);
            setIsRegistered(true);
          } else {
            console.log('No attendance found, clearing state');
            setAttendance(null);
            setIsRegistered(false);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchOne:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  // Call fetchOne when component mounts or when dependencies change
  useEffect(() => {
    if (id) {
      fetchOne();
    }
  }, [fetchOne]);

  const joinEvent = async () => {
    if (!event) {
      Alert.alert('Error', 'Event not found');
      return;
    }

    // Set loading state
    setRegistering(true);

    try {
      // Double-check if already registered
      const { data: existingRegistration, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('event', event.id)
        .eq('user', currentUser.id);
      
      if (checkError) {
        console.error('Error checking registration:', checkError);
        Alert.alert('Error', 'Could not check if you have already registered');
        setRegistering(false);
        return;
      }
      
      if (existingRegistration && existingRegistration.length > 0) {
        setAttendance(existingRegistration[0]);
        setIsRegistered(true);
        Alert.alert('Already Registered', 'You have already registered for this event.');
        setRegistering(false);
        return;
      }
      
      // 1. Add record to attendance table
      const { data, error } = await supabase
        .from('attendance')
        .insert([{ 
          user: currentUser.id, 
          event: event.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error joining event:', error);
        
        // Check specifically for the "event is full" error from Supabase
        if (error.code === '23514' || (error.message && error.message.includes('full'))) {
          setIsEventFull(true);
          Alert.alert('Event Full', 'Sorry, this event has reached its maximum number of participants.');
        } else {
          Alert.alert('Registration Failed', 'There was an error registering for this event. Please try again.');
        }
      } else {
        console.log('Successfully joined event:', data);
        
        // 3. Update attendance state
        setAttendance(data);
        setIsRegistered(true);
        
        // 4. Refresh data to ensure UI is in sync with database
        fetchOne();
        
        Alert.alert('Success', 'You have successfully registered for this event!');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert('Registration Failed', 'There was an error registering for this event. Please try again.');
    } finally {
      setRegistering(false);
    }
  }

  // Function to cancel RSVP
  const cancelRSVP = async () => {
    if (!currentUser || !attendance) {
      Alert.alert('Error', 'Could not find your registration');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration for this event?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            setRegistering(true);
            
            try {
              console.log('Attempting to cancel RSVP with attendance record:', JSON.stringify(attendance));
              console.log('User ID:', currentUser.id, 'Event ID:', event.id);
              
              // First, log the attendance record type
              console.log('Attendance ID type:', typeof attendance.id);
              console.log('Attendance event type:', typeof attendance.event);
              console.log('Attendance user type:', typeof attendance.user);
              
              // Approach 1: Use the exact ID
              console.log('Trying approach 1: Delete by exact ID');
              const { error: deleteError1 } = await supabase
                .from('attendance')
                .delete()
                .eq('id', attendance.id);
                
              // 3. We've already updated the UI state at the start of the function
              console.log('UI state already updated to show cancellation');
            
              Alert.alert('Success', 'Your registration has been canceled.');
            } catch (error) {
              console.error('Error canceling registration:', error);
              Alert.alert('Error', 'Could not cancel your registration. Please try again.');
            } finally {
              setRegistering(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

const isDeadlinePassed = useCallback(() => {
  if (!event?.Deadline) return false;
  return dayjs(event.Deadline).isBefore(dayjs(), 'day');
}, [event?.Deadline]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Event not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} bounces={false}>
        {!!event.image_url && (
          <Image source={{ uri: event.image_url }} style={styles.image} />
        )}
        
        <View style={styles.contentContainer}>
          <View style={styles.eventContainer}>
            <Text style={styles.title}>{event.Title}</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={24} color="#666" />
              <Text style={styles.infoText}>
                {dayjs(event.Date).format('ddd, D MMM YYYY')}
                {event.Time ? `, ${event.Time.slice(0, 5)} ${parseInt(event.Time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}` : ''}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={24} color="#666" />
              <Text style={styles.infoText}>{event.Location}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={24} color="#666" />
              <Text style={styles.infoText}>
                Deadline: {dayjs(event.Deadline).format('D MMM YYYY')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={24} color="#666" />
              <Text style={styles.infoText}>
                Maximum Participants: {event.MaximumParticipants ?? 'NA'}
              </Text>
            </View>

            <View style={styles.separator} />

            <Text style={styles.sectionTitle}>Details</Text>
            {!!event.Description && (
              <Text style={styles.description}>{event.Description}</Text>
            )}
          
          <View style={styles.separator} />

            <Text style={styles.sectionTitle}>Register by:</Text>
            <View style={styles.countdown}>
              <Timer targetDate={event.Deadline} />
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        
        {isRegistered ? (
          <>
            <View style={styles.registeredButton}>
              <Text style={styles.buttonText}>Registered</Text>
            </View>
            <Pressable
              style={[styles.cancelButton, registering && styles.disabledButton]}
              onPress={cancelRSVP}
              disabled={registering}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </>
        ) : isEventFull ? (
          <View style={styles.fullButton}>
            <Text style={styles.buttonText}>Event Full</Text>
          </View>
        ) : isDeadlinePassed() ? (
          <View style={styles.fullButton}>
            <Text style={styles.buttonText}>Closed</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.rsvpButton, registering && styles.disabledButton]}
            onPress={joinEvent}
            disabled={registering || !currentUser || isEventFull}
          >
            <Text style={styles.rsvpButtonText}>Register Now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20, // Overlap with image
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  eventContainer: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    color: '#000',
    marginBottom: 8,
    fontFamily: 'Baloo2-Bold',
  },
  dateTime: {
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
    fontFamily: 'Baloo2-Regular',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'Baloo2-Regular',
  },
  maxParticipants: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    fontFamily: 'Baloo2-Regular',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#000',
    marginBottom: 8,
    fontFamily: 'Baloo2-Bold',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontFamily: 'Baloo2-Regular',
  },
  countdown: {
    marginTop: 8,
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    fontFamily: 'Baloo2-Bold',
  },
  rsvpButton: {
    backgroundColor: '#0055FE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  registeredButton: {
    backgroundColor: '#9CA2AA',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0055FE',
  },
  fullButton: {
    backgroundColor: '#808080',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    opacity: 0.9,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Baloo2-SemiBold',
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Baloo2-SemiBold',
  },
  cancelButtonText: {
    color: '#0055FE',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Baloo2-SemiBold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Baloo2-Regular',
  },
  deadlineText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontFamily: 'Baloo2-Regular',
  },
});