import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  ScrollView 
} from 'react-native';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function TinderView({ events, searchQuery }) {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    searchQuery === '' || 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No events found</Text>
      </View>
    );
  }

  const currentEvent = filteredEvents[currentIndex];

  const goToNext = () => {
    if (currentIndex < filteredEvents.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
                             {currentEvent?.tags && (
  <View style={styles.tagsContainer}>
    {currentEvent.tags.split(',').map((tag, index) => (
      <View 
        key={index} 
        style={[styles.hotBadge]}
      >
        <Text style={styles.hotText}>{tag.trim()}</Text>
      </View>
    ))}
  </View>
)}
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('EventPage', { id: currentEvent.id, returnToEventId: currentEvent.id })}
        activeOpacity={0.9}
      >
        
        {currentEvent.image_url ? (
          <Image 
            source={{ uri: currentEvent.image_url }} 
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.leftButton]}
            onPress={goToPrevious}
          >
            <Ionicons name="chevron-back" size={40} color="white" />
          </TouchableOpacity>
        )}

        {currentIndex < filteredEvents.length - 1 && (
          <TouchableOpacity 
            style={[styles.navButton, styles.rightButton]}
            onPress={goToNext}
          >
            <Ionicons name="chevron-forward" size={40} color="white" />
          </TouchableOpacity>
        )}

        {/* Event Info Overlay */}
        <View style={styles.infoOverlay}>
          <Text style={styles.cardTitle}>{currentEvent.title}</Text>
          <Text style={styles.cardDate}>
            {dayjs(currentEvent.date).format('D MMMM YYYY')}
          </Text>
        </View>

        {/* Info Button */}
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => navigation.navigate('EventPage', { id: currentEvent.id })}
        >
          <Ionicons name="information-circle-sharp" size={35} color="#0055FE" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Page Indicator */}
      <View style={styles.pageIndicator}>
        <Text style={styles.pageText}>
          {currentIndex + 1} / {filteredEvents.length}
        </Text>
      </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Baloo2-Regular',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    height: 600,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 18,
    fontFamily: 'Baloo2-Regular',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftButton: {
    left: 15,
  },
  rightButton: {
    right: 15,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  cardTitle: {
    fontSize: 28,
    fontFamily: 'Baloo2-ExtraBold',
    color: 'white',
    marginBottom: 5,
  },
  cardDate: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Baloo2-Regular',
  },
  infoButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 2,
  },
  pageIndicator: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  pageText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Baloo2-SemiBold',
  },
   tagsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row', // Make tags appear in a row
    flexWrap: 'wrap',    // Allow wrapping if too many tags
    zIndex: 999,
    gap: 8,             // Add space between tags
  },
  hotBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 3,
  },
  hotText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-ExtraBold',
  },
  // You can remove tagBadge and tagText styles since we're not using them

});