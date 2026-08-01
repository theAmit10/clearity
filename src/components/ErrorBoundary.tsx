import React from 'react';
import { View, Text, Pressable } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import { logEvent } from '../services/logger';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();

  return (
    <ErrorBoundaryInner
      onError={(error, info) => {
        crashlytics().recordError(error, 'ErrorBoundary');
        logEvent('error', error.message, { stack: error.stack, componentStack: info.componentStack });
      }}
      fallback={(reset) => (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: theme.colors.iosBg }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 10, color: theme.colors.iosLabel }}>{t('errorBoundary.title')}</Text>
          <Text style={{ fontSize: 14, color: theme.colors.iosSecondaryLabel, textAlign: 'center', marginBottom: 20 }}>
            {t('errorBoundary.body')}
          </Text>
          <Pressable style={{ backgroundColor: theme.colors.iosBlue, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }} onPress={reset}>
            <Text style={{ color: theme.colors.shadowLight, fontWeight: '600' }}>{t('errorBoundary.tryAgain')}</Text>
          </Pressable>
        </View>
      )}
    >
      {children}
    </ErrorBoundaryInner>
  );
}
