import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { logEvent } from '../services/logger';
import { useTheme } from '../theme/ThemeProvider';

class ErrorBoundaryInner extends React.Component<{
  children: React.ReactNode;
  onError: (error: Error, info: React.ErrorInfo) => void;
  fallback: (reset: () => void) => React.ReactNode;
}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(() => this.setState({ hasError: false }));
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <ErrorBoundaryInner
      onError={(error, info) => {
        logEvent('error', error.message, { stack: error.stack, componentStack: info.componentStack });
      }}
      fallback={(reset) => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: theme.colors.iosBg }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 10, color: theme.colors.iosLabel }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: theme.colors.iosSecondaryLabel, textAlign: 'center', marginBottom: 20 }}>
            The error was saved to your on-device logs. You can export it from Settings.
          </Text>
          <Pressable style={{ backgroundColor: theme.colors.iosBlue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }} onPress={reset}>
            <Text style={{ color: theme.colors.shadowLight, fontWeight: '600' }}>Try again</Text>
          </Pressable>
        </View>
      )}
    >
      {children}
    </ErrorBoundaryInner>
  );
}
