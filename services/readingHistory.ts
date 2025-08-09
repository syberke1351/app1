import { supabase } from '@/lib/supabase';

export interface ReadingHistoryEntry {
  id: string;
  user_id: string;
  surah_number: number;
  surah_name: string;
  last_ayah: number;
  total_ayahs: number;
  progress_percentage: number;
  last_read: string;
  created_at: string;
  updated_at: string;
}

export class ReadingHistoryService {
  static async updateProgress(
    userId: string,
    surahNumber: number,
    surahName: string,
    ayahNumber: number,
    totalAyahs: number
  ): Promise<void> {
    try {
      const progressPercentage = Math.round((ayahNumber / totalAyahs) * 100);

      const { error } = await supabase
        .from('reading_history')
        .upsert({
          user_id: userId,
          surah_number: surahNumber,
          surah_name: surahName,
          last_ayah: ayahNumber,
          total_ayahs: totalAyahs,
          progress_percentage: progressPercentage,
          last_read: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,surah_number'
        });

      if (error) {
        console.error('Error updating reading history:', error);
      }
    } catch (error) {
      console.error('Error in updateProgress:', error);
    }
  }

  static async getUserHistory(userId: string, limit: number = 10): Promise<ReadingHistoryEntry[]> {
    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .order('last_read', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching reading history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserHistory:', error);
      return [];
    }
  }

  static async getSurahProgress(userId: string, surahNumber: number): Promise<ReadingHistoryEntry | null> {
    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('surah_number', surahNumber)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSurahProgress:', error);
      return null;
    }
  }

  static async deleteHistory(userId: string, surahNumber: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('reading_history')
        .delete()
        .eq('user_id', userId)
        .eq('surah_number', surahNumber);

      if (error) {
        console.error('Error deleting reading history:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteHistory:', error);
      return false;
    }
  }

  static async getOverallProgress(userId: string): Promise<{
    totalSurahsRead: number;
    totalAyahsRead: number;
    averageProgress: number;
    completedSurahs: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', userId);

      if (error || !data) {
        return {
          totalSurahsRead: 0,
          totalAyahsRead: 0,
          averageProgress: 0,
          completedSurahs: 0,
        };
      }

      const totalSurahsRead = data.length;
      const totalAyahsRead = data.reduce((sum, entry) => sum + entry.last_ayah, 0);
      const averageProgress = data.length > 0 
        ? Math.round(data.reduce((sum, entry) => sum + entry.progress_percentage, 0) / data.length)
        : 0;
      const completedSurahs = data.filter(entry => entry.progress_percentage >= 100).length;

      return {
        totalSurahsRead,
        totalAyahsRead,
        averageProgress,
        completedSurahs,
      };
    } catch (error) {
      console.error('Error in getOverallProgress:', error);
      return {
        totalSurahsRead: 0,
        totalAyahsRead: 0,
        averageProgress: 0,
        completedSurahs: 0,
      };
    }
  }
}