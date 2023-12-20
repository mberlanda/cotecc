export interface GameScreenRouteParams {
  opponents: number;
  name: string;
  showDebug: boolean;
}

export type RootStackParamList = {
  GameScreen: GameScreenRouteParams;
  GameSelectionScreen: {};
};
