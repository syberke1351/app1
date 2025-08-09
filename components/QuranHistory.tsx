import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, Clock, Calendar, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

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
      // This would be implemented with a proper reading history table
      // For now, we'll use bookmarks as a proxy for reading history
      const { data: bookmarks } = await supabase
        .from('quran_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (bookmarks) {
        // Convert bookmarks to reading history format
        const historyData = bookmarks.map(bookmark => ({
          id: bookmark.id,
          surah_number: bookmark.surah_number,
          surah_name: `Surah ${bookmark.surah_number}`, 
          last_ayah: bookmark.ayah_number,
          total_ayahs: 286, 
          last_read: bookmark.created_at,
          progress_percentage: Math.round((bookmark.ayah_number / 286) * 100),
        }));

        setHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching reading history:', error);
    } finally {
      setLoading(false);
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
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={32} color="#9CA3AF" />
          <Text style={styles.emptyText}>Belum ada riwayat bacaan</Text>
          <Text style={styles.emptySubtext}>Mulai baca Al-Quran untuk melihat riwayat</Text>
        </View>
      ) : (
        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {history.map((item) => (
            <Pressable
              key={item.id}
              style={styles.historyCard}
              onPress={() => continueReading(item.surah_number)}
            >
              <View style={styles.historyInfo}>
                <Text style={styles.surahName}>{item.surah_name}</Text>
                <Text style={styles.lastRead}>
                  Terakhir dibaca: {new Date(item.last_read).toLocaleDateString('id-ID')}
                </Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${item.progress_percentage}%` }]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    Ayat {item.last_ayah} dari {item.total_ayahs}
                  </Text>
                </View>
              </View>
              <ArrowRight size={20} color="#10B981" />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
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
    gap: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
});