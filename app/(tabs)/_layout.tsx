import { useAuth } from '@/contexts/AuthContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import { BookOpen, Building2, CloudUpload, Home, HousePlus, ListChecks, Monitor, Plus, Shield, Trophy, User } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window'); 

// Import screen components (pastikan path sesuai struktur project kamu)
import QuranScreen from './quran';
import admin from './admin';
import IndexScreen from './index';
import JoinOrganizeScreen from './join-organize';
import LeaderboardScreen from './leaderboard';
import monitoring from './monitoring';
import organize from './organize';
import penilaian from './penilaian';
import ProfileScreen from './profile';
import QuizScreen from './quiz';
import SetoranScreen from './setoran';
import equran from './equran';

const Tab = createBottomTabNavigator();

export default function TabsLayout() {
  const { user, profile, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const role = profile?.role;

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/welcome');
    }
  }, [loading, user]);

  if (loading || !user || !profile) {
    return null;
  }

  const getTabsForRole = () => {
    const commonTabs = [
      { name: 'Beranda', component: IndexScreen, icon: Home },
      { name: 'Al-Quran', component: QuranScreen, icon: BookOpen },
      { name: 'Leaderboard', component: LeaderboardScreen, icon: Trophy },
    ];

    switch (role) {
      case 'siswa':
        return [
          ...commonTabs,
          { name: 'Setoran', component: SetoranScreen, icon: Plus },
          { name: 'Quiz', component: QuizScreen, icon: ListChecks },
          { name: 'Gabung Kelas', component: JoinOrganizeScreen, icon: HousePlus },
          { name: 'Profil', component: ProfileScreen, icon: User },
        ];
          case 'ortu':
        return [
          ...commonTabs,
       { name: 'monitoring', component: monitoring, icon: Monitor  },
          { name: 'Gabung Kelas', component: JoinOrganizeScreen, icon: HousePlus },
          { name: 'Profil', component: ProfileScreen, icon: User },
        ];
          case 'guru':
        return [
          ...commonTabs,
           { name: 'monitoring', component: monitoring, icon: Monitor  },
          { name: 'Penilaian', component: penilaian, icon: CloudUpload },
          { name: 'Quiz', component: QuizScreen, icon: ListChecks },
           { name: 'Organize', component: organize, icon: Building2 },
          { name: 'Profil', component: ProfileScreen, icon: User },
        ];
          case 'admin':
        return [
          ...commonTabs,
          { name: 'Admin', component: admin, icon: Shield },
        ];
      default:
        return commonTabs;
    }
  };

  const tabs = getTabsForRole();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'white',
           borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 80 + insets.bottom : 80,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
          
        },
        tabBarLabelStyle: {
       
          fontWeight: '600',
         fontSize: width < 380 ? 10 : 12,
           marginTop: 4,
              },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: ({ size, color }) => (
              <tab.icon size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
