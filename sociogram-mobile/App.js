/**
 * App.js — Root of Sociogram Mobile (SDK 54 compatible)
 */

import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import { colors, font } from './theme';

import HomeScreen     from './screens/HomeScreen';
import ExploreScreen  from './screens/ExploreScreen';
import MessagesScreen from './screens/MessagesScreen';
import ProfileScreen  from './screens/ProfileScreen';
import AuthScreen     from './screens/AuthScreen';

const Stack = createNativeStackNavigator();
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

const TABS = [
  { name: 'Home',     component: HomeScreen,     icon: '🏠' },
  { name: 'Explore',  component: ExploreScreen,  icon: '🔍' },
  { name: 'Messages', component: MessagesScreen, icon: '✉️' },
  { name: 'Profile',  component: ProfileScreen,  icon: '👤' },
];

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
          <Text style={{
            fontSize: 10,
            color: focused ? colors.brand : colors.muted,
            fontWeight: focused ? '700' : '400',
            marginTop: -2,
          }}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find(t => t.name === route.name);
          return (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>
              {tab?.icon}
            </Text>
          );
        },
      })}
    >
      {TABS.map(({ name, component }) => (
        <Tab.Screen key={name} name={name} component={component} />
      ))}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={{ color: colors.muted, marginTop: 16, fontSize: font.sm }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {user ? (
        <>
          <Stack.Screen name="Main"    component={AppTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
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
