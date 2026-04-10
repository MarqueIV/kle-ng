import type { Theme } from '@/types/theme'

export const CLASSIC_THEME: Theme = {
  name: 'Classic',
  backgroundColor: '#eeeeee',
  rules: [
    {
      name: 'Default',
      colors: { color: '#cccccc', defaultTextColor: '#000000' },
    },
  ],
}

export const DARK_THEME: Theme = {
  name: 'Dark',
  backgroundColor: '#141414',
  rules: [
    {
      name: 'Default',
      colors: { color: '#2d2d2d', defaultTextColor: '#e0e0e0' },
    },
  ],
}

export const VIA_THEME: Theme = {
  name: 'VIA',
  backgroundColor: '#eeeeee',
  rules: [
    {
      name: 'Default',
      colors: { color: '#cccccc', defaultTextColor: '#000000' },
    },
    {
      name: 'Modifiers',
      matchers:
        'width > 1 or height > 1 or label matches "([Cc]trl|[Cc]ontrol|[Aa]lt.*|[Ww]in.*|[Mm]enu|[Ff]n)"',
      colors: { color: '#aaaaaa' },
    },
    {
      name: 'Accents',
      matchers: 'label matches "([Ee]nter|[Ee]sc.*)" and height == 1',
      colors: { color: '#777777' },
    },
    {
      name: 'Space',
      matchers: 'width >= 4',
      colors: { color: '#cccccc' },
    },
  ],
}

export const GRUVBOX_DARK_THEME: Theme = {
  name: 'Gruvbox (dark)',
  backgroundColor: '#a89984',
  rules: [
    {
      name: 'Default',
      colors: { color: '#2b2928', defaultTextColor: '#ebdbb2' },
    },
    {
      name: 'Modifiers',
      matchers: 'width > 1 or height > 1',
      colors: { color: '#222222', defaultTextColor: '#ebdbb2' },
    },
    {
      name: 'Space',
      matchers: 'width >= 4',
      colors: { color: '#2b2928', defaultTextColor: '#ebdbb2' },
    },
    {
      name: 'Aqua Text',
      matchers: 'label matches "([Ee]nter|[Cc]aps.*)"',
      colors: { defaultTextColor: '#8ec07c' },
    },
    {
      name: 'Red Text',
      matchers: 'label matches "([Ee]sc.*|[Ss]hift)"',
      colors: { defaultTextColor: '#fb4934' },
    },
    {
      name: 'Purple Text',
      matchers: 'label matches "([Tt]ab.*|[Bb]ack.*)"',
      colors: { defaultTextColor: '#d3869b' },
    },
    {
      name: 'Green Text',
      matchers: 'label matches "([Cc]trl|[Cc]ontrol|[Aa]lt.*|[Ww]in.*|[Mm]enu|[Ff]n)"',
      colors: { defaultTextColor: '#b8bb26' },
    },
    {
      name: 'Decal Text',
      matchers: 'decal',
      colors: { defaultTextColor: '#000000' },
    },
  ],
}

export const BUILTIN_THEMES: Theme[] = [
  CLASSIC_THEME,
  DARK_THEME,
  VIA_THEME,
  GRUVBOX_DARK_THEME,
]
