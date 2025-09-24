import React, { useEffect } from "react";
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
    ActivityIndicator
} from "react-native";
import {supabase} from "../lib/supabase";

export default function EditEvent({ route, navigation }) {
    // Getting event ID from navigation params
    const { eventId } = route.params;

    const [eventData, setEventData] = React.useState({
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

    const [isLoading, setIsLoading] = React.useState(false);
    const [uploadingImage, setUploadingImage] = React.useState(false);
    const [fetchingEvent, setFetchingEvent] = React.useState(true);
    const [originalImageUri, setOriginalImageUri] = React.useState("");

    // Fetching Existing Data
useEffect(() => {
    fetchEventData();
}, [eventId]);

const fetchEventData = async () => {
    try {
        setFetchingEvent(true);

        const { data, error } = await supabase
            .from('events')
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
                time: data.Time || "",
                image_uri: data.image_uri || "",
                details: data.details || "",
                registration_deadline: data.Deadline || "",
                tags: data.tags || "",
                maximum: data.maximumParticipants ? data.maximumParticipants.toString() : "",
                location: data.location || ""
            });

            setOriginalImageUri(data.image_uri || "");
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
      let imageUrl = eventData.image_uri;

      // Check if image was changed
      if (eventData.image_uri && eventData.image_uri !== originalImageUrl) {
        // Upload new image
        const newImageUrl = await uploadImageToSupabase(eventData.image_uri);
        if (newImageUrl) {
          imageUrl = newImageUrl;
          // Delete old image if it exists and was changed
          if (originalImageUrl) {
            await deleteOldImage(originalImageUrl);
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
          imageUrl = originalImageUrl;
        }
      }

      // If image was removed (empty string), delete old image
      if (!eventData.image_uri && originalImageUrl) {
        await deleteOldImage(originalImageUrl);
        imageUrl = null;
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
      };

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
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err) {
      Alert.alert("Error", `An unexpected error occurred: ${err.message}`);
      console.error("Unexpected Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while fetching event data
  if (fetchingEvent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading event data...</Text>
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
    backgroundColor: "#FF9800",
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
    backgroundColor: "#cccccc",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  updateButtonText: {
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
});