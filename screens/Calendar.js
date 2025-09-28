import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Calendar() {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [today] = useState(new Date());

  // Sample events data with proper time formatting
  const [events] = useState([
    {
      id: 1,
      title: "Hall Breakfast",
      time: "09:00 - 10:00",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00"
    },
    {
      id: 2,
      title: "Study Group",
      time: "14:00 - 16:00",
      date: new Date(Date.now() + 86400000), // Tomorrow
      startTime: "14:00",
      endTime: "16:00"
    },
    {
      id: 3,
      title: "Basketball Practice",
      time: "17:00 - 19:00",
      date: new Date(Date.now() + 86400000), // Tomorrow
      startTime: "17:00",
      endTime: "19:00"
    },
    {
      id: 4,
      title: "Movie Night",
      time: "20:00 - 22:00",
      date: new Date(Date.now() + 172800000), // Day after tomorrow
      startTime: "20:00",
      endTime: "22:00"
    }
  ]);
  
  // Day abbreviations for the week view
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Get start of current week
  const getStartOfWeek = () => {
    const date = new Date(today);
    date.setDate(date.getDate() + (currentWeekOffset * 7));
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  };

  // Check if two dates are the same
  const isSameDate = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Convert time string to minutes for calculation
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Calculate event duration in hours
  const calculateDuration = (startTime, endTime) => {
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);
    
    // Handle overnight events
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60; // Return duration in hours
  };

  // Check if event spans across a time slot
  const eventSpansTimeSlot = (event, timeSlot) => {
    const slotTime = timeToMinutes(timeSlot);
    const startTime = timeToMinutes(event.startTime);
    let endTime = timeToMinutes(event.endTime);
    
    // Handle overnight events
    if (endTime < startTime) {
      endTime += 24 * 60;
    }
    
    return slotTime >= startTime && slotTime < endTime;
  };

  //Generate array of 7 dates for the current week view
  const generateWeekDays = () => {
    const startOfWeek = getStartOfWeek();
    const days = [];
    
    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = generateWeekDays();
  
  //Get dynamic week title based on current week offset
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
    } else if (currentWeekOffset > 1) {
      return `Week starting ${monthDay} (${dayName})`;
    } else {
      return `Week starting ${monthDay} (${dayName})`;
    }
  };

  // Navigate weeks using arrow buttons
  const navigateWeek = (direction) => {
    if (direction === 'prev') {
      setCurrentWeekOffset(currentWeekOffset - 1);
    } else {
      setCurrentWeekOffset(currentWeekOffset + 1);
    }
  };

  // Get active indicator index based on week offset
  const getActiveIndicatorIndex = () => {
    // Map week offset to indicator position (0-3)
    // Adjust this logic based on how many weeks you want to represent
    const normalizedOffset = ((currentWeekOffset % 4) + 4) % 4;
    return normalizedOffset;
  };

  // user select day handler
  const handleDaySelect = (date, index) => {
    setSelectedDay(index);
  };

  // Filter events for selected date
  const getEventsForSelectedDate = () => {
    if (selectedDay === null) {
      // Show today's events by default
      return events.filter(event => isSameDate(event.date, today));
    }
    
    const selectedDate = weekDays[selectedDay];
    return events.filter(event => isSameDate(event.date, selectedDate));
  };

  // Get all time slots (24 hours) with events for selected date
  const getTimeSlotData = () => {
    const selectedEvents = getEventsForSelectedDate();
    const timeSlots = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    
    return timeSlots.map(timeSlot => {
      // Find events that START at this exact time slot
      const eventsStartingHere = selectedEvents.filter(event => 
        event.startTime === timeSlot
      );
      
      return {
        time: timeSlot,
        events: eventsStartingHere.map(event => ({
          ...event,
          duration: calculateDuration(event.startTime, event.endTime)
        }))
      };
    });
  };

  return (
    <View style={styles.container}>
      {/* Schedule Header */}
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>CALENDAR VIEW</Text>
        <View style={styles.logo}>
            <Image 
            source={require('../assets/hall1logo.png')} 
            style={styles.logoImage}
            resizeMode="cover"
            />
        </View>
      </View>

      {/* Week Section Container */}
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

          {/* Days Container */}
          <View style={styles.daysContainer}>
            {weekDays.map((date, index) => {
              const isToday = isSameDate(date, today);
              const isSelected = selectedDay === index;
              const hasEvents = events.some(event => isSameDate(event.date, date));
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCard,
                    isSelected && styles.selectedCard, // Selected state (pink)
                    isToday && !isSelected && styles.todayCard, // Today but not selected
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
                  {/* Event indicator dot */}
                  {hasEvents && !isSelected && (
                    <View style={styles.eventDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Week Indicators */}
          <View style={styles.weekIndicators}>
            {[0, 1, 2, 3].map((index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  getActiveIndicatorIndex() === index && styles.activeIndicator
                ]}
                onPress={() => setCurrentWeekOffset(index)}
              >
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Events Section Container */}
      <View style={styles.eventsSectionContainer}>
        <ScrollView style={styles.eventsSection} showsVerticalScrollIndicator={true}>
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
                    <View 
                      key={event.id} 
                      style={[
                        styles.eventCard, 
                        { 
                          top: -10, //Starting position of the event
                          height: Math.max(45, 20 + (event.duration * 30)), // Height based on duration of event
                          zIndex: 10
                        }
                      ]}
                    >
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>
                        {event.time} 
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
          
          {/* Show message if no events for the day */}
          {getEventsForSelectedDate().length === 0 && (
            <View style={styles.noEventsContainer}>
              <Text style={styles.noEventsText}>No events scheduled for this day</Text>
            </View>
          )}
          
          {/* Bottom spacer for tab bar */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </View>
  );
}

//UI Stylesheet
const styles = StyleSheet.create({
//Main container white background
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // Header section with title and logo
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#B8C4FE',
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 5,  
  },
  // Main title styling
  scheduleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-ExtraBold',
    color: '#333',
    letterSpacing: 1,
  },
  //Logo Container
  logo: {
    width: 30,
    height: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute', //positioned independently of title
    right: 20,
  },
  //Logo image styling
  logoImage: {
    width: '100%',
    height: '100%',
  },
  // Container for week section with margins
  weekSectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  //Week selection with blue background
  weekSection: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 15,
  },
  //Header row with navigation rows and arrows
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  //"This Week" Title
  weekTitle: {
    color: 'white',
    fontFamily: 'Baloo2-Bold',
    fontSize: 18,
    fontWeight: '600',
  },
  //Navigation Arrows button
  navArrow: {
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  //Container for day cards
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  //Individual day cards
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
  //Selected day styling pink
  selectedCard: {
    backgroundColor: '#ff9999', 
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  //Today card when not selected light blue
  todayCard: {
    backgroundColor: '#e8f4fd', 
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  //Text highlighting for selected day
  highlightedText: {
    color: '#333',
    fontWeight: 'bold',
  },
  //Dot to indicate events on a day
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2563eb',
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
  },
  //Day Number Text
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-Bold',
    color: '#333',
  },
  //Day Letter Text
  dayLetter: {
    fontSize: 11,
    color: '#666',
  },
  todayText: {
    color: '#333',
  },
  //Week indicator dots container
  weekIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  //Indicator (NOT current carousel page) dot
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  //Active indicator (current carousel page) dot
  activeIndicator: {
    backgroundColor: 'white',
  },
  //Container for events section 
  eventsSectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: 500,
  },
  //Event section with dark blue background
  eventsSection: {
    flex: 1,
    backgroundColor: '#8CBBFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderRadius: 15,
  },
  //Event section title
  eventsTitle: {
    fontSize: 18,
    fontFamily: 'Baloo2-ExtraBold',
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  //Container for all timeslots
  timeSlots: {
    gap: 20,
  },
  //Individual timeslot row
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  //Timeline labels (eg.0900)
  timeLabel: {
    width: 45,
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  //Timeline line for events
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333', 
    marginLeft: 15,
    position: 'relative',
  },
  //Dynamic event card position on timeline
  eventCard: {
    position: 'absolute',
    top: -22, // Fixed positioning for better alignment
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
    borderLeftColor: '#2563eb', // Add a blue accent bar
  },
  //Event title text
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Baloo2-ExtraBold',
    color: '#333',
    marginBottom: 2,
  },
  //Event time text
  eventTime: {
    fontSize: 10,
    fontFamily: 'Baloo2-Regular',
    color: '#666',
  },
  //Container for 'No events' message text
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  //'No events' message text 
  noEventsText: {
    fontSize: 14,
    fontFamily: 'Baloo2-ExtraBold',
    color: '#666',
  },
  bottomSpacer: {
    height: 5,
  },
});
