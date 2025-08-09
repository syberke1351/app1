import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Play, Pause, Bookmark, BookmarkCheck, Volume2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const router = useRouter();


const { width } = Dimensions.get('window');

interface Ayah {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: {
    '01': string; // Mishary Rashid Alafasy
    '02': string; // Abdul Basit
    '03': string; // Abdurrahman as-Sudais
  };
}

interface SurahDetail {
  nomor: number;
  nama: string;
  namaLatin: string;
  arti: string;
  jumlahAyat: number;
  tempatTurun: string;
  audioFull: {
    '01': string;
    '02': string;
    '03': string;
  };
  ayat: Ayah[];
}

export default function QuranDetailScreen() {
  const { nomor } = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [surahDetail, setSurahDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [bookmarkedAyahs, setBookmarkedAyahs] = useState<number[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<'01' | '02' | '03'>('01');

  const reciters = {
    '01': 'Mishary Rashid Alafasy',
    '02': 'Abdul Basit Abdul Samad',
    '03': 'Abdurrahman as-Sudais',
  };

  const fetchSurahDetail = async () => {
    try {
      const response = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
      const data = await response.json();
      
      if (data.data) {
        setSurahDetail(data.data);
      }
    } catch (error) {
      console.error('Error fetching surah detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    if (!user || !nomor) return;

    try {
      const { data } = await supabase
        .from('quran_bookmarks')
        .select('ayah_number')
        .eq('user_id', user.id)
        .eq('surah_number', parseInt(nomor as string));

      if (data) {
        setBookmarkedAyahs(data.map(b => b.ayah_number));
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const toggleBookmark = async (ayahNumber: number) => {
    if (!user || !nomor) return;

    const isBookmarked = bookmarkedAyahs.includes(ayahNumber);

    try {
      if (isBookmarked) {
        await supabase
          .from('quran_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('surah_number', parseInt(nomor as string))
          .eq('ayah_number', ayahNumber);

        setBookmarkedAyahs(prev => prev.filter(a => a !== ayahNumber));
      } else {
        await supabase
          .from('quran_bookmarks')
          .insert([{
            user_id: user.id,
            surah_number: parseInt(nomor as string),
            ayah_number: ayahNumber,
          }]);

        setBookmarkedAyahs(prev => [...prev, ayahNumber]);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const playAyahAudio = async (ayah: Ayah) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const audioUrl = ayah.audio[selectedReciter];
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentAyah(ayah.nomorAyat);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentAyah(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      setCurrentAyah(null);
    }
  };

  useEffect(() => {
    fetchSurahDetail();
    fetchBookmarks();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [nomor]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Memuat surah...</Text>
      </View>
    );
  }

  if (!surahDetail) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Gagal memuat surah</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInUp} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="white" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.surahName}>{surahDetail.namaLatin}</Text>
          <Text style={styles.surahMeaning}>{surahDetail.arti}</Text>
        </View>
        <View style={styles.surahNumber}>
          <Text style={styles.surahNumberText}>{surahDetail.nomor}</Text>
        </View>
      </Animated.View>

      {/* Surah Info */}
      <Animated.View entering={FadeInUp.delay(100)} style={styles.surahInfo}>
        <Text style={styles.arabicName}>{surahDetail.nama}</Text>
        <Text style={styles.surahDetails}>
          {surahDetail.jumlahAyat} ayat • {surahDetail.tempatTurun === 'mekah' ? 'Mekkah' : 'Madinah'}
        </Text>
      </Animated.View>

      {/* Reciter Selection */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.reciterSection}>
        <Text style={styles.reciterLabel}>Pilih Qari:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reciterList}>
          {Object.entries(reciters).map(([key, name]) => (
            <Pressable
              key={key}
              style={[
                styles.reciterButton,
                selectedReciter === key && styles.reciterButtonActive
              ]}
              onPress={() => setSelectedReciter(key as '01' | '02' | '03')}
            >
              <Volume2 size={16} color={selectedReciter === key ? 'white' : '#10B981'} />
              <Text style={[
                styles.reciterButtonText,
                selectedReciter === key && styles.reciterButtonTextActive
              ]}>
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Ayahs */}
      <ScrollView style={styles.ayahsContainer} showsVerticalScrollIndicator={false}>
        {surahDetail.ayat.map((ayah, index) => (
          <Animated.View 
            key={ayah.nomorAyat} 
            entering={FadeInDown.delay(index * 50)}
            style={styles.ayahCard}
          >
            <View style={styles.ayahHeader}>
              <View style={styles.ayahNumber}>
                <Text style={styles.ayahNumberText}>{ayah.nomorAyat}</Text>
              </View>
              <View style={styles.ayahActions}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => toggleBookmark(ayah.nomorAyat)}
                >
                  {bookmarkedAyahs.includes(ayah.nomorAyat) ? (
                    <BookmarkCheck size={16} color="#F59E0B" />
                  ) : (
                    <Bookmark size={16} color="#9CA3AF" />
                  )}
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => {
                    if (currentAyah === ayah.nomorAyat && isPlaying) {
                      stopAudio();
                    } else {
                      playAyahAudio(ayah);
                    }
                  }}
                >
                  {currentAyah === ayah.nomorAyat && isPlaying ? (
                    <Pause size={16} color="#10B981" />
                  ) : (
                    <Play size={16} color="#10B981" />
                  )}
                </Pressable>
              </View>
            </View>

            <Text style={styles.arabicText}>{ayah.teksArab}</Text>
            <Text style={styles.latinText}>{ayah.teksLatin}</Text>
            <Text style={styles.translationText}>{ayah.teksIndonesia}</Text>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  surahName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  surahMeaning: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 2,
  },
  surahNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  surahInfo: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  arabicName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  surahDetails: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  reciterSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reciterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  reciterList: {
    flexDirection: 'row',
  },
  reciterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  reciterButtonActive: {
    backgroundColor: '#10B981',
  },
  reciterButtonText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  reciterButtonTextActive: {
    color: 'white',
  },
  ayahsContainer: {
    flex: 1,
    padding: 16,
  },
  ayahCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  ayahHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ayahNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  ayahActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicText: {
    fontSize: 24,
    lineHeight: 40,
    textAlign: 'right',
    color: '#1F2937',
    marginBottom: 16,
    fontWeight: '500',
  },
  latinText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  translationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
});