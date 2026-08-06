import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, SecondaryButton, Loader } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { ROUTES } from '../../constants';
import { useAuthStore, usePlayerStore, useUiStore } from '../../store';
import { unityBridge } from '../../services';

type Props = NativeStackScreenProps<any>;

type UnityViewComponent = React.ComponentType<{
  style?: object;
  ref?: React.Ref<any>;
  onUnityMessage?: (event: { nativeEvent: { message: string } }) => void;
  androidKeepPlayerMounted?: boolean;
  fullScreen?: boolean;
}>;

/**
 * Embedded Unity gameplay (single APK).
 * Requires: Unity exported as library to MatchIQ_App/unity/builds/android
 * and a native build: npx expo run:android (Expo Go cannot embed Unity).
 */
export function UnityGameplayScreen({ navigation, route }: Props) {
  const tournamentId = route.params?.tournamentId as string | undefined;
  const mode = (route.params?.mode as 'tournament' | 'campaign' | 'practice') || 'practice';
  const token = useAuthStore((s) => s.session?.token) || 'demo-token';
  const setLast = useUiStore((s) => s.setLastMatchResult);
  const setBalances = usePlayerStore((s) => s.setBalances);
  const balances = usePlayerStore((s) => s.balances);
  const showToast = useUiStore((s) => s.showToast);
  const finished = useRef(false);
  const matchIdRef = useRef(`match-${Date.now()}`);
  const unityRef = useRef<{
    postMessage: (go: string, method: string, message: string) => void;
    unloadUnity?: () => void;
  } | null>(null);

  const [UnityView, setUnityView] = useState<UnityViewComponent | null>(null);
  const [nativeMissing, setNativeMissing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Native module — only exists in custom/dev APK, not Expo Go
        const mod = require('@azesmway/react-native-unity');
        if (mounted) setUnityView(() => mod.default as UnityViewComponent);
      } catch {
        if (mounted) setNativeMissing(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const launchPayload = useMemo(
    () => ({
      matchId: matchIdRef.current,
      tournamentId,
      mode,
      token,
    }),
    [mode, token, tournamentId],
  );

  const finishWithResult = useCallback(
    (won?: boolean, raw?: string) => {
      if (finished.current) return;
      finished.current = true;

      let result = unityBridge.createSimulatedResult(matchIdRef.current, tournamentId);
      if (raw) {
        const parsed = unityBridge.parseMatchResultUrl(raw) || unityBridge.parseMatchResultJson(raw);
        if (parsed) result = parsed;
      }
      if (won != null) result.won = won;

      setLast(result);
      setBalances({ coins: balances.coins + result.coinsEarned });
      navigation.replace(result.won ? ROUTES.Victory : ROUTES.Defeat, { result });
    },
    [balances.coins, navigation, setBalances, setLast, tournamentId],
  );

  useEffect(() => {
    if (!UnityView || !unityRef.current) return;
    // Tell Unity shell to start this match (MatchIQShellBridge.OnReactNativeLaunch)
    const json = JSON.stringify(launchPayload);
    try {
      unityRef.current.postMessage('MatchIQShellBridge', 'OnReactNativeLaunch', json);
    } catch {
      // Unity scene may not have the GO yet — shell also reads deep link / absoluteURL
    }
  }, [UnityView, launchPayload]);

  const onUnityMessage = useCallback(
    (event: { nativeEvent: { message: string } }) => {
      const message = event.nativeEvent.message || '';
      if (!message) return;
      if (
        message.startsWith('matchiq://') ||
        message.includes('match-result') ||
        message.includes('"won"')
      ) {
        finishWithResult(undefined, message);
      }
    },
    [finishWithResult],
  );

  if (Platform.OS === 'web' || nativeMissing) {
    return (
      <View style={styles.center}>
        <Text style={typography.hero}>Unity Embed</Text>
        <Text style={[typography.body, styles.body]}>
          Expo Go mein Unity embed nahi chalta. Ek native APK banao:
          {'\n\n'}1) Unity → Export Android Library → MatchIQ_App/unity/builds/android
          {'\n'}2) npx expo prebuild
          {'\n'}3) npx expo run:android
        </Text>
        <PrimaryButton title="Simulate Victory (Dev)" onPress={() => finishWithResult(true)} style={styles.btn} />
        <SecondaryButton title="Simulate Defeat (Dev)" onPress={() => finishWithResult(false)} style={styles.btn} />
        <SecondaryButton title="Back" onPress={() => navigation.goBack()} style={styles.btn} />
      </View>
    );
  }

  if (!UnityView) {
    return <Loader fullScreen label="Loading Unity…" />;
  }

  return (
    <View style={styles.root}>
      <UnityView
        ref={unityRef as any}
        style={styles.unity}
        fullScreen
        androidKeepPlayerMounted
        onUnityMessage={onUnityMessage}
      />
      <View style={styles.overlay}>
        <SecondaryButton title="Close" onPress={() => finishWithResult(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  unity: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 48,
    right: 16,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  body: { textAlign: 'center', marginVertical: spacing.md },
  btn: { alignSelf: 'stretch', marginTop: spacing.sm },
});
