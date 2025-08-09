import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Award, Users, TrendingUp, Calendar, Star, Trophy, Clock, Target, CirclePlus as PlusCircle } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import { QuranHistory } from '@/components/QuranHistory';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalSetoran?: number;
  setoranPending?: number;
  setoranDiterima?: number;
  totalPoin?: number;
  labelCount?: number;
  totalSiswa?: number;
  recentActivity?: any[];
  hafalanProgress?: number;
  murojaahProgress?: number;
}

export default function HomeScreen() {
  
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      switch (profile.role) {
        case 'siswa':
          await fetchSiswaStats();
          break;
        case 'guru':
          await fetchGuruStats();
          break;
        case 'ortu':
          await fetchOrtuStats();
          break;
        case 'admin':
          await fetchAdminStats();
          break;
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSiswaStats = async () => {
    // Get student points
    const { data: pointsData } = await supabase
      .from('siswa_poin')
      .select('*')
      .eq('siswa_id', profile?.id)
      .single();

    // Get setoran stats
    const { data: setoranData } = await supabase
      .from('setoran')
      .select('*')
      .eq('siswa_id', profile?.id)
      .order('created_at', { ascending: false });

    // Get labels count
    const { data: labelsData } = await supabase
      .from('labels')
      .select('*')
      .eq('siswa_id', profile?.id);

    const totalSetoran = setoranData?.length || 0;
    const setoranDiterima = setoranData?.filter(s => s.status === 'diterima').length || 0;
    const setoranPending = setoranData?.filter(s => s.status === 'pending').length || 0;
    const hafalanProgress = setoranData?.filter(s => s.jenis === 'hafalan' && s.status === 'diterima').length || 0;
    const murojaahProgress = setoranData?.filter(s => s.jenis === 'murojaah' && s.status === 'diterima').length || 0;

    setStats({
      totalSetoran,
      setoranDiterima,
      setoranPending,
      totalPoin: pointsData?.total_poin || 0,
      labelCount: labelsData?.length || 0,
      recentActivity: setoranData?.slice(0, 3) || [],
      hafalanProgress,
      murojaahProgress,
    });
  };

  const fetchGuruStats = async () => {
    // Get pending setoran count
    const { count: pendingCount } = await supabase
      .from('setoran')
      .select('*', { count: 'exact', head: true })
      .eq('organize_id', profile?.organize_id)
      .eq('status', 'pending');

    // Get total students in organize
    const { count: siswaCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organize_id', profile?.organize_id)
      .eq('role', 'siswa');

    // Get recent setoran for review
    const { data: recentSetoran } = await supabase
      .from('setoran')
      .select(`
        *,
        siswa:siswa_id(name)
      `)
      .eq('organize_id', profile?.organize_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    setStats({
      setoranPending: pendingCount || 0,
      totalSiswa: siswaCount || 0,
      recentActivity: recentSetoran || [],
    });
  };

  const fetchOrtuStats = async () => {
    // Get children progress
    const { data: childrenData } = await supabase
      .from('users')
      .select('id, name')
      .eq('organize_id', profile?.organize_id)
      .eq('role', 'siswa');

    if (childrenData && childrenData.length > 0) {
      const childId = childrenData[0].id; // For demo, take first child
      
      const { data: setoranData } = await supabase
        .from('setoran')
        .select('*')
        .eq('siswa_id', childId);

      const { data: pointsData } = await supabase
        .from('siswa_poin')
        .select('*')
        .eq('siswa_id', childId)
        .single();

      setStats({
        totalSetoran: setoranData?.length || 0,
        setoranDiterima: setoranData?.filter(s => s.status === 'diterima').length || 0,
        setoranPending: setoranData?.filter(s => s.status === 'pending').length || 0,
        totalPoin: pointsData?.total_poin || 0,
        recentActivity: setoranData?.slice(0, 3) || [],
      });
    }
  };

  const fetchAdminStats = async () => {
    // Get system-wide stats
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: organizesCount } = await supabase
      .from('organizes')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalSiswa: usersCount || 0,
      totalSetoran: organizesCount || 0,
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const renderStatsCard = (icon: any, title: string, value: string | number, color: string, onPress?: () => void) => (
    <Pressable style={styles.statsCard} onPress={onPress}>
      <View style={[styles.statsIcon, { backgroundColor: color }]}>
        {React.createElement(icon, { size: 24, color: 'white' })}
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </Pressable>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'siswa': return 'Siswa';
      case 'guru': return 'Guru';
      case 'ortu': return 'Orang Tua';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInUp}>
        <LinearGradient
          colors={['#10B981', '#3B82F6', '#8B5CF6']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{profile?.name}</Text>
              <Text style={styles.userRole}>{getRoleName(profile?.role || '')}</Text>
            </View>
            <View style={styles.headerIcon}>
              <BookOpen size={32} color="white" />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.content}>
        {/* Stats Cards */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.statsContainer}>
          {profile?.role === 'siswa' && (
            <>
              {renderStatsCard(TrendingUp, 'Total Poin', stats.totalPoin || 0, '#3B82F6')}
              {renderStatsCard(BookOpen, 'Setoran Diterima', stats.setoranDiterima || 0, '#10B981')}
              {renderStatsCard(Award, 'Label Juz', stats.labelCount || 0, '#F59E0B')}
            </>
          )}
          
          {profile?.role === 'guru' && (
            <>
              {renderStatsCard(Clock, 'Menunggu Penilaian', stats.setoranPending || 0, '#EF4444', () => router.push('/(tabs)/penilaian'))}
              {renderStatsCard(Users, 'Total Siswa', stats.totalSiswa || 0, '#10B981')}
              {renderStatsCard(Award, 'Kelas Aktif', 1, '#3B82F6')}
            </>
          )}

          {profile?.role === 'ortu' && (
            <>
              {renderStatsCard(TrendingUp, 'Poin Anak', stats.totalPoin || 0, '#3B82F6')}
              {renderStatsCard(BookOpen, 'Setoran Diterima', stats.setoranDiterima || 0, '#10B981')}
              {renderStatsCard(Clock, 'Menunggu Penilaian', stats.setoranPending || 0, '#F59E0B')}
            </>
          )}
        </Animated.View>

        {/* Quran Reading History */}
        <Animated.View entering={FadeInUp.delay(250)}>
          <QuranHistory />
        </Animated.View>

        {/* Progress Cards for Students */}
        {profile?.role === 'siswa' && (
          <Animated.View entering={FadeInUp.delay(300)} style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Progress Pembelajaran</Text>
            <View style={styles.progressCards}>
              <View style={styles.progressCard}>
                <BookOpen size={20} color="#10B981" />
                <Text style={styles.progressTitle}>Hafalan</Text>
                <Text style={styles.progressNumber}>{stats.hafalanProgress || 0}</Text>
                <Text style={styles.progressLabel}>Setoran Diterima</Text>
              </View>
              <View style={styles.progressCard}>
                <Target size={20} color="#3B82F6" />
                <Text style={styles.progressTitle}>Murojaah</Text>
                <Text style={styles.progressNumber}>{stats.murojaahProgress || 0}</Text>
                <Text style={styles.progressLabel}>Setoran Diterima</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          <View style={styles.quickActions}>
            {profile?.role === 'siswa' && (
              <>
                <Pressable 
                  style={[styles.actionCard, { backgroundColor: '#10B981' }]}
                  onPress={() => router.push('/(tabs)/setoran')}
                >
                  <PlusCircle size={24} color="white" />
                  <Text style={styles.actionText}>Setoran Baru</Text>
                </Pressable>
                <Pressable 
                  style={[styles.actionCard, { backgroundColor: '#3B82F6' }]}
                  onPress={() => router.push('/(tabs)/quiz')}
                >
                  <Trophy size={24} color="white" />
                  <Text style={styles.actionText}>Ikuti Quiz</Text>
                </Pressable>
              </>
            )}
            
            {profile?.role === 'guru' && (
              <>
                <Pressable 
                  style={[styles.actionCard, { backgroundColor: '#EF4444' }]}
                  onPress={() => router.push('/(tabs)/penilaian')}
                >
                  <Award size={24} color="white" />
                  <Text style={styles.actionText}>Nilai Setoran</Text>
                </Pressable>
                <Pressable 
                  style={[styles.actionCard, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => router.push('/(tabs)/organize')}
                >
                  <Users size={24} color="white" />
                  <Text style={styles.actionText}>Kelola Kelas</Text>
                </Pressable>
              </>
            )}

            {profile?.role === 'ortu' && (
              <>
                <Pressable 
                  style={[styles.actionCard, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => router.push('/(tabs)/monitoring')}
                >
                  <Users size={24} color="white" />
                  <Text style={styles.actionText}>Lihat Progress</Text>
                </Pressable>
                <Pressable 
                  style={[styles.actionCard, { backgroundColor: '#10B981' }]}
                  onPress={() => router.push('/(tabs)/quran')}
                >
                  <BookOpen size={24} color="white" />
                  <Text style={styles.actionText}>Baca Quran</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            <View style={styles.activityList}>
              {stats.recentActivity.map((activity, index) => (
                <Animated.View 
                  key={activity.id || index} 
                  entering={SlideInRight.delay(index * 100)}
                  style={styles.activityCard}
                >
                  <View style={styles.activityIcon}>
                    <BookOpen size={16} color="#10B981" />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      {profile?.role === 'guru' ? 
                        `${activity.siswa?.name} - ${activity.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'} ${activity.surah}` :
                        `${activity.jenis === 'hafalan' ? 'Hafalan' : 'Murojaah'} ${activity.surah}`
                      }
                    </Text>
                    <Text style={styles.activityDate}>
                      {new Date(activity.tanggal || activity.created_at).toLocaleDateString('id-ID')}
                    </Text>
                  </View>
                  <View style={[
                    styles.activityStatus,
                    { backgroundColor: activity.status === 'diterima' ? '#DCFCE7' : 
                                     activity.status === 'pending' ? '#FEF3C7' : '#FEE2E2' }
                  ]}>
                    <Text style={[
                      styles.activityStatusText,
                      { color: activity.status === 'diterima' ? '#10B981' : 
                               activity.status === 'pending' ? '#F59E0B' : '#EF4444' }
                    ]}>
                      {activity.status === 'pending' ? 'Menunggu' : 
                       activity.status === 'diterima' ? 'Diterima' : 'Ditolak'}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyActivity}>
              <Calendar size={32} color="#9CA3AF" />
              <Text style={styles.emptyActivityText}>Belum ada aktivitas</Text>
            </View>
          )}
        </Animated.View>

        {/* Today's Quote */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.quoteCard}>
          <Star size={20} color="#F59E0B" />
          <Text style={styles.quoteText}>
            "Dan sungguhnya telah Kami mudahkan Al-Quran untuk pelajaran, 
            maka adakah orang yang mengambil pelajaran?"
          </Text>
          <Text style={styles.quoteSource}>- QS. Al-Qamar: 17</Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  greeting: {
    fontSize: Math.min(16, width * 0.04),
    color: 'white',
    opacity: 0.9,
    fontWeight: '500',
  },
  userName: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  userRole: {
    fontSize: Math.min(14, width * 0.035),
    color: 'white',
    opacity: 0.8,
    marginTop: 2,
    fontWeight: '500',
  },
  headerIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    marginTop: -16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Math.max(12, width * 0.03),
    marginBottom: 24,
    paddingTop:10,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: Math.min(12, width * 0.03),
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressCards: {
    flexDirection: 'row',
    gap: Math.max(12, width * 0.03),
  },
  progressCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: Math.max(16, width * 0.04),
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  progressTitle: {
    fontSize: Math.min(14, width * 0.035),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressNumber: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: '#10B981',
  },
  progressLabel: {
    fontSize: Math.min(12, width * 0.03),
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Math.max(12, width * 0.03),
  },
  actionCard: {
    flex: 1,
    padding: Math.max(16, width * 0.04),
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionText: {
    color: 'white',
    fontSize: Math.min(14, width * 0.035),
    fontWeight: '600',
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: Math.min(14, width * 0.035),
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  activityDate: {
    fontSize: Math.min(12, width * 0.03),
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  activityStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activityStatusText: {
    fontSize: Math.min(12, width * 0.03),
    fontWeight: '600',
  },
  emptyActivity: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyActivityText: {
    fontSize: Math.min(14, width * 0.035),
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  quoteCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  quoteText: {
    fontSize: Math.min(16, width * 0.04),
    color: '#1F2937',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  quoteSource: {
    fontSize: Math.min(14, width * 0.035),
    color: '#6B7280',
    fontWeight: '600',
  },
});