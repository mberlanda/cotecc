export interface GameScreenRouteParams {
  opponents: number;
  name: string;
}

export type RootStackParamList = {
  GameScreen: GameScreenRouteParams;
  GameSelectionScreen: {};
};
