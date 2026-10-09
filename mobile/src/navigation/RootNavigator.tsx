import React, { useRef } from 'react';
import { NavigationContainer, NavigationContainerRef, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../store/AuthContext';
import { useAssistant } from '../store/AssistantContext';
import { useTheme } from '../store/ThemeContext';
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

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const tabIconPaths: Record<keyof MainTabParamList, string> = {
  Home: 'M3 10 12 3 21 10M5 9v11h5v-6h4v6h5V9',
  Transactions: 'M7 4v16m-4-4 4 4 4-4M17 20V4m-4 4 4-4 4 4',
  Stats: 'M5 20v-7m7 7V4m7 16V9',
  Insights: 'M12 3 14.5 9.5 21 12 14.5 14.5 12 21 9.5 14.5 3 12 9.5 9.5Z',
  Profile: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2',
};

function TabIcon({ name, focused }: { name: keyof MainTabParamList; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 32,
        height: 27,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primary : 'transparent',
      }}
    >
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke={focused ? colors.ink : colors.textMuted}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={tabIconPaths[name]} />
      </Svg>
    </View>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
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
          tabBarIcon: ({ focused }) => <TabIcon name="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'Операции',
          tabBarIcon: ({ focused }) => <TabIcon name="Transactions" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Статистика',
          tabBarIcon: ({ focused }) => <TabIcon name="Stats" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          title: 'ИИ',
          tabBarIcon: ({ focused }) => <TabIcon name="Insights" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} />,
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
  const { colors } = useTheme();
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

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { setNavigationRef } = useAssistant();
  const { colors, scheme } = useTheme();
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  const navTheme = {
    ...(scheme === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      ...(scheme === 'light' ? DefaultTheme.colors : DarkTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer
      key={scheme}
      theme={navTheme}
      ref={navRef}
      onReady={() => setNavigationRef(navRef.current)}
    >
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
