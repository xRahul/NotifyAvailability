import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import WebView from 'react-native-webview';

import UrlInput from './components/UrlInput';
import SearchInput from './components/SearchInput';
import SettingsSwitch from './components/SettingsSwitch';
import PlatformPicker from './components/PlatformPicker';
import { WEB_PLATFORM_DESKTOP, USER_AGENT_DESKTOP } from './constants';
import { loadWatchConfig, saveWatchConfig } from './storage/configStorage';
import { ensureNotificationSetup } from './services/notificationService';
import { runCheck } from './services/checkService';
import {
  resumeWatchIfNeeded,
  startWatch,
  stopWatch,
} from './services/watchScheduler';
import { DEFAULT_CONFIG, WatchConfig, WebPlatformType } from './types';
import { formatRelativeTime } from './utils';
import styles from './Styles';

const URL_PATTERN = /^https?:\/\//i;
const URL_ERROR = 'URL must start with http:// or https://';

async function performCheck(
  cfg: WatchConfig,
  onChecked: (lastChecked: string) => void,
): Promise<void> {
  await runCheck(cfg);
  const stored = await loadWatchConfig();
  onChecked(stored.lastChecked);
}

function App(): React.JSX.Element {
  const [config, setConfig] = useState<WatchConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const searchTextInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const webViewRef = useRef<React.ComponentRef<typeof WebView>>(null);

  const tick = useCallback(async (): Promise<void> => {
    try {
      const cfg = await loadWatchConfig();
      await performCheck(cfg, lastChecked =>
        setConfig(prev => ({ ...prev, lastChecked })),
      );
    } catch (error) {
      console.error('[App] background check failed', error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async (): Promise<void> => {
      try {
        const stored = await loadWatchConfig();
        if (!active) {
          return;
        }
        setConfig(stored);
        await resumeWatchIfNeeded(tick);
      } catch (error) {
        console.error('[App] startup failed', error);
      }
    };
    initialize();
    return () => {
      active = false;
    };
  }, [tick]);

  const persist = (key: string, value: string): void => {
    saveWatchConfig({ [key]: value } as Partial<WatchConfig>).catch(error =>
      console.error(`[App] failed to persist ${key}`, error),
    );
  };

  const handleStart = async (): Promise<void> => {
    const trimmedUrl = config.url.trim();
    if (!URL_PATTERN.test(trimmedUrl)) {
      setUrlError(URL_ERROR);
      return;
    }
    setUrlError(null);
    setLoading(true);
    try {
      if (!(await ensureNotificationSetup())) {
        return;
      }
      setConfig(prev => ({ ...prev, url: trimmedUrl, taskSet: 'yes' }));
      try {
        await saveWatchConfig({ url: trimmedUrl, taskSet: 'yes' });
        await startWatch(tick);
        await performCheck({ ...config, url: trimmedUrl }, lastChecked =>
          setConfig(prev => ({ ...prev, lastChecked })),
        );
      } catch (error) {
        console.error('[App] watch start failed', error);
      }
    } catch (error) {
      console.error('[App] start failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (): Promise<void> => {
    setConfig(prev => ({ ...prev, taskSet: 'no' }));
    try {
      await stopWatch();
      await saveWatchConfig({ taskSet: 'no' });
    } catch (error) {
      console.error('[App] stop failed', error);
    }
  };

  const refreshWebView = (): void => {
    webViewRef.current?.reload();
  };

  const handlePlatformChange = (itemValue: WebPlatformType): void => {
    setConfig(prev => ({ ...prev, webPlatformType: itemValue }));
    persist('webPlatformType', itemValue);
    refreshWebView();
  };

  const handleUrlSubmit = useCallback((): void => {
    searchTextInputRef.current?.focus();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="always"
      >
        <UrlInput
          url={config.url}
          setUrl={text => setConfig(prev => ({ ...prev, url: text }))}
          persist={persist}
          onSubmitEditing={handleUrlSubmit}
        />

        <SearchInput
          ref={searchTextInputRef}
          searchText={config.searchText}
          setSearchText={text =>
            setConfig(prev => ({ ...prev, searchText: text }))
          }
          persist={persist}
        />

        <SettingsSwitch
          label="Case Sensitive Search:"
          value={config.caseSensitiveSearch === 'yes'}
          onValueChange={value => {
            const valStr = value ? 'yes' : 'no';
            setConfig(prev => ({ ...prev, caseSensitiveSearch: valStr }));
            persist('caseSensitiveSearch', valStr);
          }}
        />

        <SettingsSwitch
          label="Search Absence of Text:"
          value={config.searchAbsence === 'yes'}
          onValueChange={value => {
            const valStr = value ? 'yes' : 'no';
            setConfig(prev => ({ ...prev, searchAbsence: valStr }));
            persist('searchAbsence', valStr);
          }}
        />

        <PlatformPicker
          selectedValue={config.webPlatformType}
          onValueChange={handlePlatformChange}
        />

        {urlError !== null && <Text style={styles.errorText}>{urlError}</Text>}

        <Text style={styles.lastCheckedText}>
          {`Last Checked: ${formatRelativeTime(config.lastChecked)}`}
        </Text>

        {config.taskSet === 'no' && (
          <Button
            title="Start Checking"
            disabled={loading}
            onPress={handleStart}
          />
        )}
        {config.taskSet === 'yes' && (
          <Button title="Stop Checking" onPress={handleStop} />
        )}

        {loading && <ActivityIndicator size="large" color="#7a42f4" />}

        {config.taskSet === 'yes' && config.url !== '' && (
          <WebView
            ref={webViewRef}
            style={styles.webview}
            source={{ uri: config.url }}
            dataDetectorTypes={['all']}
            scalesPageToFit={false}
            userAgent={
              config.webPlatformType === WEB_PLATFORM_DESKTOP
                ? USER_AGENT_DESKTOP
                : undefined
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
