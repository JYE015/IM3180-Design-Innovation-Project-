import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import EventListItem from '../components/EventListItem';
import FilterBar, { FilterOption } from '../components/FilterBar'
import { supabase } from '../lib/supabase';

type Event = {
  id: number;
  date: string;       // ISO built from Date + Time
  time: string;       // from DB Time
  title: string;      // mapped from Title
  location: string;   // mapped from Location
  image_url: string;  // mapped from image_url
  deadline: string;   // mapped from Deadline
};

export default function EventHome() {
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
    <>
      <SafeAreaView style={styles.container}>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <TextInput 
            style={styles.searchInput}
            placeholder='Search events...'
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FilterBar value={filter} onChange={setFilter} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {events
              .filter(event => 
                searchQuery === '' || 
                event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.location.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(e => (
                <EventListItem key={e.id} event={e} />
              ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  messageContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 50 
  },
  messageText: { 
    fontSize: 16, 
    color: '#666',
    textAlign: 'center'
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff'
  }
});
