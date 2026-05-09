import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

const Navbar = ({ user, onAuthClick, onSignOut }) => {
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const links = [
    { to: '/', label: 'Home' },
    { to: '/market', label: 'Market' },
    { to: '/listings', label: 'Listings' },
    { to: '/messages', label: 'Messages' },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    if (onSignOut) onSignOut()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#30363d] bg-[#161b22]">
      <div className="flex items-center w-full px-6 md:px-10 py-3 gap-6">
        <Link to="/" className="text-xl font-bold text-blue-400 tracking-tight flex-shrink-0">
          Flare
        </Link>
        <nav className="flex items-center gap-1">
          {links.map(({ to, label }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-[#1c2128]'
                    : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#1c2128]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3 ml-auto">
          {!user ? (
            <button
              onClick={onAuthClick}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-500 transition-colors"
            >
              Sign In / Sign Up
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-blue-400 transition-all"
              >
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  : (((user.user_metadata?.first_name?.[0] || '') + (user.user_metadata?.last_name?.[0] || '')).toUpperCase() || user.email?.[0]?.toUpperCase() || '?')
                }
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#30363d]">
                    <p className="text-xs font-semibold text-white truncate">
                      {user.user_metadata?.username || user.email}
                    </p>
                    <p className="text-xs text-[#8b949e] truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#1c2128] transition-colors"
                  >
                    👤 Profile
                  </Link>
                  <button
                    onClick={() => { setDropdownOpen(false); handleSignOut() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#1c2128] transition-colors"
                  >
                    ↩ Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
