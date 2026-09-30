import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { C } from '../theme';

interface KateVoiceOrbProps {
  size?: number;
  isPlaying?: boolean;
}

export function KateVoiceOrb({ size = 80, isPlaying = false }: KateVoiceOrbProps) {
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [rippleAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Continuous subtle breathing animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: isPlaying ? 1.15 : 1.05,
          duration: isPlaying ? 600 : 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: isPlaying ? 600 : 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Ripple wave when playing
    const rippleLoop = Animated.loop(
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: isPlaying ? 1200 : 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    pulseLoop.start();
    rippleLoop.start();

    return () => {
      pulseLoop.stop();
      rippleLoop.stop();
    };
  }, [isPlaying, pulseAnim, rippleAnim]);

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.8],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [isPlaying ? 0.6 : 0.3, isPlaying ? 0.3 : 0.1, 0],
  });

  return (
    <View style={[styles.container, { width: size * 2, height: size * 2 }]}>
      {/* Outer Ripple Ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: rippleScale }],
            opacity: rippleOpacity,
            borderColor: C.blue,
          },
        ]}
      />

      {/* Main Glowing Orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseAnim }],
            backgroundColor: isPlaying ? C.blue : C.navy,
            shadowColor: C.blue,
            shadowOpacity: isPlaying ? 0.8 : 0.4,
            shadowRadius: isPlaying ? 24 : 12,
          },
        ]}
      >
        <Sparkles size={size * 0.4} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
