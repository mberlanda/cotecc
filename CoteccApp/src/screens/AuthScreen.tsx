import React, {useState} from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useRouter} from 'expo-router';

import PickerModal from '../components/PickerModal';
import PrimaryButton from '../components/PrimaryButton';
import {Language, languageOptions, translate} from '../i18n';
import {theme} from '../theme';

const AuthScreen = () => {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [guestName, setGuestName] = useState('');
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const continueAsGuest = () => {
    const displayName = guestName.trim();
    if (!displayName) {
      Alert.alert(t('guestNameRequired'), t('guestNameRequiredMessage'));
      return;
    }

    router.push({
      pathname: '/home',
      params: {name: displayName, sessionType: 'guest', language},
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Image
          source={require('../assets/cotecc-banner.png')}
          resizeMode="cover"
          style={styles.banner}
        />
        <View style={styles.logoMark}>
          <Image
            source={require('../assets/asso-coppe-mark.png')}
            resizeMode="contain"
            style={styles.logoCard}
          />
        </View>
      </View>

      <View style={styles.languagePanel}>
        <PickerModal
          id="language"
          options={languageOptions}
          selectedValue={language}
          title={t('language')}
          onValueChange={itemValue => setLanguage(itemValue as Language)}
        />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{t('playAsGuest')}</Text>
          <Text style={styles.panelHint}>{t('guestHint')}</Text>
        </View>
        <TextInput
          style={styles.input}
          onChangeText={setGuestName}
          value={guestName}
          placeholder={t('playerName')}
          placeholderTextColor={theme.colors.inkMuted}
          testID="guest-name-input"
        />
        <PrimaryButton
          title={t('playAsGuest')}
          onPress={continueAsGuest}
          testID="play-as-guest-button"
        />
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  banner: {
    width: '100%',
    height: 200,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.primaryDark,
  },
  logoMark: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -46,
    borderRadius: 37,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.gold,
  },
  logoCard: {
    width: 56,
    height: 56,
  },
  languagePanel: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  panel: {
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  panelHeader: {
    gap: theme.spacing.xs,
  },
  panelTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  panelHint: {
    color: theme.colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    color: theme.colors.ink,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
});

export default AuthScreen;
