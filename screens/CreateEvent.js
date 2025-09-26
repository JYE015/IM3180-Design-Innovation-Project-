import React, { useState } from "react";
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

  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  // Calendar Modals
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  
  // Image Uploader
  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // You can adjust this ratio
        quality: 0.8, // Compress image to reduce file size
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange("image_uri", result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Taking Photo from Image
  const takePhoto = async () => {
    try {
      // Request permission to access camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange("image_uri", result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
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
        { text: 'Remove Image', onPress: () => handleInputChange("image_uri", ""), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
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

      // Convert file URI → ArrayBuffer
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload as ArrayBuffer
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Update preview to hosted URL
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
    // Basic Validation
    if (!eventData.event_title || !eventData.date || !eventData.time || !eventData.details) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

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
      let imageUrl = null;
      if (eventData.image_uri) {
        imageUrl = await uploadImageToSupabase(eventData.image_uri);
        if (!imageUrl) {
          // If image upload failed, ask user if they want to continue without image
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
      }
    } catch (err) {
      Alert.alert("Error", `An unexpected error occurred: ${err.message}`);
      console.error("Unexpected Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // UI TEAM EDIT HERE ONWARDS 

  return (
    <ScrollView style={styles.container}>
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
        />
      </View>

      {/* Location */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter event location"  
          value={eventData.location}
          onChangeText={(value) => handleInputChange("location", value)}
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
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM (24hr)"
            value={eventData.time}
            onChangeText={(value) => handleInputChange("time", value)}
          />
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
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.input}
          placeholder="workshop, academic, sports (comma separated)"
          value={eventData.tags}
          onChangeText={(value) => handleInputChange("tags", value)}
        />
        <Text style={styles.helperText}>Separate multiple tags with commas</Text>
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

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={isLoading || uploadingImage}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? "Publishing..." : "Publish Event"}
        </Text>
      </TouchableOpacity>

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
    </ScrollView>
  );
}

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
});
