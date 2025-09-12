import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const fetchOne = async () => {
      setLoading(true);
      if (typeof id !== 'number' || Number.isNaN(id)) {
        setEvent(null);
        setLoading(false);
        return;
      }

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
      }
      setLoading(false);
    };

    fetchOne();
  }, [id]);

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
                ? `${dayjs(event.Date).format('ddd, D MMM')} · ${dayjs(event.Date).format('hh:mm A')}`
                : 'Date TBA'}
            </Text>
            {!!event.Description && <Text style={[styles.text]}>{event.Description}</Text>}
            <Text style={[styles.text]}>Deadline: {event.Deadline}</Text>
            <Text style={[styles.text]}>📍 {event.Location}</Text>
            {!!event.Tags && <Text style={[styles.text]}>Tags: {event.Tags}</Text>}
            <Text style={[styles.text]}>
              Participants: {event.CurrentParticipants ?? 0} / {event.MaximumParticipants ?? '∞'}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={[styles.text, { fontSize: 18 }]}>Free</Text>
          <Pressable
            style={{ padding: 10, borderRadius: 5, backgroundColor: 'pink' }}
            onPress={() => alert("You have RSVP'd!")}
          >
            <Text style={[styles.details, { fontSize: 17, color: 'black' }]}>Join and RSVP!</Text>
          </Pressable>
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

});
