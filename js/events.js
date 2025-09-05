// Events page specific functionality

// Event filtering functionality
function initEventFilters() {
  const chips = document.querySelectorAll('.chip');
  
  if (!chips.length) return;
  
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      
      // Update chip states
      chips.forEach(c => {
        c.classList.remove('active', 'inactive');
        c.classList.add(c === chip ? 'active' : 'inactive');
      });
      
      // Filter events (works with both static and dynamic content)
      filterEvents(filter);
    });
  });
}

// Filter events function that works with dynamic content
function filterEvents(filter) {
  // Use the Google Sheets manager to re-render with the new filter
  if (typeof googleSheetsEventsManager !== 'undefined') {
    googleSheetsEventsManager.renderEvents(filter);
  }
}

// Initialize events functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initEventFilters();
});