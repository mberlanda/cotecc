import React, {useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, View} from 'react-native';

import {useLocalSearchParams, useRouter} from 'expo-router';

import Checkbox from '../components/Checkbox';
import PickerModal from '../components/PickerModal';
import PrimaryButton from '../components/PrimaryButton';
import {Language, languageOptions, translate} from '../i18n';
import {SessionRouteParams} from '../routes';
import {theme} from '../theme';

const HomeScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as SessionRouteParams;
  const [language, setLanguage] = useState<Language>(
    (params.language as Language) ?? 'en',
  );
  const [gameSpeed, setGameSpeed] = useState(500);
  const [playerCount, setPlayerCount] = useState(4);
  const [showDebug, setShowDebug] = useState(false);
  const [maxLifeCount, setMaxLifeCount] = useState(4);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const playerCountOptions = {
    2: `2 ${t('players').toLowerCase()}`,
    3: `3 ${t('players').toLowerCase()}`,
    4: `4 ${t('players').toLowerCase()}`,
    5: `5 ${t('players').toLowerCase()}`,
    6: `6 ${t('players').toLowerCase()}`,
  };
  const gameSpeedOptions = {
    500: t('fast'),
    1000: t('normal'),
    1500: t('slow'),
  };
  const maxLifeCountOptions = {
    2: `2 ${t('lives').toLowerCase()}`,
    3: `3 ${t('lives').toLowerCase()}`,
    4: `4 ${t('lives').toLowerCase()}`,
    5: `5 ${t('lives').toLowerCase()}`,
  };

  const startGame = () => {
    router.push({
      pathname: '/game',
      params: {
        gameSpeed,
        playerCount,
        name: params.name,
        showDebug: String(showDebug),
        maxLifeCount,
        sessionType: params.sessionType,
        language,
      },
    });
  };

  const openHowToPlay = () => {
    router.push({
      pathname: '/how-to-play',
      params: {name: params.name, sessionType: params.sessionType, language},
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Image
          source={require('../assets/cards/card_3_0.jpeg')}
          resizeMode="contain"
          style={styles.asso}
        />
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{t('welcome')}</Text>
          <Text style={styles.title}>{params.name}</Text>
          <Text style={styles.subtitle}>{t('versusComputer')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton title={t('newGameComputer')} onPress={startGame} />
        <PrimaryButton title={t('howToPlay')} onPress={openHowToPlay} />
      </View>

      <View style={styles.setupPanel}>
        <Text style={styles.sectionTitle}>{t('tableSetup')}</Text>
        <PickerModal
          id="language"
          options={languageOptions}
          selectedValue={language}
          title={t('language')}
          onValueChange={itemValue => setLanguage(itemValue as Language)}
        />
        <PickerModal
          id="player-count"
          options={playerCountOptions}
          selectedValue={playerCount}
          title={t('players')}
          onValueChange={itemValue => setPlayerCount(+itemValue)}
        />
        <PickerModal
          id="game-speed"
          options={gameSpeedOptions}
          selectedValue={gameSpeed}
          title={t('aiPace')}
          onValueChange={itemValue => setGameSpeed(+itemValue)}
        />
        <PickerModal
          id="max-life-count"
          options={maxLifeCountOptions}
          selectedValue={maxLifeCount}
          title={t('lives')}
          onValueChange={itemValue => setMaxLifeCount(+itemValue)}
        />
        <Checkbox
          checked={showDebug}
          onPress={() => setShowDebug(!showDebug)}
          text={t('showDebug')}
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
    gap: theme.spacing.xl,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: theme.spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.gold,
  },
  asso: {
    width: 92,
    height: 144,
  },
  heroCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: theme.colors.inkMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    gap: theme.spacing.sm,
  },
  setupPanel: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
});

export default HomeScreen;
