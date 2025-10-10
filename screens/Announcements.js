import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";

// Helper function to get time category
const getTimeCategory = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Today
  if (diffDays === 0) return 'Today';
  
  // Yesterday
  if (diffDays === 1) return 'Yesterday';
  
  // This week (last 7 days)
  if (diffDays <= 7) return 'This Week';
  
  // This month
  const sameMonth = date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
  if (sameMonth) return 'Earlier This Month';
  
  // This year
  if (date.getFullYear() === now.getFullYear()) return 'Earlier This Year';
  
  // Older
  return date.getFullYear().toString();
};

// Group announcements by time category
const groupAnnouncementsByTime = (announcements) => {
  const groups = {};
  
  announcements.forEach(announcement => {
    const category = getTimeCategory(announcement.created_at);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(announcement);
  });
  
  return groups;
};

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

  // Group announcements by time
  const groupedAnnouncements = groupAnnouncementsByTime(announcements);
  const sections = Object.keys(groupedAnnouncements).map(category => ({
    title: category,
    data: groupedAnnouncements[category]
  }));

  // Sort sections by time order
  const sectionOrder = ['Today', 'Yesterday', 'This Week', 'Earlier This Month', 'Earlier This Year'];
  sections.sort((a, b) => {
    const indexA = sectionOrder.indexOf(a.title);
    const indexB = sectionOrder.indexOf(b.title);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return b.title.localeCompare(a.title); // Years in descending order
  });

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

      {/* List with Sections */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.container}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{title}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const date = new Date(item.created_at);
          const day = date.getDate();
          const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
          const year = date.getFullYear();
          
          return (
            <View style={styles.card}>
              {/* Date Left Sidebar */}
              <View style={styles.dateLeftSidebar}>
                <Text style={styles.dateDay}>{day}</Text>
                <Text style={styles.dateMonth}>{month}</Text>
                <Text style={styles.dateYear}>{year}</Text>
              </View>
              
              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
              </View>
            </View>
          );
        }}
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
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  
  // Section Header
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,  // Space between title and badge
    paddingTop: 8,
    paddingBottom: 4,
    paddingLeft: 4,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'Baloo2-SemiBold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#d1d5db',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontFamily: 'Baloo2-SemiBold',
    color: '#4b5563',
  },
  
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  
  // Date Left Sidebar
  dateLeftSidebar: {
    width: 75,
    backgroundColor: '#8CBBFF',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderTopLeftRadius: 12,  
    borderBottomLeftRadius: 12,  
  },
  
  dateDay: {
    fontSize: 30,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-ExtraBold',
    color: '#1f2937',
    lineHeight: 34,
    marginBottom: -14,
  },
  
  dateMonth: {
    fontSize: 14,
    fontFamily: 'Baloo2-SemiBold',
    color: '#4b5563',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  
  dateYear: {
    fontSize: 11,
    fontFamily: 'Baloo2-SemiBold',
    color: '#6b7280',
    marginTop: -6,
  },
  
  // Content Area
  cardContent: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    borderTopRightRadius: 12,  
  borderBottomRightRadius: 12,  
  },
  
  title: {
    fontSize: 17,
    fontFamily: 'Baloo2-ExtraBold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  
  message: {
    fontSize: 14,
    fontFamily: 'Baloo2-Regular',
    color: '#4b5563',
    lineHeight: 20,
  },
});