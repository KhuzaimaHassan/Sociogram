/**
 * App.js — Root of Sociogram Mobile
 *
 * Navigation structure:
 *   AuthStack  →  (Login / Register)
 *   AppTabs    →  Home | Explore | Messages | Profile
 *                 └─ Home stack → Notifications, Camera
 *                 └─ Messages stack → Chat
 *                 └─ Profile stack → OtherProfile, Settings
 */

import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AuthProvider, useAuth } from './context/AuthContext';
import { colors, font } from './theme';

// Screens
import HomeScreen      from './screens/HomeScreen';
import ExploreScreen   from './screens/ExploreScreen';
import MessagesScreen  from './screens/MessagesScreen';
import ProfileScreen   from './screens/ProfileScreen';
import AuthScreen      from './screens/AuthScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    background:   colors.bg,
    card:         colors.elevated,
    text:         colors.white,
    border:       colors.border,
    primary:      colors.brand,
    notification: colors.accent,
  },
};

const TAB_ICONS = {
  Home:     { active: '🏠', inactive: '🏠' },
  Explore:  { active: '🔍', inactive: '🔍' },
  Messages: { active: '✉️', inactive: '✉️' },
  Profile:  { active: '👤', inactive: '👤' },
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.elevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabel: ({ focused }) => (
          <Text style={{ fontSize: 10, color: focused ? colors.brand : colors.muted, fontWeight: focused ? '700' : '500', marginTop: -2 }}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]?.active}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Explore"  component={ExploreScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile"  component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      {user ? (
        <>
          <Stack.Screen name="Main"     component={AppTabs} />
          <Stack.Screen name="Profile"  component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsPlaceholder} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreenWrapper} />
      )}
    </Stack.Navigator>
  );
}

// Simple wrappers for screens that need navigation
function AuthScreenWrapper({ navigation }) {
  const { login, register } = useAuth();

  async function handleSubmit(tab, form) {
    if (tab === 'login') {
      await login({ email: form.email, password: form.password });
    } else {
      await register({ username: form.username, email: form.email, password: form.password, displayName: form.displayName });
    }
  }

  return <AuthScreen onSubmit={handleSubmit} navigation={navigation} />;
}

function SettingsPlaceholder({ navigation }) {
  const { logout } = useAuth();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ color: colors.white, fontSize: font.lg, fontWeight: '800' }}>⚙️ Settings</Text>
      <Text style={{ color: colors.muted, fontSize: font.sm, textAlign: 'center', paddingHorizontal: 32 }}>
        Full settings available on the web app at sociogram-rho.vercel.app
      </Text>
      <View style={{ gap: 10 }}>
        <LinearGradient colors={[colors.brand, colors.accent]} start={[0,0]} end={[1,0]} style={{ borderRadius: 14, overflow: 'hidden' }}>
          <Text
            style={{ color: '#fff', fontWeight: '700', paddingHorizontal: 24, paddingVertical: 12, textAlign: 'center' }}
            onPress={() => navigation.goBack()}
          >
            Go Back
          </Text>
        </LinearGradient>
        <Text style={{ color: colors.rose, textAlign: 'center', paddingVertical: 8 }} onPress={logout}>
          Log Out
        </Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <AuthProvider>
        <NavigationContainer theme={NAV_THEME}>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
