import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["icon"]

  connect() {
    this.initializeTheme()
    this.updateIcons()
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'light' || (!savedTheme && !prefersDark)) {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }

  toggle() {
    const html = document.documentElement
    const isDark = html.classList.contains('dark')

    if (isDark) {
      html.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      html.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }

    this.updateIcons()
    this.dispatchThemeChange(isDark ? 'light' : 'dark')
  }

  updateIcons() {
    const isDark = document.documentElement.classList.contains('dark')
    const sunPath = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    const moonPath = "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"

    // Chercher toutes les icônes dans le DOM (pas seulement les targets)
    document.querySelectorAll('[data-theme-target="icon"]').forEach(icon => {
      icon.setAttribute('d', isDark ? sunPath : moonPath)
    })
  }

  dispatchThemeChange(theme) {
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }))
  }
}
