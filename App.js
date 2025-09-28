import { StatusBar } from 'expo-status-bar';
import { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from './lib/supabase';

// Add font loading import
import * as Font from 'expo-font';

// React Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import UserProfile from './screens/UserProfile';
import EventHome from './screens/EventHome';
import EventPage from './components/EventPage';
import TinderView from './components/TinderView';
import CreateEvent from './screens/CreateEvent';
import Calendar from './screens/Calendar';
import AdminHome from './screens/AdminHome';
import AdminEventListItem from './components/AdminEventListItem';
import EditEvent from './screens/EditEvent';
import AdminEventPage from './components/AdminEventPage';

// ✅ NEW: Import Announcements
import Announcements from './screens/Announcements';

// Import icons
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main app screens
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Announcements') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4E8EF7',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false, // We'll handle headers in individual screens
      })}
    >
      <Tab.Screen
        name="Home"
        component={EventHome}
        options={{ title: 'Home' }}
      />

      <Tab.Screen
        name="Calendar"
        component={Calendar}
        options={{ title: 'Calendar' }}
      />

      {/* ✅ NEW: Announcements Tab */}
      <Tab.Screen
        name="Announcements"
        component={Announcements}
        options={{ title: 'Inbox' }}
      />

      <Tab.Screen
        name="Profile"
        component={UserProfile}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function LoginScreen({ navigation }) {
  const [role, setRole] = useState("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Admin credentials (⚠️ do not ship hardcoded secrets in production)
  const ADMIN_EMAIL = "admin@gmail.com";
  const ADMIN_PASSWORD = "000000";

  // ---------------- SIGN UP FUNCTION ----------------
  const handleSignup = async () => {
    if (role === "Admin") {
      Alert.alert("Error", "Admins cannot sign up. Use the official hall admin account.");
      return;
    }
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    console.log('Attempting signup with:', email);

    try {
      const { data: userData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (signUpError) {
        Alert.alert("Sign Up Error", signUpError.message);
        return;
      }

      if (!userData.user) {
        Alert.alert("Error", "Sign up failed - no user data");
        return;
      }

      // Create profile in DB
      await supabase.from('profiles').upsert(
        { id: userData.user.id, role: 'User' },
        { onConflict: 'id' }
      );

      Alert.alert("Success!", "Account created. Please verify your email.");
      setEmail("");
      setPassword("");

    } catch (error) {
      console.log('Unexpected signup error:', error);
      Alert.alert("Unexpected Error", error.message);
    }
  };

  // ---------------- LOGIN FUNCTION ----------------
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return false;
    }

    try {
      // Admin path
      if (role === "Admin") {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          Alert.alert("Welcome Admin!", "You have successfully logged in as Hall 5 Admin.");
          setEmail("");
          setPassword("");
          navigation.navigate('AdminHome');
          return true;
        } else {
          Alert.alert("Access Denied", "Invalid admin credentials.");
          return false;
        }
      }

      // Regular user login
      const { data: userData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (loginError) {
        Alert.alert("Login Error", loginError.message);
        return false;
      }

      if (!userData?.user) {
        Alert.alert("Error", "Login failed - no user data");
        return false;
      }

      // Navigate to main tabs
      navigation.navigate('MainTabs');
      return true;

    } catch (error) {
      console.log('Unexpected login error:', error);
      Alert.alert("Unexpected Error", error.message);
      return false;
    }
  };

  // ---------- UI ----------
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={require('./assets/hubble_image.png')}
        style={styles.hubbleImage}
      />

      {/* Role Selection */}
      <View style={styles.newRoleContainer}>
        <Text style={styles.roleLabel}>Select Your Role:</Text>
        <View style={styles.circleButtonRow}>
          {/* USER */}
          <TouchableOpacity
            style={[
              styles.circleButton,
              styles.blueCircle,
              role === "User" && styles.selectedCircle
            ]}
            onPress={() => setRole("User")}
            activeOpacity={0.8}
          >
            <Text style={styles.circleText}>USER</Text>
          </TouchableOpacity>

          {/* ADMIN */}
          <TouchableOpacity
            style={[
              styles.circleButton,
              styles.redCircle,
              role === "Admin" && styles.selectedCircle
            ]}
            onPress={() => setRole("Admin")}
            activeOpacity={0.8}
          >
            <Text style={styles.circleText}>ADMIN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email */}
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder={role === "Admin" ? "Admin Email" : "Your Email"}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Password */}
      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder={role === "Admin" ? "Admin Password" : "Your Password"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Buttons */}
      {email.trim() !== "" && password.trim() !== "" && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          {role !== "Admin" && (
            <TouchableOpacity
              style={[styles.button, styles.signupButton]}
              onPress={handleSignup}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <StatusBar style="auto" />
    </ScrollView>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Baloo2-Regular': require('./assets/fonts/Baloo2-Regular.ttf'),
          'Baloo2-Medium': require('./assets/fonts/Baloo2-Medium.ttf'),
          'Baloo2-Bold': require('./assets/fonts/Baloo2-Bold.ttf'),
          'Baloo2-ExtraBold': require('./assets/fonts/Baloo2-ExtraBold.ttf'),
          'Baloo2-SemiBold': require('./assets/fonts/Baloo2-SemiBold.ttf'),
        });
      } catch (error) {
        console.warn('Error loading fonts:', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="EventPage" component={EventPage} options={{ title: 'Event Details' }} />
        <Stack.Screen name="AdminPage" component={CreateEvent} options={{ title: 'Event Details' }} />
        <Stack.Screen name="AdminHome" component={AdminHome} options={{ title: 'Admin Home' }} />
        <Stack.Screen name="AdminEventListItem" component={AdminEventListItem} />
        <Stack.Screen name="AdminEventPage" component={AdminEventPage} options={{ title: 'Event Tracking Details' }} />
        <Stack.Screen name="EditEvent" component={EditEvent} options={{ title: 'Edit Event Page' }} />
        <Stack.Screen name="TinderView" component={TinderView} options={{ title: 'Event Home' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  hubbleImage: {
    width: '115%',
    height: 400,
    borderRadius: 12,
    marginTop: 20,
    resizeMode: 'contain',
  },
  roleLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-Bold',
    color: '#333',
    marginBottom: 5,
  },
  circleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  circleButton: {
    width: 120,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 3,
  },
  blueCircle: {
    backgroundColor: '#0055FF',
    borderColor: '#1E40AF',
  },
  redCircle: {
    backgroundColor: '#EF4444',
    borderColor: '#B91C1C',
  },
  selectedCircle: {
    borderWidth: 5,
    borderColor: '#FFD700',
    shadowOpacity: 0.6,
    elevation: 12,
    transform: [{ scale: 1.1 }],
  },
  circleText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Baloo2-ExtraBold',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-Bold',
    color: '#333',
    marginBottom: 5,
    alignSelf: 'flex-start',
    marginLeft: 5,
  },
  input: {
    width: '100%',
    height: 55,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Baloo2-Regular',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  adminInfo: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  adminInfoText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButton: {
    backgroundColor: '#0055FF',
  },
  signupButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Baloo2-ExtraBold',
  },
});
