import { Controller } from "@hotwired/stimulus"

/**
 * PushswapController
 *
 * Visualizer pour l'algorithme push_swap.
 * Reproduit ton algo C et anime le tri visuellement.
 */
export default class extends Controller {
  static targets = ["canvas", "opCount", "status"]
  static values = { speed: { type: Number, default: 200 } }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  connect() {
    // État initial
    this.stackA = []
    this.stackB = []
    this.operations = []
    this.currentOp = 0
    this.isPlaying = false
    this.timeoutId = null
    this.originalValues = []

    // Setup canvas puis génération initiale (sans auto-play)
    this.setupCanvas()
    this.generate(100)
  }

  disconnect() {
    this.pause()
  }

  setupCanvas() {
    const canvas = this.canvasTarget
    const rect = canvas.getBoundingClientRect()

    // Support écrans Retina (devicePixelRatio)
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    // Garde la taille CSS
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    this.ctx = canvas.getContext('2d')
    this.ctx.scale(dpr, dpr)

    // Stocke les dimensions CSS pour le dessin
    this.canvasWidth = rect.width
    this.canvasHeight = rect.height
  }

  // ============================================================
  // GÉNÉRATION
  // ============================================================

  generate(count) {

    // Stop l'animation en cours
    this.pause()
    this.currentOp = 0

    // Crée et mélange les valeurs
    const values = Array.from({ length: count }, (_, i) => i + 1)
    this.shuffle(values)

    // Sauvegarde les valeurs originales
    this.originalValues = [...values]

    // Résout le tri (calcule les opérations)
    this.solveAndRecord(values)


    // Réinitialise les stacks pour la visualisation
    this.resetStacks()

    // Affiche
    this.updateStatus()
    this.draw()
  }

  generate3() { this.generate(3) }
  generate5() { this.generate(5) }
  generate10() { this.generate(10) }
  generate100() { this.generate(100) }
  generate500() { this.generate(500) }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]
    }
  }

  // Réinitialise les stacks avec les valeurs originales (sans toucher aux opérations)
  resetStacks() {
    this.stackA = this.originalValues.map(value => ({
      value,
      index: value - 1
    }))
    this.stackB = []
    this.currentOp = 0
  }

  // ============================================================
  // ALGORITHME PUSH_SWAP
  // ============================================================

  solveAndRecord(values) {
    // Initialise les stacks de travail
    this.stackA = values.map(value => ({ value, index: value - 1 }))
    this.stackB = []
    this.operations = []

    // Déjà trié ?
    if (this.isSorted()) return

    const size = this.stackA.length

    if (size === 2) {
      this.op_sa()
    } else if (size === 3) {
      this.sortThree()
    } else if (size <= 5) {
      this.littleSort()
    } else {
      const range = size <= 100 ? 15 : 35
      this.bigSort(range)
      this.finalSort()
    }
  }

  isSorted() {
    for (let i = 0; i < this.stackA.length - 1; i++) {
      if (this.stackA[i].index > this.stackA[i + 1].index) return false
    }
    return true
  }

  sortThree() {
    const a = this.stackA[0].index
    const b = this.stackA[1].index
    const c = this.stackA[2].index

    if (a < b && b < c) return
    if (a < c && b > c) { this.op_sa(); this.op_ra() }
    else if (a > b && a < c) { this.op_sa() }
    else if (a > b && b > c) { this.op_sa(); this.op_rra() }
    else if (a > b && a > c && b < c) { this.op_ra() }
    else { this.op_rra() }
  }

  littleSort() {
    while (this.stackB.length < 2) {
      if (this.stackA[0].index <= 1) {
        this.op_pb()
      } else {
        this.op_ra()
      }
    }

    if (this.stackA.length === 3) {
      this.sortThree()
    } else if (this.stackA.length >= 2 && this.stackA[0].index > this.stackA[1].index) {
      this.op_sa()
    }

    if (this.stackB.length >= 2 && this.stackB[0].index < this.stackB[1].index) {
      this.op_sb()
    }

    this.op_pa()
    this.op_pa()
  }

  bigSort(range) {
    let i = 0
    const total = this.stackA.length

    while (this.stackA.length > 0) {
      if (this.stackA[0].index <= i) {
        this.op_pb()
        i++
      } else if (this.stackA[0].index <= i + range) {
        this.op_pb()
        this.op_rb()
        i++
      } else {
        this.op_ra()
      }
    }
  }

  finalSort() {
    while (this.stackB.length > 0) {
      const maxIdx = Math.max(...this.stackB.map(el => el.index))
      const pos = this.stackB.findIndex(el => el.index === maxIdx)

      if (pos === 0) {
        this.op_pa()
      } else if (pos <= this.stackB.length / 2) {
        this.op_rb()
      } else {
        this.op_rrb()
      }
    }
  }

  // ============================================================
  // OPÉRATIONS (enregistrent dans this.operations)
  // ============================================================

  op_sa() {
    if (this.stackA.length < 2) return
    ;[this.stackA[0], this.stackA[1]] = [this.stackA[1], this.stackA[0]]
    this.operations.push('sa')
  }

  op_sb() {
    if (this.stackB.length < 2) return
    ;[this.stackB[0], this.stackB[1]] = [this.stackB[1], this.stackB[0]]
    this.operations.push('sb')
  }

  op_pa() {
    if (this.stackB.length < 1) return
    this.stackA.unshift(this.stackB.shift())
    this.operations.push('pa')
  }

  op_pb() {
    if (this.stackA.length < 1) return
    this.stackB.unshift(this.stackA.shift())
    this.operations.push('pb')
  }

  op_ra() {
    if (this.stackA.length < 2) return
    this.stackA.push(this.stackA.shift())
    this.operations.push('ra')
  }

  op_rb() {
    if (this.stackB.length < 2) return
    this.stackB.push(this.stackB.shift())
    this.operations.push('rb')
  }

  op_rra() {
    if (this.stackA.length < 2) return
    this.stackA.unshift(this.stackA.pop())
    this.operations.push('rra')
  }

  op_rrb() {
    if (this.stackB.length < 2) return
    this.stackB.unshift(this.stackB.pop())
    this.operations.push('rrb')
  }

  // ============================================================
  // EXÉCUTION DES OPÉRATIONS (pour la visualisation)
  // ============================================================

  execOp(op) {
    switch(op) {
      case 'sa':
        if (this.stackA.length >= 2)
          [this.stackA[0], this.stackA[1]] = [this.stackA[1], this.stackA[0]]
        break
      case 'sb':
        if (this.stackB.length >= 2)
          [this.stackB[0], this.stackB[1]] = [this.stackB[1], this.stackB[0]]
        break
      case 'pa':
        if (this.stackB.length >= 1)
          this.stackA.unshift(this.stackB.shift())
        break
      case 'pb':
        if (this.stackA.length >= 1)
          this.stackB.unshift(this.stackA.shift())
        break
      case 'ra':
        if (this.stackA.length >= 2)
          this.stackA.push(this.stackA.shift())
        break
      case 'rb':
        if (this.stackB.length >= 2)
          this.stackB.push(this.stackB.shift())
        break
      case 'rra':
        if (this.stackA.length >= 2)
          this.stackA.unshift(this.stackA.pop())
        break
      case 'rrb':
        if (this.stackB.length >= 2)
          this.stackB.unshift(this.stackB.pop())
        break
    }
  }

  // ============================================================
  // CONTRÔLES
  // ============================================================

  play() {
    if (this.isPlaying) return
    this.isPlaying = true
    this.animate()
  }

  pause() {
    this.isPlaying = false
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  stop() {
    this.pause()
    this.resetStacks()
    this.updateStatus()
    this.draw()
  }

  step() {
    if (this.currentOp < this.operations.length) {
      this.execOp(this.operations[this.currentOp])
      this.currentOp++
      this.updateStatus()
      this.draw()
    }
  }

  stepBack() {
    // Pour reculer, on reset et on rejoue jusqu'à currentOp - 1
    if (this.currentOp > 0) {
      const targetOp = this.currentOp - 1
      this.resetStacks()
      for (let i = 0; i < targetOp; i++) {
        this.execOp(this.operations[i])
      }
      this.currentOp = targetOp
      this.updateStatus()
      this.draw()
    }
  }

  setSpeed(event) {
    this.speedValue = parseInt(event.target.value)
  }

  animate() {
    if (!this.isPlaying) return

    if (this.currentOp < this.operations.length) {
      this.execOp(this.operations[this.currentOp])
      this.currentOp++
      this.updateStatus()
      this.draw()

      const delay = 1000 / this.speedValue
      this.timeoutId = setTimeout(() => this.animate(), delay)
    } else {
      // Animation terminée
      this.isPlaying = false
    }
  }

  updateStatus() {
    if (this.hasOpCountTarget) {
      this.opCountTarget.textContent = `${this.currentOp} / ${this.operations.length} opérations`
    }
    if (this.hasStatusTarget) {
      const done = this.currentOp === this.operations.length && this.operations.length > 0
      this.statusTarget.textContent = done ? 'Trié !' : ''
    }
  }

  // ============================================================
  // DESSIN
  // ============================================================

  draw() {
    const ctx = this.ctx

    if (!ctx) {
      console.error("Pas de contexte canvas!")
      return
    }

    const totalCount = this.stackA.length + this.stackB.length
    if (totalCount === 0) {
      return
    }

    const width = this.canvasWidth
    const height = this.canvasHeight

    // Clear - fond transparent pour glass-card
    ctx.fillStyle = 'rgba(3, 3, 3, 0.8)'
    ctx.fillRect(0, 0, width, height)

    const halfWidth = width / 2
    const padding = 20
    const labelSpace = 30
    const barHeight = Math.max(2, (height - labelSpace) / totalCount)
    const gap = Math.min(1, barHeight * 0.1)
    const actualBarHeight = barHeight - gap
    const maxBarWidth = halfWidth - padding * 2

    // Stack A (gauche)
    this.stackA.forEach((el, i) => {
      const barWidth = ((el.index + 1) / totalCount) * maxBarWidth
      const y = i * barHeight
      this.drawBar(ctx, padding, y, barWidth, actualBarHeight, el.index / totalCount)
    })

    // Stack B (droite)
    this.stackB.forEach((el, i) => {
      const barWidth = ((el.index + 1) / totalCount) * maxBarWidth
      const y = i * barHeight
      this.drawBar(ctx, halfWidth + padding, y, barWidth, actualBarHeight, el.index / totalCount)
    })

    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '500 13px system-ui, -apple-system, sans-serif'
    ctx.fillText('Stack A', padding, height - 10)
    ctx.fillText('Stack B', halfWidth + padding, height - 10)

    // Ligne centrale avec dégradé néon
    const gradient = ctx.createLinearGradient(halfWidth, 0, halfWidth, height)
    gradient.addColorStop(0, 'rgba(0, 200, 255, 0)')
    gradient.addColorStop(0.1, 'rgba(0, 200, 255, 0.4)')
    gradient.addColorStop(0.5, 'rgba(0, 200, 255, 0.6)')
    gradient.addColorStop(0.9, 'rgba(0, 200, 255, 0.4)')
    gradient.addColorStop(1, 'rgba(0, 200, 255, 0)')
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(halfWidth, 0)
    ctx.lineTo(halfWidth, height)
    ctx.stroke()
  }

  drawBar(ctx, x, y, width, height, ratio) {
    const radius = Math.min(3, height / 2)
    const color = this.getColor(ratio)

    // Ombre subtile
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.roundRect(x + 1, y + 1, width, height, radius)
    ctx.fill()

    // Barre principale avec dégradé
    const gradient = ctx.createLinearGradient(x, y, x, y + height)
    gradient.addColorStop(0, this.lightenColor(color, 20))
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, this.darkenColor(color, 10))

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, radius)
    ctx.fill()

    // Reflet en haut
    if (height > 4) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.beginPath()
      ctx.roundRect(x, y, width, height * 0.4, radius)
      ctx.fill()
    }
  }

  getColor(ratio) {
    // Dégradé néon : cyan (#00c8ff) -> bleu plus profond
    // Petites barres = cyan clair, grandes barres = cyan foncé/violet
    const hue = 190 - ratio * 30  // 190 (cyan) -> 160 (turquoise)
    const saturation = 85 + ratio * 15
    const lightness = 60 - ratio * 15  // Plus clair pour petites valeurs
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  lightenColor(color, percent) {
    // Extrait HSL et augmente la luminosité
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (match) {
      const h = match[1]
      const s = match[2]
      const l = Math.min(100, parseInt(match[3]) + percent)
      return `hsl(${h}, ${s}%, ${l}%)`
    }
    return color
  }

  darkenColor(color, percent) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (match) {
      const h = match[1]
      const s = match[2]
      const l = Math.max(0, parseInt(match[3]) - percent)
      return `hsl(${h}, ${s}%, ${l}%)`
    }
    return color
  }
}
