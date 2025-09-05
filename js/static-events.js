// Static Events Manager (fallback solution)
class StaticEventsManager {
  constructor() {
    this.events = [
      {
        id: "friday-floasis",
        title: "Friday Floasis",
        date: "2025-09-12",
        time: "7:00 PM",
        location: "San Diego",
        description: "Live DJ sets, creator jam session, rooftop vibes.",
        tags: ["social", "irl"],
        detailsUrl: "#",
        rsvpUrl: "#",
        featured: true
      },
      {
        id: "maker-night-tiny-bets",
        title: "Maker Night: Tiny Bets",
        date: "2025-09-18",
        time: "6:30 PM",
        location: "Mission Valley",
        description: "Bring a small idea, leave with a shipped prototype. Tools & snacks provided.",
        tags: ["workshop", "irl"],
        detailsUrl: "#",
        rsvpUrl: "#",
        featured: false
      },
      {
        id: "meeting-of-minds",
        title: "Meeting of the Minds",
        date: "2025-09-20",
        time: "4:00 PM",
        location: "North Park",
        description: "Salon-style conversation night. Philosophy, tech, and what we're building next.",
        tags: ["social", "irl"],
        detailsUrl: "#",
        rsvpUrl: "#",
        featured: false
      },
      {
        id: "horizon-festival",
        title: "Into the Horizon Festival",
        date: "2025-10-05",
        time: "All Day",
        location: "Mission Bay",
        description: "Art, technology, music. A day-long mashup of what makes this community fun.",
        tags: ["festival", "irl"],
        detailsUrl: "#",
        rsvpUrl: "#",
        featured: true
      }
    ];
  }

  async loadEvents() {
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    this.renderEvents();
  }

  renderEvents() {
    const eventsContainer = document.getElementById('events');
    if (!eventsContainer) return;

    if (this.events.length === 0) {
      eventsContainer.innerHTML = `
        <div class="no-events">
          <p>No upcoming events at the moment. Check back soon!</p>
        </div>
      `;
      return;
    }

    // Sort events by date (future events first)
    const now = new Date();
    const sortedEvents = this.events
      .filter(event => new Date(event.date) >= now) // Only future events
      .sort((a, b) => new Date(a.date) - new Date(b.date));

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

    return `
      <article class="event" data-tags="${tagsClass}">
        <h3>${event.title}</h3>
        <time datetime="${event.date}">${formattedDate} • ${event.time} • ${event.location}</time>
        <div class="meta">${event.description}</div>
        <div class="actions">
          <a class="btn" href="${event.detailsUrl}" target="_blank" rel="noopener">Details</a>
          <a class="btn primary" href="${event.rsvpUrl}" target="_blank" rel="noopener">RSVP</a>
        </div>
      </article>
    `;
  }
}

// Initialize static events manager
const staticEventsManager = new StaticEventsManager();