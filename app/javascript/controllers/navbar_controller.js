import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["mobileMenu", "hamburger", "link", "navbar"]

  connect() {
    this.isMenuOpen = false
    this.lastScrollY = 0
    this.isHidden = false

    // Bind scroll event
    this.handleScroll = this.handleScroll.bind(this)
    window.addEventListener("scroll", this.handleScroll, { passive: true })

    // Update active link on scroll
    this.updateActiveLink()
  }

  disconnect() {
    window.removeEventListener("scroll", this.handleScroll)
  }

  handleScroll() {
    const currentScrollY = window.scrollY

    // Add/remove scrolled class for background opacity
    if (currentScrollY > 50) {
      this.navbarTarget.classList.add("navbar-scrolled")
    } else {
      this.navbarTarget.classList.remove("navbar-scrolled")
    }

    // Hide/show navbar on scroll (only after 100px)
    if (currentScrollY > 100) {
      if (currentScrollY > this.lastScrollY && !this.isHidden) {
        // Scrolling down - hide navbar
        this.navbarTarget.classList.add("navbar-hidden")
        this.isHidden = true
        // Close mobile menu if open
        if (this.isMenuOpen) {
          this.closeMenu()
        }
      } else if (currentScrollY < this.lastScrollY && this.isHidden) {
        // Scrolling up - show navbar
        this.navbarTarget.classList.remove("navbar-hidden")
        this.isHidden = false
      }
    } else {
      // At top - always show
      this.navbarTarget.classList.remove("navbar-hidden")
      this.isHidden = false
    }

    this.lastScrollY = currentScrollY

    // Update active link
    this.updateActiveLink()
  }

  updateActiveLink() {
    const sections = ["hero", "about", "village", "solong", "pushswap", "ftprintf", "projects", "contact"]
    const scrollY = window.scrollY + 150 // Offset for navbar height

    let activeSection = "hero"

    for (const sectionId of sections) {
      const section = document.getElementById(sectionId)
      if (section) {
        const top = section.offsetTop
        const height = section.offsetHeight
        if (scrollY >= top && scrollY < top + height) {
          activeSection = sectionId
        }
      }
    }

    // Update link styles
    this.linkTargets.forEach(link => {
      const href = link.getAttribute("href")
      if (href === `#${activeSection}`) {
        link.classList.add("text-neon-400")
        link.classList.remove("text-gray-400")
      } else {
        link.classList.remove("text-neon-400")
        link.classList.add("text-gray-400")
      }
    })
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen

    if (this.isMenuOpen) {
      this.mobileMenuTarget.classList.add("menu-open")
      this.hamburgerTarget.classList.add("menu-open")
    } else {
      this.mobileMenuTarget.classList.remove("menu-open")
      this.hamburgerTarget.classList.remove("menu-open")
    }
  }

  closeMenu() {
    this.isMenuOpen = false
    this.mobileMenuTarget.classList.remove("menu-open")
    this.hamburgerTarget.classList.remove("menu-open")
  }

  closeMenuOnBackdrop(event) {
    // Ferme seulement si on clique sur l'overlay (pas sur la modal)
    if (event.target === this.mobileMenuTarget) {
      this.closeMenu()
    }
  }
}
