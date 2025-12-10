import { Controller } from "@hotwired/stimulus"

/**
 * PrintfController
 *
 * Simulateur interactif de ft_printf
 * Parse une format string et affiche le résultat
 */
export default class extends Controller {
  static targets = ["format", "argsContainer", "parsing", "output", "charCount"]

  connect() {
    this.args = {}
    // Initialiser avec les valeurs par défaut
    this.initializeArgs()
    this.parse()
  }

  initializeArgs() {
    const format = this.formatTarget.value
    const tokens = this.tokenize(format)
    const conversions = tokens.filter(t => t.type === 'conversion')

    conversions.forEach((token, idx) => {
      if (this.args[idx] === undefined) {
        this.args[idx] = this.getPlaceholder(token.specifier)
      }
    })
  }

  parse() {
    const format = this.formatTarget.value
    const tokens = this.tokenize(format)

    // Reset args pour le nouveau format
    const conversions = tokens.filter(t => t.type === 'conversion')
    const newArgs = {}
    conversions.forEach((token, idx) => {
      newArgs[idx] = this.args[idx] !== undefined ? this.args[idx] : this.getPlaceholder(token.specifier)
    })
    this.args = newArgs

    this.renderParsing(tokens)
    this.renderArgInputs(tokens)
    this.renderOutput(tokens)
  }

  tokenize(format) {
    const tokens = []
    let i = 0
    let argIndex = 0

    while (i < format.length) {
      if (format[i] === '%' && i + 1 < format.length) {
        const specifier = format[i + 1]

        if (specifier === '%') {
          tokens.push({ type: 'escape', value: '%', raw: '%%' })
          i += 2
        } else if ('cspdiuxX'.includes(specifier)) {
          tokens.push({
            type: 'conversion',
            specifier: specifier,
            raw: '%' + specifier,
            argIndex: argIndex++
          })
          i += 2
        } else {
          tokens.push({ type: 'text', value: format[i] })
          i++
        }
      } else {
        let text = ''
        while (i < format.length && format[i] !== '%') {
          text += format[i]
          i++
        }
        if (text) {
          tokens.push({ type: 'text', value: text })
        }
      }
    }

    return tokens
  }

  renderParsing(tokens) {
    this.parsingTarget.innerHTML = tokens.map(token => {
      if (token.type === 'text') {
        return `<span class="text-gray-400 bg-dark-800 px-2 py-1 rounded">"${this.escapeHtml(token.value)}"</span>`
      } else if (token.type === 'escape') {
        return `<span class="text-purple-400 bg-dark-800 px-2 py-1 rounded">%%</span>`
      } else if (token.type === 'conversion') {
        const colors = {
          's': 'text-green-400',
          'c': 'text-yellow-400',
          'd': 'text-cyan-400',
          'i': 'text-cyan-400',
          'u': 'text-cyan-300',
          'x': 'text-purple-400',
          'X': 'text-purple-300',
          'p': 'text-pink-400'
        }
        const color = colors[token.specifier] || 'text-cyan-400'
        return `<span class="${color} bg-dark-800 px-2 py-1 rounded font-bold">${token.raw}</span>`
      }
      return ''
    }).join('')
  }

  renderArgInputs(tokens) {
    const conversions = tokens.filter(t => t.type === 'conversion')

    if (conversions.length === 0) {
      this.argsContainerTarget.innerHTML = '<span class="text-gray-500 text-sm">Aucun argument requis</span>'
      return
    }

    this.argsContainerTarget.innerHTML = conversions.map((token, idx) => {
      const currentValue = this.args[idx] !== undefined ? this.args[idx] : this.getPlaceholder(token.specifier)
      const description = this.getDescription(token.specifier)
      const colorClass = this.getColorClass(token.specifier)

      return `
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="${colorClass} font-mono text-sm font-bold">${token.raw}</span>
            <input
              type="text"
              value="${this.escapeHtml(String(currentValue))}"
              data-arg-index="${idx}"
              data-specifier="${token.specifier}"
              data-action="input->printf#updateArg"
              class="bg-dark-800 border border-dark-600 rounded px-3 py-2 text-white font-mono text-sm w-36 focus:border-neon-500 focus:outline-none transition-colors"
            >
          </div>
          <span class="text-gray-500 text-xs">${description}</span>
        </div>
      `
    }).join('')
  }

  getColorClass(specifier) {
    const colors = {
      's': 'text-green-400',
      'c': 'text-yellow-400',
      'd': 'text-cyan-400',
      'i': 'text-cyan-400',
      'u': 'text-cyan-300',
      'x': 'text-purple-400',
      'X': 'text-purple-300',
      'p': 'text-pink-400'
    }
    return colors[specifier] || 'text-cyan-400'
  }

  getDescription(specifier) {
    const descriptions = {
      's': 'string (texte)',
      'c': 'char (1 caractère)',
      'd': 'int (entier signé)',
      'i': 'int (entier signé)',
      'u': 'unsigned int',
      'x': 'hex minuscule',
      'X': 'hex majuscule',
      'p': 'pointeur (adresse)'
    }
    return descriptions[specifier] || ''
  }

  getPlaceholder(specifier) {
    const placeholders = {
      's': 'User',
      'c': 'A',
      'd': '42',
      'i': '42',
      'u': '42',
      'x': '255',
      'X': '255',
      'p': '0x7fff5fbff8c8'
    }
    return placeholders[specifier] || ''
  }

  updateArg(event) {
    const idx = parseInt(event.target.dataset.argIndex)
    this.args[idx] = event.target.value
    this.renderOutput()
  }

  renderOutput(tokens = null) {
    if (!tokens) {
      tokens = this.tokenize(this.formatTarget.value)
    }

    let output = ''
    let argIndex = 0

    tokens.forEach(token => {
      if (token.type === 'text') {
        output += token.value
      } else if (token.type === 'escape') {
        output += '%'
      } else if (token.type === 'conversion') {
        const argValue = this.args[argIndex] !== undefined ? this.args[argIndex] : ''
        output += this.formatArg(token.specifier, argValue)
        argIndex++
      }
    })

    this.outputTarget.textContent = output || '(vide)'
    this.charCountTarget.textContent = `${output.length} caractères`
  }

  formatArg(specifier, value) {
    switch (specifier) {
      case 's':
        return String(value)
      case 'c':
        return String(value).charAt(0) || ''
      case 'd':
      case 'i':
        const intVal = parseInt(value)
        return isNaN(intVal) ? '0' : intVal.toString()
      case 'u':
        const uintVal = parseInt(value)
        return isNaN(uintVal) ? '0' : Math.abs(uintVal).toString()
      case 'x':
        const hexVal = parseInt(value)
        if (isNaN(hexVal)) return '0'
        return (hexVal >= 0 ? hexVal : (0xFFFFFFFF + hexVal + 1)).toString(16)
      case 'X':
        const hexValUpper = parseInt(value)
        if (isNaN(hexValUpper)) return '0'
        return (hexValUpper >= 0 ? hexValUpper : (0xFFFFFFFF + hexValUpper + 1)).toString(16).toUpperCase()
      case 'p':
        if (String(value).startsWith('0x')) return value
        return '0x' + value
      default:
        return String(value)
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Exemples prédéfinis
  example1() {
    this.args = {}
    this.formatTarget.value = "Bonjour %s ! Tu as %d nouveaux messages."
    this.args = { 0: 'Greg', 1: '5' }
    this.parse()
  }

  example2() {
    this.args = {}
    this.formatTarget.value = "Couleur: #%x%x%x (RGB: %d, %d, %d)"
    this.args = { 0: '255', 1: '128', 2: '0', 3: '255', 4: '128', 5: '0' }
    this.parse()
  }

  example3() {
    this.args = {}
    this.formatTarget.value = "Variable a l'adresse %p contient la valeur %d"
    this.args = { 0: '0x7fff5fbff8c8', 1: '42' }
    this.parse()
  }

  example4() {
    this.args = {}
    this.formatTarget.value = "Joueur %s (#%d): Score %u, Niveau %x, Badge: %c"
    this.args = { 0: 'Player1', 1: '1337', 2: '9500', 3: '15', 4: 'S' }
    this.parse()
  }
}
