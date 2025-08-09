import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Users, Award, PenTool } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp, SlideInLeft, SlideInRight } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10B981', '#3B82F6', '#8B5CF6']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <Animated.View entering={FadeInUp.delay(300)} style={styles.header}>
          <View style={styles.logoContainer}>
            <BookOpen size={64} color="white" strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>IQRO</Text>
          <Text style={styles.subtitle}>
            Platform Pembelajaran Quran Digital untuk Hafalan dan Murojaah
          </Text>
        </Animated.View>

        <View style={styles.features}>
          <Animated.View entering={SlideInLeft.delay(500)} style={styles.feature}>
            <PenTool size={24} color="white" />
            <Text style={styles.featureText}>Setoran Hafalan & Murojaah</Text>
          </Animated.View>
          <Animated.View entering={SlideInRight.delay(600)} style={styles.feature}>
            <Award size={24} color="white" />
            <Text style={styles.featureText}>Penilaian & Label Pencapaian</Text>
          </Animated.View>
          <Animated.View entering={SlideInLeft.delay(700)} style={styles.feature}>
            <Users size={24} color="white" />
            <Text style={styles.featureText}>Monitoring Orang Tua</Text>
          </Animated.View>
          <Animated.View entering={SlideInRight.delay(800)} style={styles.feature}>
            <BookOpen size={24} color="white" />
            <Text style={styles.featureText}>Baca Quran Digital</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(900)} style={styles.buttons}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Masuk</Text>
          </Pressable>
          
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.secondaryButtonText}>Daftar</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: height,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: Math.max(24, width * 0.05),
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,

  },
  title: {
    fontSize: Math.min(42, width * 0.105),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: Math.min(16, width * 0.04),
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: Math.min(24, width * 0.06),
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  features: {
    gap: Math.max(16, height * 0.02),
    marginVertical: height * 0.04,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: Math.max(16, width * 0.04),
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,

  },
  featureText: {
    color: 'white',
    fontSize: Math.min(16, width * 0.04),
    fontWeight: '600',
    flex: 1,
  },
  buttons: {
    gap: Math.max(16, height * 0.02),
  },
  button: {
    padding: Math.max(16, width * 0.04),
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,

  },
  primaryButtonText: {
    color: '#10B981',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'white',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: 'bold',
  },
});