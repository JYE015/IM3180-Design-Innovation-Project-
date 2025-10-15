import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import AdminEventListItem from '../components/AdminEventListItem';
import { supabase } from '../lib/supabase';

export default function AdminHome() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const navigation = useNavigation();
  
  // Animation values
  const [announcementAnim] = useState(new Animated.Value(0));
  const [createEventAnim] = useState(new Animated.Value(0));

  const animateMenu = (visible) => {
    if (visible) {
      setIsMenuVisible(true);
      Animated.stagger(100, [
        Animated.spring(announcementAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true
        }),
        Animated.spring(createEventAnim, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(announcementAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(createEventAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        setIsMenuVisible(false);
      });
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('Events')
        .select(
          'id, Title, Description, Date, Time, Location, image_url, Deadline, Tags, MaximumParticipants, CurrentParticipants'
        )
        .order('Date', { ascending: true })
        .order('Time', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const normalized = (data ?? []).map((r) => ({
        id: r.id,
        title: r.Title,
        date: r.Date,
        time: r.Time ?? null,
        location: r.Location,
        image_url: r.image_url ?? '',
        deadline: r.Deadline || '',
        tags: r.Tags,
        maximumParticipants: r.MaximumParticipants,
        currentParticipants: r.CurrentParticipants
      }));

      const upcoming = normalized.filter(event => event.date >= today);
      const past = normalized.filter(event => event.date < today);

      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (error) {
      console.error('Error fetching events:', error);
      setUpcomingEvents([]);
      setPastEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      return () => {};
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <TextInput 
          style={styles.searchInput}
          placeholder='Search events...'
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : upcomingEvents.length === 0 && pastEvents.length === 0 ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>No events found</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Upcoming Events Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              Upcoming Events
            </Text>
            <ScrollView horizontal={true} contentContainerStyle={styles.scrollContent}>
              {upcomingEvents
                .filter(event => 
                  searchQuery === '' || 
                  event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  event.location.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(event => (
                  <AdminEventListItem 
                    key={event.id} 
                    event={event} 
                    onPress={() => navigation.navigate('AdminEventPage', { event })}
                  />
                ))}
            </ScrollView>
          </View>

          {/* Past Events Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>
              Past Events
            </Text>
            <ScrollView horizontal={true} contentContainerStyle={styles.scrollContent}>
              {pastEvents
                .filter(event => 
                  searchQuery === '' || 
                  event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  event.location.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(event => (
                  <AdminEventListItem 
                    key={event.id} 
                    event={event} 
                    onPress={() => navigation.navigate('AdminEventPage', { event })}
                  />
                ))}
            </ScrollView>
          </View>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          alignItems='centre'
          activeOpacity={1} 
          onPress={() => animateMenu(false)}
        >
          <View style={styles.menuContainer}>
            <Animated.View style={{
              transform: [{
                translateY: announcementAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }],
              opacity: announcementAnim
            }}>
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: '#ff9800', borderRadius: 8 }]}
                onPress={() => {
                  animateMenu(false);
                  navigation.navigate('AdminAnnouncements');
                }}
              >
                <Ionicons name="megaphone" size={24} color="white" />
                <Text style={[styles.menuText, { color: 'white' }]}>Announcements</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{
              transform: [{
                translateY: createEventAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }],
              opacity: createEventAnim
            }}>
              <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: '#4CAF50', borderRadius: 8 }]}
                onPress={() => {
                  animateMenu(false);
                  navigation.navigate('AdminPage');
                }}
              >
                <Ionicons name="calendar" size={24} color="white" />
                <Text style={[styles.menuText, { color: 'white' }]}>Create Event</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity 
        style={[styles.fab, isMenuVisible && styles.fabActive]}
        onPress={() => animateMenu(!isMenuVisible)}
      >
        <Animated.View style={{
          transform: [{
            rotate: announcementAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '45deg']
            })
          }]
        }}>
          <Ionicons name="add" size={30} color="white" />
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  messageContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 50 
  },
  messageText: { 
    fontSize: 16, 
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Baloo2-Regular',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    fontFamily: 'Baloo2-Regular',
  },
  contentContainer: {
    flex: 1,
    gap: 20
  },
  section: {
    flex: 1
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#333',
    fontFamily: 'Baloo2-Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    right: undefined,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4E8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuContainer: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 90,
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    gap: 8
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Baloo2-Bold',
  },
  fabActive: {
    backgroundColor: '#f44336'
  }
});