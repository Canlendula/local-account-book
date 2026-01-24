import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { migrateDbIfNeeded } from '@/db/database';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const [showSplash, setShowSplash] = useState(true);

  // Custom Splash Screen Component
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          {/* 状态栏样式：浅色背景用深色文字，深色背景用浅色文字 */}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <CustomSplashScreen onFinish={() => setShowSplash(false)} />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="accounting.db" onInit={migrateDbIfNeeded}>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            {/* 状态栏样式：浅色背景用深色文字，深色背景用浅色文字 */}
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
          </ThemeProvider>
        </PaperProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function CustomSplashScreen({ onFinish }: { onFinish: () => void }) {
  const [greeting, setGreeting] = useState('');
  const theme = useColorScheme() === 'dark' ? MD3DarkTheme : MD3LightTheme;

  useEffect(() => {
    const hour = dayjs().hour();
    let text = '';
    if (hour >= 5 && hour < 12) {
      text = '早上好，开启美好的一天';
    } else if (hour >= 12 && hour < 18) {
      text = '下午好，继续加油';
    } else if (hour >= 18 && hour < 22) {
      text = '晚上好，享受生活';
    } else {
      text = '夜深了，早点休息';
    }
    setGreeting(text);

    const timer = setTimeout(() => {
      onFinish();
    }, 2500); // 2.5 seconds animation

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.splashContainer, { backgroundColor: theme.colors.background }]}>
      <Text variant="displayMedium" style={[styles.splashText, { color: theme.colors.primary }]}>又来记账了哥</Text>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>{greeting}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Or dynamic based on theme if accessed inside PaperProvider
  },
  splashText: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  greetingText: {
    opacity: 0.8,
  },
});
