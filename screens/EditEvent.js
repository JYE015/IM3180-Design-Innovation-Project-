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
    const uploadImageToSupabase = async (uri) => {
        if (!imageUri) return null;

        // If its already a Supabase URL, return as is
        if (imageUri.includes('supabase'))
            return imageUri;
        } 
          
        try {
            setUploadingImage(true);
            const response = await fetch(uri);
            const blob = await response.blob();
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
