import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EventListItem from '../components/EventListItem';
import FilterBar, { FilterOption } from '../components/FilterBar'
import { supabase } from '../lib/supabase';

type Event = {
  id: number;
  date: string;       // ISO built from Date + Time
  title: string;      // mapped from Title
  location: string;   // mapped from Location
  image_uri: string;  // mapped from image_url
};

export default function EventHome() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<FilterOption>('All');
  const [loading, setLoading] = useState(true);

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

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setLoading(false);
      return;
    }

    // Map DB → UI (and combine Date + Time into a single ISO for dayjs)
    const normalized: Event[] = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.Title,
      date: r.Date,            // keep as YYYY-MM-DD
      time: r.Time ?? null,    // keep raw DB time
      location: r.Location,
      image_uri: r.image_url ?? '',
    }));

    setEvents(normalized);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={{ paddingHorizontal: 16 }}>
          <FilterBar value={filter} onChange={setFilter} />
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
            {events.map(e => (
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
});
