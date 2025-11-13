import React, { useEffect, useRef, useState } from "react"
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { Audio, AVPlaybackStatus } from "expo-av"

export default function Explore() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [recordingUri, setRecordingUri] = useState<string | null>(null)
  const [recordingDurationMillis, setRecordingDurationMillis] = useState(0)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const playbackRef = useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadingPlay, setLoadingPlay] = useState(false)

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync()
        } catch {}
        recordingRef.current = null
      }
      if (playbackRef.current) {
        playbackRef.current.unloadAsync().catch(() => {})
        playbackRef.current = null
      }
    }
  }, [])

  function formatMillis(ms: number) {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  async function startRecording() {
    setIsPreparing(true)
    try {
      const perm = await Audio.requestPermissionsAsync()
      if (perm.status !== "granted") {
        Alert.alert("Permission required", "Microphone permission is required to record audio.")
        setIsPreparing(false)
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,

        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      })

      const recording = new Audio.Recording()
      recordingRef.current = recording

      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          setRecordingDurationMillis(status.durationMillis ?? 0)
        }
      })

      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY)
      await recording.startAsync()
      setIsRecording(true)
      setRecordingUri(null)
    } catch (err) {
      console.error("startRecording error", err)
      Alert.alert("Recording failed", "Could not start recording.")
    } finally {
      setIsPreparing(false)
    }
  }

  async function stopRecording() {
    try {
      const recording = recordingRef.current
      if (!recording) return

      setIsPreparing(true)
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI() ?? null
      setRecordingUri(uri)
      setIsRecording(false)
      setRecordingDurationMillis((prev) => prev) // ensure duration stays
      recordingRef.current = null
    } catch (err) {
      console.error("stopRecording error", err)
      Alert.alert("Stop failed", "Could not stop recording cleanly.")
    } finally {
      setIsPreparing(false)
    }
  }

  async function playRecording() {
    if (!recordingUri) return
    setLoadingPlay(true)
    try {
      // unload previous if exists
      if (playbackRef.current) {
        await playbackRef.current.unloadAsync()
        playbackRef.current = null
      }

      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri }, { shouldPlay: true })
      playbackRef.current = sound
      setIsPlaying(true)

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status) return
        if ("isLoaded" in status && !status.isLoaded) return
        if ("didJustFinish" in status && status.didJustFinish) {
          setIsPlaying(false)
          sound.unloadAsync().catch(() => {})
          playbackRef.current = null
        }
      })
    } catch (err) {
      console.error("playRecording error", err)
      Alert.alert("Playback failed", "Could not play recording.")
      setIsPlaying(false)
    } finally {
      setLoadingPlay(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recorder</Text>

      <View style={styles.micCircle}>
        <View style={[styles.innerCircle, isRecording ? styles.innerRecording : null]} />
      </View>

      <Text style={styles.statusText}>
        {isPreparing ? "Working..." : isRecording ? `Recording · ${formatMillis(recordingDurationMillis)}` : recordingUri ? `Recorded · ${formatMillis(recordingDurationMillis)}` : "Ready to record"}
      </Text>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={isRecording ? stopRecording : startRecording}
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
        >
          {isPreparing ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>{isRecording ? "Stop " : "Record "}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={playRecording}
          disabled={!recordingUri || isPlaying || loadingPlay}
          style={({ pressed }) => [
            styles.button,
            (!recordingUri || isPlaying || loadingPlay) ? styles.buttonDisabled : null,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          {loadingPlay ? <ActivityIndicator /> : <Text style={styles.buttonText}>{isPlaying ? "Playing  " : "Play "}</Text>}
        </Pressable>
      </View>

      <View style={styles.metaBox}>
        <Text style={styles.metaLabel}>File</Text>
        <Text style={styles.metaValue}>{recordingUri ?? "No file yet"}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    marginBottom: 24,
  },
  micCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  innerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#e74c3c",
  },
  innerRecording: {
    backgroundColor: "#c0392b",
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    color: "#555",
    marginBottom: 18,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
  metaBox: {
    marginTop: 26,
    width: "100%",
    paddingHorizontal: 10,
  },
  metaLabel: {
    fontSize: 12,
    color: "#888",
  },
  metaValue: {
    fontSize: 13,
    color: "#333",
    marginTop: 6,
  },
})
