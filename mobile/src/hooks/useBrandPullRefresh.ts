import { useCallback, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { lightHaptic } from '../utils/haptics';

/** Distance (px) at which the brand liquid is full and refresh starts. */
const PULL_FILL_PX = 90;

/**
 * Pull-to-refresh that fires as soon as the fill hits 100% —
 * no need to release past the system threshold.
 *
 * Call `armRefresh(() => load(true))` each render (or in an effect).
 */
export function useBrandPullRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [pullProgress] = useState(() => new Animated.Value(0));
  const refreshingRef = useRef(false);
  const wasPullingRef = useRef(false);
  const suppressPullUntilRef = useRef(0);
  const dataReadyRef = useRef(false);
  const animReadyRef = useRef(false);
  const loadRef = useRef<(() => void | Promise<void>) | null>(null);

  const settleRefresh = useCallback(() => {
    if (!refreshingRef.current || !dataReadyRef.current || !animReadyRef.current) return;
    suppressPullUntilRef.current = Date.now() + 350;
    refreshingRef.current = false;
    pullProgress.setValue(0);
    setRefreshing(false);
  }, [pullProgress]);

  const markDataReady = useCallback(() => {
    dataReadyRef.current = true;
    setDataReady(true);
    settleRefresh();
  }, [settleRefresh]);

  const markAnimReady = useCallback(() => {
    animReadyRef.current = true;
    settleRefresh();
  }, [settleRefresh]);

  const armRefresh = useCallback((fn: () => void | Promise<void>) => {
    loadRef.current = fn;
  }, []);

  const startRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    wasPullingRef.current = false;
    pullProgress.stopAnimation();
    pullProgress.setValue(1);
    dataReadyRef.current = false;
    animReadyRef.current = false;
    setDataReady(false);
    setRefreshing(true);
    void lightHaptic();
    void loadRef.current?.();
  }, [pullProgress]);

  const onPullScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (refreshingRef.current || Date.now() < suppressPullUntilRef.current) return;
      const y = e.nativeEvent.contentOffset.y;
      if (y >= 0) {
        if (wasPullingRef.current) {
          wasPullingRef.current = false;
          Animated.timing(pullProgress, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
        return;
      }
      const p = Math.min(1, -y / PULL_FILL_PX);
      wasPullingRef.current = true;
      pullProgress.stopAnimation();
      pullProgress.setValue(p);
      if (p >= 1) startRefresh();
    },
    [pullProgress, startRefresh]
  );

  return {
    refreshing,
    dataReady,
    pullProgress,
    startRefresh,
    onPullScroll,
    armRefresh,
    markDataReady,
    markAnimReady,
  };
}
