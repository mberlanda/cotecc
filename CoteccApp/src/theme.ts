export const theme = {
  colors: {
    background: '#F3E4C4',
    surface: '#FFF7E3',
    surfaceMuted: '#E8D2A3',
    ink: '#17120D',
    inkMuted: '#5F5546',
    primary: '#B3261E',
    primaryDark: '#23150F',
    accent: '#225D9C',
    gold: '#D49B23',
    blue: '#225D9C',
    table: '#176B55',
    tableDark: '#0E4638',
    border: '#9E7A3A',
    danger: '#B3261E',
    white: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 14,
    pill: 999,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
};

export type Theme = typeof theme;
