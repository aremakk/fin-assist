import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../utils/theme';

type Props = {
  size?: number;
  style?: ViewStyle;
  /** 0..1 while pulling — liquid fills */
  progress?: number;
  /**
   * After release:
   * stay full → glow / dim / glow → empty → onFinished()
   */
  animate?: boolean;
  /** Called when the full refresh animation (incl. empty) is done */
  onFinished?: () => void;
};

/**
 * Pull → fill.
 * Release → glow ↔ dim → empty → content settles back.
 */
export function BrandLoader({
  size = 56,
  style,
  progress = 1,
  animate = true,
  onFinished,
}: Props) {
  const fill = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const finishedRef = useRef(false);
  const progressRef = useRef(progress);
  const onFinishedRef = useRef(onFinished);
  progressRef.current = progress;
  onFinishedRef.current = onFinished;

  // Pull phase: fill follows finger
  useEffect(() => {
    if (animate) return;
    const p = Math.min(1, Math.max(0, progress));
    Animated.timing(fill, {
      toValue: p,
      duration: 50,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    glow.setValue(p >= 0.98 ? 0.55 : p * 0.2);
    breathe.setValue(0.9 + p * 0.1);
  }, [animate, breathe, fill, glow, progress]);

  // Release phase: full → glow/dim → empty → settle menu
  useEffect(() => {
    if (!animate) return;

    finishedRef.current = false;
    let cancelled = false;

    const startFill = Math.min(1, Math.max(0.35, progressRef.current || 1));
    fill.setValue(startFill);
    glow.setValue(0.15);
    breathe.setValue(1);

    const glowOnce = () =>
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.delay(90),
        Animated.timing(glow, {
          toValue: 0.16,
          duration: 460,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.delay(60),
      ]);

    const sequence = Animated.sequence([
      Animated.timing(fill, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      glowOnce(),
      glowOnce(),
      Animated.timing(glow, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.delay(140),
      Animated.parallel([
        Animated.timing(fill, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 420,
          useNativeDriver: false,
        }),
        Animated.timing(breathe, {
          toValue: 0.86,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(120),
    ]);

    sequence.start(({ finished }) => {
      if (!finished || cancelled || finishedRef.current) return;
      finishedRef.current = true;
      // lock fill at 0 so pull-phase can't flash a remnant
      fill.setValue(0);
      glow.setValue(0);
      onFinishedRef.current?.();
    });

    return () => {
      cancelled = true;
      sequence.stop();
    };
  }, [animate, breathe, fill, glow]);

  const radius = Math.round(size * 0.3);
  const fontSize = Math.round(size * 0.46);

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size],
  });

  const markColor = fill.interpolate({
    inputRange: [0, 0.28, 0.65, 1],
    outputRange: ['#7A8455', '#C6E86A', '#1C2014', '#141610'],
  });

  const dimOverlay = glow.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0.55, 0.42, 0],
  });

  const haloOpacity = glow.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0, 0.1, 0.7],
  });

  const haloScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.22],
  });

  const ringOpacity = glow.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0, 0.18, 1],
  });

  // Gloss only when there is real liquid — kills bottom yellow flash
  const highlightOpacity = fill.interpolate({
    inputRange: [0, 0.12, 0.22, 1],
    outputRange: [0, 0, 0.28, 0.5],
  });

  // Fully gone below ~12% fill — no empty dark tile flash
  const wrapOpacity = fill.interpolate({
    inputRange: [0, 0.08, 0.16, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width: size + 32,
          height: size + 32,
          opacity: wrapOpacity,
          transform: [{ scale: breathe }],
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size + 22,
            height: size + 22,
            borderRadius: (size + 22) / 2.6,
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: size + 10,
            height: size + 10,
            borderRadius: (size + 10) * 0.32,
            opacity: ringOpacity,
          },
        ]}
      />

      <View style={[styles.tile, { width: size, height: size, borderRadius: radius }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2A2D38" />
              <Stop offset="1" stopColor="#12141A" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size} height={size} rx={radius} ry={radius} fill="url(#base)" />
        </Svg>

        <Animated.View
          style={[
            styles.liquidClip,
            {
              height: fillHeight,
              borderBottomLeftRadius: radius,
              borderBottomRightRadius: radius,
            },
          ]}
        >
          <View style={{ width: size, height: size, justifyContent: 'flex-end' }}>
            <Svg width={size} height={size}>
              <Defs>
                <LinearGradient id="lime" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#F0FFB0" />
                  <Stop offset="0.35" stopColor="#D8FC70" />
                  <Stop offset="1" stopColor="#A8C94A" />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={size} height={size} rx={radius} ry={radius} fill="url(#lime)" />
            </Svg>
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.dim, { borderRadius: radius, opacity: dimOverlay }]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.gloss,
            {
              bottom: fillHeight,
              opacity: highlightOpacity,
              width: size * 0.72,
              marginLeft: size * 0.14,
            },
          ]}
        />

        <View style={styles.markWrap} pointerEvents="none">
          <Animated.Text
            allowFontScaling={false}
            style={[
              styles.mark,
              {
                fontSize,
                lineHeight: Math.round(fontSize * 1.05),
                color: markColor,
                // optical nudge: "f" ascender sits high, "." pulls mass left
                marginTop: Math.round(size * 0.07),
                marginLeft: Math.round(size * 0.06),
              },
            ]}
          >
            f.
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

export function BrandRefreshOverlay({
  visible,
  progress = 0,
  onFinished,
}: {
  visible: boolean;
  progress?: number;
  onFinished?: () => void;
}) {
  const [suppressPull, setSuppressPull] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      setSuppressPull(false);
      return;
    }
    if (!wasVisible.current) return;
    // Just closed — ignore rubber-band pull for a bit (kills ms flash)
    wasVisible.current = false;
    setSuppressPull(true);
    const t = setTimeout(() => setSuppressPull(false), 450);
    return () => clearTimeout(t);
  }, [visible]);

  const showPull = !visible && !suppressPull && progress > 0.08;
  if (!visible && !showPull) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <BrandLoader
        size={56}
        animate={visible}
        progress={visible ? 1 : progress}
        onFinished={onFinished}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(216, 252, 112, 0.32)',
    shadowColor: '#D8FC70',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  tile: {
    overflow: 'hidden',
    backgroundColor: '#12141A',
  },
  liquidClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 16, 0.55)',
  },
  gloss: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  markWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    fontWeight: '900',
    letterSpacing: -1,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
