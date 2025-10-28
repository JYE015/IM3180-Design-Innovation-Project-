import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Animated,
} from 'react-native';
import dayjs from 'dayjs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTinderView } from '../context/TinderViewContext';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function TinderView({ events, searchQuery }) {
  const navigation = useNavigation();
  const { currentIndex, setCurrentIndex } = useTinderView();
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  // Animation values for swipe and card stacking
  const position = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const nextCardScale = useRef(new Animated.Value(0.9)).current;
  const nextCardOpacity = useRef(new Animated.Value(0.7)).current;
  const [swiping, setSwiping] = useState(false);
  
  // Simple touch tracking
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const isSwiping = useRef(false);
  
  // Filter events when search query changes - now also filters for upcoming events
  useEffect(() => {
    const today = dayjs().startOf('day');
    
    // Filter for both upcoming events AND search query
    const filtered = events.filter(event => {
      // First check if it's an upcoming event (date is today or in future)
      const eventDate = dayjs(event.date);
      const isUpcoming = eventDate.isAfter(today) || eventDate.isSame(today, 'day');
      
      // Then check if it matches search query
      const matchesSearch = searchQuery === '' || 
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Only return true if both conditions are met
      return isUpcoming && matchesSearch;
    });
    
    // Sort by date (closest upcoming first)
    filtered.sort((a, b) => {
      return dayjs(a.date).diff(dayjs(b.date));
    });
    
    setFilteredEvents(filtered);
  }, [events, searchQuery]);
  
  // Handle edge cases after filtering
  useEffect(() => {
    if (filteredEvents.length > 0 && currentIndex >= filteredEvents.length) {
      setCurrentIndex(0);
    }
  }, [filteredEvents, currentIndex, setCurrentIndex]);
  
  // Reset animation values when currentIndex changes
  useEffect(() => {
    position.setValue(0);
    rotation.setValue(0);
    scale.setValue(1);
    opacity.setValue(1);
    nextCardScale.setValue(0.9);
    nextCardOpacity.setValue(0.7);
  }, [currentIndex]);
  
  // Handle manual navigation with animations
  const navigateToNext = (fromSwipe = false) => {
    console.log(`navigateToNext called: fromSwipe=${fromSwipe}, swiping=${swiping}, currentIndex=${currentIndex}`);
    
    if (currentIndex < filteredEvents.length - 1 && (!swiping || fromSwipe)) {
      setSwiping(true);
      
      // Animate current card off screen and fade out
      Animated.parallel([
        Animated.timing(position, {
          toValue: -screenWidth,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 81,
          useNativeDriver: true
        }),
        Animated.timing(nextCardScale, {
          toValue: 1,
          duration: 10,
          useNativeDriver: true
        }),
        Animated.timing(nextCardOpacity, {
          toValue: 1,
          duration: 81,
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentIndex(i => i + 1);
        setSwiping(false);
      });
    } else {
      console.log("navigateToNext blocked");
    }
  };
  
  const navigateToPrevious = (fromSwipe = false) => {
    console.log(`navigateToPrevious called: fromSwipe=${fromSwipe}, swiping=${swiping}, currentIndex=${currentIndex}`);
    
    if (currentIndex > 0 && (!swiping || fromSwipe)) {
      setSwiping(true);
      
      // Animate card off screen
      Animated.parallel([
        Animated.timing(position, {
          toValue: screenWidth,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentIndex(i => i - 1);
        setSwiping(false);
      });
    } else {
      console.log("navigateToPrevious blocked");
    }
  };

  // Enhanced touch handlers with real-time feedback
  const handleTouchStart = (event) => {
    touchStart.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    };
    isSwiping.current = true;
  };
  
  // Handle touch move for real-time card movement
  const handleTouchMove = (event) => {
    if (!isSwiping.current) return;
    
    const currentX = event.nativeEvent.pageX;
    const deltaX = currentX - touchStart.current.x;
    
    // Move card with finger in real-time
    position.setValue(deltaX);
    
    // Add subtle rotation based on swipe direction
    const rotationValue = deltaX / 25;
    rotation.setValue(rotationValue);
    
    // Adjust opacity based on swipe distance
    const maxSwipeDistance = 150;
    const opacityFactor = Math.max(0.5, 1 - (Math.abs(deltaX) / maxSwipeDistance * 0.5));
    opacity.setValue(opacityFactor);
  };

  const handleTouchEnd = (event) => {
    if (!isSwiping.current) return;
    
    touchEnd.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY
    };
    
    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    
    // Only consider horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && currentIndex < filteredEvents.length - 1) {
        // Left swipe - next card
        Animated.timing(position, {
          toValue: -screenWidth,
          duration: 20,
          useNativeDriver: true
        }).start(() => {
          navigateToNext(true);
        });
      } else if (deltaX > 0 && currentIndex > 0) {
        // Right swipe - previous card
        Animated.timing(position, {
          toValue: screenWidth,
          duration: 20,
          useNativeDriver: true
        }).start(() => {
          navigateToPrevious(true);
        });
      } else {
        // Can't navigate but swiped - animate back to center
        resetCardPosition();
      }
    } else {
      // Not enough horizontal movement - reset position
      resetCardPosition();
    }
    
    isSwiping.current = false;
  };
  
  // Reset card position with animation
  const resetCardPosition = () => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.spring(rotation, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true
      })
    ]).start();
  };

  // Empty state
  if (filteredEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No upcoming events found</Text>
      </View>
    );
  }

  const currentEvent = filteredEvents[currentIndex];
  if (!currentEvent) return null;
  
  return (
    <View style={styles.container}>
      {/* Card container with swipe detection and navigation arrows */}
      <View style={styles.cardWrapper}>
        {/* Left navigation arrow */}
        {currentIndex > 0 && (
          <TouchableOpacity 
            style={styles.navArrow} 
            onPress={navigateToPrevious}
          >
            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </View>
          </TouchableOpacity>
        )}
        
        {/* SWIPEABLE CARD */}
        <Animated.View 
          style={[
            styles.card,
            {
              transform: [
                { translateX: position },
                { rotate: rotation.interpolate({
                    inputRange: [-100, 0, 100],
                    outputRange: ['-5deg', '0deg', '5deg']
                  })
                },
                { scale: scale }
              ],
              opacity: opacity,
            }
          ]}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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

          {/* Tags */}
          {currentEvent.tags && (
            <View style={styles.tagsContainer}>
              {currentEvent.tags.split(',').map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Event info */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
            style={styles.infoOverlay}
          >
            <Text style={styles.eventTitle}>{currentEvent.title}</Text>
            <Text style={styles.eventDate}>
              {dayjs(currentEvent.date).format('D MMMM YYYY')}
              {currentEvent.time ? `, ${currentEvent.time.slice(0, 5)} ${parseInt(currentEvent.time.slice(0, 2)) >= 12 ? 'PM' : 'AM'}` : ''}
            </Text>
            <Text style={styles.eventLocation}>{currentEvent.location}</Text>
          </LinearGradient>

          {/* Details button */}
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => navigation.navigate('EventPage', { id: currentEvent.id })}
          >
            <Ionicons name="information" size={30} color="white" />
          </TouchableOpacity>
        </Animated.View>
        
        {/* Right navigation arrow */}
        {currentIndex < filteredEvents.length - 1 && (
          <TouchableOpacity 
            style={[styles.navArrow, styles.navArrowRight]} 
            onPress={navigateToNext}
          >
            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </View>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Event counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counter}>{currentIndex + 1} / {filteredEvents.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  counterContainer: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
  },
  counter: {
    fontSize: 16,
    color: '#333',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    overflow: 'hidden',
    fontFamily: 'Baloo2-SemiBold',
  },
  cardWrapper: {
    width: screenWidth - 32,
    height: 500,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: screenWidth - 32,
    height: 500,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000000ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(240,240,240,0.8)',
  },
  navArrow: {
    position: 'absolute',
    left: 10,
    zIndex: 10,
    opacity: 0.9,
  },
  navArrowRight: {
    left: undefined,
    right: 10,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  placeholderImage: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Baloo2-SemiBold',
  },
  tagsContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '60%',
    zIndex: 1,
  },
  tagBadge: {
    backgroundColor: '#0055FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 4,
    marginBottom: 4,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-SemiBold',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
    height: '50%',
    justifyContent: 'flex-end',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  eventTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Baloo2-Bold',
  },
  eventDate: {
    color: 'white',
    fontSize: 18,
    marginBottom: 4,
    fontFamily: 'Baloo2-SemiBold',
  },
  eventLocation: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Baloo2-SemiBold',
  },
  detailsButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 2,
    width: 54,
    height: 54,
    borderRadius: 32,
    backgroundColor: '#0055FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
  },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Baloo2-SemiBold',
  },
});