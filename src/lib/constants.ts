export const COLORS = {
  background: '#FDF8ED',
  backgroundDark: '#EDE7E0',
  card: '#FFFFFF',
  text: '#2D1E3C',
  textSecondary: '#6B6B6B',
  textMuted: '#A0A0A0',
  accent: '#2D1E3C',
  white: '#FFFFFF',
  error: '#D32F2F',
  border: '#E0DAD3',
} as const;

export const FONTS = {
  displayBold: 'Geist_900Black',
  displaySemiBold: 'Geist_600SemiBold',
  bodyRegular: 'Geist_400Regular',
  bodyMedium: 'Geist_500Medium',
  bodyBold: 'Geist_700Bold',
} as const;

export const STORAGE = {
  audioBucket: 'audio-recordings',
  audioExtension: '.m4a',
  audioContentType: 'audio/mp4',
} as const;
