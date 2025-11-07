import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  const [recording, setRecording] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setGranted(status === 'granted');
    })();
  }, []);

  const toggleRecording = () => {
    if (!granted) return alert('Microphone permission required');
    setRecording(!recording);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        {recording ? 'Recording active' : 'Recording stopped'}
      </Text>
      <Button
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={toggleRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  status: { marginBottom: 20, fontSize: 18 },
});
