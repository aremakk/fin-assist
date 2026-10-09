import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../store/ThemeContext';
import { lightHaptic } from '../utils/haptics';

type Props = {
  size?: number;
  style?: ViewStyle;
  /** Shared 0..1 pull value. Updating it does not re-render the screen. */
  progress?: Animated.Value;
  /** Pulse while active, then empty the tile when data is ready. */
  animate?: boolean;
  complete?: boolean;
  /** Called after the tile has emptied. */
  onFinished?: () => void;
};

/** height/bottom need the JS driver — keep every loader node on JS to avoid conflicts. */
function jsTiming(
  value: Animated.Value,
  toValue: number,
  duration: number,
  easing: (v: number) => number = Easing.inOut(Easing.sin)
) {
  return Animated.timing(value, {
    toValue,
    duration,
    easing,
    useNativeDriver: false,
    isInteraction: false,
  });
}

/**
 * Pull → fill. Refresh → pulse until data arrives → empty and settle.
 */
export function BrandLoader({
  size = 56,
  style,
  progress,
  animate = true,
  complete = false,
  onFinished,
}: Props) {
  const { colors } = useTheme();
  const [internalFill] = useState(() => new Animated.Value(0));
  const fill = progress ?? internalFill;
  const [glow] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(1));
  const finishedRef = useRef(false);
  const pulseStartedAtRef = useRef(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // Keep the loader alive for slow requests instead of disappearing mid-refresh.
  useEffect(() => {
    if (!animate || complete) return;
    pulseStartedAtRef.current = Date.now();
    fill.setValue(1);
    glow.setValue(0.2);
    breathe.setValue(1);
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([jsTiming(glow, 1, 520), jsTiming(glow, 0.2, 520)]),
        Animated.sequence([jsTiming(breathe, 1.035, 520), jsTiming(breathe, 1, 520)]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animate, breathe, complete, fill, glow]);

  // Finish only after the request is complete — hold a beat, then drain slowly.
  useEffect(() => {
    if (!animate || !complete) return;
    finishedRef.current = false;
    let cancelled = false;
    glow.stopAnimation();
    breathe.stopAnimation();

    /** Even if API is instant, stay full briefly so empty feels intentional. */
    const MIN_FULL_MS = 750;
    const holdMs = Math.max(0, MIN_FULL_MS - (Date.now() - pulseStartedAtRef.current));

    const sequence = Animated.sequence([
      Animated.delay(holdMs),
      jsTiming(glow, 1, 360, Easing.out(Easing.cubic)),
      Animated.delay(180),
      Animated.parallel([
        jsTiming(fill, 0, 980, Easing.inOut(Easing.cubic)),
        jsTiming(glow, 0, 820, Easing.inOut(Easing.cubic)),
        jsTiming(breathe, 0.9, 980, Easing.inOut(Easing.cubic)),
      ]),
    ]);

    sequence.start(({ finished }) => {
      if (!finished || cancelled || finishedRef.current) return;
      finishedRef.current = true;
      fill.setValue(0);
      glow.setValue(0);
      onFinishedRef.current?.();
    });

    return () => {
      cancelled = true;
      sequence.stop();
    };
  }, [animate, breathe, complete, fill, glow]);

  const radius = Math.round(size * 0.3);
  const fontSize = Math.round(size * 0.46);

  const activeGlow = animate
    ? glow
    : fill.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });
  const activeBreathe = animate
    ? breathe
    : fill.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  const fillHeight = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size],
  });

  const markColor = fill.interpolate({
    inputRange: [0, 0.28, 0.65, 1],
    outputRange: [
      colors.loaderMarkEmpty,
      colors.loaderFillMid,
      colors.ink,
      colors.loaderMarkFull,
    ],
  });

  const dimOverlay = activeGlow.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0.55, 0.42, 0],
  });

  const haloOpacity = activeGlow.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0, 0.1, 0.7],
  });

  const haloScale = activeGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.22],
  });

  const ringOpacity = activeGlow.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [0, 0.18, 1],
  });

  // Gloss only when there is real liquid — kills bottom yellow flash
  const highlightOpacity = fill.interpolate({
    inputRange: [0, 0.12, 0.22, 1],
    outputRange: [0, 0, 0.28, 0.5],
  });

  // Stay visible almost to the end of the drain
  const wrapOpacity = fill.interpolate({
    inputRange: [0, 0.03, 0.1, 1],
    outputRange: [0, 0, 1, 1],
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: 'center', justifyContent: 'center' },
        halo: {
          position: 'absolute',
          backgroundColor: colors.loaderHalo,
          shadowColor: colors.primary,
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
          backgroundColor: colors.loaderBaseBottom,
        },
        liquidClip: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        },
        dim: {
          ...StyleSheet.absoluteFill,
          backgroundColor: colors.loaderDim,
        },
        gloss: {
          position: 'absolute',
          height: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.55)',
        },
        markWrap: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
        },
        mark: {
          fontWeight: '900',
          letterSpacing: -1,
          includeFontPadding: false,
          textAlign: 'center',
        },
      }),
    [colors]
  );

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width: size + 32,
          height: size + 32,
          opacity: wrapOpacity,
          transform: [{ scale: activeBreathe }],
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
              <Stop offset="0" stopColor={colors.loaderBaseTop} />
              <Stop offset="1" stopColor={colors.loaderBaseBottom} />
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
                  <Stop offset="0" stopColor={colors.loaderFillTop} />
                  <Stop offset="0.35" stopColor={colors.loaderFillMid} />
                  <Stop offset="1" stopColor={colors.loaderFillBottom} />
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
  complete,
  progress,
  onFinished,
}: {
  visible: boolean;
  complete: boolean;
  progress: Animated.Value;
  onFinished?: () => void;
}) {
  useEffect(() => {
    if (visible) lightHaptic();
  }, [visible]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <BrandLoader
        size={56}
        animate={visible}
        complete={complete}
        progress={progress}
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
});
