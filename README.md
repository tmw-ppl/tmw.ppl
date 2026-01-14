# Tomorrow People - React Version

A modern React application for the Tomorrow People community, built with Vite, TypeScript, and Supabase.

## 🚀 Features

- **Modern React Architecture**: Built with React 18, TypeScript, and Vite for optimal performance
- **Authentication**: Secure user authentication with Supabase Auth
- **Event Management**: Dynamic event loading with filtering and image scraping
- **Responsive Design**: Mobile-first design with dark/light theme support
- **Real-time Updates**: Live data synchronization with Supabase
- **Type Safety**: Full TypeScript support for better developer experience

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Custom CSS with CSS Variables
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router v6
- **State Management**: React Context + Hooks

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Card, Chip)
│   ├── Header.tsx      # Navigation header
│   ├── Footer.tsx      # Site footer
│   └── Layout.tsx      # Main layout wrapper
├── contexts/           # React Context providers
│   └── AuthContext.tsx # Authentication context
├── lib/                # External library configurations
│   └── supabase.ts     # Supabase client setup
├── pages/              # Page components
│   ├── Home.tsx        # Landing page
│   ├── Events.tsx      # Events listing
│   ├── Auth.tsx        # Authentication forms
│   ├── Profile.tsx     # User profile
│   ├── Projects.tsx    # Projects showcase
│   ├── Profiles.tsx    # Community profiles
│   └── CreateEvent.tsx # Event creation
├── App.tsx             # Main app component with routing
├── main.tsx           # App entry point
└── index.css          # Global styles and CSS variables
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
 
4. Open your browser to `http://localhost:5173`

### Environment Setup

The app is configured to use the existing Supabase instance. No additional environment variables are needed for basic functionality.

## 🎨 Design System

### CSS Variables
The app uses a comprehensive CSS variable system for consistent theming:

```css
:root {
  --bg: #0b1220;           /* Background color */
  --text: #e6f0ff;         /* Primary text */
  --primary: #34d399;      /* Teal accent */
  --accent: #60a5fa;       /* Blue accent */
  --hot: #f59e0b;          /* Amber accent */
  --card: #121a2b;         /* Card background */
  --border: #1f2a44;       /* Border color */
}
```

### Components
- **Button**: Configurable button with variants (primary, secondary, danger, etc.)
- **Card**: Consistent card styling for content blocks
- **Chip**: Interactive filter chips for event filtering
- **Layout**: Responsive layout wrapper with header and footer

## 🔐 Authentication

The app uses Supabase Auth with the following features:

- Email/password authentication
- User registration with profile creation
- Protected routes
- Session persistence
- Automatic redirects based on auth state

## 📅 Events System

### Features
- Dynamic event loading from Supabase
- Real-time filtering by category and date
- Automatic image scraping from Partiful links
- Responsive event cards
- RSVP integration

### Event Structure
```typescript
interface Event {
  id: string
  title: string
  description?: string
  date: string
  time?: string
  location?: string
  rsvp_url?: string
  image_url?: string
  tags?: string[]
  published: boolean
  created_by: string
}
```

## 🚀 Deployment

The app can be deployed to any static hosting service:

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting service

### Recommended Platforms
- Vercel (zero-config deployment)
- Netlify (great for static sites)
- GitHub Pages (free hosting)

## 🔄 Migration from Vanilla JS

This React version maintains feature parity with the original vanilla JavaScript version while adding:

- **Better State Management**: React Context instead of global variables
- **Type Safety**: TypeScript interfaces for all data structures
- **Component Reusability**: Modular components for better maintainability
- **Modern Development Experience**: Hot reload, TypeScript checking, and better debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the Tomorrow People community. See the main project for licensing information.

## 🆘 Support

For questions or issues:
1. Check the original tmw.ppl documentation
2. Review the Supabase setup guides
3. Open an issue in the repository

---

**Tomorrow People** - Building, learning, and playing with people who make tomorrow.