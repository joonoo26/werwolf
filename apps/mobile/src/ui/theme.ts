// Designtokens aus docs/STYLE_GUIDE.md (Dark Nordic Mystery). Palette bewusst geschlossen.
export const colors = {
  night950: '#090D0F',
  night900: '#101518',
  night800: '#181E21',
  night700: '#222A2E',
  ivory100: '#F1E8D8',
  ivory300: '#C8BFAF',
  ash500: '#777B7B',
  ember500: '#B84532',
  ember400: '#CD5A3F',
  fire400: '#D29A57',
  line: 'rgba(241,232,216,0.12)',
  scrim: 'rgba(9,13,15,0.72)',
} as const;

export const fonts = {
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiSemi: 'Inter_600SemiBold',
  display: 'CormorantGaramond_600SemiBold',
  displayBold: 'CormorantGaramond_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

/** Normale UI 150–250 ms, Inszenierung 700–1400 ms (STYLE_GUIDE §15). */
export const motion = { ui: 200, cinematic: 1100 } as const;

/** Mindestgröße für Touch-Ziele (STYLE_GUIDE §17). */
export const MIN_TOUCH = 44;
