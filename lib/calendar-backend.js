// lib/calendar-backend.js
// Fixed version with proper exports

import { supabase } from './supabase';
import dayjs from 'dayjs';

/**
 * Helper function to calculate end time (assumes 1-2 hour duration)
 */
const calculateEndTime = (startTime) => {
  if (!startTime) return '01:00';
  
  const [hours, minutes] = startTime.split(':').map(Number);
  let endHour = hours + 2; // Default 2-hour duration
  
  // Handle 24-hour overflow
  if (endHour >= 24) {
    endHour = endHour - 24;
  }
  
  return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Get events for a specific week to populate your calendar
 */
export const getWeekEvents = async (weekOffset = 0) => {
  try {
    console.log('getWeekEvents called with weekOffset:', weekOffset);
    
    // Calculate the week date range
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + (weekOffset * 7));
    
    // Get Monday of the week (your calendar starts from Monday)
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    console.log('Fetching events from', startDate, 'to', endDate);

    const { data, error } = await supabase
      .from('Events')
      .select(`
        id,
        Title,
        Description,
        Date,
        Time,
        Location,
        image_url,
        Tags,
        MaximumParticipants,
        CurrentParticipants
      `)
      .gte('Date', startDate)
      .lte('Date', endDate)
      .order('Date', { ascending: true })
      .order('Time', { ascending: true });

    if (error) {
      console.error('Supabase error in getWeekEvents:', error);
      throw error;
    }

    console.log('Raw data from Supabase:', data);

    // Transform data to match your Calendar.js component format
    const transformedEvents = data?.map(event => ({
      id: event.id,
      title: event.Title,
      time: event.Time ? `${event.Time.slice(0, 5)} - ${calculateEndTime(event.Time.slice(0, 5))}` : 'All day',
      date: new Date(event.Date),
      startTime: event.Time ? event.Time.slice(0, 5) : '00:00', // Remove seconds
      endTime: calculateEndTime(event.Time ? event.Time.slice(0, 5) : '00:00'),
      description: event.Description,
      location: event.Location,
      tags: event.Tags,
      maxParticipants: event.MaximumParticipants,
      currentParticipants: event.CurrentParticipants
    })) || [];

    console.log('Transformed events:', transformedEvents);

    return { data: transformedEvents, error: null };
  } catch (error) {
    console.error('Error in getWeekEvents:', error);
    return { data: [], error };
  }
};

/**
 * Get user's registered events for the calendar view (Option 1 - Separate queries)
 */
export const getUserWeekEvents = async (userId, weekOffset = 0) => {
  try {
    if (!userId) {
      console.log('No userId provided to getUserWeekEvents');
      return { data: [], error: null };
    }

    console.log('getUserWeekEvents called with userId:', userId, 'weekOffset:', weekOffset);

    // Calculate week date range
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + (weekOffset * 7));
    
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    // Step 1: Get attendance records for the user
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('id, event, created_at')
      .eq('user', userId);

    if (attendanceError) {
      console.error('Error fetching attendance data:', attendanceError);
      throw attendanceError;
    }

    if (!attendanceData || attendanceData.length === 0) {
      console.log('No attendance records found for user');
      return { data: [], error: null };
    }

    // Step 2: Get event IDs that user is registered for
    const eventIds = attendanceData.map(attendance => attendance.event);
    console.log('User is registered for event IDs:', eventIds);

    // Step 3: Get events for those IDs within the date range with proper ordering
    const { data: eventsData, error: eventsError } = await supabase
      .from('Events')
      .select(`
        id,
        Title,
        Description,
        Date,
        Time,
        Location,
        Tags,
        MaximumParticipants,
        CurrentParticipants
      `)
      .in('id', eventIds)
      .gte('Date', startDate)
      .lte('Date', endDate)
      .order('Date', { ascending: true })
      .order('Time', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events data:', eventsError);
      throw eventsError;
    }

    if (!eventsData || eventsData.length === 0) {
      console.log('No events found for user in the specified date range');
      return { data: [], error: null };
    }

    // Step 4: Create a map of attendance data for quick lookup
    const attendanceMap = new Map();
    attendanceData.forEach(attendance => {
      attendanceMap.set(attendance.event, attendance);
    });

    // Step 5: Transform to match calendar format
    const userEvents = eventsData.map(event => {
      const attendance = attendanceMap.get(event.id);
      return {
        id: event.id,
        title: event.Title,
        time: event.Time ? `${event.Time.slice(0, 5)} - ${calculateEndTime(event.Time.slice(0, 5))}` : 'All day',
        date: new Date(event.Date),
        startTime: event.Time ? event.Time.slice(0, 5) : '00:00', // Remove seconds
        endTime: calculateEndTime(event.Time ? event.Time.slice(0, 5) : '00:00'),
        description: event.Description,
        location: event.Location,
        tags: event.Tags,
        maxParticipants: event.MaximumParticipants,
        currentParticipants: event.CurrentParticipants,
        isUserRegistered: true,
        attendanceId: attendance?.id,
        registrationDate: attendance?.created_at
      };
    });

    console.log('User events found:', userEvents.length);
    console.log('User events:', userEvents);

    return { data: userEvents, error: null };
  } catch (error) {
    console.error('Error in getUserWeekEvents:', error);
    return { data: [], error };
  }
};

/**
 * Register user for an event from calendar
 */
export const registerForEventFromCalendar = async (userId, eventId) => {
  try {
    console.log('Registering user', userId, 'for event', eventId);

    // Check if already registered
    const { data: existingRegistration } = await supabase
      .from('attendance')
      .select('id')
      .eq('user', userId)
      .eq('event', eventId)
      .single();

    if (existingRegistration) {
      return { data: null, error: { message: 'Already registered for this event' } };
    }

    // Register for event
    const { data, error } = await supabase
      .from('attendance')
      .insert([{
        user: userId,
        event: eventId,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error registering for event:', error);
      throw error;
    }

    console.log('Successfully registered for event:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error in registerForEventFromCalendar:', error);
    return { data: null, error };
  }
};

/**
 * Cancel registration for an event from calendar
 */
export const cancelEventRegistration = async (userId, eventId) => {
  try {
    console.log('Canceling registration for user', userId, 'event', eventId);

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('user', userId)
      .eq('event', eventId);

    if (error) {
      console.error('Error canceling registration:', error);
      throw error;
    }

    console.log('Successfully canceled registration');
    return { error: null };
  } catch (error) {
    console.error('Error in cancelEventRegistration:', error);
    return { error };
  }
};

/**
 * Get calendar statistics for dashboard
 */
export const getCalendarStats = async (userId = null) => {
  try {
    console.log('Getting calendar stats for user:', userId);

    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const weekEnd = endOfWeek.toISOString().split('T')[0];

    // Get today's events
    const { count: todayCount } = await supabase
      .from('Events')
      .select('*', { count: 'exact', head: true })
      .eq('Date', today);

    // Get this week's events
    const { count: weekCount } = await supabase
      .from('Events')
      .select('*', { count: 'exact', head: true })
      .gte('Date', weekStart)
      .lte('Date', weekEnd);

    let userRegistrations = 0;
    if (userId) {
      const { count } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('user', userId);
      userRegistrations = count || 0;
    }

    const stats = {
      todayEvents: todayCount || 0,
      weekEvents: weekCount || 0,
      userRegistrations
    };

    console.log('Calendar stats:', stats);

    return {
      data: stats,
      error: null
    };
  } catch (error) {
    console.error('Error in getCalendarStats:', error);
    return { data: null, error };
  }
};

/**
 * Create a new event from the calendar (optional feature)
 */
export const createEventFromCalendar = async (eventData) => {
  try {
    const { data, error } = await supabase
      .from('Events')
      .insert([{
        Title: eventData.title,
        Description: eventData.description || '',
        Date: eventData.date,
        Time: eventData.startTime,
        Location: eventData.location || '',
        Tags: eventData.tags || '',
        MaximumParticipants: eventData.maxParticipants || null,
        CurrentParticipants: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error in createEventFromCalendar:', error);
    return { data: null, error };
  }
};