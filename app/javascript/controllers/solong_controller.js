import { Controller } from "@hotwired/stimulus"

/**
 * SolongController
 * ================
 *
 * Mini-jeu so_long jouable dans le navigateur.
 * Respecte les règles du projet 42 + mode bonus avec ennemi.
 *
 * ARCHITECTURE:
 * - Le jeu utilise une grille 2D (tableau de strings)
 * - Chaque cellule contient: '0' (sol), '1' (mur), 'C' (collectible), 'E' (sortie), 'P' (spawn joueur)
 * - Le rendu se fait sur un Canvas avec requestAnimationFrame pour les animations
 * - L'ennemi (mode bonus) utilise un algorithme de poursuite simple
 *
 * GAME LOOP:
 * 1. animate() est appelé ~60 fois/seconde
 * 2. updateEnemy() déplace l'ennemi vers le joueur
 * 3. checkCollision() vérifie si l'ennemi touche le joueur
 * 4. draw() redessine tout le canvas
 */
export default class extends Controller {
  static targets = ["canvas", "moves", "collectibles", "status", "bonusToggle"]

  connect() {
    this.setupCanvas()
    this.bonusEnabled = false  // Mode bonus désactivé par défaut
    this.particles = []        // Système de particules pour les effets
    this.lastTime = 0          // Pour le delta time
    this.loadMap1()
    this.bindKeys()
    this.bindTouch()

    // Démarre l'animation avec le timestamp
    requestAnimationFrame((time) => {
      this.lastTime = time
      this.animate(time)
    })
  }

  disconnect() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  // ============================================================
  // SETUP CANVAS
  // ============================================================
  // On utilise devicePixelRatio pour avoir un rendu net sur écrans Retina
  // Le canvas interne est plus grand que le canvas CSS pour éviter le flou

  setupCanvas() {
    const canvas = this.canvasTarget
    const container = canvas.parentElement
    const dpr = window.devicePixelRatio || 1

    this.width = container.clientWidth
    this.height = container.clientHeight

    // Canvas interne plus grand (x dpr) pour la netteté
    canvas.width = this.width * dpr
    canvas.height = this.height * dpr
    canvas.style.width = `${this.width}px`
    canvas.style.height = `${this.height}px`

    this.ctx = canvas.getContext('2d')
    this.ctx.scale(dpr, dpr)  // On scale le contexte pour dessiner en coordonnées "normales"
  }

  bindKeys() {
    this.handleKeyDown = this.onKeyDown.bind(this)
    document.addEventListener('keydown', this.handleKeyDown)
  }

  // ============================================================
  // CONTROLES TACTILES (MOBILE) - D-PAD
  // ============================================================
  // Boutons directionnels pour mobile avec effet hold (répétition)

  bindTouch() {
    this.holdInterval = null
    this.holdDelay = 150  // Délai initial avant répétition (ms)
    this.holdSpeed = 80   // Vitesse de répétition (ms)
  }

  // Démarre le mouvement continu (appelé sur mousedown/touchstart)
  startMove(direction) {
    if (this.gameOver) return

    // Premier mouvement immédiat
    this.executeMove(direction)

    // Délai avant de commencer la répétition
    this.holdTimeout = setTimeout(() => {
      // Répétition continue
      this.holdInterval = setInterval(() => {
        if (!this.gameOver) {
          this.executeMove(direction)
        } else {
          this.stopMove()
        }
      }, this.holdSpeed)
    }, this.holdDelay)
  }

  // Arrête le mouvement continu (appelé sur mouseup/touchend/mouseleave)
  stopMove() {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout)
      this.holdTimeout = null
    }
    if (this.holdInterval) {
      clearInterval(this.holdInterval)
      this.holdInterval = null
    }
  }

  // Exécute un mouvement selon la direction
  executeMove(direction) {
    switch (direction) {
      case 'up':
        this.movePlayer(0, -1)
        break
      case 'down':
        this.movePlayer(0, 1)
        break
      case 'left':
        this.movePlayer(-1, 0)
        break
      case 'right':
        this.movePlayer(1, 0)
        break
    }
  }

  // Actions pour le D-pad avec hold
  startMoveUp(e) {
    e.preventDefault()
    this.startMove('up')
  }

  startMoveDown(e) {
    e.preventDefault()
    this.startMove('down')
  }

  startMoveLeft(e) {
    e.preventDefault()
    this.startMove('left')
  }

  startMoveRight(e) {
    e.preventDefault()
    this.startMove('right')
  }

  // ============================================================
  // TOGGLE BONUS
  // ============================================================
  // Active/désactive le mode bonus (ennemi)
  // Redémarre la partie pour appliquer le changement

  toggleBonus() {
    this.bonusEnabled = !this.bonusEnabled

    // Met à jour le visuel du toggle
    if (this.hasBonusToggleTarget) {
      this.bonusToggleTarget.classList.toggle('active', this.bonusEnabled)
    }

    // Redémarre avec la map actuelle
    this.initGame()
  }

  // ============================================================
  // MAPS
  // ============================================================
  // Format: string[] où chaque string est une ligne
  // 1 = mur, 0 = sol, P = spawn joueur, C = collectible, E = sortie
  // Les maps DOIVENT être fermées par des murs (règle so_long)

  loadMap1() {
    // Map 1: "Éveil" - Découverte
    // Simple, linéaire, pour apprendre les contrôles
    // L'ennemi spawn loin du joueur avec un chemin prévisible
    this.currentMap = 'eveil'
    this.map = [
      "1111111111111",
      "1P0000C000001",
      "1011111111101",
      "10C0000000C01",
      "1011111111101",
      "1000000000E01",
      "1111111111111"
    ]
    this.enemySpawn = { x: 11, y: 5 }  // Spawn ennemi loin du joueur
    this.initGame()
  }

  loadMap2() {
    // Map 2: "Carrefour" - Choix multiples
    // Plusieurs chemins possibles, l'ennemi doit contourner
    this.currentMap = 'carrefour'
    this.map = [
      "1111111111111111",
      "1P000010000C0001",
      "1011101011101C01",
      "10C0101000101C01",
      "1010101110101E01",
      "1010C00000101001",
      "1011111110C01011",
      "1000000000011111",
      "1111111111111111"
    ]
    this.enemySpawn = { x: 13, y: 7 }
    this.initGame()
  }

  loadMap3() {
    // Map 3: "Labyrinthe" - Perdez-vous
    // Plus grand, plus de collectibles, ennemi plus menaçant
    this.currentMap = 'labyrinthe'
    this.map = [
      "1111111111111111111",
      "1P00000000C00000001",
      "1011110101111011101",
      "10C0010100000010001",
      "1011010111111010111",
      "1000010C000000000C1",
      "1110111111101111101",
      "1C00000000100000101",
      "1011111110101110001",
      "100C000000000C00E01",
      "1111111111111111111"
    ]
    this.enemySpawn = { x: 17, y: 2 }
    this.initGame()
  }

  loadMap4() {
    // Map 4: "Nexus" - Croix centrale, chemins multiples
    this.currentMap = 'nexus'
    this.map = [
      "111111111111111",
      "1C0000100000001",
      "101110101011101",
      "101000101000101",
      "10100010100C101",
      "101C1110111C101",
      "100000000000001",
      "1P1111E11111001",
      "100000000000001",
      "101C1110111C101",
      "101000101000101",
      "101110101011101",
      "1C0000100000C01",
      "111111111111111"
    ]
    this.enemySpawn = { x: 13, y: 12 }
    this.initGame()
  }

  loadMap5() {
    // Map 5: "Enfer" - Couloirs étroits, peu d'échappatoires !
    this.currentMap = 'enfer'
    this.map = [
      "1111111111111111111",
      "1P000C0CC10000000C1",
      "1C01011101011101C01",
      "1001010001010001001",
      "1101010C01010C01001",
      "1001010101010101011",
      "1011010101010101001",
      "1C00010101000101011",
      "1011110101110101001",
      "1000000100010001011",
      "1011110101110100001",
      "1C00000100000000E01",
      "1111111111111111111"
    ]
    this.enemySpawn = { x: 17, y: 11 }
    this.initGame()
  }

  // ============================================================
  // INITIALISATION DU JEU
  // ============================================================

  initGame() {
    this.moves = 0
    this.collected = 0
    this.totalCollectibles = 0
    this.gameOver = false
    this.won = false
    this.lost = false
    this.exitOpen = false
    this.deathAnimation = null   // Pour l'animation d'aspiration (mort)
    this.victoryAnimation = null // Pour l'animation de victoire
    this.particles = []          // Particules pour effets visuels

    // Parse la map pour extraire les positions
    this.grid = []
    this.player = { x: 0, y: 0 }
    this.exit = { x: 0, y: 0 }
    this.collectibles = []

    for (let y = 0; y < this.map.length; y++) {
      this.grid[y] = []
      for (let x = 0; x < this.map[y].length; x++) {
        const char = this.map[y][x]
        this.grid[y][x] = char

        if (char === 'P') {
          this.player = { x, y }
          this.grid[y][x] = '0'  // Le joueur est sur du sol
        } else if (char === 'E') {
          this.exit = { x, y }
        } else if (char === 'C') {
          this.collectibles.push({ x, y, collected: false })
          this.totalCollectibles++
        }
      }
    }

    // Calcule la taille des cellules pour centrer la map
    this.cols = this.map[0].length
    this.rows = this.map.length

    // Initialise l'ennemi si bonus activé
    // Vitesse adaptée à la taille de la map : plus la map est grande, plus l'ennemi est rapide
    // Les vitesses sont maintenant en CASES PAR SECONDE (pas par frame)
    if (this.bonusEnabled && this.enemySpawn) {
      const mapSize = this.cols * this.rows
      // Base speed: ~1.2 cases/sec pour petites maps, ~2.1 cases/sec pour grandes maps
      const baseSpeed = (0.02 + (mapSize / 300) * 0.015) * 60
      // Max speed réduit : ~1.8 cases/sec pour petites maps, ~3 cases/sec pour grandes maps
      const maxSpeed = (0.03 + (mapSize / 300) * 0.02) * 60

      this.enemy = {
        x: this.enemySpawn.x,
        y: this.enemySpawn.y,
        // Position en pixels pour mouvement fluide (pas case par case)
        px: this.enemySpawn.x,
        py: this.enemySpawn.y,
        speed: baseSpeed,
        baseSpeed: baseSpeed,
        maxSpeed: maxSpeed,
        speedIncrement: 0.001 * 60,  // Incrément par mouvement du joueur (en cases/sec)
        trail: []           // Historique des positions pour la "queue"
      }
    } else {
      this.enemy = null
    }

    this.cellSize = Math.min(
      (this.width - 40) / this.cols,
      (this.height - 40) / this.rows
    )

    // Offset pour centrer la map dans le canvas
    this.offsetX = (this.width - this.cols * this.cellSize) / 2
    this.offsetY = (this.height - this.rows * this.cellSize) / 2

    this.updateUI()
    this.statusTarget.textContent = ""
    this.statusTarget.className = "text-sm font-medium"

    this.time = 0  // Temps pour les animations
  }

  restart() {
    this.initGame()
  }

  // ============================================================
  // GAME LOGIC - DÉPLACEMENT JOUEUR
  // ============================================================

  onKeyDown(e) {
    if (this.gameOver) return

    let dx = 0, dy = 0

    switch (e.key) {
      case 'ArrowUp':
      case 'z':
      case 'Z':
        dy = -1
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        dy = 1
        break
      case 'ArrowLeft':
      case 'q':
      case 'Q':
        dx = -1
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        dx = 1
        break
      default:
        return
    }

    e.preventDefault()
    this.movePlayer(dx, dy)
  }

  movePlayer(dx, dy) {
    const newX = this.player.x + dx
    const newY = this.player.y + dy

    // Vérifie les limites
    if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
      return
    }

    // Vérifie les murs
    if (this.grid[newY][newX] === '1') {
      return
    }

    // Vérifie la sortie
    if (this.grid[newY][newX] === 'E') {
      if (this.collected < this.totalCollectibles) {
        return  // Pas encore tous les collectibles
      }
      // Victoire ! Lance l'animation
      this.player.x = newX
      this.player.y = newY
      this.moves++
      this.gameOver = true
      this.won = true
      this.updateUI()
      this.startVictoryAnimation()
      return
    }

    // Déplacement valide
    this.player.x = newX
    this.player.y = newY
    this.moves++

    // Vérifie collectible
    const collectible = this.collectibles.find(
      c => c.x === newX && c.y === newY && !c.collected
    )
    if (collectible) {
      collectible.collected = true
      this.collected++
      this.grid[newY][newX] = '0'

      // Explosion de particules dorées !
      this.spawnCollectParticles(newX, newY)

      if (this.collected === this.totalCollectibles) {
        this.exitOpen = true
      }
    }

    // Augmente la vitesse de l'ennemi à chaque mouvement
    if (this.enemy) {
      this.enemy.speed = Math.min(
        this.enemy.maxSpeed,
        this.enemy.speed + this.enemy.speedIncrement
      )
    }

    this.updateUI()
  }

  updateUI() {
    this.movesTarget.textContent = this.moves
    this.collectiblesTarget.textContent = `${this.collected}/${this.totalCollectibles}`
  }

  // ============================================================
  // GAME LOGIC - ENNEMI (BONUS)
  // ============================================================
  // L'ennemi se déplace en continu vers le joueur
  // Il traverse les murs (c'est un fantôme !)
  // Sa position est en float pour un mouvement fluide

  updateEnemy(deltaTime) {
    if (!this.enemy || this.gameOver) return

    // Direction vers le joueur
    const dx = this.player.x - this.enemy.px
    const dy = this.player.y - this.enemy.py
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 0.1) {
      // Normalise et applique la vitesse (cases/sec * temps = cases parcourues)
      // L'ennemi va TOUJOURS vers le joueur (traverse les murs)
      this.enemy.px += (dx / dist) * this.enemy.speed * deltaTime
      this.enemy.py += (dy / dist) * this.enemy.speed * deltaTime

      // Ajoute la position actuelle au trail (queue du fantôme)
      this.enemy.trail.push({ x: this.enemy.px, y: this.enemy.py })
      if (this.enemy.trail.length > 15) {
        this.enemy.trail.shift()  // Garde seulement les 15 dernières positions
      }
    }

    // Met à jour la position en cases (pour collision)
    this.enemy.x = Math.round(this.enemy.px)
    this.enemy.y = Math.round(this.enemy.py)

    // Vérifie collision avec le joueur
    const collisionDist = Math.sqrt(
      Math.pow(this.player.x - this.enemy.px, 2) +
      Math.pow(this.player.y - this.enemy.py, 2)
    )

    if (collisionDist < 0.5) {
      // Touché ! Lance l'animation de mort
      this.startDeathAnimation()
    }
  }

  // ============================================================
  // ANIMATION DE MORT (ASPIRATION)
  // ============================================================
  // Quand l'ennemi touche le joueur:
  // 1. Le joueur est "aspiré" vers l'ennemi (spiral)
  // 2. Il rétrécit progressivement
  // 3. Game over à la fin

  startDeathAnimation() {
    this.gameOver = true
    this.lost = true

    // Sauvegarde la position initiale du joueur
    this.deathAnimation = {
      phase: 'absorb',      // 'absorb', 'explode', 'message'
      startX: this.player.x,
      startY: this.player.y,
      targetX: this.enemy.px,
      targetY: this.enemy.py,
      progress: 0,
      rotation: 0,
      scale: 1,
      messageAlpha: 0,
      messageScale: 0
    }

    // Spawn particules cyan qui convergent vers l'ennemi
    for (let i = 0; i < 20; i++) {
      this.spawnDeathParticle(this.player.x, this.player.y, 'inward')
    }
  }

  updateDeathAnimation(deltaTime) {
    if (!this.deathAnimation) return

    const da = this.deathAnimation
    // Vitesses en unités par seconde (valeurs originales * 60 pour convertir de "par frame" à "par seconde")
    const absorbSpeed = 0.025 * 60   // Progression de l'absorption (~1.5/sec)
    const rotationSpeed = 0.4 * 60   // Rotation en radians/sec (~24/sec)
    const explodeSpeed = 0.03 * 60   // Progression de l'explosion (~1.8/sec)
    const messageSpeed = 0.02 * 60   // Progression du message (~1.2/sec)

    if (da.phase === 'absorb') {
      da.progress += absorbSpeed * deltaTime
      da.rotation += rotationSpeed * deltaTime
      da.scale = 1 - da.progress * 0.9

      // Spawn des particules cyan qui partent du joueur
      if (Math.random() < 0.4) {
        this.spawnDeathParticle(this.player.x, this.player.y, 'inward')
      }

      if (da.progress >= 1) {
        da.phase = 'explode'
        da.progress = 0
        // Explosion de particules rouges depuis l'ennemi !
        for (let i = 0; i < 40; i++) {
          this.spawnDeathParticle(this.enemy.px, this.enemy.py, 'outward')
        }
      }
    } else if (da.phase === 'explode') {
      da.progress += explodeSpeed * deltaTime

      if (da.progress >= 0.5) {
        da.phase = 'message'
        da.progress = 0
      }
    } else if (da.phase === 'message') {
      da.progress += messageSpeed * deltaTime
      da.messageAlpha = Math.min(1, da.progress * 2)
      da.messageScale = Math.min(1, da.progress * 1.5)

      if (da.progress >= 1) {
        this.statusTarget.textContent = "Game Over"
        this.statusTarget.className = "text-sm font-medium text-red-400"
      }
    }
  }

  spawnDeathParticle(cellX, cellY, direction) {
    const cx = this.offsetX + cellX * this.cellSize + this.cellSize / 2
    const cy = this.offsetY + cellY * this.cellSize + this.cellSize / 2

    const angle = Math.random() * Math.PI * 2

    if (direction === 'inward') {
      // Particules cyan qui vont vers l'ennemi
      const enemyCx = this.offsetX + this.enemy.px * this.cellSize + this.cellSize / 2
      const enemyCy = this.offsetY + this.enemy.py * this.cellSize + this.cellSize / 2
      const distance = 30 + Math.random() * 50

      this.particles.push({
        x: cx + Math.cos(angle) * distance,
        y: cy + Math.sin(angle) * distance,
        targetX: enemyCx,
        targetY: enemyCy,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 3,
        life: 1,
        decay: (0.02 + Math.random() * 0.02) * 60,  // Decay en unités par seconde
        color: 'cyan',
        direction: 'inward',
        inwardSpeed: 4 * 60  // Vitesse en pixels/sec (valeur originale: 4)
      })
    } else {
      // Explosion rouge depuis l'ennemi (vitesse en pixels/sec, valeurs originales: 3-8 * 60)
      const speed = (3 + Math.random() * 5) * 60
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        life: 1,
        decay: (0.015 + Math.random() * 0.015) * 60,  // Decay en unités par seconde
        color: 'red',
        direction: 'outward'
      })
    }
  }

  // ============================================================
  // ANIMATION DE VICTOIRE
  // ============================================================
  // Quand le joueur atteint la sortie:
  // 1. Le joueur est aspiré dans le portail (spiral vers le centre)
  // 2. Explosion de particules violettes
  // 3. Message de victoire avec effet de scale

  startVictoryAnimation() {
    this.victoryAnimation = {
      phase: 'absorb',      // 'absorb', 'explode', 'message'
      progress: 0,
      rotation: 0,
      scale: 1,
      messageAlpha: 0,
      messageScale: 0
    }

    // Spawn les premières particules autour de la sortie
    for (let i = 0; i < 30; i++) {
      this.spawnVictoryParticle(this.exit.x, this.exit.y, 'inward')
    }
  }

  updateVictoryAnimation(deltaTime) {
    if (!this.victoryAnimation) return

    const va = this.victoryAnimation
    // Vitesses en unités par seconde (valeurs originales * 60 pour convertir de "par frame" à "par seconde")
    const absorbSpeed = 0.025 * 60   // Progression de l'absorption (~1.5/sec)
    const rotationSpeed = 0.4 * 60   // Rotation en radians/sec (~24/sec)
    const explodeSpeed = 0.03 * 60   // Progression de l'explosion (~1.8/sec)
    const messageSpeed = 0.02 * 60   // Progression du message (~1.2/sec)

    if (va.phase === 'absorb') {
      va.progress += absorbSpeed * deltaTime
      va.rotation += rotationSpeed * deltaTime
      va.scale = 1 - va.progress * 0.8

      // Spawn des particules qui convergent vers le portail
      if (Math.random() < 0.3) {
        this.spawnVictoryParticle(this.exit.x, this.exit.y, 'inward')
      }

      if (va.progress >= 1) {
        va.phase = 'explode'
        va.progress = 0
        // Explosion massive !
        for (let i = 0; i < 50; i++) {
          this.spawnVictoryParticle(this.exit.x, this.exit.y, 'outward')
        }
      }
    } else if (va.phase === 'explode') {
      va.progress += explodeSpeed * deltaTime

      if (va.progress >= 0.5) {
        va.phase = 'message'
        va.progress = 0
      }
    } else if (va.phase === 'message') {
      va.progress += messageSpeed * deltaTime
      va.messageAlpha = Math.min(1, va.progress * 2)
      va.messageScale = Math.min(1, va.progress * 1.5)

      if (va.progress >= 1) {
        this.statusTarget.textContent = "Victoire !"
        this.statusTarget.className = "text-sm font-medium text-purple-400"
      }
    }
  }

  spawnVictoryParticle(cellX, cellY, direction) {
    const cx = this.offsetX + cellX * this.cellSize + this.cellSize / 2
    const cy = this.offsetY + cellY * this.cellSize + this.cellSize / 2

    const angle = Math.random() * Math.PI * 2
    const distance = direction === 'inward' ? 100 + Math.random() * 100 : 0
    // Vitesses en pixels par seconde (valeurs originales * 60)
    const speed = direction === 'inward' ? (2 + Math.random() * 3) * 60 : (4 + Math.random() * 6) * 60

    this.particles.push({
      x: cx + Math.cos(angle) * distance,
      y: cy + Math.sin(angle) * distance,
      targetX: cx,
      targetY: cy,
      vx: direction === 'outward' ? Math.cos(angle) * speed : 0,
      vy: direction === 'outward' ? Math.sin(angle) * speed : 0,
      size: 3 + Math.random() * 4,
      life: 1,
      decay: (0.015 + Math.random() * 0.015) * 60,  // Decay en unités par seconde
      color: Math.random() < 0.5 ? 'purple' : 'cyan',
      direction: direction,
      inwardSpeed: 4 * 60  // Vitesse de convergence en pixels/sec (valeur originale: 4)
    })
  }

  // ============================================================
  // SYSTÈME DE PARTICULES
  // ============================================================
  // Les particules sont des objets simples avec position, vélocité, vie
  // Elles sont mises à jour et dessinées chaque frame

  spawnCollectParticles(cellX, cellY) {
    const cx = this.offsetX + cellX * this.cellSize + this.cellSize / 2
    const cy = this.offsetY + cellY * this.cellSize + this.cellSize / 2

    // Spawn 15-20 particules dorées
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2
      // Vitesse en pixels par seconde (valeurs originales: 2-6 par frame * 60)
      const speed = (2 + Math.random() * 4) * 60

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 1,
        decay: (0.02 + Math.random() * 0.02) * 60,  // Decay en unités par seconde
        color: 'gold',
        direction: 'outward'
      })
    }
  }

  updateParticles(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      if (p.direction === 'inward' && p.targetX !== undefined) {
        // Particules qui vont vers le centre (victoire)
        const dx = p.targetX - p.x
        const dy = p.targetY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 2) {
          const inwardSpeed = p.inwardSpeed || 240
          p.x += (dx / dist) * inwardSpeed * deltaTime
          p.y += (dy / dist) * inwardSpeed * deltaTime
        }
      } else {
        // Particules qui s'éloignent
        p.x += p.vx * deltaTime
        p.y += p.vy * deltaTime
        // Friction appliquée par seconde (0.96^60 ≈ 0.085 par seconde)
        const frictionPerSec = Math.pow(0.96, 60)
        const friction = Math.pow(frictionPerSec, deltaTime)
        p.vx *= friction
        p.vy *= friction
        p.vy += 0.1 * 60 * deltaTime   // Gravité légère (valeur originale: 0.1 par frame)
      }

      p.life -= p.decay * deltaTime

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save()

      let color
      if (p.color === 'gold') {
        color = `rgba(250, 204, 21, ${p.life})`
        this.ctx.shadowColor = 'rgba(250, 204, 21, 0.8)'
      } else if (p.color === 'purple') {
        color = `rgba(168, 85, 247, ${p.life})`
        this.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)'
      } else if (p.color === 'red') {
        color = `rgba(239, 68, 68, ${p.life})`
        this.ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
      } else {
        color = `rgba(0, 200, 255, ${p.life})`
        this.ctx.shadowColor = 'rgba(0, 200, 255, 0.8)'
      }

      this.ctx.shadowBlur = 8
      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      this.ctx.fill()

      this.ctx.restore()
    })
  }

  // ============================================================
  // BOUCLE DE RENDU (ANIMATION LOOP)
  // ============================================================
  // requestAnimationFrame appelle animate() ~60 fois/seconde
  // C'est ici qu'on met à jour les positions et qu'on redessine

  animate(currentTime) {
    // Calcul du delta time en secondes
    const deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    // Protection contre les deltas trop grands (ex: onglet inactif)
    const safeDelta = Math.min(deltaTime, 0.1)

    // Temps pour les animations visuelles (pulse, rotation) - en secondes
    this.time += safeDelta

    // Met à jour l'ennemi
    this.updateEnemy(safeDelta)

    // Met à jour l'animation de mort
    this.updateDeathAnimation(safeDelta)

    // Met à jour l'animation de victoire
    this.updateVictoryAnimation(safeDelta)

    // Met à jour les particules
    this.updateParticles(safeDelta)

    // Redessine tout
    this.draw()

    // Boucle
    this.animationId = requestAnimationFrame((time) => this.animate(time))
  }

  // ============================================================
  // RENDU CANVAS
  // ============================================================

  draw() {
    // Efface le canvas
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Dessine la grille
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x]
        const px = this.offsetX + x * this.cellSize
        const py = this.offsetY + y * this.cellSize

        if (cell === '1') {
          this.drawWall(px, py)
        } else {
          this.drawFloor(px, py)
        }
      }
    }

    // Dessine les collectibles
    this.collectibles.forEach(c => {
      if (!c.collected) {
        this.drawCollectible(
          this.offsetX + c.x * this.cellSize,
          this.offsetY + c.y * this.cellSize
        )
      }
    })

    // Dessine la sortie
    this.drawExit(
      this.offsetX + this.exit.x * this.cellSize,
      this.offsetY + this.exit.y * this.cellSize
    )

    // Dessine l'ennemi (avant le joueur pour qu'il passe "derrière" visuellement)
    if (this.enemy && !this.deathAnimation) {
      this.drawEnemy()
    }

    // Dessine le joueur (ou les animations spéciales)
    if (this.deathAnimation) {
      this.drawDeathAnimation()
    } else if (this.victoryAnimation) {
      this.drawVictoryAnimation()
    } else {
      this.drawPlayer(
        this.offsetX + this.player.x * this.cellSize,
        this.offsetY + this.player.y * this.cellSize
      )
    }

    // Dessine les particules par-dessus tout
    this.drawParticles()

    // Dessine le message de victoire
    if (this.victoryAnimation && this.victoryAnimation.phase === 'message') {
      this.drawVictoryMessage()
    }

    // Dessine le message de défaite
    if (this.deathAnimation && this.deathAnimation.phase === 'message') {
      this.drawDeathMessage()
    }
  }

  // ============================================================
  // FONCTIONS DE DESSIN
  // ============================================================

  drawWall(x, y) {
    const padding = 1
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2)

    // Bordure subtile neon
    this.ctx.strokeStyle = 'rgba(0, 200, 255, 0.1)'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(x + padding, y + padding, this.cellSize - padding * 2, this.cellSize - padding * 2)
  }

  drawFloor(x, y) {
    // Grille style Tron
    this.ctx.fillStyle = '#080808'
    this.ctx.fillRect(x, y, this.cellSize, this.cellSize)

    this.ctx.strokeStyle = 'rgba(0, 200, 255, 0.05)'
    this.ctx.lineWidth = 1
    this.ctx.strokeRect(x, y, this.cellSize, this.cellSize)
  }

  drawPlayer(x, y) {
    const cx = x + this.cellSize / 2
    const cy = y + this.cellSize / 2
    const radius = this.cellSize * 0.35

    // Effet pulse basé sur le temps (valeur originale: sin(time * 3))
    const pulse = Math.sin(this.time * 3) * 0.2 + 0.8

    // Glow cyan
    this.ctx.shadowColor = 'rgba(0, 200, 255, 0.8)'
    this.ctx.shadowBlur = 15 * pulse

    // Cercle principal
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = '#00c8ff'
    this.ctx.fill()

    // Cercle intérieur plus clair
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2)
    this.ctx.fillStyle = '#80e6ff'
    this.ctx.fill()

    this.ctx.shadowBlur = 0
  }

  drawCollectible(x, y) {
    const cx = x + this.cellSize / 2
    const cy = y + this.cellSize / 2
    const size = this.cellSize * 0.25

    // Animation: rotation + flottement (temps en secondes)
    // Valeurs originales: rotation = time * 2, bounce = sin(time * 4) * 2
    // Donc ~0.3 tour/sec et ~0.6 rebonds/sec
    const rotation = this.time * 2  // ~0.3 tour par seconde
    const bounce = Math.sin(this.time * 4) * 2  // ~0.6 rebonds par seconde

    this.ctx.save()
    this.ctx.translate(cx, cy + bounce)
    this.ctx.rotate(rotation)

    // Glow jaune
    this.ctx.shadowColor = 'rgba(250, 204, 21, 0.8)'
    this.ctx.shadowBlur = 10

    // Forme diamant
    this.ctx.beginPath()
    this.ctx.moveTo(0, -size)
    this.ctx.lineTo(size, 0)
    this.ctx.lineTo(0, size)
    this.ctx.lineTo(-size, 0)
    this.ctx.closePath()
    this.ctx.fillStyle = '#facc15'
    this.ctx.fill()

    this.ctx.shadowBlur = 0
    this.ctx.restore()
  }

  drawExit(x, y) {
    const cx = x + this.cellSize / 2
    const cy = y + this.cellSize / 2
    const size = this.cellSize * 0.4

    const isOpen = this.exitOpen
    const color = isOpen ? 'rgba(168, 85, 247, 1)' : 'rgba(100, 100, 100, 0.5)'
    const glowColor = isOpen ? 'rgba(168, 85, 247, 0.8)' : 'rgba(100, 100, 100, 0.2)'

    // Pulse : ~0.6 cycles par seconde si ouvert (valeur originale: sin(time * 4))
    const pulse = isOpen ? Math.sin(this.time * 4) * 0.3 + 0.7 : 0.5

    this.ctx.shadowColor = glowColor
    this.ctx.shadowBlur = isOpen ? 20 * pulse : 5

    // Anneau extérieur
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, size, 0, Math.PI * 2)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 3
    this.ctx.stroke()

    // Anneau intérieur
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, size * 0.6, 0, Math.PI * 2)
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Centre si ouvert
    if (isOpen) {
      this.ctx.beginPath()
      this.ctx.arc(cx, cy, size * 0.2, 0, Math.PI * 2)
      this.ctx.fillStyle = color
      this.ctx.fill()
    }

    this.ctx.shadowBlur = 0
  }

  // ============================================================
  // DESSIN ENNEMI (BONUS)
  // ============================================================
  // Le fantôme est dessiné avec:
  // - Une "queue" qui suit (trail)
  // - Un corps principal rouge/orange
  // - Un glow qui s'intensifie quand il est proche

  drawEnemy() {
    if (!this.enemy) return

    const cx = this.offsetX + this.enemy.px * this.cellSize + this.cellSize / 2
    const cy = this.offsetY + this.enemy.py * this.cellSize + this.cellSize / 2
    const radius = this.cellSize * 0.35

    // Distance au joueur pour intensifier le glow
    const distToPlayer = Math.sqrt(
      Math.pow(this.player.x - this.enemy.px, 2) +
      Math.pow(this.player.y - this.enemy.py, 2)
    )
    const intensity = Math.max(0.5, 1 - distToPlayer / 10)

    // Dessine la queue (trail)
    this.enemy.trail.forEach((pos, i) => {
      const alpha = (i / this.enemy.trail.length) * 0.5
      const trailX = this.offsetX + pos.x * this.cellSize + this.cellSize / 2
      const trailY = this.offsetY + pos.y * this.cellSize + this.cellSize / 2
      const trailRadius = radius * (i / this.enemy.trail.length) * 0.8

      this.ctx.beginPath()
      this.ctx.arc(trailX, trailY, trailRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`
      this.ctx.fill()
    })

    // Glow rouge (valeur originale: sin(time * 5))
    const pulse = Math.sin(this.time * 5) * 0.3 + 0.7
    this.ctx.shadowColor = `rgba(239, 68, 68, ${intensity})`
    this.ctx.shadowBlur = 20 * pulse * intensity

    // Corps principal
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = '#ef4444'
    this.ctx.fill()

    // "Yeux" (deux points blancs)
    this.ctx.shadowBlur = 0
    const eyeOffset = radius * 0.3
    const eyeRadius = radius * 0.15

    // Direction vers le joueur pour orienter les yeux
    const dx = this.player.x - this.enemy.px
    const dy = this.player.y - this.enemy.py
    const angle = Math.atan2(dy, dx)

    const eyeX = Math.cos(angle) * eyeOffset * 0.5
    const eyeY = Math.sin(angle) * eyeOffset * 0.5

    // Oeil gauche
    this.ctx.beginPath()
    this.ctx.arc(cx - eyeOffset * 0.5 + eyeX, cy - eyeOffset * 0.3 + eyeY, eyeRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = 'white'
    this.ctx.fill()

    // Oeil droit
    this.ctx.beginPath()
    this.ctx.arc(cx + eyeOffset * 0.5 + eyeX, cy - eyeOffset * 0.3 + eyeY, eyeRadius, 0, Math.PI * 2)
    this.ctx.fillStyle = 'white'
    this.ctx.fill()
  }

  // ============================================================
  // ANIMATION DE MORT
  // ============================================================
  // Le joueur est aspiré vers l'ennemi en spirale

  drawDeathAnimation() {
    if (!this.deathAnimation || !this.enemy) return

    const da = this.deathAnimation

    // Phase absorb : le joueur spirale vers l'ennemi
    if (da.phase === 'absorb') {
      // Interpole la position du joueur vers l'ennemi
      const currentX = da.startX + (da.targetX - da.startX) * da.progress
      const currentY = da.startY + (da.targetY - da.startY) * da.progress

      // Ajoute un offset spiral
      const spiralRadius = (1 - da.progress) * this.cellSize * 0.5
      const spiralX = Math.cos(da.rotation) * spiralRadius
      const spiralY = Math.sin(da.rotation) * spiralRadius

      const cx = this.offsetX + currentX * this.cellSize + this.cellSize / 2 + spiralX
      const cy = this.offsetY + currentY * this.cellSize + this.cellSize / 2 + spiralY
      const radius = this.cellSize * 0.35 * da.scale

      if (radius > 0) {
        // Glow qui change de cyan à rouge
        const redAmount = da.progress
        this.ctx.shadowColor = `rgba(${Math.round(239 * redAmount + 0 * (1 - redAmount))}, ${Math.round(68 * redAmount + 200 * (1 - redAmount))}, ${Math.round(68 * redAmount + 255 * (1 - redAmount))}, 0.8)`
        this.ctx.shadowBlur = 15

        this.ctx.beginPath()
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${Math.round(239 * redAmount + 0 * (1 - redAmount))}, ${Math.round(68 * redAmount + 200 * (1 - redAmount))}, ${Math.round(68 * redAmount + 255 * (1 - redAmount))}, 1)`
        this.ctx.fill()

        this.ctx.shadowBlur = 0
      }
    }

    // L'ennemi pulse de façon menaçante pendant la phase explode (valeur originale: sin(time * 10))
    if (da.phase === 'explode') {
      const enemyCx = this.offsetX + this.enemy.px * this.cellSize + this.cellSize / 2
      const enemyCy = this.offsetY + this.enemy.py * this.cellSize + this.cellSize / 2
      const pulseSize = 1 + Math.sin(this.time * 10) * 0.3

      this.ctx.shadowColor = 'rgba(239, 68, 68, 0.9)'
      this.ctx.shadowBlur = 40 * pulseSize

      this.ctx.beginPath()
      this.ctx.arc(enemyCx, enemyCy, this.cellSize * 0.4 * pulseSize, 0, Math.PI * 2)
      this.ctx.fillStyle = '#ef4444'
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    // Dessine l'ennemi (sauf pendant explode où on le dessine différemment)
    if (da.phase !== 'explode') {
      this.drawEnemy()
    }
  }

  // ============================================================
  // ANIMATION DE VICTOIRE - RENDU
  // ============================================================

  drawVictoryAnimation() {
    if (!this.victoryAnimation) return

    const va = this.victoryAnimation
    const cx = this.offsetX + this.exit.x * this.cellSize + this.cellSize / 2
    const cy = this.offsetY + this.exit.y * this.cellSize + this.cellSize / 2

    if (va.phase === 'absorb') {
      // Le joueur spirale vers le portail
      const playerCx = this.offsetX + this.player.x * this.cellSize + this.cellSize / 2
      const playerCy = this.offsetY + this.player.y * this.cellSize + this.cellSize / 2

      // Interpole vers le centre du portail
      const currentX = playerCx + (cx - playerCx) * va.progress
      const currentY = playerCy + (cy - playerCy) * va.progress

      // Spiral
      const spiralRadius = (1 - va.progress) * this.cellSize * 0.3
      const spiralX = Math.cos(va.rotation) * spiralRadius
      const spiralY = Math.sin(va.rotation) * spiralRadius

      const radius = this.cellSize * 0.35 * va.scale

      if (radius > 0) {
        // Glow qui passe de cyan à violet
        const purple = va.progress
        this.ctx.shadowColor = `rgba(${Math.round(168 * purple)}, ${Math.round(85 * purple + 200 * (1 - purple))}, ${Math.round(247 * purple + 255 * (1 - purple))}, 0.8)`
        this.ctx.shadowBlur = 20

        this.ctx.beginPath()
        this.ctx.arc(currentX + spiralX, currentY + spiralY, radius, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${Math.round(168 * purple)}, ${Math.round(85 * purple + 200 * (1 - purple))}, ${Math.round(247 * purple + 255 * (1 - purple))}, 1)`
        this.ctx.fill()

        this.ctx.shadowBlur = 0
      }
    }

    // Le portail pulse intensément pendant l'animation (valeur originale: sin(time * 8))
    const portalPulse = 1 + Math.sin(this.time * 8) * 0.2
    this.ctx.shadowColor = 'rgba(168, 85, 247, 0.9)'
    this.ctx.shadowBlur = 30 * portalPulse

    this.ctx.beginPath()
    this.ctx.arc(cx, cy, this.cellSize * 0.4 * portalPulse, 0, Math.PI * 2)
    this.ctx.strokeStyle = 'rgba(168, 85, 247, 1)'
    this.ctx.lineWidth = 4
    this.ctx.stroke()

    this.ctx.shadowBlur = 0
  }

  drawVictoryMessage() {
    if (!this.victoryAnimation) return

    const va = this.victoryAnimation
    const centerX = this.width / 2
    const centerY = this.height / 2

    this.ctx.save()

    // Fond semi-transparent
    this.ctx.fillStyle = `rgba(10, 10, 10, ${va.messageAlpha * 0.7})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Texte "VICTOIRE !"
    this.ctx.translate(centerX, centerY)
    this.ctx.scale(va.messageScale, va.messageScale)

    // Glow violet
    this.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)'
    this.ctx.shadowBlur = 30

    this.ctx.font = 'bold 48px "Inter", sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = `rgba(168, 85, 247, ${va.messageAlpha})`
    this.ctx.fillText('VICTOIRE !', 0, -20)

    // Sous-texte avec stats
    this.ctx.shadowBlur = 10
    this.ctx.font = '18px "Inter", sans-serif'
    this.ctx.fillStyle = `rgba(200, 200, 200, ${va.messageAlpha})`
    this.ctx.fillText(`${this.moves} mouvements`, 0, 30)

    this.ctx.restore()
  }

  drawDeathMessage() {
    if (!this.deathAnimation) return

    const da = this.deathAnimation
    const centerX = this.width / 2
    const centerY = this.height / 2

    this.ctx.save()

    // Fond semi-transparent rouge
    this.ctx.fillStyle = `rgba(20, 5, 5, ${da.messageAlpha * 0.8})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Texte "GAME OVER"
    this.ctx.translate(centerX, centerY)
    this.ctx.scale(da.messageScale, da.messageScale)

    // Glow rouge
    this.ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
    this.ctx.shadowBlur = 30

    this.ctx.font = 'bold 48px "Inter", sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = `rgba(239, 68, 68, ${da.messageAlpha})`
    this.ctx.fillText('GAME OVER', 0, -30)

    // Sous-texte
    this.ctx.shadowBlur = 10
    this.ctx.font = '18px "Inter", sans-serif'
    this.ctx.fillStyle = `rgba(200, 200, 200, ${da.messageAlpha})`
    this.ctx.fillText('Le fantôme t\'a attrapé !', 0, 15)

    // Hint pour réessayer
    this.ctx.font = '14px "Inter", sans-serif'
    this.ctx.fillStyle = `rgba(150, 150, 150, ${da.messageAlpha * 0.8})`
    this.ctx.fillText('Clique sur Recommencer', 0, 50)

    this.ctx.restore()
  }
}
