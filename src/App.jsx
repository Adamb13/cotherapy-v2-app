import { useState, useEffect } from 'react'
import { getTherapist, getClient, getAllClientsForTherapist, getDyadStatus, DYAD_STATES } from './lib/db'
import { DEMO_THERAPIST_ID } from './lib/supabase'
import TherapistSettings from './pages/TherapistSettings'
import ClientOnboarding from './pages/ClientOnboarding'
import PostSession from './pages/PostSession'
import PreSession from './pages/PreSession'
import ClientChat from './pages/ClientChat'
import ClientConsent from './pages/ClientConsent'

const DEMO_PASSWORD = 'c0Therapy2025!'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [userType, setUserType] = useState('therapist')
  const [currentView, setCurrentView] = useState('settings')
  const [therapist, setTherapist] = useState(null)
  const [client, setClient] = useState(null)
  const [clients, setClients] = useState([])
  const [showClientSelector, setShowClientSelector] = useState(false)
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
      const [t, c, allClients] = await Promise.all([
        getTherapist(),
        getClient(),
        getAllClientsForTherapist(DEMO_THERAPIST_ID)
      ])
      setTherapist(t)
      setClient(c)
      // Show all non-terminated clients (including invited, pending_config, paused)
      setClients(allClients.filter(cl => getDyadStatus(cl) !== DYAD_STATES.TERMINATED))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reload clients when returning from client onboarding
  async function reloadClients() {
    const allClients = await getAllClientsForTherapist(DEMO_THERAPIST_ID)
    // Show all non-terminated clients (including invited, pending_config, paused)
    setClients(allClients.filter(cl => getDyadStatus(cl) !== DYAD_STATES.TERMINATED))
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
                className={`nav-link ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentView('settings')}
              >
                <span>⚙</span> My Practice
              </button>
              <button
                className={`nav-link ${currentView === 'client-onboarding' ? 'active' : ''}`}
                onClick={() => setCurrentView('client-onboarding')}
              >
                <span>👤</span> Client Setup
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
          {/* Client Selector (Therapist view only) */}
          {userType === 'therapist' && clients.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowClientSelector(!showClientSelector)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: 'var(--sand)',
                  border: '1px solid var(--sand-dark)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                <span>👤</span>
                <span>{client?.display_name || 'Select Client'}</span>
                <span style={{ opacity: 0.5 }}>▼</span>
              </button>
              {showClientSelector && (
                <>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                    onClick={() => setShowClientSelector(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'white',
                    borderRadius: 8,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    border: '1px solid var(--sand-dark)',
                    minWidth: 200,
                    zIndex: 100,
                    overflow: 'hidden'
                  }}>
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClient(c)
                          setShowClientSelector(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '10px 14px',
                          background: c.id === client?.id ? 'var(--sage-light)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 13,
                          textAlign: 'left',
                          borderBottom: '1px solid var(--sand)'
                        }}
                      >
                        <span>{c.id === client?.id ? '✓' : '  '}</span>
                        {c.display_name || 'Unnamed'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="view-toggle">
            <button
              className={userType === 'therapist' ? 'active' : ''}
              onClick={() => { setUserType('therapist'); setCurrentView('settings'); }}
            >
              Therapist
            </button>
            <button
              className={userType === 'client' ? 'active' : ''}
              onClick={() => setUserType('client')}
            >
              Client
            </button>
          </div>
          <div className="avatar" title={userType === 'therapist' ? therapist?.full_name : client?.display_name} style={{ fontSize: userType === 'therapist' ? 11 : 14 }}>
            {userType === 'therapist'
              ? ('Dr. ' + (therapist?.full_name?.split(' ').pop()?.[0] || 'T'))
              : (client?.display_name?.[0]?.toUpperCase() || 'CL')
            }
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main>
        {userType === 'client' ? (
          // Show consent screen if client is in 'invited' status, otherwise show chat
          getDyadStatus(client) === DYAD_STATES.INVITED ? (
            <ClientConsent
              client={client}
              therapist={therapist}
              onConsentAccepted={(updatedClient) => {
                setClient(updatedClient)
                reloadClients()
              }}
            />
          ) : (
            <ClientChat client={client} therapist={therapist} />
          )
        ) : (
          <>
            {currentView === 'settings' && (
              <TherapistSettings
                therapist={therapist}
                onUpdate={setTherapist}
                onNext={() => setCurrentView('client-onboarding')}
              />
            )}
            {currentView === 'client-onboarding' && (
              <ClientOnboarding
                therapist={therapist}
                client={client}
                onClientUpdate={(updatedClient) => {
                  setClient(updatedClient)
                  reloadClients()
                }}
                onNext={() => setCurrentView('post-session')}
              />
            )}
            {currentView === 'post-session' && (
              <PostSession
                therapist={therapist}
                client={client}
                onClientUpdate={setClient}
                onNext={() => setCurrentView('pre-session')}
              />
            )}
            {currentView === 'pre-session' && (
              <PreSession
                therapist={therapist}
                client={client}
                onClientUpdate={setClient}
              />
            )}
          </>
        )}
      </main>
    </>
  )
}

export default App
