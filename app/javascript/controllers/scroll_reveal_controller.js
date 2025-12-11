import { Controller } from "@hotwired/stimulus"

/**
 * ScrollRevealController
 * ======================
 * Gère les animations au scroll avec Intersection Observer
 * - Révèle les éléments quand ils entrent dans le viewport
 * - Anime les lignes de séparation
 * - Effet staggered pour les groupes d'éléments
 */
export default class extends Controller {
  static targets = ["item", "line", "stagger"]

  connect() {
    // Petit délai pour s'assurer que le CSS est chargé
    setTimeout(() => {
      this.setupObservers()
    }, 100)
  }

  disconnect() {
    if (this.observer) this.observer.disconnect()
    if (this.lineObserver) this.lineObserver.disconnect()
  }

  setupObservers() {
    // Observer pour les éléments individuels
    // rootMargin négatif = l'élément doit être plus loin dans le viewport pour trigger
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Ajoute la classe revealed qui déclenche l'animation CSS
            entry.target.classList.add("revealed")
            this.observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -100px 0px"
      }
    )

    // Observer pour les lignes
    this.lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("line-revealed")
            this.lineObserver.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.5,
        rootMargin: "0px 0px -50px 0px"
      }
    )

    // Observer les items
    this.itemTargets.forEach((item) => {
      this.observer.observe(item)
    })

    // Observer les lignes
    this.lineTargets.forEach((line) => {
      this.lineObserver.observe(line)
    })

    // Observer les groupes staggered
    this.staggerTargets.forEach((group) => {
      this.observer.observe(group)
    })
  }
}
