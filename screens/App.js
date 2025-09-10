import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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
import { supabase } from '../lib/supabase';

// ✅ NEW: React Navigation
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UserProfile from './UserProfile';

const Stack = createNativeStackNavigator();

function LoginScreen({ navigation }) {
  const [role, setRole] = useState("User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Admin credentials (⚠️ do not ship hardcoded secrets in production)
  const ADMIN_EMAIL = "ntuhall5admin@dipgirlies.com";
  const ADMIN_PASSWORD = "848526";

  // Test function to verify Supabase connection
  const testSupabase = async () => {
    try {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase.from('profiles').select('count');

      if (error) {
        console.log('Supabase error:', error);
        Alert.alert('Supabase Error', `Error: ${error.message}\n\nCheck your API key!`);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.log('Auth error:', authError);
        Alert.alert('Auth Error', authError.message);
        return;
      }

      Alert.alert('Success!', 'Supabase and Auth are connected properly!');
      console.log('Supabase test successful');
    } catch (err) {
      console.log('Connection error:', err);
      Alert.alert('Connection Error', `${err.message}\n\nCheck your supabase.js file`);
    }
  };

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

      console.log('Signup result:', userData, signUpError);

      if (signUpError) {
        console.log('Full signup error:', signUpError);
        Alert.alert(
          "Sign Up Error",
          `Error: ${signUpError.message}\n\nTry:\n1. Different email (like test@gmail.com)\n2. Check Supabase email settings`
        );
        return;
      }

      if (!userData.user) {
        Alert.alert("Error", "Sign up failed - no user data");
        return;
      }

      console.log('User created, now creating profile...');

      // Wait a moment for the auth session to be fully established
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          role: 'User'
        });

      if (profileError) {
        console.log('Profile creation error:', profileError);
        console.log('Attempting alternative profile creation...');

        const { error: altProfileError } = await supabase
          .from('profiles')
          .upsert(
            { id: userData.user.id, role: 'User' },
            { onConflict: 'id' }
          );

        if (altProfileError) {
          Alert.alert(
            "Profile Error",
            `${profileError.message}\n\nPlease update your database RLS policies or disable RLS for testing.`
          );
          return;
        }
      }

      Alert.alert(
        "Success!",
        "Account created successfully! Please check your email to verify your account."
      );

      setEmail("");
      setPassword("");

    } catch (error) {
      console.log('Unexpected signup error:', error);
      Alert.alert("Unexpected Error", error.message);
    }
  };

  // ---------------- LOGIN FUNCTION ----------------
  // Returns true on success so we can navigate
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return false;
    }

    console.log('Attempting login with:', email, 'Role:', role);

    try {
      // Admin path
      if (role === "Admin") {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          Alert.alert("Welcome Admin!", "You have successfully logged in as Hall 5 Admin.");
          setEmail("");
          setPassword("");
          // Navigate to profile anyway (or another admin screen if you make one)
          navigation.navigate('UserProfile', { from: 'admin' });
          return true;
        } else {
          Alert.alert("Access Denied", "Invalid admin credentials.");
          return false;
        }
      }

      // Regular user login
      console.log('Attempting user login...');
      const { data: userData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log('Login result:', userData, loginError);

      if (loginError) {
        console.log('Login error details:', loginError);

        if (loginError.message.includes("Invalid login credentials")) {
          Alert.alert(
            "Account Not Found",
            "No account found with this email. Would you like to sign up instead?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Up",
                onPress: () => {
                  setRole("User");
                  handleSignup();
                }
              }
            ]
          );
        } else if (loginError.message.includes("Email not confirmed")) {
          Alert.alert("Email Not Verified", "Please check your email and click the verification link first.");
        } else {
          Alert.alert("Login Error", loginError.message);
        }
        return false;
      }

      if (!userData?.user) {
        Alert.alert("Error", "Login failed - no user data");
        return false;
      }

      console.log('User logged in, checking profile...');

      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      console.log('Profile query result:', profile, profileError);

      if (profileError) {
        console.log('Profile error details:', profileError);

        if (profileError.code === 'PGRST116') {
          Alert.alert(
            "Profile Missing",
            "No profile found. This might be because:\n" +
            "1. Profile wasn't created during signup\n" +
            "2. Database policies are blocking access\n\n" +
            "Try signing up again or check your database."
          );
        } else {
          Alert.alert("Profile Error", profileError.message);
        }
        return false;
      }

      // Check if role matches UI selection
      if (profile.role !== role) {
        Alert.alert(
          "Role Mismatch",
          `This account is registered as a ${profile.role}, but you selected ${role}.\n\nWould you like to login as ${profile.role}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Yes",
              onPress: () => {
                setRole(profile.role);
                Alert.alert("Welcome!", `Successfully logged in as ${profile.role}!`);
                setEmail("");
                setPassword("");
                navigation.navigate('UserProfile', { role: profile.role });
              }
            }
          ]
        );
        return false;
      }

      Alert.alert("Welcome!", `Successfully logged in as ${profile.role}!`);
      setEmail("");
      setPassword("");
      navigation.navigate('UserProfile', { role: profile.role });
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
      {/* Hall Image */}
      <Image
        source={require('./assets/hall5logo.jpg')}
        style={styles.hallImage}
      />

      {/* Title */}
      <Text style={styles.title}>Hall 5 Login System</Text>

      {/* Test Supabase Button */}
      <TouchableOpacity style={styles.testButton} onPress={testSupabase}>
        <Text style={styles.testButtonText}>Test Supabase Connection</Text>
      </TouchableOpacity>

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

        <Text style={styles.currentRole}>Selected: {role}</Text>
      </View>

      {/* Email Input */}
      <TextInput
        style={styles.input}
        placeholder={role === "Admin" ? "Admin Email" : "Your Email"}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Password Input */}
      <TextInput
        style={styles.input}
        placeholder={role === "Admin" ? "Admin Password" : "Your Password"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Admin Info Display */}
      {role === "Admin" && (
        <View style={styles.adminInfo}>
          <Text style={styles.adminInfoText}>Admin Login Info:</Text>
          <Text style={styles.adminInfoText}>Email: ntuhall5admin@dipgirlies.com</Text>
          <Text style={styles.adminInfoText}>Password: 848526</Text>
        </View>
      )}

      {/* Buttons */}
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

      <StatusBar style="auto" />
    </ScrollView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Hall 5 Login' }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfile}
          options={{ title: 'My Profile' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  hallImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Role selector
  newRoleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  circleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  circleButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
    backgroundColor: '#3B82F6',
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
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  currentRole: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  input: {
    width: '100%',
    height: 55,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
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
    backgroundColor: '#4E8EF7',
  },
  signupButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
