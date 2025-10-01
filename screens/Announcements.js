import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase"; // ✅ FIXED PATH

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("Announcements")
        .select("id, created_at, title, message")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("Error fetching announcements:", error);
        return;
      }
      setAnnouncements(data || []);
    } catch (err) {
      console.log("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Loading announcements…</Text>
      </View>
    );
  }

  if (announcements.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ANNOUNCEMENTS</Text>
          <View style={styles.headerLogo}>
            <Image
              source={require("../assets/hall1logo.png")}
              style={styles.headerLogoImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Empty state */}
        <View style={styles.center}>
          <Text>No announcements yet 📭</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ANNOUNCEMENTS</Text>
        <View style={styles.headerLogo}>
          <Image
            source={require("../assets/hall1logo.png")}
            style={styles.headerLogoImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Header styles (same as UserProfile/Calendar)
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: "#B8C4FE",
    paddingHorizontal: 20,
    paddingTop: 75,
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "Baloo2-ExtraBold",
    color: "#333",
  },
  headerLogo: {
    width: 45,
    height: 45,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    right: 20,
  },
  headerLogoImage: {
    width: "90%",
    height: "90%",
  },

  // Page styles
  container: {
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: "Baloo2-ExtraBold",
    color: "#333",
    marginBottom: 6,
  },
  message: {
    fontSize: 15,
    fontFamily: "Baloo2-Regular",
    color: "#555",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    fontFamily: "Baloo2-SemiBold",
    color: "#888",
    textAlign: "right",
  },
});
