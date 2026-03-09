import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#2D1E3C', '#E8E2DB', '#9B8EC4', '#D4A574',
  '#F5C563', '#A8D8B9', '#F2A6B0', '#7FBCD2',
];

const PIECE_COUNT = 20;
const BURST_INTERVAL = 1000;

type Piece = {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  shape: 'square' | 'circle';
};

function createBurst(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    x: new Animated.Value(Math.random() * SCREEN_W),
    y: new Animated.Value(-20),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(1),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? 'square' : 'circle',
  }));
}

function animateBurst(pieces: Piece[]) {
  pieces.forEach((p) => {
    const duration = 1800 + Math.random() * 1200;
    const drift = (Math.random() - 0.5) * 120;

    p.y.setValue(-20);
    p.x.setValue(Math.random() * SCREEN_W);
    p.rotate.setValue(0);
    p.opacity.setValue(1);

    Animated.parallel([
      Animated.timing(p.y, {
        toValue: SCREEN_H * 0.8 + Math.random() * SCREEN_H * 0.2,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(p.x, {
        toValue: (Math.random() * SCREEN_W) + drift,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(p.rotate, {
        toValue: 2 + Math.random() * 4,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(p.opacity, {
        toValue: 0,
        duration,
        delay: duration * 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  });
}

export function Confetti({ active }: { active: boolean }) {
  const [bursts, setBursts] = useState<Piece[][]>([]);

  useEffect(() => {
    if (!active) {
      setBursts([]);
      return;
    }

    // Initial burst
    const first = createBurst();
    setBursts([first]);
    animateBurst(first);

    const interval = setInterval(() => {
      const burst = createBurst();
      setBursts((prev) => [...prev.slice(-2), burst]);
      animateBurst(burst);
    }, BURST_INTERVAL);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bursts.flatMap((burst, bi) =>
        burst.map((p, pi) => (
          <Animated.View
            key={`${bi}-${pi}`}
            style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
              backgroundColor: p.color,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 6],
                    outputRange: ['0deg', '2160deg'],
                  }),
                },
              ],
              opacity: p.opacity,
            }}
          />
        ))
      )}
    </View>
  );
}
