import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Clock, Calendar, ArrowRight, TrendingUp } from 'lucide-react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ReadingHistoryService } from '@/services/readingHistory';

interface ReadingHistory {
  id: string;
  surah_number: number;
  surah_name: string;
  last_ayah: number;
  total_ayahs: number;
  last_read: string;
  progress_percentage: number;
}

export function QuranHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadingHistory = async () => {
    if (!user) return;

    try {
      const data = await ReadingHistoryService.getUserHistory(user.id, 5);
      setHistory(data);
    } catch (error) {
      console.error('Error in fetchReadingHistory:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReadingProgress = async (surahNumber: number, surahName: string, ayahNumber: number, totalAyahs: number) => {
    if (!user) return;

    try {
      await ReadingHistoryService.updateProgress(
        user.id,
        surahNumber,
        surahName,
        ayahNumber,
        totalAyahs
      );

      // Refresh history after update
      fetchReadingHistory();
    } catch (error) {
      console.error('Error updating reading history:', error);
    }
  };

  useEffect(() => {
    fetchReadingHistory();
  }, [user]);

  const continueReading = (surahNumber: number) => {
    router.push(`/(tabs)/equran?nomor=${surahNumber}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Memuat riwayat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Clock size={20} color="#10B981" />
        <Text style={styles.title}>Riwayat Bacaan</Text>
        <View style={styles.headerBadge}>
          <TrendingUp size={14} color="#10B981" />
          <Text style={styles.headerBadgeText}>{history.length}</Text>
        </View>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={32} color="#9CA3AF" />
          <Text style={styles.emptyText}>Belum ada riwayat bacaan</Text>
          <Text style={styles.emptySubtext}>Mulai baca Al-Quran untuk melihat riwayat</Text>
          <Pressable 
            style={styles.startReadingButton}
            onPress={() => router.push('/(tabs)/quran')}
          >
            <BookOpen size={16} color="white" />
            <Text style={styles.startReadingText}>Mulai Membaca</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {history.map((item, index) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(index * 100)}>
              <Pressable
                style={styles.historyCard}
                onPress={() => continueReading(item.surah_number)}
              >
                <View style={styles.historyInfo}>
                  <Text style={styles.surahName}>{item.surah_name}</Text>
                  <Text style={styles.lastRead}>
                    Terakhir dibaca: {new Date(item.last_read).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${item.progress_percentage}%` }]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {item.progress_percentage}% • Ayat {item.last_ayah} dari {item.total_ayahs}
                    </Text>
                  </View>
                </View>
                <View style={styles.continueButton}>
                  <ArrowRight size={20} color="#10B981" />
                </View>
              </Pressable>
            </Animated.View>
          ))}
          
          <Pressable 
            style={styles.viewAllButton}
            onPress={() => router.push('/(tabs)/quran')}
          >
            <Text style={styles.viewAllText}>Lihat Semua Surah</Text>
            <ArrowRight size={16} color="#10B981" />
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  startReadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startReadingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  historyList: {
    maxHeight: 300,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  lastRead: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  continueButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
});