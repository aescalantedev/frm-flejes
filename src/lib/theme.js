export const themes = {
  darkMinimal: {
    name: 'Minimalista Oscuro',
    colors: {
      bg: '#0F172A',
      surface: '#1E293B',
      'surface-hover': '#334155',
      border: '#334155',
      text: '#F8FAFC',
      'text-muted': '#94A3B8',
      accent: '#059669',
      'accent-hover': '#047857',
    }
  },
  lightMinimal: {
    name: 'Minimalista Claro',
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
  oceanM3: {
    name: 'Azul Material 3',
    colors: {
      bg: '#0B132B',
      surface: '#1C2541',
      'surface-hover': '#2C3E50',
      border: '#2C3E50',
      text: '#FFFFFF',
      'text-muted': '#A5B4FC',
      accent: '#3B82F6',
      'accent-hover': '#2563EB',
    }
  },
  forestM3: {
    name: 'Verde Bosque',
    colors: {
      bg: '#0D1A13',
      surface: '#162D21',
      'surface-hover': '#234633',
      border: '#234633',
      text: '#F0FDF4',
      'text-muted': '#86EFAC',
      accent: '#22C55E',
      'accent-hover': '#16A34A',
    }
  },
  nordic: {
    name: 'Nórdico Frío',
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
  warmM3: {
    name: 'Cálido Minimalista',
    colors: {
      bg: '#1C1917',
      surface: '#292524',
      'surface-hover': '#44403C',
      border: '#44403C',
      text: '#FAFAF9',
      'text-muted': '#D6D3D1',
      accent: '#F97316',
      'accent-hover': '#EA580C',
    }
  }
}

export const applyTheme = (themeName) => {
  const selectedTheme = themes[themeName] || themes.darkMinimal
  const root = document.documentElement

  Object.entries(selectedTheme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value)
  })

  localStorage.setItem('theme', themeName)
}
