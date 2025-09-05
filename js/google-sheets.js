// Google Sheets Events Manager
class GoogleSheetsEventsManager {
  constructor() {
    this.sheetsUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQnQ0ktcAVsNXuF5T7zh4ijOSErWS4yQqC8oZc1Ca-VlGb33UEeXsivS-idi6aFfKlc9NjAzTSWby1T/pub?gid=750063072&single=true&output=csv';
    this.events = [];
    this.loading = false;
    this.error = null;
  }

  async loadEvents() {
    this.loading = true;
    this.error = null;
    
    // Show loading state
    this.renderLoading();
    
    try {
      // Use CORS proxy to bypass browser restrictions
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const fullUrl = proxyUrl + encodeURIComponent(this.sheetsUrl);
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      
      // Parse CSV data
      this.events = this.parseCSV(csvText);
      
      // Scrape images for events with Partiful links
      await this.scrapeEventImages();
      
      this.renderEvents('upcoming'); // Default to upcoming events
    } catch (err) {
      console.error('Google Sheets error:', err);
      this.error = err.message;
      this.renderError();
    } finally {
      this.loading = false;
    }
  }

  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = this.parseCSVLine(lines[0]); // Use proper CSV parsing for headers too
    
    const events = [];
    
    // Skip header row, process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= headers.length) {
        const event = this.createEventFromRow(headers, values);
        if (event && event.published) { // Only show published events
          events.push(event);
        }
      }
    }
    
    return events;
  }

  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  createEventFromRow(headers, values) {
    const event = {};
    
    // Map CSV columns to event properties
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();
      const value = values[i] ? values[i].trim() : '';
      
      switch (header) {
        case 'Title':
          event.title = value;
          break;
        case 'Description':
          event.description = value;
          break;
        case 'Starts Time':
          event.date = this.parseDate(value);
          event.time = this.parseTime(value);
          break;
        case 'End Time':
          event.endTime = this.parseTime(value);
          break;
        case 'Location':
          event.location = value;
          break;
        case 'Partiful Link':
        case 'Partiful':
        case 'Link':
        case 'RSVP Link':
        case 'Event Link':
          // Only set links if there's actually a URL
          if (value && value.trim() !== '') {
            event.detailsUrl = value.trim();
            event.rsvpUrl = value.trim(); // Using same link for both
          }
          break;
        case 'Type of Event':
        case 'Event Type':
        case 'Types':
        case 'Tags':
          // Parse comma-separated event types as tags array
          if (value && value.trim() !== '') {
            event.tags = value.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
          }
          break;
        case 'Published':
        case '"Published"': // Handle escaped quotes
          // Coerce text to boolean - only TRUE/FALSE values
          event.published = value.toUpperCase() === 'TRUE';
          break;
      }
    }
    
    // Set defaults
    event.id = `event-${Math.random().toString(36).substr(2, 9)}`;
    // Only set description if it exists, otherwise leave empty
    if (!event.description || event.description.trim() === '') {
      event.description = '';
    }
    // Only set default tags if no tags were found
    if (!event.tags || event.tags.length === 0) {
      event.tags = ['irl']; // Default tag
    }
    
    // If published field is undefined or empty, default to true (show all events unless explicitly hidden)
    if (event.published === undefined || event.published === null) {
      event.published = true;
    }
    
    return event;
  }

  async scrapeEventImages() {
    const eventsWithPartiful = this.events.filter(event => 
      event.rsvpUrl && event.rsvpUrl.includes('partiful.com')
    );
    
    console.log(`Scraping images for ${eventsWithPartiful.length} Partiful events`);
    
    for (const event of eventsWithPartiful) {
      try {
        const imageUrl = await this.scrapePartifulImage(event.rsvpUrl);
        if (imageUrl) {
          event.imageUrl = imageUrl;
          console.log(`✅ Found image for ${event.title}`);
        }
      } catch (error) {
        console.warn(`Failed to scrape image for ${event.title}:`, error);
      }
    }
  }

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
        console.log(`✅ Found image for [${this.currentEventTitle}]: ${metaImageMatch[1]}`);
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

  parseDate(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      console.warn('Could not parse date:', dateString);
      return '';
    }
  }

  parseTime(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      console.warn('Could not parse time:', dateString);
      return '';
    }
  }

  renderEvents(filter = 'upcoming') {
    const eventsContainer = document.getElementById('events');
    if (!eventsContainer) return;

    if (this.events.length === 0) {
      eventsContainer.innerHTML = `
        <div class="no-events">
          <p>No events at the moment. Check back soon!</p>
        </div>
      `;
      return;
    }

    // Filter events based on the selected filter
    const now = new Date();
    let filteredEvents = this.events;

    switch (filter) {
      case 'upcoming':
        filteredEvents = this.events.filter(event => new Date(event.date) >= now);
        break;
      case 'past':
        filteredEvents = this.events.filter(event => new Date(event.date) < now);
        break;
      case 'all':
        // Show all events
        break;
      default:
        // Tag-based filtering (irl, workshop, social)
        filteredEvents = this.events.filter(event => 
          event.tags && event.tags.includes(filter)
        );
    }

    // Sort events by date
    const sortedEvents = filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedEvents.length === 0) {
      eventsContainer.innerHTML = `
        <div class="no-events">
          <p>No ${filter} events found.</p>
        </div>
      `;
      return;
    }

    eventsContainer.innerHTML = sortedEvents.map(event => this.renderEvent(event)).join('');
  }

  renderEvent(event) {
    const date = new Date(event.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const tagsClass = Array.isArray(event.tags) ? event.tags.join(' ') : event.tags;
    
    // Format time range (handle optional times)
    let timeDisplay = '';
    if (event.time) {
      timeDisplay = event.time;
      if (event.endTime) {
        timeDisplay = `${event.time} - ${event.endTime}`;
      }
    }

    // Build the time/location display
    let timeLocationDisplay = formattedDate;
    if (timeDisplay) {
      timeLocationDisplay += ` • ${timeDisplay}`;
    }
    if (event.location) {
      timeLocationDisplay += ` • ${event.location}`;
    }

    // Build image (only show if it exists)
    const imageHtml = event.imageUrl ? `<div class="event-image"><img src="${event.imageUrl}" alt="${event.title}" loading="lazy"></div>` : '';

    // Build description (only show if it exists)
    const descriptionHtml = event.description ? `<div class="meta">${event.description}</div>` : '';

    // Build action buttons (only show if links exist)
    let actionsHtml = '';
    if (event.rsvpUrl) {
      actionsHtml = '<div class="actions">';
      if (event.rsvpUrl.includes('partiful.com')) {
        actionsHtml += `<a class="btn primary" href="${event.rsvpUrl}" target="_blank" rel="noopener">RSVP on Partiful</a>`;
      } else {
        actionsHtml += `<a class="btn primary" href="${event.rsvpUrl}" target="_blank" rel="noopener">RSVP</a>`;
      }
      actionsHtml += '</div>';
    }

    return `
      <article class="event" data-tags="${tagsClass}">
        <div class="event-content">
          <div class="event-title-row">
            <div class="event-title-section">
              <h3>${event.title}</h3>
              ${actionsHtml}
            </div>
          </div>
          ${descriptionHtml}
          <time datetime="${event.date}">${timeLocationDisplay}</time>
        </div>
        ${imageHtml}
      </article>
    `;
  }

  renderError() {
    const eventsContainer = document.getElementById('events');
    if (!eventsContainer) return;

    eventsContainer.innerHTML = `
      <div class="error-message">
        <p>Sorry, we couldn't load the events from Google Sheets. Please try again later.</p>
        <button class="btn" onclick="googleSheetsEventsManager.loadEvents()">Retry</button>
      </div>
    `;
  }

  renderLoading() {
    const eventsContainer = document.getElementById('events');
    if (!eventsContainer) return;

    eventsContainer.innerHTML = `
      <div class="loading-message">
        <p>Loading events from Google Sheets...</p>
      </div>
    `;
  }
}

// Initialize Google Sheets events manager
const googleSheetsEventsManager = new GoogleSheetsEventsManager();