import en from './en';
import es from './es';
import it from './it';

export type Language = 'en' | 'it' | 'es';

export const languageOptions: Record<Language, string> = {
  en: 'English',
  it: 'Italiano',
  es: 'Español',
};

const translations: Record<Language, Record<TranslationKey, string>> = {en, it, es};

export type TranslationKey = keyof typeof en;

export const translate = (language: Language, key: TranslationKey): string =>
  translations[language][key];
