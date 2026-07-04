import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { logEvent } from '../services/logger';

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logEvent('error', error.message, { stack: error.stack, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The error was saved to your on-device logs. You can export it from Settings.
          </Text>
          <Pressable style={styles.button} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: '#F2F2F7' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10, color: '#1C1C1E' },
  body: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: '#FFF', fontWeight: '600' },
});
