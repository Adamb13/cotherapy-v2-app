import { useState, useEffect } from 'react'
import { getTherapist, getClient } from './lib/db'
import Intake from './pages/Intake'
import PostSession from './pages/PostSession'
import PreSession from './pages/PreSession'
import ClientChat from './pages/ClientChat'

const DEMO_PASSWORD = 'c0Therapy2025!'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [userType, setUserType] = useState('therapist')
  const [currentView, setCurrentView] = useState('intake')
  const [therapist, setTherapist] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('cotherapy_auth') === 'true') {
      setAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (authenticated) {
      loadData()
    }
  }, [authenticated])

  function handleLogin(e) {
    e.preventDefault()
    if (passwordInput === DEMO_PASSWORD) {
      sessionStorage.setItem('cotherapy_auth', 'true')
      setAuthenticated(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  async function loadData() {
    try {
      const [t, c] = await Promise.all([
        getTherapist(),
        getClient()
      ])
      setTherapist(t)
      setClient(c)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Password screen
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cream)',
        padding: '24px'
      }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 4C8 4 4 8 4 12s4 8 8 8c2 0 4-1 5.5-2.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 4c4 0 8 4 8 8s-4 8-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
                <circle cx="12" cy="12" r="2" fill="white"/>
              </svg>
            </div>
            <span className="logo-text">CoTherapy<span>.ai</span></span>
          </div>
          <h2 style={{ marginBottom: '8px' }}>Demo Access</h2>
          <p style={{ color: 'var(--warm-gray)', marginBottom: '24px', fontSize: '14px' }}>
            Enter password to view the prototype
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              className="form-input"
              placeholder="Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            {passwordError && (
              <p style={{ color: 'var(--error)', fontSize: '13px', marginBottom: '16px' }}>
                Incorrect password. Please try again.
              </p>
            )}
            <button type="submit" className="btn primary" style={{ width: '100%' }}>
              Enter Demo
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        Loading CoTherapy...
      </div>
    )
  }

  return (
    <>
      {/* Navigation */}
      <nav className="nav">
        <div className="logo">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 4C8 4 4 8 4 12s4 8 8 8c2 0 4-1 5.5-2.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 4c4 0 8 4 8 8s-4 8-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4"/>
              <circle cx="12" cy="12" r="2" fill="white"/>
            </svg>
          </div>
          <span className="logo-text">CoTherapy<span>.ai</span></span>
        </div>
        
        <div className="nav-links">
          {userType === 'therapist' ? (
            <>
              <button 
                className={`nav-link ${currentView === 'intake' ? 'active' : ''}`}
                onClick={() => setCurrentView('intake')}
              >
                <span>⚙</span> Intake
              </button>
              <button 
                className={`nav-link ${currentView === 'post-session' ? 'active' : ''}`}
                onClick={() => setCurrentView('post-session')}
              >
                <span>✎</span> Post-Session
              </button>
              <button 
                className={`nav-link ${currentView === 'pre-session' ? 'active' : ''}`}
                onClick={() => setCurrentView('pre-session')}
              >
                <span>☰</span> Pre-Session
              </button>
            </>
          ) : (
            <button className="nav-link active">
              <span>💬</span> Chat
            </button>
          )}
        </div>
        
        <div className="nav-right">
          <div className="view-toggle">
            <button 
              className={userType === 'therapist' ? 'active' : ''}
              onClick={() => { setUserType('therapist'); setCurrentView('intake'); }}
            >
              Therapist View
            </button>
            <button 
              className={userType === 'client' ? 'active' : ''}
              onClick={() => setUserType('client')}
            >
              Client View
            </button>
          </div>
          <div className="avatar">
            {userType === 'therapist' ? 'DR' : 'CL'}
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main>
        {userType === 'client' ? (
          <ClientChat client={client} therapist={therapist} />
        ) : (
          <>
            {currentView === 'intake' && (
              <Intake 
                therapist={therapist} 
                onUpdate={setTherapist}
                onNext={() => setCurrentView('post-session')}
              />
            )}
            {currentView === 'post-session' && (
              <PostSession 
                therapist={therapist}
                client={client}
                onNext={() => setCurrentView('pre-session')}
              />
            )}
            {currentView === 'pre-session' && (
              <PreSession 
                therapist={therapist}
                client={client}
              />
            )}
          </>
        )}
      </main>
    </>
  )
}

export default App
