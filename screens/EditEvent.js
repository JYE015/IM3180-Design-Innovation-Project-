import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    ActivityIndicator,
    Modal
} from "react-native";
import { useFonts } from 'expo-font';
import {supabase} from "../lib/supabase";
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


export default function EditEvent({ route, navigation }) {
    // Load Baloo2 font
    const [fontsLoaded] = useFonts({
      'Baloo2-Regular': require('../assets/fonts/Baloo2-Regular.ttf'),
      'Baloo2-Bold': require('../assets/fonts/Baloo2-Bold.ttf'),
      'Baloo2-SemiBold': require('../assets/fonts/Baloo2-SemiBold.ttf'),
      'Baloo2-Medium': require('../assets/fonts/Baloo2-Medium.ttf'),
    });

    // Getting event ID from navigation params
    const { eventId } = route.params;
    const [showCalendar, setShowCalendar] = useState(false);
    const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [eventData, setEventData] = useState({
        event_title:"",
        date: "",
        time: "",
        image_uri: "",
        details: "",
        registration_deadline: "",
        tags: "",
        maximum: "",
        location: ""
    });

    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [fetchingEvent, setFetchingEvent] = useState(true);
    const [originalImageUri, setOriginalImageUri] = useState("");
    
    // Tag States
    const [showTagsDropdown, setShowTagsDropdown] = useState(false);
    const [selectedTags, setSelectedTags] = useState([]);
  
    
    // Fetching Existing Data
    useEffect(() => {
        fetchEventData();
    }, [eventId]);

const fetchEventData = async () => {
    try {
        setFetchingEvent(true);

        const { data, error } = await supabase
            .from('Events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) {
            console.error("Error fetching event data:", error);
            Alert.alert("Error", "Failed to fetch event data.");
            navigation.goBack();
            return;
        }

        if (data) {
            // Mapping Supabase Data to local fields
            setEventData({
                event_title: data.Title || "",
                date: data.Date || "",
                time: data.Time ? data.Time.slice(0, 5) : "",
                image_uri: data.image_url || "",
                details: data.Description || "",
                registration_deadline: data.Deadline || "",
                tags: data.Tags || "",
                maximum: data.MaximumParticipants ? data.MaximumParticipants.toString() : "",
                location: data.Location || ""
            });

            setOriginalImageUri(data.image_url || "");
            
            // Parse tags into array
            if (data.Tags) {
              const parsedTags = data.Tags.split(', ').map(tag => tag.trim()).filter(tag => tag);
              setSelectedTags(parsedTags);
            }
          }
      } catch (error) {
          console.error("Unexpected error", error);
          Alert.alert("Error", "Failed to fetch event data.");
          navigation.goBack();
      } finally {
          setFetchingEvent(false);
      }
    };

    // Handling Input Changes
    const handleInputChange = (field, value) => {
        setEventData((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle date selection from calendar
    const handleDateSelect = (date) => {
        handleInputChange("date", date);
    };

    // Handle deadline selection from calendar
    const handleDeadlineSelect = (date) => {
        handleInputChange("registration_deadline", date);
    };

    const handleTimeSelect = (time /* "HH:MM" 24h */) => {
      handleInputChange("time", time);
    };
    
    // Toggle Function
   const toggleTag = (tag) => {
      setSelectedTags((prev) => {
        let newTags;
        if (prev.includes(tag)) {
          newTags = prev.filter((t) => t !== tag);
        } else {
          newTags = [...prev, tag];
        }
        
        setEventData((prevData) => ({
          ...prevData,
          tags: newTags.join(', '),
        }));
        
        return newTags;
      });
    };

    // Image Upload Function
    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "You need to grant permission to access the media library.");
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
        } catch (error) {
            console.error("Image Picker Error:", error);
            Alert.alert("Error", "Failed to pick image.");
        }
    };

    // Taking Photo from Camera
    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "You need to grant permission to access the camera.");
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
        } catch (error) {
            console.error("Camera Error:", error);
            Alert.alert("Error", "Failed to take photo.");
        }
    };  

    // Showing Image Options
    const showImageOptions = () => {
        Alert.alert(
            "Select Image",
            "Choose an option",
            [
                { text: "Gallery", onPress: pickImage },
                { text: "Camera", onPress: takePhoto },
                { text: "Remove Image", onPress: () => handleInputChange("image_uri", ""), style: 'destructive' },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    // Upload Image to Supabase Storage
     const uploadImageToSupabase = async (imageUri) => {
    if (!imageUri) return null;

    // If it's already a Supabase URL, return as is
    if (imageUri.includes('supabase')) {
      return imageUri;
    }

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

 // Delete old image from storage if it was changed
  const deleteOldImage = async (oldImageUrl) => {
    if (!oldImageUrl || !oldImageUrl.includes('supabase')) return;

    try {
      // Extract filename from URL
      const urlParts = oldImageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      await supabase.storage
        .from("event-images")
        .remove([fileName]);
    } catch (error) {
      console.error("Error deleting old image:", error);
      // Don't throw error - this is cleanup, not critical
    }
  };

  // Handle form submission to update the event
  const handleUpdate = async () => {

    // Validate Maximum if provided
    if (eventData.maximum && (isNaN(eventData.maximum) || parseInt(eventData.maximum) <= 0)) {
      Alert.alert("Error", "Maximum must be a positive number.");
      return;
    }

    // Validate Date & Time format
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
      let imageUrl = eventData.image_uri;

      // Check if image was changed
      if (eventData.image_uri && eventData.image_uri !== originalImageUri) {
        // Upload new image
        const newImageUrl = await uploadImageToSupabase(eventData.image_uri);
        if (newImageUrl) {
          imageUrl = newImageUrl;
          // Delete old image if it exists and was changed
          if (originalImageUri) {
            await deleteOldImage(originalImageUri);
          }
        } else {
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Image Upload Failed',
              'Would you like to update the event without changing the image?',
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
          // Keep original image
          imageUrl = originalImageUri;
        }
      }

      // If image was removed (empty string), delete old image
      if (!eventData.image_uri && originalImageUri) {
        await deleteOldImage(originalImageUri);
        imageUrl = null;
      }

      const payload = {};

      if (eventData.event_title) {
        payload.Title = eventData.event_title.trim();
      }
      if (eventData.details) {
        payload.Description = eventData.details.trim();
      }
      if (eventData.date) {
        payload.Date = eventData.date;
      }
      if (eventData.time) {
        payload.Time = eventData.time;
      }
      if (eventData.location) {
        payload.Location = eventData.location;
      }
      if (eventData.image_url) {
        payload.image_url = eventData.image_uri;
      }
      if (imageUrl !== undefined) {
        payload.image_url = imageUrl || null;
      }
        if (eventData.registration_deadline) {
        payload.Deadline = eventData.registration_deadline;
      }
      if (eventData.tags) {
        payload.Tags = eventData.tags;
      }
      if (eventData.maximum) {
        payload.MaximumParticipants = parseInt(eventData.maximum, 10);
      }


    console.log("Updating event with payload:", payload);

      const { error } = await supabase
        .from("Events")
        .update(payload)
        .eq("id", eventId);

      if (error) {
        console.error("Supabase Update Error:", JSON.stringify(error, null, 2));
        Alert.alert("Error", `Failed to update event: ${error.message}`);
      } else {
        Alert.alert("Success", "Event updated successfully!", [
          { 
            text: "OK", 
            onPress: () => {
              route.params?.onUpdated?.();   
              navigation.goBack();
            } 
          }
        ]);
      }
    } catch (err) {
      Alert.alert("Error", `An unexpected error occurred: ${err.message}`);
      console.error("Unexpected Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while fonts or event data is loading
  if (!fontsLoaded || fetchingEvent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {!fontsLoaded ? 'Loading fonts...' : 'Loading event data...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Event</Text>
        <Text style={styles.subtitle}>Update the event details below.</Text>
      </View>

      {/* Event Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event title"
          value={eventData.event_title}
          onChangeText={(value) => handleInputChange("event_title", value)}
        />
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event location"  
          value={eventData.location}
          onChangeText={(value) => handleInputChange("location", value)}
        />
      </View>
      
      {/* Date & Time Row */}
      <View style={[styles.rowContainer]}>
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

        {/* Image Preview */}
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Details of Event *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your event details..."
          value={eventData.details}
          onChangeText={(value) => handleInputChange("details", value)}
          multiline={true}
          numberOfLines={4}
        />
      </View>

      {/* Registration Deadline */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Registration Deadline</Text>
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
      <View style={styles.inputGroup}>
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

        {/* Dropdown Menu */}
        {showTagsDropdown && (
          <View style={styles.dropdownMenu}>
            {AvailableTags.map((tag, index) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.dropdownItem,
                  selectedTags.includes(tag) && styles.dropdownItemSelected,
                  index === AvailableTags.length - 1 && styles.lastDropdownItem,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <View style={[styles.checkbox, selectedTags.includes(tag) && styles.checkboxSelected]}>
                  {selectedTags.includes(tag) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.dropdownItemText, selectedTags.includes(tag) && styles.dropdownItemTextSelected]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Tags Pills */}
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maximum Participants</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 50"
          value={eventData.maximum}
          onChangeText={(value) => handleInputChange("maximum", value)}
          keyboardType="numeric"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.cancelButton]}
          onPress={() => navigation.goBack()}
          disabled={isLoading || uploadingImage}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.updateButton, (isLoading || uploadingImage) && styles.disabledButton]}
          onPress={handleUpdate}
          disabled={isLoading || uploadingImage}
        >
          <Text style={styles.updateButtonText}>
            {isLoading ? "Updating..." : "Update Event"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
      {/* Calendar Modals */}
      <CalendarModal
        visible={showCalendar}
        selectedDate={eventData.date}
        onDateSelect={handleDateSelect}
        onClose={() => setShowCalendar(false)}
        title="Select Event Date"
      />

      <CalendarModal
        visible={showDeadlineCalendar}
        selectedDate={eventData.registration_deadline}
        onDateSelect={handleDeadlineSelect}
        onClose={() => setShowDeadlineCalendar(false)}
        title="Select Registration Deadline"
      />

      {/* Time Picker Modal */}
        <TimePickerModal
          visible={showTimePicker}
          selectedTime={eventData.time}
          onTimeSelect={handleTimeSelect}
          onClose={() => setShowTimePicker(false)}
          title="Select Event Time"
        />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontFamily: 'Baloo2-Regular',
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
    fontFamily: 'Baloo2-Bold',
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontFamily: 'Baloo2-Regular',
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
    fontFamily: 'Baloo2-SemiBold',
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
    fontFamily: 'Baloo2-Regular',
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
    fontFamily: 'Baloo2-Regular',
  },
  imagePreview: {
    marginTop: 10,
  },
  previewLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    fontFamily: 'Baloo2-Regular',
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 6,
    resizeMode: "cover",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 15,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#757575",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    flex: 0.48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  updateButton: {
    backgroundColor: "#0055FE",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
    flex: 0.48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#8c8c8c",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: 'Baloo2-Bold',
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: 'Baloo2-Bold',
  },
  imagePickerButton: {
    backgroundColor: "#0055FE",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: 'Baloo2-SemiBold',
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
    fontFamily: 'Baloo2-Regular',
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
    fontFamily: 'Baloo2-Medium',
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
    overflow: 'hidden',
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
    fontFamily: 'Baloo2-Medium',
  },
  dropdownItemTextSelected: {
    fontFamily: 'Baloo2-SemiBold',
    color: '#0055FE',
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
    backgroundColor: '#0055FE',
    borderColor: '#0055FE',
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
    backgroundColor: '#ffffffff',
    borderWidth: 1,
    borderColor: '#0055FE',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagPillText: {
    color: '#0055FE',
    fontSize: 13,
    fontFamily: 'Baloo2-SemiBold',
  },
  tagPillCloseBtn: {
    padding: 2,
  },
  tagPillClose: {
    color: '#0055FE',
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
    fontFamily: 'Baloo2-Bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  calendarWrapper: {
    alignItems: 'center',
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
    backgroundColor: '#8c8c8c',
  },
  confirmButton: {
    backgroundColor: '#0055FE',
  },
  cancelButtonText: {
    color: 'white',
    fontFamily: 'Baloo2-Bold',
    fontSize: 16,
  },
  confirmButtonText: {
    color: 'white',
    fontFamily: 'Baloo2-Bold',
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
    fontFamily: 'Baloo2-Bold',
    color: '#0055FE',
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
    fontFamily: 'Baloo2-SemiBold',
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
    backgroundColor: '#0055FE',
  },
  pickerOptionText: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'Baloo2-Regular',
  },
  pickerOptionTextSelected: {
    color: 'white',
    fontFamily: 'Baloo2-Bold',
  },
});