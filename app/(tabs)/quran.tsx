import { useRouter } from 'expo-router';
import { ArrowRight, Search, Bookmark, Clock, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Animated, { FadeInDown, FadeInUp, SlideInRight } from 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { ReadingHistoryService } from '@/services/readingHistory';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TextInput, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string; // Mekah atau Madinah
}

interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface Bookmark {
  id: string;
  surah_number: number;
  ayah_number: number;
  note?: string;
  created_at: string;
}

export default function SurahListScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [surahList, setSurahList] = useState<Surah[]>([]);
  const [filteredSurahList, setFilteredSurahList] = useState<Surah[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeTab, setActiveTab] = useState<'surah' | 'bookmarks' | 'prayer'>('surah');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSurahList = async () => {
    try {
      const res = await fetch('https://equran.id/api/v2/surat');
      const json = await res.json();
      if (json.data) {
        setSurahList(json.data);
        setFilteredSurahList(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch surah list:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async () => {
    try {
      // Using Jakarta coordinates as default
      const response = await fetch(
        'https://api.aladhan.com/v1/timings?latitude=-6.2088&longitude=106.8456&method=2'
      );
      const data = await response.json();
      
      if (data.data) {
        setPrayerTimes({
          fajr: data.data.timings.Fajr,
          dhuhr: data.data.timings.Dhuhr,
          asr: data.data.timings.Asr,
          maghrib: data.data.timings.Maghrib,
          isha: data.data.timings.Isha,
        });
      }
    } catch (error) {
      console.error('Error fetching prayer times:', error);
    }
  };

  const fetchBookmarks = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('quran_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setBookmarks(data);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredSurahList(surahList);
    } else {
      const filtered = surahList.filter(surah =>
        surah.namaLatin.toLowerCase().includes(query.toLowerCase()) ||
        surah.nama.includes(query) ||
        surah.nomor.toString().includes(query)
      );
      setFilteredSurahList(filtered);
    }
  };

  const getNextPrayer = () => {
    if (!prayerTimes) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: 'Subuh', time: prayerTimes.fajr },
      { name: 'Dzuhur', time: prayerTimes.dhuhr },
      { name: 'Ashar', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isya', time: prayerTimes.isha },
    ];

    for (const prayer of prayers) {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerTime = hours * 60 + minutes;
      
      if (prayerTime > currentTime) {
        const timeLeft = prayerTime - currentTime;
        const hoursLeft = Math.floor(timeLeft / 60);
        const minutesLeft = timeLeft % 60;
        return {
          ...prayer,
          timeLeft: `${hoursLeft}j ${minutesLeft}m`,
        };
      }
    }

    return null;
  };

  useEffect(() => {
    fetchSurahList();
    fetchPrayerTimes();
    fetchBookmarks();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );  
  }

  const renderSurahItem = ({ item }: { item: Surah }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: '#D1FAE5' },
      ]}
      onPress={() => {
        updateReadingHistory(item.nomor, item.namaLatin, 1, item.jumlahAyat);
        router.push(`/(tabs)/equran?nomor=${item.nomor}`);
      }}

    >
      <View style={styles.left}>
        <View style={styles.numberCircle}>
          <Text style={styles.numberText}>{item.nomor}</Text>
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.surahName}>{item.namaLatin}</Text>
        <Text style={styles.surahInfo}>
          {item.jumlahAyat} ayat • {item.tempatTurun === 'mekah' ? 'Mekkah' : 'Madinah'}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.arabicName}>{item.nama}</Text>
        <ArrowRight size={20} color="#10B981" />
      </View>
    </Pressable>
  );

  const renderBookmarkItem = ({ item }: { item: Bookmark }) => {
    const surah = surahList.find(s => s.nomor === item.surah_number);
    if (!surah) return null;

    return (
      <Pressable
        style={styles.bookmarkCard}
        onPress={() => {
          updateReadingHistory(item.surah_number, surah.namaLatin, item.ayah_number, surah.jumlahAyat);
          router.push(`/(tabs)/equran?nomor=${item.surah_number}`);
        }}
      >
        <View style={styles.bookmarkHeader}>
          <Text style={styles.bookmarkSurah}>{surah.namaLatin}</Text>
          <Text style={styles.bookmarkAyah}>Ayat {item.ayah_number}</Text>
        </View>
        {item.note && (
          <Text style={styles.bookmarkNote}>{item.note}</Text>
        )}
        <Text style={styles.bookmarkDate}>
          {new Date(item.created_at).toLocaleDateString('id-ID')}
        </Text>
      </Pressable>
    );
  };

  const updateReadingHistory = async (surahNumber: number, surahName: string, ayahNumber: number, totalAyahs: number) => {
    if (!user) return;

    try {
      await ReadingHistoryService.updateProgress(
        user.id,
        surahNumber,
        surahName,
        ayahNumber,
        totalAyahs
      );
    } catch (error) {
      console.error('Error updating reading history:', error);
    }
  };

  const nextPrayer = getNextPrayer();

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <Animated.View entering={FadeInUp} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <LinearGradient
          colors={['#10B981', '#3B82F6']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Al-Quran Digital</Text>
          <Text style={styles.headerSubtitle}>Baca, dengar, dan pelajari</Text>
        </LinearGradient>
      </Animated.View>

      {/* Prayer Times Card */}
      {prayerTimes && nextPrayer && (
        <Animated.View entering={FadeInUp.delay(100)} style={styles.prayerCard}>
          <View style={styles.prayerHeader}>
            <Clock size={20} color="#10B981" />
            <Text style={styles.prayerTitle}>Waktu Sholat Berikutnya</Text>
          </View>
          <View style={styles.prayerInfo}>
            <Text style={styles.prayerName}>{nextPrayer.name}</Text>
            <Text style={styles.prayerTime}>{nextPrayer.time}</Text>
          </View>
          <Text style={styles.prayerCountdown}>dalam {nextPrayer.timeLeft}</Text>
        </Animated.View>
      )}

      {/* Tab Navigation */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'surah' && styles.tabActive]}
          onPress={() => setActiveTab('surah')}
        >
          <Text style={[styles.tabText, activeTab === 'surah' && styles.tabTextActive]}>
            Daftar Surah
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'bookmarks' && styles.tabActive]}
          onPress={() => setActiveTab('bookmarks')}
        >
          <Text style={[styles.tabText, activeTab === 'bookmarks' && styles.tabTextActive]}>
            Bookmark ({bookmarks.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'prayer' && styles.tabActive]}
          onPress={() => setActiveTab('prayer')}
        >
          <Text style={[styles.tabText, activeTab === 'prayer' && styles.tabTextActive]}>
            Jadwal Sholat
          </Text>
        </Pressable>
      </Animated.View>

      {/* Search Bar (only for surah tab) */}
      {activeTab === 'surah' && (
        <Animated.View entering={FadeInUp.delay(300)} style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari surah..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
        </Animated.View>
      )}

      {/* Content based on active tab */}
      {activeTab === 'surah' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredSurahList}
            keyExtractor={(item) => item.nomor.toString()}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 50)}>
                {renderSurahItem({ item })}
              </Animated.View>
            )}
            contentContainerStyle={{ padding: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {activeTab === 'bookmarks' && (
        <ScrollView style={styles.bookmarksContainer}>
          {bookmarks.length === 0 ? (
            <View style={styles.emptyBookmarksContainer}>
              <Bookmark size={48} color="#9CA3AF" />
              <Text style={styles.emptyBookmarksText}>Belum ada bookmark</Text>
              <Text style={styles.emptyBookmarksSubtext}>
                Bookmark ayat favorit Anda saat membaca
              </Text>
            </View>
          ) : (
            <FlatList
              data={bookmarks}
              keyExtractor={(item) => item.id}
              renderItem={renderBookmarkItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </ScrollView>
      )}

      {activeTab === 'prayer' && prayerTimes && (
        <ScrollView style={styles.prayerTimesContainer}>
          <View style={styles.prayerTimesHeader}>
            <MapPin size={20} color="#10B981" />
            <Text style={styles.prayerTimesTitle}>Jakarta, Indonesia</Text>
          </View>
          
          {Object.entries({
            'Subuh': prayerTimes.fajr,
            'Dzuhur': prayerTimes.dhuhr,
            'Ashar': prayerTimes.asr,
            'Maghrib': prayerTimes.maghrib,
            'Isya': prayerTimes.isha,
          }).map(([name, time], index) => (
            <Animated.View 
              key={name} 
              entering={FadeInDown.delay(index * 100)}
              style={[
                styles.prayerTimeCard,
                nextPrayer?.name === name && styles.prayerTimeCardNext
              ]}
            >
              <Text style={[
                styles.prayerTimeName,
                nextPrayer?.name === name && styles.prayerTimeNameNext
              ]}>
                {name}
              </Text>
              <Text style={[
                styles.prayerTimeValue,
                nextPrayer?.name === name && styles.prayerTimeValueNext
              ]}>
                {time}
              </Text>
              {nextPrayer?.name === name && (
                <View style={styles.nextPrayerBadge}>
                  <Text style={styles.nextPrayerText}>Berikutnya</Text>
                </View>
              )}
            </Animated.View>
          ))}
        </ScrollView>
      )}
      </View>

  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  headerGradient: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Math.min(16, width * 0.04),
    color: 'white',
    opacity: 0.9,
  },
  prayerCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  prayerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  prayerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  prayerTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  prayerCountdown: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#10B981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginVertical: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  left: {
    marginRight: 16,
  },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  center: {
    flex: 1,
  },
  surahName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  surahInfo: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  right: {
    alignItems: 'flex-end',
  },
  arabicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  // Bookmarks styles
  bookmarksContainer: {
    flex: 1,
  },
  emptyBookmarksContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyBookmarksText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyBookmarksSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  bookmarkCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookmarkSurah: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  bookmarkAyah: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  bookmarkNote: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bookmarkDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Prayer times styles
  prayerTimesContainer: {
    flex: 1,
    padding: 16,
  },
  prayerTimesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  prayerTimesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  prayerTimeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerTimeCardNext: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
  },
  prayerTimeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  prayerTimeNameNext: {
    color: 'white',
  },
  prayerTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  prayerTimeValueNext: {
    color: 'white',
  },
  nextPrayerBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nextPrayerText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
});
