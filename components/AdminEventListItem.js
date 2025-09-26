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

      {/* Status Badge */}
      {isPastEvent() && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Past</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    flexDirection: 'row',
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
    width: 80,
    height: 80,
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
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusContainer: {
    marginTop: 4,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 12,
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
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#666',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});