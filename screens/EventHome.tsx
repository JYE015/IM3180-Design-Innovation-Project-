import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import EventListItem from '../components/EventListItem';
import FilterBar, { FilterOption } from '../components/FilterBar'
import TinderView from '../components/TinderView';
import { supabase } from '../lib/supabase';

const screenWidth = Dimensions.get('window').width;

type Event = {
  id: number;
  date: string;       // ISO built from Date + Time
  time: string;       // from DB Time
  title: string;      // mapped from Title
  location: string;   // mapped from Location
  image_url: string;  // mapped from image_url
  deadline: string;   // mapped from Deadline
  tags: string;
};

// Navigation types
type RootStackParamList = {
  EventPage: { id: number };
};

type NavigationProp = import('@react-navigation/native').NavigationProp<RootStackParamList>;

export default function EventHome() {
  const navigation = useNavigation<NavigationProp>();
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<FilterOption>('All');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myEventIds, setMyEventIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    setLoading(true);

    // 'Date' is a DATE column → compare with YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from('Events') // case-sensitive table name
      .select(
        'id, Title, Description, Date, Time, Location, image_url, Deadline, Tags, MaximumParticipants, CurrentParticipants'
      )
      .order('Date', { ascending: true })
      .order('Time', { ascending: true, nullsFirst: true });

    // Filters
    if (filter === 'Upcoming') query = query.gte('Date', today);
    if (filter === 'Past')     query = query.lt('Date', today);
    if (filter === 'Online')   query = query.ilike('Location', '%online%');
    if (filter === 'In-person')query = query.not('Location', 'ilike', '%online%');

// Tag filtering - will match if the tag appears anywhere in the Tags field
  if (["Workshop", "Academic",  "Sports","Cultural","Welfare","FOC", "Residential Affairs"].includes(filter)) {
    query = query.ilike('Tags', `%${filter}%`);
  }
    
    // Special handling for "My Events" filter which requires post-fetch filtering
    let isMyEventsFilter = filter === 'My Events';

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setLoading(false);
      return;
    }

    // Map DB → UI (and combine Date + Time into a single ISO for dayjs)
    let normalized: Event[] = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.Title,
      date: r.Date,            // keep as YYYY-MM-DD
      time: r.Time ?? null,    // keep raw DB time
      location: r.Location,
      image_url: r.image_url ?? '',
      deadline: r.Deadline || '',  // Add deadline field
      tags: r.Tags || ''
    }));

    // If "My Events" filter is active, only show events the user has registered for
    if (isMyEventsFilter && myEventIds.length > 0) {
      normalized = normalized.filter(event => myEventIds.includes(event.id));
    }

    setEvents(normalized);
    setLoading(false);
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (user) {
        setCurrentUser(user);
        fetchUserEvents(user.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Fetch events the user has registered for
  const fetchUserEvents = async (userId: string) => {
    try {
      console.log('Fetching events for user:', userId);
      const { data, error } = await supabase
        .from('attendance')
        .select('event')
        .eq('user', userId);

      if (error) {
        console.error('Error fetching user events:', error);
        return;
      }

      if (data && data.length > 0) {
        const eventIds = data.map(item => item.event);
        console.log('User registered events:', eventIds);
        setMyEventIds(eventIds);
      }
    } catch (error) {
      console.error('Error in fetchUserEvents:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUser();
      return () => {};
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      return () => {};
    }, [filter, myEventIds])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerBackground}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder='Search events...'
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.logo}>
            <Image 
              source={require('../assets/hall1logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <FilterBar value={filter} onChange={setFilter} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : events.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>
              {filter === 'My Events' ? 'No events registered' : 'No events found'}
            </Text>
          </View>
        ) : filter === 'All' ? (
          <TinderView events={events} searchQuery={searchQuery} />
        ) : (
          <FlatList
            data={events.filter(event => 
              searchQuery === '' || 
              event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              event.location.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.gridCard}
                onPress={() => navigation.navigate('EventPage', { id: item.id })}
              >
                {item.image_url ? (
                  <Image 
                    source={{ uri: item.image_url }} 
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cardImage, styles.placeholderImage]}>
                    <Text style={styles.placeholderText}>No Image</Text>
                  </View>
                )}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardDate}>
                    {dayjs(item.date).format('D MMMM YYYY')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#B8C4FE',
  },
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
    fontFamily: 'Baloo2-Regular'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    marginRight: 60,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    fontFamily: 'Baloo2-Regular',
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
    top: 5,
  },
  logoImage: {
    width: '90%',
    height: '90%',
  },
  headerBackground: {
    backgroundColor: '#B8C4FE',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 12,
  },
  gridContainer: {
    padding: 8,
  },
  gridCard: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    maxWidth: (screenWidth - 48) / 2,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
    fontFamily: 'Baloo2-Regular',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Baloo2-ExtraBold',
    marginBottom: 4,
    color: '#000',
  },
  cardDate: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Baloo2-Regular',
  },
});