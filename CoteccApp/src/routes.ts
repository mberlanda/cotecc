export interface GameScreenRouteParams {
  gameSpeed: number;
  opponents: number;
  name: string;
  showDebug: boolean;
}

export type RootStackParamList = {
  GameScreen: GameScreenRouteParams;
  GameSelectionScreen: {};
};
