// Main JavaScript functionality

// Smooth scroll for in-page links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          window.scrollTo({ 
            top: el.offsetTop - 70, 
            behavior: 'smooth' 
          });
        }
      }
    });
  });
}

// Mobile menu toggle
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.navlinks');
  
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initSmoothScroll();
  initMobileMenu();
});