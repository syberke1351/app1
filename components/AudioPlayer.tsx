import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react-native';

interface AudioPlayerProps {
  fileUrl: string;
  title?: string;
}

export function AudioPlayer({ fileUrl, title }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  useEffect(() => {
    // Bersihkan sound saat komponen unmount atau fileUrl berubah
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fileUrl },
        { shouldPlay: false }
      );
      
      setSound(newSound);

      // Ambil durasi
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || null);
      }

      // Update posisi dan status play
     newSound.setOnPlaybackStatusUpdate((status) => {
  if (status.isLoaded) {
    setPosition(status.positionMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      // Audio sudah selesai
      setIsPlaying(false);
      setPosition(0);          // reset posisi ke 0
      sound?.setPositionAsync(0); // reset posisi audio di player (optional, tapi aman)
    }
  }
});


    } catch (error) {
      Alert.alert('Error', 'Gagal memuat file audio');
      console.error('Error loading audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

const playPause = async () => {
  try {
    if (!sound) {
      await loadAudio();  // Load dulu audio
      return;
    }

    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      Alert.alert('Info', 'Audio belum selesai dimuat');
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  } catch (error) {
    Alert.alert('Error', 'Gagal memutar audio');
    console.error('Error playing audio:', error);
  }
};

const restart = async () => {
  try {
    if (!sound) {
      Alert.alert('Info', 'Audio belum siap untuk diulang');
      return;
    }

    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      Alert.alert('Info', 'Audio belum selesai dimuat');
      return;
    }

    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (error) {
    Alert.alert('Error', 'Gagal mengulang audio');
    console.error('Error restarting audio:', error);
  }
};


  // Tangani tap pada progress bar untuk seek
  const handleSeek = async (event: any) => {
    if (!sound || !duration || progressBarWidth === 0) {
      console.log('Skipping seek: sound, duration or progressBarWidth missing');
      return;
    }

    const { locationX } = event.nativeEvent;
    const seekRatio = locationX / progressBarWidth;
    const seekMillis = Math.floor(duration * seekRatio);

    console.log(`Seeking to ${seekMillis}ms (ratio ${seekRatio.toFixed(2)})`);

    try {
      await sound.setPositionAsync(seekMillis);
    } catch (error) {
      Alert.alert('Error', 'Gagal mengubah posisi audio');
      console.error('Error seeking audio:', error);
    }
  };

  // Simpan lebar progress bar saat layout berubah
  const onProgressBarLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setProgressBarWidth(width);
    // console.log('Progress bar width:', width);
  };

  const formatTime = (milliseconds: number | null) => {
    if (!milliseconds) return '0:00';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Volume2 size={16} color="#10B981" />
        <Text style={styles.title}>{title || 'Audio Setoran'}</Text>
      </View>
      
      <View style={styles.controls}>
        <Pressable 
          style={styles.controlButton}
          onPress={restart}
          disabled={!sound}
        >
          <RotateCcw size={16} color={sound ? "#6B7280" : "#D1D5DB"} />
        </Pressable>
        
        <Pressable 
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={playPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.loadingText}>...</Text>
          ) : isPlaying ? (
            <Pause size={20} color="white" />
          ) : (
            <Play size={20} color="white" />
          )}
        </Pressable>
        
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

   {duration && (
  <Pressable
    onPress={handleSeek}
    onLayout={onProgressBarLayout}
    style={styles.progressContainer}
  >
    <View style={styles.progressBar}>
      <View 
        style={[styles.progressFill, { width: `${position && duration ? (position / duration) * 100 : 0}%` }]} 
      />
      {position !== null && duration !== null && (
        <View
          style={[
            styles.progressThumb,
            {
              left: Math.max(
                0,
                Math.min(
                  progressBarWidth - 16,
                  (position / duration) * progressBarWidth - 8,
                )
              ),
            },
          ]}
        />
      )}
    </View>
  </Pressable>
)}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressThumb: {
  position: 'absolute',
  top: -6,            // supaya bulatan tepat di tengah progress bar (yang tingginya 4)
  width: 16,
  height: 16,
  borderRadius: 8,    // bulatan sempurna
  backgroundColor: '#000000ff',
  borderWidth: 2,
  borderColor: 'white',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 3,
  elevation: 3,
},

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
  loadingText: {
    color: 'white',
    fontWeight: 'bold',
  },
  timeContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  progressContainer: {
    marginTop: 8,
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
});
