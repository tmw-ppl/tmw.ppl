/**
 * Supabase Events Manager
 * Handles all event-related operations with Supabase
 */
class SupabaseEventsManager {
  constructor() {
    this.supabase = window.supabaseClient;
    this.events = [];
    this.currentFilter = 'all';
    this.currentUser = null;
    
    // Initialize when Supabase is ready
    this.init();
  }

  async init() {
    // Wait for Supabase client to be available
    const checkSupabase = () => {
      if (window.supabaseClient) {
        this.supabase = window.supabaseClient;
        this.setupAuthListener();
        this.loadEvents();
        return;
      }
      setTimeout(checkSupabase, 100);
    };
    checkSupabase();
  }

  setupAuthListener() {
    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this.currentUser = session.user;
        this.updateEventCards();
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.updateEventCards();
      }
    });
  }

  /**
   * Load events from Supabase
   */
  async loadEvents() {
    try {
      console.log('Loading events from Supabase...');
      
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('published', true)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error loading events:', error);
        this.showError('Failed to load events. Please try again.');
        return;
      }

      this.events = data || [];
      console.log(`Loaded ${this.events.length} events`);
      
      // Scrape images for events with Partiful links
      await this.scrapeEventImages();
      
      this.renderEvents();
      
    } catch (error) {
      console.error('Error loading events:', error);
      this.showError('Failed to load events. Please try again.');
    }
  }

  /**
   * Create a new event
   */
  async createEvent(eventData) {
    try {
      console.log('Creating event:', eventData);
      
      if (!this.currentUser) {
        throw new Error('You must be logged in to create events');
      }

      const { data, error } = await this.supabase
        .from('events')
        .insert([{
          ...eventData,
          created_by: this.currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }

      console.log('Event created successfully:', data);
      
      // Reload events to show the new one
      await this.loadEvents();
      
      return data;
      
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(id, eventData) {
    try {
      console.log('Updating event:', id, eventData);
      
      if (!this.currentUser) {
        throw new Error('You must be logged in to update events');
      }

      const { data, error } = await this.supabase
        .from('events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('created_by', this.currentUser.id) // Ensure user owns the event
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      console.log('Event updated successfully:', data);
      
      // Reload events to show the updated one
      await this.loadEvents();
      
      return data;
      
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(id) {
    try {
      console.log('Deleting event:', id);
      
      if (!this.currentUser) {
        throw new Error('You must be logged in to delete events');
      }

      // Confirm deletion
      if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
      }

      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('created_by', this.currentUser.id); // Ensure user owns the event

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      console.log('Event deleted successfully');
      
      // Reload events to remove the deleted one
      await this.loadEvents();
      
    } catch (error) {
      console.error('Error deleting event:', error);
      this.showError('Failed to delete event. Please try again.');
    }
  }

  /**
   * Toggle event publish status
   */
  async togglePublish(id) {
    try {
      const event = this.events.find(e => e.id === id);
      if (!event) {
        throw new Error('Event not found');
      }

      const newPublishedStatus = !event.published;
      
      const { data, error } = await this.supabase
        .from('events')
        .update({ 
          published: newPublishedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('created_by', this.currentUser.id)
        .select()
        .single();

      if (error) {
        console.error('Error toggling publish status:', error);
        throw error;
      }

      console.log('Publish status updated:', data);
      
      // Reload events to show the updated status
      await this.loadEvents();
      
      return data;
      
    } catch (error) {
      console.error('Error toggling publish status:', error);
      throw error;
    }
  }

  /**
   * Filter events by criteria
   */
  filterEvents(filter) {
    this.currentFilter = filter;
    
    let filteredEvents = [...this.events];
    
    switch (filter) {
      case 'upcoming':
        filteredEvents = filteredEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= new Date();
        });
        break;
        
      case 'past':
        filteredEvents = filteredEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate < new Date();
        });
        break;
        
      case 'virtual':
        filteredEvents = filteredEvents.filter(event => 
          event.tags && event.tags.includes('Virtual')
        );
        break;
        
      case 'wellness':
        filteredEvents = filteredEvents.filter(event => 
          event.tags && event.tags.includes('Wellness')
        );
        break;
        
      case 'rager':
        filteredEvents = filteredEvents.filter(event => 
          event.tags && event.tags.includes('Rager')
        );
        break;
        
      case 'irL':
        filteredEvents = filteredEvents.filter(event => 
          event.tags && event.tags.includes('IRL')
        );
        break;
        
      case 'workshop':
        filteredEvents = filteredEvents.filter(event => 
          event.tags && event.tags.includes('Workshop')
        );
        break;
        
      case 'social':
        filteredEvents = filteredEvents.filter(event => 
          event.tags && event.tags.includes('Social')
        );
        break;
        
      case 'all':
      default:
        // No filtering
        break;
    }
    
    this.renderEvents(filteredEvents);
    this.updateFilterChips(filter);
  }

  /**
   * Search events by query
   */
  searchEvents(query) {
    if (!query.trim()) {
      this.renderEvents();
      return;
    }
    
    const searchTerm = query.toLowerCase();
    const filteredEvents = this.events.filter(event => 
      event.title.toLowerCase().includes(searchTerm) ||
      (event.description && event.description.toLowerCase().includes(searchTerm)) ||
      (event.location && event.location.toLowerCase().includes(searchTerm))
    );
    
    this.renderEvents(filteredEvents);
  }

  /**
   * Render events to the page
   */
  renderEvents(eventsToRender = null) {
    const events = eventsToRender || this.events;
    const eventsContainer = document.getElementById('events-container');
    
    if (!eventsContainer) {
      console.error('Events container not found');
      return;
    }
    
    if (events.length === 0) {
      eventsContainer.innerHTML = `
        <div class="no-events">
          <h3>No events found</h3>
          <p>Try adjusting your filters or check back later for new events.</p>
        </div>
      `;
      return;
    }
    
    eventsContainer.innerHTML = events.map(event => this.renderEvent(event)).join('');
  }

  /**
   * Render a single event card
   */
  renderEvent(event) {
    const eventDate = new Date(event.date);
    const isPast = eventDate < new Date();
    const canEdit = this.currentUser && this.currentUser.id === event.created_by;
    
    return `
      <div class="event ${isPast ? 'past' : ''}" data-event-id="${event.id}">
        <div class="event-content">
          <div class="event-header">
            <h3 class="event-title">
              ${this.escapeHtml(event.title)}
              ${event.rsvp_url ? ` • <a href="${this.escapeHtml(event.rsvp_url)}" target="_blank" class="btn secondary small inline">${event.rsvp_url.includes('partiful.com') ? 'RSVP on Partiful' : 'RSVP'}</a>` : ''}
            </h3>
          </div>
          
          <div class="event-details">
            <p class="event-description">${this.escapeHtml(event.description || '')}</p>
            
            <div class="event-meta">
              <div class="event-date">
                <strong>${eventDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</strong>
                ${event.time ? ` at ${this.escapeHtml(event.time)}` : ''}
              </div>
              
              ${event.location ? `
                <div class="event-location">
                  📍 ${this.escapeHtml(event.location)}
                </div>
              ` : ''}
            </div>
          </div>
          
          ${canEdit ? `
            <div class="event-actions">
              <button class="btn secondary small" onclick="eventsManager.editEvent('${event.id}')">Edit</button>
              <button class="btn danger small" onclick="eventsManager.deleteEvent('${event.id}')">Delete</button>
              <button class="btn ${event.published ? 'warning' : 'success'} small" onclick="eventsManager.togglePublish('${event.id}')">
                ${event.published ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          ` : ''}
        </div>
        
        ${event.image_url ? `
          <div class="event-image">
            <img src="${this.escapeHtml(event.image_url)}" alt="${this.escapeHtml(event.title)}" loading="lazy">
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Update filter chips UI
   */
  updateFilterChips(activeFilter) {
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
      const filter = chip.dataset.filter;
      if (filter === activeFilter) {
        chip.classList.remove('inactive');
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
        chip.classList.add('inactive');
      }
    });
  }

  /**
   * Update event cards based on auth state
   */
  updateEventCards() {
    // Re-render events to show/hide edit buttons
    this.renderEvents();
  }

  /**
   * Edit event (placeholder for now)
   */
  editEvent(id) {
    console.log('Edit event:', id);
    // TODO: Navigate to edit form or open modal
    window.location.href = `edit-event.html?id=${id}`;
  }

  /**
   * Show error message
   */
  showError(message) {
    // Create or update error message element
    let errorElement = document.getElementById('error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'error-message';
      errorElement.className = 'error-message';
      document.body.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Scrape images for events with Partiful links
   */
  async scrapeEventImages() {
    const eventsWithPartiful = this.events.filter(event => 
      event.rsvp_url && event.rsvp_url.includes('partiful.com') && !event.image_url
    );
    
    console.log(`Scraping images for ${eventsWithPartiful.length} Partiful events`);
    
    for (const event of eventsWithPartiful) {
      try {
        const imageUrl = await this.scrapePartifulImage(event.rsvp_url);
        if (imageUrl) {
          event.image_url = imageUrl;
          console.log(`✅ Found image for ${event.title}`);
          
          // Update the event in Supabase with the scraped image
          await this.updateEventImage(event.id, imageUrl);
        }
      } catch (error) {
        console.warn(`Failed to scrape image for ${event.title}:`, error);
      }
    }
  }

  /**
   * Scrape image from Partiful page
   */
  async scrapePartifulImage(partifulUrl) {
    try {
      // Use CORS proxy to fetch the Partiful page
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const fullUrl = proxyUrl + encodeURIComponent(partifulUrl);
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Strategy 1: Look for meta tags with og:image or name="image" (highest priority)
      const metaImageMatch = html.match(/<meta[^>]*(?:property="og:image"|name="image")[^>]*content="([^"]*imgix\.net[^"]*)"/i);
      if (metaImageMatch) {
        console.log(`✅ Found meta image: ${metaImageMatch[1]}`);
        return metaImageMatch[1];
      }
      
      // Strategy 2: Look for imgix images in srcset (most reliable for Partiful)
      const srcsetMatches = html.match(/srcset="([^"]*imgix\.net[^"]*)"/gi);
      if (srcsetMatches) {
        const firstSrcset = srcsetMatches[0].match(/srcset="([^"]+)"/i);
        if (firstSrcset) {
          const urls = firstSrcset[1].split(',');
          return urls[urls.length - 1].trim().split(' ')[0];
        }
      }
      
      // Strategy 3: Look for imgix images in src attribute
      const imgixMatches = html.match(/src="([^"]*imgix\.net[^"]*)"/gi);
      if (imgixMatches) {
        const firstMatch = imgixMatches[0].match(/src="([^"]+)"/i);
        if (firstMatch) {
          return firstMatch[1];
        }
      }
      
      // Strategy 4: Look for EventPage_image class with any image
      const eventPageMatches = html.match(/class="[^"]*EventPage_image[^"]*"[^>]*>[\s\S]*?<img[^>]*>/gi);
      if (eventPageMatches) {
        for (const match of eventPageMatches) {
          const srcMatch = match.match(/src="([^"]+)"/i) || match.match(/srcset="([^"]+)"/i);
          if (srcMatch) {
            let imageUrl = srcMatch[1];
            if (imageUrl.includes(',')) {
              imageUrl = imageUrl.split(',')[0].trim().split(' ')[0];
            }
            return imageUrl;
          }
        }
      }
      
      // Strategy 5: Look for any image with specific alt text patterns
      const altPatterns = [
        /<img[^>]*alt="[^"]*(?:event|poster|flyer|banner)[^"]*"[^>]*>/gi,
        /<img[^>]*alt="[^"]*\.(jpg|jpeg|png|webp)[^"]*"[^>]*>/gi
      ];
      
      for (const pattern of altPatterns) {
        const altMatches = html.match(pattern);
        if (altMatches) {
          for (const match of altMatches) {
            const srcMatch = match.match(/src="([^"]+)"/i) || match.match(/srcset="([^"]+)"/i);
            if (srcMatch) {
              let imageUrl = srcMatch[1];
              if (imageUrl.includes(',')) {
                imageUrl = imageUrl.split(',')[0].trim().split(' ')[0];
              }
              return imageUrl;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error scraping Partiful image:', error);
      return null;
    }
  }

  /**
   * Update event image URL in Supabase
   */
  async updateEventImage(eventId, imageUrl) {
    try {
      const { error } = await this.supabase
        .from('events')
        .update({ 
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        console.error('Error updating event image:', error);
      } else {
        console.log(`Updated image for event ${eventId}`);
      }
    } catch (error) {
      console.error('Error updating event image:', error);
    }
  }

  /**
   * Get user's events (for profile page)
   */
  async getUserEvents() {
    if (!this.currentUser) {
      return [];
    }
    
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('created_by', this.currentUser.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading user events:', error);
        return [];
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Error loading user events:', error);
      return [];
    }
  }
}

// Initialize events manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Supabase to be ready
  const initEventsManager = () => {
    if (window.supabaseClient) {
      window.eventsManager = new SupabaseEventsManager();
      return;
    }
    setTimeout(initEventsManager, 100);
  };
  initEventsManager();
});
