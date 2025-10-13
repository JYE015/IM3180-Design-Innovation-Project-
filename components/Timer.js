import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';

export default function Timer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00'
  });
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    // Handle invalid or missing date
    if (!targetDate) {
      setIsPast(true);
      return;
    }

    const calculateTimeLeft = () => {
      const now = dayjs();
      const target = dayjs(targetDate);
      
      // Check if the deadline has passed
      if (target.isBefore(now)) {
        setIsPast(true);
        return { days: '00', hours: '00', minutes: '00' };
      }

      // Calculate the remaining time
      const diffMs = target.diff(now);
      const diffDuration = dayjs.duration(diffMs);
      
      const days = String(Math.floor(diffDuration.asDays())).padStart(2, '0');
      const hours = String(diffDuration.hours()).padStart(2, '0');
      const minutes = String(diffDuration.minutes()).padStart(2, '0');
      
      return { days, hours, minutes };
    };

    // Update time immediately
    setTimeLeft(calculateTimeLeft());
    
    // Set up interval to update every minute
    const timerId = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(timerId);
  }, [targetDate]);

  if (isPast) {
    return <Text style={styles.pastText}>Registration Closed</Text>;
  }

  return (
    <View style={styles.timerContainer}>
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{timeLeft.days}</Text>
        <Text style={styles.timeLabel}>Days</Text>
      </View>
      <Text style={styles.timeSeparator}>:</Text>
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{timeLeft.hours}</Text>
        <Text style={styles.timeLabel}>Hours</Text>
      </View>
      <Text style={styles.timeSeparator}>:</Text>
      <View style={styles.timeBlock}>
        <Text style={styles.timeValue}>{timeLeft.minutes}</Text>
        <Text style={styles.timeLabel}>Mins</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 32,
    fontFamily: 'Baloo2-Bold',
    color: '#000000ff',
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Baloo2-Regular',
    color: '#666',
    marginTop: -5,
  },
  timeSeparator: {
    fontSize: 32,
    fontFamily: 'Baloo2-Bold',
    color: '#000000ff',
    marginHorizontal: 8,
    marginBottom: 10,
  },
  pastText: {
    fontSize: 24,
    fontFamily: 'Baloo2-Bold',
    color: '#0055FE',
    textAlign: 'center',
  }
});
