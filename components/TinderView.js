import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';

const numColumns = 2;
const screenWidth = Dimensions.get('window').width;

//has both front and backend code here
//anything with navigation don't change, anything with style need to change!
export default function TinderView({ events, searchQuery }) {
  const navigation = useNavigation();

  const renderEventCard = ({ item }) => (
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
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardDate}>
          {dayjs(item.date).format('D MMM YYYY')}
          {item.time && ` · ${item.time}`}
        </Text>
        <Text style={styles.cardLocation} numberOfLines={1}>{item.location}</Text>
      </View>
    </TouchableOpacity>
  );

  //Backend Code: nothing to change here
  const filteredEvents = events.filter(event => 
    searchQuery === '' || 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FlatList
      data={filteredEvents}
      renderItem={renderEventCard}
      keyExtractor={item => item.id.toString()}
      numColumns={numColumns}
      contentContainerStyle={styles.gridContainer}
    />
  );
}

const styles = StyleSheet.create({
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
    fontFamily: 'Baloo2-Bold',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'Baloo2-Regular',
  },
  cardLocation: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Baloo2-Regular',
  }
});