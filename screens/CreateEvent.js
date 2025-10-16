import React, { useState, useRef } from "react";
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Modal
} from "react-native";
import { supabase } from "../lib/supabase";
import { Calendar } from 'react-native-calendars';

// Tags definition
const AvailableTags = [
  "Workshop",
  "Academic",
  "Sports",
  "Cultural",
  "Welfare",
  "FOC",
  "Residential Affairs"];

// Time Picker Modal Component
const TimePickerModal = ({ visible, selectedTime, onTimeSelect, onClose, title = "Select Time" }) => {
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: 12, minute: 0, period: 'PM' };
    const [hours, minutes] = timeStr.split(':').map(Number);
    return {
      hour: hours === 0 ? 12 : hours > 12 ? hours - 12 : hours,
      minute: minutes,
      period: hours >= 12 ? 'PM' : 'AM'
    };
  };

  const initialTime = parseTime(selectedTime);
  const [selectedHour, setSelectedHour] = useState(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initialTime.period);

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour24 = 0;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onTimeSelect(timeString);
    onClose();
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={calendarStyles.modalOverlay}>
        <View style={calendarStyles.timePickerContainer}>
          <Text style={calendarStyles.modalTitle}>{title}</Text>
          
          <View style={calendarStyles.timeDisplay}>
            <Text style={calendarStyles.timeDisplayText}>
              {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
            </Text>
          </View>

          <View style={calendarStyles.pickerRow}>
            {/* Hours */}
            <View style={calendarStyles.pickerColumn}>
              <Text style={calendarStyles.pickerLabel}>Hour</Text>
              <ScrollView style={calendarStyles.scrollPicker} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      calendarStyles.pickerOption,
                      selectedHour === hour && calendarStyles.pickerOptionSelected
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[
                      calendarStyles.pickerOptionText,
                      selectedHour === hour && calendarStyles.pickerOptionTextSelected
                    ]}>
                      {hour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Minutes */}
            <View style={calendarStyles.pickerColumn}>
              <Text style={calendarStyles.pickerLabel}>Minute</Text>
              <ScrollView style={calendarStyles.scrollPicker} showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      calendarStyles.pickerOption,
                      selectedMinute === minute && calendarStyles.pickerOptionSelected
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text style={[
                      calendarStyles.pickerOptionText,
                      selectedMinute === minute && calendarStyles.pickerOptionTextSelected
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM */}
            <View style={calendarStyles.pickerColumn}>
              <Text style={calendarStyles.pickerLabel}>Period</Text>
              <View style={calendarStyles.periodContainer}>
                {['AM', 'PM'].map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      calendarStyles.pickerOption,
                      selectedPeriod === period && calendarStyles.pickerOptionSelected
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text style={[
                      calendarStyles.pickerOptionText,
                      selectedPeriod === period && calendarStyles.pickerOptionTextSelected
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={calendarStyles.buttonRow}>
            <TouchableOpacity style={[calendarStyles.modalButton, calendarStyles.cancelButton]} onPress={onClose}>
              <Text style={calendarStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[calendarStyles.modalButton, calendarStyles.confirmButton]} onPress={handleConfirm}>
              <Text style={calendarStyles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CalendarModal = ({ visible, selectedDate, onDateSelect, onClose, title = "Select Date" }) => {
  const [selected, setSelected] = useState(selectedDate || '');

  const handleDayPress = (day) => {
    setSelected(day.dateString);
  };

  const handleConfirm = () => {
    onDateSelect(selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={calendarStyles.modalOverlay}>
        <View style={calendarStyles.calendarContainer}>
          <Text style={calendarStyles.modalTitle}>{title}</Text>
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              [selected]: { selected: true, selectedColor: '#4CAF50' }
            }}
            minDate={new Date().toISOString().split('T')[0]}
          />
          <View style={calendarStyles.buttonRow}>
            <TouchableOpacity style={[calendarStyles.modalButton, calendarStyles.cancelButton]} onPress={onClose}>
              <Text style={calendarStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[calendarStyles.modalButton, calendarStyles.confirmButton]} onPress={handleConfirm}>
              <Text style={calendarStyles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function CreateEvent() {
  // Create refs for navigation
  const locationInputRef = useRef(null);
  const detailsInputRef = useRef(null);
  const maximumInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const detailsViewRef = useRef(null);
  const tagsViewRef = useRef(null);
  const maximumViewRef = useRef(null);
  const submitButtonViewRef = useRef(null);

  const [eventData, setEventData] = useState({
    event_title: "",
    date: "",
    time: "",
    image_uri: "",
    details: "",
    registration_deadline: "",
    tags: "",
    maximum: "",
    location: "",
  });

  // Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Calendar & Time State
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Tag States
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  // Handle time selection from picker
  const handleTimeSelect = (time) => {
    handleInputChange("time", time);
  };

  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    handleInputChange("date", date);
  };

  // Handle deadline selection from calendar
  const handleDeadlineSelect = (date) => {
    handleInputChange("registration_deadline", date);
  };

  // Handling Input Changes
  const handleInputChange = (field, value) => {
    setEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Toggle Function
  const toggleTag = (tag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
    
    // Update eventData with comma-separated tags
    setEventData((prev) => ({
      ...prev,
      tags: selectedTags.includes(tag) 
        ? selectedTags.filter((t) => t !== tag).join(', ')
        : [...selectedTags, tag].join(', '),
    }));
  };

  // Image Uploader
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        // Skip to next field even if permission denied
        setTimeout(() => {
          detailsViewRef.current?.measureLayout(
            scrollViewRef.current,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
            }
          );
          setTimeout(() => detailsInputRef.current?.focus(), 300);
        }, 300);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange("image_uri", result.assets[0].uri);
      }
      
      // Auto-focus details field after image selection (or cancellation)
      setTimeout(() => {
        detailsViewRef.current?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          }
        );
        setTimeout(() => detailsInputRef.current?.focus(), 300);
      }, 300);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      // Continue to next field even on error
      setTimeout(() => {
        detailsViewRef.current?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          }
        );
        setTimeout(() => detailsInputRef.current?.focus(), 300);
      }, 300);
    }
  };

  // Taking Photo from Image
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
        // Skip to next field even if permission denied
        setTimeout(() => {
          detailsViewRef.current?.measureLayout(
            scrollViewRef.current,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
            }
          );
          setTimeout(() => detailsInputRef.current?.focus(), 300);
        }, 300);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange("image_uri", result.assets[0].uri);
      }
      
      // Auto-focus details field after photo (or cancellation)
      setTimeout(() => {
        detailsViewRef.current?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          }
        );
        setTimeout(() => detailsInputRef.current?.focus(), 300);
      }, 300);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      // Continue to next field even on error
      setTimeout(() => {
        detailsViewRef.current?.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          }
        );
        setTimeout(() => detailsInputRef.current?.focus(), 300);
      }, 300);
    }
  };

  // Showing Image Options
  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { 
          text: 'Skip', 
          onPress: () => {
            // Skip image and go to details
            setTimeout(() => {
              detailsViewRef.current?.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                }
              );
              setTimeout(() => detailsInputRef.current?.focus(), 300);
            }, 300);
          }
        },
        { 
          text: 'Remove Image', 
          onPress: () => {
            handleInputChange("image_uri", "");
            setTimeout(() => {
              detailsViewRef.current?.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                }
              );
              setTimeout(() => detailsInputRef.current?.focus(), 300);
            }, 300);
          }, 
          style: 'destructive' 
        },
      ]
    );
  };

  // Send Image to Supabase Storage
  const uploadImageToSupabase = async (imageUri) => {
    if (!imageUri) return null;

    try {
      setUploadingImage(true);

      const fileExt = imageUri.split('.').pop().toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      setEventData((prev) => ({
        ...prev,
        image_uri: publicUrl,
      }));

      return publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
      Alert.alert("Error", "Failed to upload image. Please try again.");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handling Form Submission to Supabase
  const handleSubmit = async () => {
    if (!eventData.event_title || !eventData.date || !eventData.time || !eventData.details) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (eventData.maximum && (isNaN(eventData.maximum) || parseInt(eventData.maximum) <= 0)) {
      Alert.alert("Error", "Maximum must be a positive number.");
      return;
    }

    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(eventData.date);
    const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(eventData.time || "");
    if (!dateOk) {
      Alert.alert("Error", "Date must be in YYYY-MM-DD format.");
      return;
    }
    if (eventData.time && !timeOk) {
      Alert.alert("Error", "Time must be in HH:MM (24hr) format.");
      return;
    }

    setIsLoading(true);

    try {
      let imageUrl = null;
      if (eventData.image_uri) {
        imageUrl = await uploadImageToSupabase(eventData.image_uri);
        if (!imageUrl) {
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Image Upload Failed',
              'Would you like to create the event without an image?',
              [
                { text: 'Cancel', onPress: () => resolve(false) },
                { text: 'Continue', onPress: () => resolve(true) },
              ]
            );
          });
          
          if (!shouldContinue) {
            setIsLoading(false);
            return;
          }
        }
      }

      const payload = {
        Title: eventData.event_title.trim(),
        Description: eventData.details.trim(),
        Date: eventData.date ? eventData.date : null,
        Time: eventData.time ? eventData.time : null,
        Location: eventData.location ? eventData.location : null,
        image_url: imageUrl,
        Deadline: eventData.registration_deadline ? eventData.registration_deadline : null,
        Tags: eventData.tags ? eventData.tags : null,
        MaximumParticipants: eventData.maximum ? parseInt(eventData.maximum, 10) : null,
        CurrentParticipants: 0,
      };

      console.log("Submitting payload:", payload);

      const { data, error } = await supabase.from("Events").insert([payload]);

      if (error) {
        console.error("Supabase Insert Error:", JSON.stringify(error, null, 2));
        Alert.alert("Error", `Failed to create event: ${error.message}`);
      } else {
        Alert.alert("Success", "Event created successfully!");
        console.log("Supabase Inserted Data:", data);

        setEventData({
          event_title: "",
          date: "",
          time: "",
          image_url: "",
          details: "",
          registration_deadline: "",
          tags: "",
          maximum: "",
          location: "",
        });
        setSelectedTags([]);
      }
    } catch (err) {
      Alert.alert("Error", `An unexpected error occurred: ${err.message}`);
      console.error("Unexpected Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Create New Event</Text>
        <Text style={styles.subtitle}>Fill in the details below to create a new event.</Text>
      </View>

      {/* Event Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event title"
          value={eventData.event_title}
          onChangeText={(value) => handleInputChange("event_title", value)}
          returnKeyType="next"
          onSubmitEditing={() => locationInputRef.current?.focus()}
          blurOnSubmit={false}
        />
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location *</Text>
        <TextInput
          ref={locationInputRef}
          style={styles.input}
          placeholder="Enter event location"  
          value={eventData.location}
          onChangeText={(value) => handleInputChange("location", value)}
          returnKeyType="next"
          onSubmitEditing={() => setShowCalendar(true)}
          blurOnSubmit={false}
        />
      </View>
      
      {/* Date & Time Row */}
      <View style={styles.rowContainer}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Date *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowCalendar(true)}
          >
            <Text style={[styles.datePickerText, !eventData.date && styles.placeholderText]}>
              {eventData.date || "Select Date"}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Time *</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={[styles.datePickerText, !eventData.time && styles.placeholderText]}>
              {eventData.time || "Select Time"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image Upload */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Picture</Text>
        
        <TouchableOpacity 
          style={styles.imagePickerButton} 
          onPress={showImageOptions}
          disabled={uploadingImage}
        >
          <Text style={styles.imagePickerButtonText}>
            {uploadingImage ? 'Uploading...' : eventData.image_uri ? 'Change Image' : 'Add Image'}
          </Text>
        </TouchableOpacity>

        {eventData.image_uri && (
          <View style={styles.imagePreview}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Image
              source={{ uri: eventData.image_uri }}
              style={styles.previewImage}
              onError={(error) => {
                console.log("Image load error:", error);
              }}
            />
          </View>
        )}
      </View>

      {/* Event Details */}
      <View style={styles.inputGroup} ref={detailsViewRef} collapsable={false}>
        <Text style={styles.label}>Details of Event *</Text>
        <TextInput
          ref={detailsInputRef}
          style={[styles.input, styles.textArea]}
          placeholder="Describe your event details..."
          value={eventData.details}
          onChangeText={(value) => handleInputChange("details", value)}
          multiline={true}
          numberOfLines={4}
          returnKeyType="next"
          onSubmitEditing={() => setShowDeadlineCalendar(true)}
          blurOnSubmit={true}
        />
      </View>

      {/* Registration Deadline */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Registration Deadline *</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDeadlineCalendar(true)}
        >
          <Text style={[styles.datePickerText, !eventData.registration_deadline && styles.placeholderText]}>
            {eventData.registration_deadline || "Select Deadline"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tags */}
      <View style={styles.inputGroup} ref={tagsViewRef} collapsable={false}>
        <Text style={styles.label}>Tags</Text>
        
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowTagsDropdown(!showTagsDropdown)}
        >
          <View style={styles.dropdownButtonContent}>
            <Text style={[styles.dropdownButtonText, selectedTags.length === 0 && styles.placeholderText]}>
              {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected` : 'Select tags...'}
            </Text>
          </View>
          <Text style={styles.dropdownIcon}>{showTagsDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showTagsDropdown && (
          <ScrollView style={styles.dropdownMenu} nestedScrollEnabled={true}>
            {AvailableTags.map((tag, index) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.dropdownItem,
                  selectedTags.includes(tag) && styles.dropdownItemSelected,
                ]}
                onPress={() => {
                  toggleTag(tag);
                  // Auto-close dropdown and move to maximum field after selecting a tag
                  if (!selectedTags.includes(tag)) {
                    setTimeout(() => {
                      setShowTagsDropdown(false);
                      setTimeout(() => {
                        maximumViewRef.current?.measureLayout(
                          scrollViewRef.current,
                          (x, y) => {
                            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                          }
                        );
                        setTimeout(() => maximumInputRef.current?.focus(), 300);
                      }, 300);
                    }, 500);
                  }
                }}
              >
                <View style={[styles.checkbox, selectedTags.includes(tag) && styles.checkboxSelected]}>
                  {selectedTags.includes(tag) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.dropdownItemText, selectedTags.includes(tag) && styles.dropdownItemTextSelected]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
            
            {/* Skip button at bottom of dropdown */}
            <TouchableOpacity
              style={[styles.dropdownItem, { backgroundColor: '#f5f5f5', borderTopWidth: 2, borderTopColor: '#e0e0e0' }]}
              onPress={() => {
                setShowTagsDropdown(false);
                setTimeout(() => {
                  maximumViewRef.current?.measureLayout(
                    scrollViewRef.current,
                    (x, y) => {
                      scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
                    }
                  );
                  setTimeout(() => maximumInputRef.current?.focus(), 300);
                }, 300);
              }}
            >
              <Text style={[styles.dropdownButtonText, { textAlign: 'center', flex: 1, color: '#666' }]}>
                Skip Tags →
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {selectedTags.length > 0 && (
          <View style={styles.selectedTagsContainer}>
            {selectedTags.map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
                <TouchableOpacity onPress={() => toggleTag(tag)} style={styles.tagPillCloseBtn}>
                  <Text style={styles.tagPillClose}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Maximum Participants */}
      <View style={styles.inputGroup} ref={maximumViewRef} collapsable={false}>
        <Text style={styles.label}>Maximum Participants</Text>
        <TextInput
          ref={maximumInputRef}
          style={styles.input}
          placeholder="e.g. 50"
          value={eventData.maximum}
          onChangeText={(value) => handleInputChange("maximum", value)}
          keyboardType="numeric"
          returnKeyType="done"
          onFocus={() => {
            setTimeout(() => {
              maximumViewRef.current?.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  // Scroll much higher to show both field and button above keyboard
                  scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
                }
              );
            }, 100);
          }}
          onSubmitEditing={() => {
            setTimeout(() => {
              submitButtonViewRef.current?.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({ y: y + 100, animated: true });
                }
              );
            }, 100);
          }}
        />
      </View>

      {/* Submit Button */}
      <View ref={submitButtonViewRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isLoading || uploadingImage}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? "Publishing..." : "Publish Event"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />

      {/* Extra spacing to ensure content is scrollable above keyboard */}
      <View style={{ height: 400 }} />

      {/* Calendar Modals */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={eventData.date}
        onDateSelect={(date) => {
          handleDateSelect(date);
          setTimeout(() => setShowTimePicker(true), 300);
        }}
        onClose={() => setShowCalendar(false)}
        title="Select Event Date"
      />

      <CalendarModal
        visible={showDeadlineCalendar}
        selectedDate={eventData.registration_deadline}
        onDateSelect={(date) => {
          handleDeadlineSelect(date);
          setTimeout(() => {
            setShowTagsDropdown(true);
            // Scroll to tags section when dropdown opens
            setTimeout(() => {
              tagsViewRef.current?.measureLayout(
                scrollViewRef.current,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({ y: y - 50, animated: true });
                }
              );
            }, 300);
          }, 300);
        }}
        onClose={() => setShowDeadlineCalendar(false)}
        title="Select Registration Deadline"
      />
      
      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        selectedTime={eventData.time}
        onTimeSelect={(time) => {
          handleTimeSelect(time);
          setTimeout(() => showImageOptions(), 300);
        }}
        onClose={() => setShowTimePicker(false)}
        title="Select Event Time"
      />
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  inputGroup: {
    backgroundColor: "#fff",
    padding: 15,
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 15,
  },
  halfWidth: {
    flex: 0.48,
    marginHorizontal: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  imagePreview: {
    marginTop: 10,
  },
  previewLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 6,
    resizeMode: "cover",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 15,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  imagePickerButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 30,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#fafafa",
    justifyContent: "center",
  },
  datePickerText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  dropdownButton: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dropdownButtonContent: {
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f8f4',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: '#d0d0d0',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPillText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  tagPillCloseBtn: {
    padding: 2,
  },
  tagPillClose: {
    color: '#2e7d32',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});

const calendarStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 0.45,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeDisplay: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  timeDisplayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
    marginBottom: 15,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  scrollPicker: {
    maxHeight: 150,
    width: '100%',
  },
  periodContainer: {
    width: '100%',
  },
  pickerOption: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 2,
  },
  pickerOptionSelected: {
    backgroundColor: '#4CAF50',
  },
  pickerOptionText: {
    fontSize: 18,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  }
});