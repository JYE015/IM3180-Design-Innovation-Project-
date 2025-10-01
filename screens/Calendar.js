// screens/Calendar.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { 
  getWeekEvents, 
  getUserWeekEvents, 
  getCalendarStats,
  registerForEventFromCalendar,
  cancelEventRegistration 
} from '../lib/calendar-backend';

const { width } = Dimensions.get('window');

export default function Calendar({ navigation }) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [today] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarStats, setCalendarStats] = useState(null);

  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, []);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: weekEvents, error: eventsError } = await getWeekEvents(currentWeekOffset);
      
      if (eventsError) {
        console.error('Error fetching week events:', eventsError);
        Alert.alert('Error', 'Failed to load events');
        return;
      }

      setEvents(weekEvents || []);

      if (currentUser) {
        const { data: userWeekEvents, error: userError } = await getUserWeekEvents(
          currentUser.id, 
          currentWeekOffset
        );
        
        if (userError) {
          console.error('Error fetching user events:', userError);
        } else {
          setUserEvents(userWeekEvents || []);
        }

        const todayFormatted = new Date().toISOString().split('T')[0];
        const todayEvents = weekEvents?.filter(e => {
          const eventDate = new Date(e.date).toISOString().split('T')[0];
          return eventDate === todayFormatted;
        }).length || 0;
        
        const weekEventsCount = weekEvents?.length || 0;
        const userRegistrationsInWeek = userWeekEvents?.length || 0;

        setCalendarStats({
          todayEvents: todayEvents,
          weekEvents: weekEventsCount,
          userRegistrations: userRegistrationsInWeek
        });
      } else {
        setUserEvents([]);
        const todayFormatted = new Date().toISOString().split('T')[0];
        const todayEvents = weekEvents?.filter(e => {
          const eventDate = new Date(e.date).toISOString().split('T')[0];
          return eventDate === todayFormatted;
        }).length || 0;
        
        setCalendarStats({
          todayEvents: todayEvents,
          weekEvents: weekEvents?.length || 0,
          userRegistrations: 0
        });
      }
    } catch (error) {
      console.error('Error in fetchCalendarData:', error);
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [currentWeekOffset, currentUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCalendarData();
    setRefreshing(false);
  }, [fetchCalendarData]);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser !== undefined) {
        fetchCalendarData();
      }
    }, [fetchCalendarData, currentUser])
  );

  const getStartOfWeek = () => {
    const date = new Date(today);
    date.setDate(date.getDate() + (currentWeekOffset * 7));
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  };

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 2;
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);
    
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  };

  const generateWeekDays = () => {
    const startOfWeek = getStartOfWeek();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = generateWeekDays();
  
  const getWeekTitle = () => {
    if (currentWeekOffset === 0) {
      return "This week";
    }
    
    const startOfWeek = getStartOfWeek();
    const dayName = startOfWeek.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (currentWeekOffset === 1) {
      return `Next week starting ${monthDay} (${dayName})`;
    } else if (currentWeekOffset === -1) {
      return `Last week starting ${monthDay} (${dayName})`;
    } else {
      return `Week starting ${monthDay} (${dayName})`;
    }
  };

  const navigateWeek = (direction) => {
    if (direction === 'prev') {
      setCurrentWeekOffset(currentWeekOffset - 1);
    } else {
      setCurrentWeekOffset(currentWeekOffset + 1);
    }
    setSelectedDay(null);
  };

  const getActiveIndicatorIndex = () => {
    const normalizedOffset = ((currentWeekOffset % 4) + 4) % 4;
    return normalizedOffset;
  };

  const handleDaySelect = (date, index) => {
    setSelectedDay(index);
  };

  const handleEventPress = (event) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to view event details or register.');
      return;
    }

    const isUserRegistered = userEvents.some(userEvent => userEvent.id === event.id);

    Alert.alert(
      event.title,
      `${event.description || ''}\n\nLocation: ${event.location || 'TBA'}\nTime: ${event.time}`,
      [
        { text: 'View Details', onPress: () => navigation.navigate('EventPage', { id: event.id }) },
        isUserRegistered 
          ? { text: 'Cancel Registration', onPress: () => handleCancelRegistration(event), style: 'destructive' }
          : { text: 'Register', onPress: () => handleRegisterEvent(event) },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  const handleRegisterEvent = async (event) => {
    try {
      const { error } = await registerForEventFromCalendar(currentUser.id, event.id);
      
      if (error) {
        Alert.alert('Registration Failed', error.message);
        return;
      }

      Alert.alert('Success', 'You have successfully registered for this event!');
      fetchCalendarData();
    } catch (error) {
      console.error('Error registering for event:', error);
      Alert.alert('Error', 'Failed to register for event. Please try again.');
    }
  };

  const handleCancelRegistration = async (event) => {
    try {
      const { error } = await cancelEventRegistration(currentUser.id, event.id);
      
      if (error) {
        Alert.alert('Error', 'Failed to cancel registration. Please try again.');
        return;
      }

      Alert.alert('Success', 'Your registration has been canceled.');
      fetchCalendarData();
    } catch (error) {
      console.error('Error canceling registration:', error);
      Alert.alert('Error', 'Failed to cancel registration. Please try again.');
    }
  };

  const getEventsForSelectedDate = () => {
    let targetDate;
    
    if (selectedDay === null) {
      targetDate = today;
    } else {
      targetDate = weekDays[selectedDay];
    }

    const allEvents = [...events];
    const selectedDateEvents = allEvents.filter(event => isSameDate(event.date, targetDate));

    return selectedDateEvents.map(event => {
      const isRegistered = userEvents.some(userEvent => userEvent.id === event.id);
      return {
        ...event,
        isUserRegistered: isRegistered
      };
    });
  };

  const getTimeSlotData = () => {
    const selectedEvents = getEventsForSelectedDate();
    const timeSlots = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    
    return timeSlots.map(timeSlot => {
      const slotHour = parseInt(timeSlot.split(':')[0]);
      
      const eventsStartingHere = selectedEvents.filter(event => {
        if (!event.startTime) return false;
        const eventHourStr = event.startTime.split(':')[0];
        const eventHour = parseInt(eventHourStr);
        return eventHour === slotHour;
      });
      
      return {
        time: timeSlot,
        events: eventsStartingHere.map(event => ({
          ...event,
          duration: calculateDuration(
            event.startTime ? event.startTime.slice(0, 5) : '00:00', 
            event.endTime ? event.endTime.slice(0, 5) : '02:00'
          )
        }))
      };
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>CALENDAR VIEW</Text>
        {calendarStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
               This Week: {calendarStats.weekEvents}
              {currentUser && ` | My Events: ${calendarStats.userRegistrations}`}
            </Text>
          </View>
        )}
        <View style={styles.logo}>
          <Image 
            source={require('../assets/hall1logo.png')} 
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.weekSectionContainer}>
        <View style={styles.weekSection}>
          <View style={styles.weekHeader}>
            <TouchableOpacity 
              style={styles.navArrow} 
              onPress={() => navigateWeek('prev')}
            >
              <Ionicons name="chevron-back" size={18} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.weekTitle}>{getWeekTitle()}</Text>
            
            <TouchableOpacity 
              style={styles.navArrow} 
              onPress={() => navigateWeek('next')}
            >
              <Ionicons name="chevron-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.daysContainer}>
            {weekDays.map((date, index) => {
              const isToday = isSameDate(date, today);
              const isSelected = selectedDay === index;
              const hasEvents = events.some(event => isSameDate(event.date, date));
              const hasUserEvents = userEvents.some(event => isSameDate(event.date, date));
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCard,
                    isSelected && styles.selectedCard,
                    isToday && !isSelected && styles.todayCard,
                  ]}
                  onPress={() => handleDaySelect(date, index)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayNumber,
                    (isToday || isSelected) && styles.highlightedText
                  ]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[
                    styles.dayLetter,
                    (isToday || isSelected) && styles.highlightedText
                  ]}>
                    {dayNames[index]}
                  </Text>
                  {hasEvents && !isSelected && (
                    <View style={[
                      styles.eventDot,
                      hasUserEvents && styles.userEventDot
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.weekIndicators}>
            {[0, 1, 2, 3].map((index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  getActiveIndicatorIndex() === index && styles.activeIndicator
                ]}
                onPress={() => setCurrentWeekOffset(index)}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.eventsSectionContainer}>
        <ScrollView 
          style={styles.eventsSection} 
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.eventsTitle}>
            {selectedDay !== null 
              ? `Events for ${weekDays[selectedDay].toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
              : 'Today\'s Events'
            }
          </Text>
          
          <View style={styles.timeSlots}>
            {getTimeSlotData().map((slot, index) => (
              <View key={index} style={styles.timeSlot}>
                <Text style={styles.timeLabel}>{slot.time}</Text>
                <View style={styles.timeLine}>
                  {slot.events.map((event, eventIndex) => (
                    <TouchableOpacity
                      key={event.id} 
                      style={[
                        styles.eventCard, 
                        event.isUserRegistered && styles.userEventCard,
                        { 
                          top: -10,
                          height: Math.max(45, 20 + (event.duration * 30)),
                          zIndex: 10
                        }
                      ]}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>{event.time}</Text>
                      {event.location && (
                        <Text style={styles.eventLocation}>{event.location}</Text>
                      )}
                      {event.isUserRegistered && (
                        <View style={styles.registeredBadge}>
                          <Text style={styles.registeredBadgeText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
          
          {getEventsForSelectedDate().length === 0 && (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>No events scheduled for this day</Text>
              {!currentUser && (
                <Text style={styles.loginPrompt}>
                  Log in to see your registered events
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#B8C4FE',
    paddingHorizontal: 20,
    paddingTop: 75,
    paddingBottom: 5,  
  },
  scheduleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-ExtraBold',
    color: '#333',
  },
  statsContainer: {
    position: 'absolute',
    top: 45,
    left: 20,
    right: 20,
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  logo: {
    width: 45,
    height: 45,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 20,
  },
  logoImage: {
    width: '90%',
    height: '90%',
  },
  weekSectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  weekSection: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 15,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Baloo2-Bold',
    fontWeight: '600',
  },
  navArrow: {
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 40,
    flex: 1,
    marginHorizontal: 2,
  },
  selectedCard: {
    backgroundColor: '#ff9999', 
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  todayCard: {
    backgroundColor: '#e8f4fd', 
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  highlightedText: {
    color: '#333',
    fontWeight: 'bold',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563eb',
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
  },
  userEventDot: {
    backgroundColor: '#ff9999',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayLetter: {
    fontSize: 11,
    color: '#666',
  },
  weekIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeIndicator: {
    backgroundColor: 'white',
  },
  eventsSectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: 500,
  },
  eventsSection: {
    flex: 1,
    backgroundColor: '#8CBBFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderRadius: 15,
  },
  eventsTitle: {
    fontSize: 18,
    fontFamily: 'Baloo2-ExtraBold',
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  timeSlots: {
    gap: 20,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    width: 45,
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333', 
    marginLeft: 15,
    position: 'relative',
  },
  eventCard: {
    position: 'absolute',
    top: -22,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  userEventCard: {
    borderLeftColor: '#ff9999',
    backgroundColor: '#fff5f5',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Baloo2-ExtraBold',
    color: '#333',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    fontFamily: 'Baloo2-Regular',
    color: '#666',
  },
  eventLocation: {
    fontSize: 9,
    fontFamily: 'Baloo2-Regular',
    color: '#888',
    marginTop: 1,
  },
  registeredBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registeredBadgeText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Baloo2-ExtraBold',
    fontWeight: 'bold',
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noEventsText: {
    fontSize: 14,
    fontFamily: 'Baloo2-Bold',
    color: '#666',
  },
  loginPrompt: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 5,
  },
});