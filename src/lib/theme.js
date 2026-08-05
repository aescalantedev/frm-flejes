export const themes = {

  // ── OSCUROS ────────────────────────────────────────────────────────────

  darkMinimal: {
    name: 'Pizarra Oscura',
    description: 'Dark mode clásico y elegante',
    colors: {
      bg: '#0F172A',
      surface: '#1E293B',
      'surface-hover': '#263145',
      border: '#2D3F55',
      text: '#F1F5F9',
      'text-muted': '#94A3B8',
      accent: '#10B981',
      'accent-hover': '#059669',
    }
  },

  nordic: {
    name: 'Nórdico Frío',
    description: 'Inspirado en Nord — suave y descansado',
    colors: {
      bg: '#2E3440',
      surface: '#3B4252',
      'surface-hover': '#434C5E',
      border: '#4C566A',
      text: '#ECEFF4',
      'text-muted': '#D8DEE9',
      accent: '#88C0D0',
      'accent-hover': '#81A1C1',
    }
  },

  graphite: {
    name: 'Grafito Carbón',
    description: 'Gris carbón con acento cian suave',
    colors: {
      bg: '#111318',
      surface: '#1C2028',
      'surface-hover': '#252A34',
      border: '#2E3441',
      text: '#E2E8F0',
      'text-muted': '#8892A4',
      accent: '#22D3EE',
      'accent-hover': '#06B6D4',
    }
  },

  dusk: {
    name: 'Atardecer Índigo',
    description: 'Azul medianoche con violeta cálido',
    colors: {
      bg: '#13111A',
      surface: '#1D1B26',
      'surface-hover': '#282535',
      border: '#332F45',
      text: '#EDE9FE',
      'text-muted': '#A78BFA',
      accent: '#C084FC',
      'accent-hover': '#A855F7',
    }
  },

  warmSlate: {
    name: 'Cálido Pizarra',
    description: 'Tonos tierra oscuros, acento ámbar',
    colors: {
      bg: '#18120E',
      surface: '#241A14',
      'surface-hover': '#30241C',
      border: '#3D2E22',
      text: '#FEF3C7',
      'text-muted': '#D97706',
      accent: '#F59E0B',
      'accent-hover': '#D97706',
    }
  },

  // ── CLAROS ─────────────────────────────────────────────────────────────

  lightMinimal: {
    name: 'Minimalista Claro',
    description: 'Blanco limpio y aireado',
    colors: {
      bg: '#F8FAFC',
      surface: '#FFFFFF',
      'surface-hover': '#F1F5F9',
      border: '#E2E8F0',
      text: '#0F172A',
      'text-muted': '#64748B',
      accent: '#059669',
      'accent-hover': '#047857',
    }
  },

  lightCream: {
    name: 'Crema Natural',
    description: 'Papel claro con acento esmeralda',
    colors: {
      bg: '#FAFAF7',
      surface: '#F5F5F0',
      'surface-hover': '#EEEEE8',
      border: '#D6D3CA',
      text: '#1C1917',
      'text-muted': '#78716C',
      accent: '#059669',
      'accent-hover': '#047857',
    }
  },

}

export const applyTheme = (themeName) => {
  const selectedTheme = themes[themeName] || themes.darkMinimal
  const root = document.documentElement

  Object.entries(selectedTheme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value)
  })

  localStorage.setItem('theme', themeName)
}
