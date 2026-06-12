import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {NavigationProp, RouteProp} from '@react-navigation/native';

import PrimaryButton from '../components/PrimaryButton';
import {translate} from '../i18n';
import {RootStackParamList} from '../routes';
import {theme} from '../theme';

const HowToPlayScreen = ({
  navigation,
  route,
}: {
  navigation: NavigationProp<RootStackParamList, 'HowToPlayScreen'>;
  route: RouteProp<RootStackParamList, 'HowToPlayScreen'>;
}) => {
  const {language, name} = route.params;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const rules = [t('rule1'), t('rule2'), t('rule3'), t('rule4')];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('howToPlay')}</Text>
        <Text style={styles.title}>Cotecc</Text>
        <Text style={styles.subtitle}>
          {t('welcome')}, {name}.
        </Text>
      </View>

      <View style={styles.rulesPanel}>
        {rules.map((rule, index) => (
          <View key={rule} style={styles.ruleRow}>
            <View style={styles.ruleBadge}>
              <Text style={styles.ruleBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton
        title={t('home')}
        onPress={() => navigation.navigate('HomeScreen', route.params)}
      />
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
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  header: {
    gap: theme.spacing.xs,
  },
  kicker: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
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
  },
  rulesPanel: {
    gap: theme.spacing.md,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ruleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blue,
  },
  ruleBadgeText: {
    color: theme.colors.white,
    fontWeight: '900',
  },
  ruleText: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
});

export default HowToPlayScreen;
