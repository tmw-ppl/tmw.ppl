// Events page specific functionality

// Event filtering functionality
function initEventFilters() {
  const chips = document.querySelectorAll('.chip');
  const eventsList = document.getElementById('events');
  
  if (!chips.length || !eventsList) return;
  
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      
      // Update chip states
      chips.forEach(c => {
        c.classList.remove('active', 'inactive');
        c.classList.add(c === chip ? 'active' : 'inactive');
      });
      
      // Filter events
      Array.from(eventsList.children).forEach(event => {
        if (filter === 'all') {
          event.style.display = '';
          return;
        }
        
        const tags = (event.getAttribute('data-tags') || '').split(/\s+/);
        event.style.display = tags.includes(filter) ? '' : 'none';
      });
    });
  });
}

// Initialize events functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initEventFilters();
});