import {Language} from './i18n';

export interface GameScreenRouteParams {
  gameSpeed: number;
  playerCount: number;
  name: string;
  showDebug: boolean;
  maxLifeCount: number;
  sessionType: 'guest' | 'login' | 'register';
  language: Language;
}

export interface SessionRouteParams {
  name: string;
  sessionType: 'guest' | 'login' | 'register';
  language: Language;
}

export type RootStackParamList = {
  AuthScreen: {};
  HomeScreen: SessionRouteParams;
  HowToPlayScreen: SessionRouteParams;
  GameScreen: GameScreenRouteParams;
};
