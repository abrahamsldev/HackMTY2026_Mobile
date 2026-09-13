import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

// expo-audio reports metering in dBFS on every platform (iOS `averagePower`,
// Android `20*log10(amplitude/32767)`, web via a Web Audio analyser) — roughly
// -160 (silence) to 0 (full scale). Real rooms rarely get near either extreme,
// so we map a practical speaking window instead of the whole theoretical range.
const VOICE_METER_MIN_DB = -50;
const VOICE_METER_MAX_DB = -10;
// Perceptual shaping: without this, normal speech barely moves the orb because
// most conversational volume sits in the lower half of the dB window.
const VOICE_METER_CURVE_EXPONENT = 0.6;
// Exponential moving average factor for the metering samples themselves.
const VOICE_METER_SMOOTHING = 0.35;
// Poll rate for recorder.getStatus() — expo-audio only exposes metering via
// this synchronous status snapshot, not a push-based event, so some polling
// is unavoidable. 60ms (~16Hz) is fast enough that Reanimated's UI-thread
// interpolation between samples reads as continuous motion, while staying far
// below the "read shared values from JS" or "animate via setInterval" traps —
// this loop only ever *writes* one number, it never drives the animation itself.
const VOICE_METER_POLL_MS = 60;
// How long the level takes to settle back to 0 once recording stops.
const VOICE_LEVEL_RELEASE_MS = 220;
// Safety net only: if `submit()` turns out to be a silent no-op (should not
// happen in the normal flow, guarded upstream), don't leave the loader stuck
// forever waiting for a pending state that will never arrive.
const VOICE_SUBMIT_WATCHDOG_MS = 4000;
// How long the "done" phase lingers so the exit animation can play before the
// overlay actually unmounts.
const VOICE_DONE_LINGER_MS = 260;

export type VoiceFlowPhase =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'stopping'
  | 'transcribing'
  | 'submitting'
  | 'waiting'
  | 'done';

export type VoiceFlowOptions = {
  /** Uploads the recording and resolves with the transcribed text (existing n8n STT path). */
  transcribe: (uri: string) => Promise<string>;
  /** The app's single canonical chat submission path (e.g. handleSubmit). Fire-and-forget. */
  submit: (text: string) => void;
  /** assistant.pending — used to know when the agent request triggered by this voice turn has settled. */
  isAgentPending: boolean;
};

export type VoiceFlow = {
  phase: VoiceFlowPhase;
  /** Smoothed 0..1 microphone level, written from JS, read on the UI thread. */
  level: SharedValue<number>;
  isRecording: boolean;
  isBusy: boolean;
  /** Starts recording if idle, stops (and submits) if listening; no-op otherwise. */
  onPress: () => void;
  /** Discards the current recording without transcribing/submitting it. */
  cancel: () => void;
};

export function useVoiceFlow({ transcribe, submit, isAgentPending }: VoiceFlowOptions): VoiceFlow {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [phase, setPhase] = useState<VoiceFlowPhase>('idle');
  const level = useSharedValue(0);
  const smoothedLevelRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const awaitingAgentRef = useRef(false);

  const stopMetering = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startMetering = useCallback(() => {
    stopMetering();
    pollRef.current = setInterval(() => {
      const status = recorder.getStatus();
      const db = status.metering;
      if (typeof db !== 'number' || !Number.isFinite(db)) return;
      const normalized = Math.min(
        1,
        Math.max(0, (db - VOICE_METER_MIN_DB) / (VOICE_METER_MAX_DB - VOICE_METER_MIN_DB)),
      );
      const shaped = Math.pow(normalized, VOICE_METER_CURVE_EXPONENT);
      const previous = smoothedLevelRef.current;
      const next = previous + (shaped - previous) * VOICE_METER_SMOOTHING;
      smoothedLevelRef.current = next;
      level.value = next;
    }, VOICE_METER_POLL_MS);
  }, [level, recorder, stopMetering]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopMetering();
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
    // Mount/unmount cleanup only — recorder identity is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (phase !== 'idle') return;
    setPhase('starting');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!mountedRef.current) return;
      if (!permission.granted) {
        setPhase('idle');
        Alert.alert('Micrófono no disponible', 'Concede permiso al micrófono para enviar una consulta de voz.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!mountedRef.current) return;
      recorder.record();
      smoothedLevelRef.current = 0;
      // eslint-disable-next-line react-hooks/immutability -- Reanimated's SharedValue.value mutation is the documented API; the rule doesn't yet recognize it.
      level.value = 0;
      startMetering();
      setPhase('listening');
    } catch (error) {
      stopMetering();
      if (mountedRef.current) setPhase('idle');
      Alert.alert('No se pudo usar el micrófono', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    }
  }, [level, phase, recorder, startMetering, stopMetering]);

  const stop = useCallback(async () => {
    if (phase !== 'listening') return;
    setPhase('stopping');
    stopMetering();
    // eslint-disable-next-line react-hooks/immutability -- Reanimated's SharedValue.value mutation is the documented API; the rule doesn't yet recognize it.
    level.value = withTiming(0, { duration: VOICE_LEVEL_RELEASE_MS });
    try {
      await recorder.stop();
      if (!mountedRef.current) return;
      const uri = recorder.uri;
      if (!uri) {
        setPhase('idle');
        Alert.alert('No se pudo grabar', 'No se encontró el archivo de audio.');
        return;
      }
      setPhase('transcribing');
      let text: string;
      try {
        text = await transcribe(uri);
      } catch (error) {
        if (mountedRef.current) setPhase('idle');
        Alert.alert(
          'No se pudo procesar el audio',
          error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        );
        return;
      }
      if (!mountedRef.current) return;
      awaitingAgentRef.current = true;
      setPhase('submitting');
      submit(text);
    } catch (error) {
      if (mountedRef.current) setPhase('idle');
      Alert.alert('No se pudo usar el micrófono', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    }
  }, [level, phase, recorder, stopMetering, submit, transcribe]);

  const cancel = useCallback(() => {
    if (phase !== 'listening' && phase !== 'starting') return;
    stopMetering();
    // eslint-disable-next-line react-hooks/immutability -- Reanimated's SharedValue.value mutation is the documented API; the rule doesn't yet recognize it.
    level.value = withTiming(0, { duration: VOICE_LEVEL_RELEASE_MS });
    if (recorder.isRecording) {
      recorder.stop().catch(() => {});
    }
    setPhase('idle');
  }, [level, phase, recorder, stopMetering]);

  // The loader must stay up through "submitting" and "waiting" and leave only
  // once the agent has actually responded — derived from real assistant
  // state, not a timer. `awaitingAgentRef` gates this so an unrelated,
  // pre-existing `isAgentPending` value can't be misread as "this turn is done".
  useEffect(() => {
    if (!awaitingAgentRef.current) return;
    if (phase === 'submitting' && isAgentPending) {
      const timer = setTimeout(() => setPhase('waiting'), 0);
      return () => clearTimeout(timer);
    }
    if (phase === 'waiting' && !isAgentPending) {
      awaitingAgentRef.current = false;
      const timer = setTimeout(() => setPhase('done'), 0);
      return () => clearTimeout(timer);
    }
  }, [isAgentPending, phase]);

  // Safety net: `submit` is expected to always lead to `isAgentPending`
  // becoming true almost immediately. If it doesn't (e.g. a guard upstream
  // silently rejected the submission), don't leave the loader stuck forever.
  useEffect(() => {
    if (phase !== 'submitting') return;
    const timer = setTimeout(() => {
      if (awaitingAgentRef.current && mountedRef.current) {
        awaitingAgentRef.current = false;
        setPhase('idle');
      }
    }, VOICE_SUBMIT_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done') return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setPhase('idle');
    }, VOICE_DONE_LINGER_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const onPress = useCallback(() => {
    if (phase === 'idle') {
      void start();
    } else if (phase === 'listening') {
      void stop();
    }
  }, [phase, start, stop]);

  return {
    phase,
    level,
    isRecording: phase === 'listening',
    isBusy: phase === 'starting' || phase === 'stopping',
    onPress,
    cancel,
  };
}
