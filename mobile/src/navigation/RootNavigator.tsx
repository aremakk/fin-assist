import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { useAssistant } from '../store/AssistantContext';
import { Loading } from '../components/ui';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TransactionFormScreen } from '../screens/TransactionFormScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { WalletsScreen } from '../screens/WalletsScreen';
import { AuthStackParamList, MainTabParamList, RootStackParamList } from './types';
import { colors } from '../utils/theme';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.tabIconText, focused && styles.tabIconTextActive]}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 78,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused }) => <TabIcon label="01" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Операции',
          tabBarIcon: ({ focused }) => <TabIcon label="02" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Статистика',
          tabBarIcon: ({ focused }) => <TabIcon label="03" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          title: 'ИИ',
          tabBarIcon: ({ focused }) => <TabIcon label="AI" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => <TabIcon label="05" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen
        name="TransactionForm"
        component={TransactionFormScreen}
        options={{ title: '', headerBackTitle: 'Назад', presentation: 'modal' }}
      />
      <RootStack.Screen name="Categories" component={CategoriesScreen} options={{ title: '', headerBackTitle: 'Назад' }} />
      <RootStack.Screen name="Wallets" component={WalletsScreen} options={{ title: '', headerBackTitle: 'Назад' }} />
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: { width: 32, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: colors.primary },
  tabIconText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  tabIconTextActive: { color: colors.ink },
});

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { setNavigationRef } = useAssistant();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer ref={navRef} onReady={() => setNavigationRef(navRef.current)}>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
