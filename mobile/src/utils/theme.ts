export type ColorPalette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  /** Text/icon on primary (lime) surfaces */
  ink: string;
  onPrimaryMuted: string;
  violet: string;
  violetDeep: string;
  /** Text on violet/hero accent cards */
  onViolet: string;
  onVioletMuted: string;
  income: string;
  expense: string;
  danger: string;
  warning: string;
  chart: string[];
  /** Modal / sheet dim */
  overlay: string;
  /** Brand loader tile */
  loaderBaseTop: string;
  loaderBaseBottom: string;
  loaderFillTop: string;
  loaderFillMid: string;
  loaderFillBottom: string;
  loaderMarkEmpty: string;
  loaderMarkFull: string;
  loaderHalo: string;
  loaderDim: string;
};

/** Dark — default FinAssist look */
export const darkColors: ColorPalette = {
  background: '#050607',
  surface: '#0C0E12',
  surfaceRaised: '#13151B',
  text: '#E4E3DD',
  textMuted: '#757780',
  border: '#22242C',
  primary: '#A8C94A',
  primaryDark: '#0A0C08',
  primarySoft: '#181C12',
  ink: '#080A06',
  onPrimaryMuted: 'rgba(8, 10, 6, 0.65)',
  violet: '#8A78C4',
  violetDeep: '#1E1A2A',
  onViolet: '#141018',
  onVioletMuted: 'rgba(42, 36, 56, 0.9)',
  income: '#A8C94A',
  expense: '#D48460',
  danger: '#D45A56',
  warning: '#CFA55A',
  chart: ['#A8C94A', '#8A78C4', '#D48460', '#4FA8A2', '#CFA55A', '#5B6FD0', '#C46A9F'],
  overlay: 'rgba(0, 0, 0, 0.55)',
  loaderBaseTop: '#13151B',
  loaderBaseBottom: '#050607',
  loaderFillTop: '#C4DC78',
  loaderFillMid: '#A8C94A',
  loaderFillBottom: '#7A9832',
  loaderMarkEmpty: '#4A5430',
  loaderMarkFull: '#050607',
  loaderHalo: 'rgba(168, 201, 74, 0.22)',
  loaderDim: 'rgba(10, 12, 16, 0.55)',
};

/** Light — same brand, bright surfaces */
export const lightColors: ColorPalette = {
  background: '#F2F3F5',
  surface: '#FFFFFF',
  surfaceRaised: '#E8EAEE',
  text: '#141610',
  textMuted: '#5C6370',
  border: '#D0D5DD',
  primary: '#C8E86A',
  primaryDark: '#5A6E22',
  primarySoft: '#F2F9D8',
  ink: '#1A1E10',
  onPrimaryMuted: 'rgba(26, 30, 16, 0.55)',
  violet: '#7B6BB8',
  violetDeep: '#EDE8F8',
  onViolet: '#FFFFFF',
  onVioletMuted: 'rgba(255, 255, 255, 0.78)',
  income: '#7FA826',
  expense: '#C45E2E',
  danger: '#C43B36',
  warning: '#B8860B',
  chart: ['#C8E86A', '#7B6BB8', '#C45E2E', '#2A9A94', '#B8860B', '#4A5FC0', '#A84D80'],
  overlay: 'rgba(20, 24, 32, 0.35)',
  loaderBaseTop: '#E8EAEE',
  loaderBaseBottom: '#D0D5DD',
  loaderFillTop: '#E8F8A8',
  loaderFillMid: '#C8E86A',
  loaderFillBottom: '#A8C94A',
  loaderMarkEmpty: '#8A9A48',
  loaderMarkFull: '#1A1E10',
  loaderHalo: 'rgba(200, 232, 106, 0.35)',
  loaderDim: 'rgba(255, 255, 255, 0.35)',
};

/** @deprecated Prefer useTheme().colors */
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export type ThemeScheme = 'light' | 'dark';

export function paletteFor(scheme: ThemeScheme): ColorPalette {
  return scheme === 'light' ? lightColors : darkColors;
}
