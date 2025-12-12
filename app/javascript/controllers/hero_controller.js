import { Controller } from "@hotwired/stimulus"

/**
 * HeroController
 *
 * Crée un effet de particules connectées (constellation/réseau)
 * avec animations GSAP au scroll.
 * Optimisé pour le FCP : canvas différé, GSAP chargé dynamiquement
 */
export default class extends Controller {
  static targets = ["canvas", "avatar", "title", "subtitle", "cta"]

  connect() {
    this.particles = []
    this.waves = []
    this.mouse = { x: null, y: null, radius: 150 }
    this.animationId = null
    this.lastTime = 0
    this.gsap = null

    // Charger GSAP dynamiquement et animer l'entrée immédiatement
    this.loadGsapAndAnimate()

    // Différer l'initialisation du canvas pour améliorer le FCP
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.initCanvas(), { timeout: 200 })
    } else {
      setTimeout(() => this.initCanvas(), 100)
    }

    window.addEventListener('resize', this.handleResize.bind(this))
  }

  async loadGsapAndAnimate() {
    const { default: gsap } = await import('gsap')
    this.gsap = gsap
    this.animateEntrance()
  }

  initCanvas() {
    this.setupCanvas()
    this.createParticles()
    this.setupMouseTracking()
    this.setupClickWave()

    // Démarre l'animation avec requestAnimationFrame
    requestAnimationFrame((time) => {
      this.lastTime = time
      this.animate(time)
    })
  }

  disconnect() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    window.removeEventListener('resize', this.handleResize.bind(this))
  }

  setupCanvas() {
    const canvas = this.canvasTarget
    const dpr = window.devicePixelRatio || 1

    this.width = window.innerWidth
    this.height = window.innerHeight

    canvas.width = this.width * dpr
    canvas.height = this.height * dpr
    canvas.style.width = `${this.width}px`
    canvas.style.height = `${this.height}px`

    this.ctx = canvas.getContext('2d')
    this.ctx.scale(dpr, dpr)
  }

  handleResize() {
    const newWidth = window.innerWidth
    const newHeight = window.innerHeight

    // Sur mobile, ignorer les petits changements de hauteur (barre d'adresse qui apparaît/disparaît)
    const widthChanged = Math.abs(newWidth - this.width) > 50
    const heightOnlyChanged = !widthChanged && Math.abs(newHeight - this.height) > 100

    // Rotation d'écran ou changement de largeur significatif = tout recréer
    if (widthChanged) {
      this.setupCanvas()
      this.particles = []
      this.createParticles()
    }
    // Changement de hauteur seul (barre d'adresse mobile) = juste ajuster le canvas
    else if (heightOnlyChanged) {
      const canvas = this.canvasTarget
      const dpr = window.devicePixelRatio || 1
      this.height = newHeight
      canvas.height = this.height * dpr
      canvas.style.height = `${this.height}px`
      // Repositionner les particules qui seraient hors limites
      this.particles.forEach(p => {
        if (p.y > this.height) p.y = this.height - 10
      })
    }
    // Sinon: petit changement = ignorer complètement
  }

  createParticles() {
    // Nombre de particules basé sur la taille de l'écran
    // Réduit sur mobile pour améliorer les performances
    const isMobile = this.width < 768
    const divisor = isMobile ? 8000 : 15000
    const particleCount = Math.max(isMobile ? 35 : 40, Math.floor((this.width * this.height) / divisor))

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        // Vitesses en pixels par seconde (à 60 FPS, 0.5 * 60 = 30 pixels/sec)
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      })
    }
  }

  setupMouseTracking() {
    // On écoute directement sur la SECTION hero (le parent du canvas)
    const heroSection = this.element  // La section avec data-controller="hero"

    heroSection.addEventListener('mousemove', (e) => {
      // Position relative à la section hero
      const rect = heroSection.getBoundingClientRect()
      this.mouse.x = e.clientX - rect.left
      this.mouse.y = e.clientY - rect.top
    })

    heroSection.addEventListener('mouseleave', () => {
      this.mouse.x = null
      this.mouse.y = null
    })
  }

  // ============================================================
  // ONDE DE CLIC
  // ============================================================

  setupClickWave() {
    const heroSection = this.element

    heroSection.addEventListener('click', (e) => {
      // Calcule la position du clic relative à la section
      const rect = heroSection.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Crée une nouvelle onde à cette position
      // Taille réduite sur mobile uniquement
      const isMobile = this.width < 768
      this.waves.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: isMobile ? 150 : 300,
        opacity: 0.4,
        speed: isMobile ? 80 : 120
      })
    })
  }

  updateWaves(deltaTime) {
    // Parcourt toutes les ondes actives
    this.waves.forEach((wave, index) => {
      // Fait grandir le rayon (vitesse * temps écoulé)
      wave.radius += wave.speed * deltaTime

      // Diminue l'opacité proportionnellement à l'expansion
      // Plus l'onde est grande, plus elle est transparente
      wave.opacity = 0.6 * (1 - wave.radius / wave.maxRadius)

      // Pousse les particules sur le passage de l'onde
      this.particles.forEach(particle => {
        // Distance entre la particule et le centre de l'onde
        const dx = particle.x - wave.x
        const dy = particle.y - wave.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // L'onde a une "épaisseur" de 30px
        // Si la particule est sur le bord de l'onde (pas au centre, pas à l'extérieur)
        const waveThickness = 30
        if (dist > wave.radius - waveThickness && dist < wave.radius + waveThickness) {
          // Calcule la force de poussée (plus forte au centre de l'épaisseur)
          const distFromWaveEdge = Math.abs(dist - wave.radius)
          const force = (1 - distFromWaveEdge / waveThickness) * 30  // 30 pixels/sec de force max

          // Pousse la particule vers l'extérieur (direction = du centre vers la particule)
          const angle = Math.atan2(dy, dx)
          particle.x += Math.cos(angle) * force * deltaTime
          particle.y += Math.sin(angle) * force * deltaTime
        }
      })

      // Supprime l'onde si elle a atteint son rayon max
      if (wave.radius >= wave.maxRadius) {
        this.waves.splice(index, 1)
      }
    })
  }

  drawWaves() {
    // Dessine chaque onde active
    this.waves.forEach(wave => {
      // Cercle principal de l'onde
      this.ctx.beginPath()
      this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(0, 200, 255, ${wave.opacity})`
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Glow de l'onde
      this.ctx.beginPath()
      this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(0, 200, 255, ${wave.opacity * 0.3})`
      this.ctx.lineWidth = 6
      this.ctx.stroke()

      // Connecte les particules proches de l'onde au bord du cercle
      const waveThickness = 180  // Zone de connexion
      this.particles.forEach(particle => {
        const dx = particle.x - wave.x
        const dy = particle.y - wave.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Si la particule est proche du bord de l'onde
        if (dist > wave.radius - waveThickness && dist < wave.radius + waveThickness) {
          // Opacité basée sur la distance au bord de l'onde
          const distFromWaveEdge = Math.abs(dist - wave.radius)
          const lineOpacity = (1 - distFromWaveEdge / waveThickness) * wave.opacity * 0.8

          // Calcule le point sur le cercle le plus proche de la particule
          // C'est le point sur le cercle dans la direction de la particule
          const angle = Math.atan2(dy, dx)
          const pointOnCircleX = wave.x + Math.cos(angle) * wave.radius
          const pointOnCircleY = wave.y + Math.sin(angle) * wave.radius

          // Ligne de la particule vers le bord du cercle
          this.ctx.beginPath()
          this.ctx.moveTo(particle.x, particle.y)
          this.ctx.lineTo(pointOnCircleX, pointOnCircleY)
          this.ctx.strokeStyle = `rgba(0, 200, 255, ${lineOpacity})`
          this.ctx.lineWidth = 1
          this.ctx.stroke()
        }
      })
    })
  }

  animate(currentTime) {
    // Calcul du delta time en secondes
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    // Protection contre les deltas trop grands (ex: onglet inactif)
    const safeDelta = Math.min(deltaTime, 0.1)

    this.ctx.clearRect(0, 0, this.width, this.height)

    // Update et draw les ondes de clic
    this.updateWaves(safeDelta)
    this.drawWaves()

    // Update et draw particles
    this.particles.forEach((particle, i) => {
      // Mouvement (vitesse * temps = distance)
      particle.x += particle.vx * safeDelta
      particle.y += particle.vy * safeDelta

      // Rebond sur les bords
      if (particle.x < 0 || particle.x > this.width) particle.vx *= -1
      if (particle.y < 0 || particle.y > this.height) particle.vy *= -1

      // Interaction souris
      if (this.mouse.x !== null) {
        const dx = particle.x - this.mouse.x
        const dy = particle.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius
          // Force de répulsion : 60 pixels/sec max
          particle.x += dx * force * 1.2 * safeDelta
          particle.y += dy * force * 1.2 * safeDelta
        }
      }

      // Draw particle
      this.ctx.beginPath()
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(0, 200, 255, ${particle.opacity})`
      this.ctx.fill()

      // Connecter les particules proches
      for (let j = i + 1; j < this.particles.length; j++) {
        const other = this.particles[j]
        const dx = particle.x - other.x
        const dy = particle.y - other.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 120) {
          const opacity = (1 - dist / 120) * 0.3
          this.ctx.beginPath()
          this.ctx.moveTo(particle.x, particle.y)
          this.ctx.lineTo(other.x, other.y)
          this.ctx.strokeStyle = `rgba(0, 200, 255, ${opacity})`
          this.ctx.lineWidth = 0.5
          this.ctx.stroke()
        }
      }

      // Connecter à la souris
      if (this.mouse.x !== null) {
        const dx = particle.x - this.mouse.x
        const dy = particle.y - this.mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < this.mouse.radius) {
          const opacity = (1 - dist / this.mouse.radius) * 0.5
          this.ctx.beginPath()
          this.ctx.moveTo(particle.x, particle.y)
          this.ctx.lineTo(this.mouse.x, this.mouse.y)
          this.ctx.strokeStyle = `rgba(0, 200, 255, ${opacity})`
          this.ctx.lineWidth = 0.8
          this.ctx.stroke()
        }
      }
    })

    this.animationId = requestAnimationFrame((time) => this.animate(time))
  }

  animateEntrance() {
    if (!this.gsap) return
    const gsap = this.gsap
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

    // Fade in du canvas
    tl.fromTo(this.canvasTarget,
      { opacity: 0 },
      { opacity: 1, duration: 1 }
    )

    // Avatar
    if (this.hasAvatarTarget) {
      tl.fromTo(this.avatarTarget,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" },
        "-=0.5"
      )
    }

    // Titre
    if (this.hasTitleTarget) {
      tl.fromTo(this.titleTarget,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        "-=0.5"
      )
    }

    // Sous-titre
    if (this.hasSubtitleTarget) {
      tl.fromTo(this.subtitleTarget,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.4"
      )
    }

    // CTA buttons
    if (this.hasCtaTarget) {
      tl.fromTo(this.ctaTarget,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 },
        "-=0.2"
      )
    }
  }
}
