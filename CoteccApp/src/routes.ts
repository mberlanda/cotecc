export interface GameScreenRouteParams {
  gameSpeed: number;
  opponents: number;
  name: string;
  showDebug: boolean;
  maxLifeCount: number;
}

export type RootStackParamList = {
  GameScreen: GameScreenRouteParams;
  GameSelectionScreen: {};
};
