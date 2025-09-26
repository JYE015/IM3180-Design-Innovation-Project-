import dayjs from 'dayjs';
import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

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
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={{ padding: 16 }}>
        <Text>Event not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <ScrollView>
          <View style={styles.eventContainer}>
            {!!event.image_url && <Image source={{ uri: event.image_url }} style={styles.image} />}
            <Text style={[styles.text, styles.title]}>{event.Title}</Text>
            <Text style={[styles.text, styles.details]}>
              {dayjs(event.Date).isValid()
                ? `${dayjs(event.Date).format('ddd, D MMM YYYY')} · ${event.Time || ''}`
                : 'Date TBA'}
            </Text>
            {!!event.Description && <Text style={[styles.text]}>{event.Description}</Text>}
            <Text style={[styles.text]}>Deadline:  
              {dayjs(event.Deadline).isValid()
                ? `${dayjs(event.Deadline).format('ddd, D MMM YYYY')}`
                : 'Date TBA'}
            </Text>
            <Text style={[styles.text]}>📍 {event.Location}</Text>
            {!!event.Tags && <Text style={[styles.text]}>Tags: {event.Tags}</Text>}
            <Text style={[styles.text]}>
              Maximum Participants: {event.MaximumParticipants ?? 'NA'}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={[styles.text, { fontSize: 18 }]}>Free</Text>
          {/* Force isRegistered state as the source of truth, not just attendance object */}
          {isRegistered ? (
            <View style={styles.registrationStatusContainer}>
              <View style={styles.registeredButton}>
                <Text style={[styles.details, { fontSize: 17, color: 'white' }]}>RSVP'd</Text>
              </View>
              <Pressable
                style={[styles.cancelButton, registering && styles.disabledButton]}
                onPress={cancelRSVP}
                disabled={registering}
              >
                {registering ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={[styles.details, { fontSize: 15, color: 'white' }]}>Cancel</Text>
                )}
              </Pressable>
            </View>
          ) : isEventFull ? (
            // Show "Event Full" button when the event is at capacity
            <View style={styles.fullButton}>
              <Text style={[styles.details, { fontSize: 17, color: 'white' }]}>Event Full :( </Text>
            </View>
          ) : isDeadlinePassed() ? (
            // Show "Event Full" button when the event is at capacity
            <View style={styles.fullButton}>
              <Text style={[styles.details, { fontSize: 17, color: 'white' }]}>Closed</Text>
            </View>
          ) : (
            // Regular RSVP button
            <Pressable
              style={[
                styles.rsvpButton,
                registering && styles.disabledButton
              ]}
              onPress={joinEvent}
              disabled={registering || !currentUser || isEventFull}
            >
              {registering ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={[styles.details, { fontSize: 17, color: 'black' }]}>Join and RSVP!</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

    eventContainer: {
    backgroundColor: '#ffffff',
    padding: 3,
    flex: 1
    },

    details: {
    fontSize: 15,
    color: '#676767ff',
    fontWeight: 'bold',
    marginVertical: 8,
    marginHorizontal: 5,
    textTransform: 'uppercase'
  },

  text: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginHorizontal: 5,
  },

    title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 5,
    marginHorizontal: 5,
  },


    image: {
    width: '100%',    // Takes full width of parent container
    height: 150,      // Fixed height
    borderRadius: 10,
    resizeMode: 'cover',  // Ensures image fills the space
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: '#abababff',
  },

  rsvpButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'pink',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  registeredButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',  // Green color for registered state
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  disabledButton: {
    backgroundColor: '#cccccc',  // Gray color for disabled state
    opacity: 0.7,
  },

  registrationStatusContainer: {
    alignItems: 'center',
  },

  cancelButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ff5252',  // Red color for cancel button
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#808080',  // Gray color for full event state
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },

});
