import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

export default function AdminEventListItem({ event, onPress }) {
  const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).format('DD MMM YYYY');
  };

  const getSignupPercentage = () => {
    if (!event.maximumParticipants) return 0;
    return (event.currentParticipants / event.maximumParticipants) * 100;
  };

  const getStatusColor = () => {
    const percentage = getSignupPercentage();
    if (percentage >= 100) return '#ff4444'; // Full - Red
    if (percentage >= 75) return '#ffa000';  // Almost full - Orange
    return '#4CAF50';                        // Available - Green
  };

  const isPastEvent = () => {
    if (!event.date) return false;
    return dayjs(event.date).isBefore(dayjs(), 'day');
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isPastEvent() && styles.pastEventContainer
      ]} 
      onPress={onPress}
    >
      {/* Event Image */}
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={30} color="#666" />
          </View>
        )}
      </View>

      {/* Event Details */}
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.info}>{formatDate(event.date)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.info} numberOfLines={1}>{event.location}</Text>
        </View>

        {/* Signup Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusInfo}>
            <Text style={styles.participantCount}>
              {event.currentParticipants}/{event.maximumParticipants}
            </Text>
            <Text style={styles.statusLabel}>Signups</Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBar,
                { 
                  width: `${Math.min(getSignupPercentage(), 100)}%`,
                  backgroundColor: getStatusColor()
                }
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: -10,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
    flexDirection: 'row',  // Change from 'row' to 'column'
    height: 170,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pastEventContainer: {
    opacity: 0.7,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Baloo2-Bold',
    color: '#333',
    marginBottom: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
    marginTop: 1,
  },
  info: {
    fontSize: 15,
    fontFamily: 'Baloo2-Regular',
    color: '#666',
    marginLeft: 4,
  },
  statusContainer: {
    marginTop: 1,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  participantCount: {
    fontSize: 15,
    fontFamily: 'Baloo2-Bold',
    color: '#333',
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Baloo2-Regular',
    color: '#666',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});