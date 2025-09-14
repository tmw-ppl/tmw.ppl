import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Pages
import Home from './pages/Home'
import Events from './pages/Events'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Projects from './pages/Projects'
import Profiles from './pages/Profiles'
import CreateEvent from './pages/CreateEvent'
import Confirm from './pages/Confirm'
import EditEvent from './pages/EditEvent'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/confirm" element={<Confirm />} />
              <Route path="/edit-event" element={<EditEvent />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App