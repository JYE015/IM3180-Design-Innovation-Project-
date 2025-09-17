import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase"; // Adjust the path as necessary

export default function CreateEvent() {
  const [eventData, setEventData] = useState({
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

  const [isLoading, setIsLoading] = useState(false);

  // Handling Input Changes
  const handleInputChange = (field, value) => {
    setEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Validating Image Url
  const isValidUrl = (url) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
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
      const payload = {
        Title: eventData.event_title.trim(),
        Description: eventData.details.trim(),
        Date: eventData.date ? eventData.date : null,
        Time: eventData.time ? eventData.time : null,
        Location: eventData.location ? eventData.location : null,
        image_url: eventData.image_url ? eventData.image_url : null,
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
        <Text style={styles.label}>Location</Text>
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
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={eventData.date}
            onChangeText={(value) => handleInputChange("date", value)}
          />
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

      {/* Image URL */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Picture (Image URL)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com/image.jpg"
          value={eventData.image_url}
          onChangeText={(value) => handleInputChange("image_url", value)}
        />
        {/* Preview image only if URL is valid */}
        {eventData.image_url && isValidUrl(eventData.image_url) && (
          <View style={styles.imagePreview}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Image
              source={{ uri: eventData.image_url }}
              style={styles.previewImage}
              onError={(error) => {
                console.log("Image load error:", error);
              }}
              onLoad={() => console.log("Image loaded successfully")}
            />
            <Text style={styles.imageNote}>
              If image doesn't show, the URL might not work on mobile
            </Text>
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
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={eventData.registration_deadline}
          onChangeText={(value) => handleInputChange("registration_deadline", value)}
        />
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
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? "Publishing..." : "Publish Event"}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
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
  bottomSpacer: {
    height: 30,
  },
});
