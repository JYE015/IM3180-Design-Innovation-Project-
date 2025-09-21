import AntDesign from '@expo/vector-icons/AntDesign';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity, Image, StyleSheet, Text, View } from 'react-native';

// Update the event type to match your new table
type Event = {
 id: number;
  title: string;
  date: string;   // from DB Date
  time: string; // from DB Time
  deadline: string;
  image_url: string;
  location: string; // Added location property
  tags?: string;
  maximumParticipants?: number;
  currentParticipants?: number;
};

type EventListItemProps = {
  event: Event;
};

export default function EventListItem({ event }: EventListItemProps) {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('EventPage', { id: event.id })} style={styles.eventContainer}>
        <View style={styles.contentContainer}>
          <View>
            <Text style={[styles.text, styles.title]}>{event.title}</Text>
            <Text style={[styles.text, styles.details]}>
              {dayjs(event.date).isValid()
                ? `${dayjs(event.date).format('ddd, D MMM YYYY')} · ${event.time}`
                : 'Date TBA'}
            </Text>
            <Text style={[styles.text, styles.location]}>Location: {event.location}</Text>
            {!!event.image_url && (
              <Image
                source={{ uri: event.image_url }}
                style={styles.image}
              />
            )}
            <Text style={[styles.text, styles.details]}>Deadline: 
              {dayjs(event.deadline).isValid()
                ? `${dayjs(event.deadline).format('ddd, D MMM YYYY')}`
                : 'Date TBA'}
            </Text>
            {!!event.tags && (
              <Text style={[styles.text, styles.details]}>Tags: {event.tags}</Text>
            )}
          </View>
        </View>

  {/* Removed leftover Link closing tag */}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16, // Adds spacing from edges
    backgroundColor: '#fff',
  },

    contentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
  
     eventContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // for Android shadow
  },

  text: {
    fontSize: 18,
    color: '#000',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 5,
    marginHorizontal: 5,
  },

   details: {
    fontSize: 15,
    color: '#676767ff',
    fontWeight: 'bold',
    marginVertical: 8,
    marginHorizontal: 5,
    textTransform: 'uppercase'
  },

   location: {
    fontSize: 15,
    color: '#2c2b2bff',
    fontWeight: '600',
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
    alignItems: 'center',
    gap: 5, // Adds spacing between items
  },
  icon: {
    marginHorizontal: 5,
  }
});
