import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../supabaseClient'

import SupportModal from './supportmodal'
import NotificationsBell from './notificationsbell'

const Navbar = ({ user, setUser, setIsAuthModalOpen }) => {
  const [supportOpen, setSupportOpen] = useState(false);
  const [role, setRole] = useState(null);

  // look up signed-in user's role so we can show owner-only links
  useEffect(() => {
    let cancelled = false;
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        return;
      }
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (cancelled) return;
      if (error && error.code !== 'PGRST116') {
        setRole(null);
        return;
      }
      setRole(data?.role || null);
    };
    void fetchRole();
    return () => { cancelled = true; };
  }, [user]);

  // end session and clear user state
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
  }

  return (
    <>
      <header className='sticky top-0 z-40 w-full bg-[#0d1117]/90 backdrop-blur border-b border-white/5'>
        <div className='flex items-center justify-between w-full px-6 md:px-12 py-4'>
          <Link to='/' className='inline-flex items-center'>
            <img
              src='/assets/TransWhiteFlare.png'
              alt='Flare'
              className='h-16 md:h-24 w-auto object-contain'
            />
          </Link>

          <div className='flex items-center justify-center gap-6 ml-auto'>
            <nav className='flex gap-6 items-center'>
              <Link to='/' className='text-gray-300 hover:text-white font-medium transition-colors text-sm'>
                Home
              </Link>
              {user && (
                <>
                  <Link to='/listings' className='text-gray-300 hover:text-white font-medium transition-colors text-sm'>
                    Listings
                  </Link>
                  <Link to='/wallet' className='text-gray-300 hover:text-white font-medium transition-colors text-sm'>
                    Wallet
                  </Link>
                  <Link to='/messages' className='text-gray-300 hover:text-white font-medium transition-colors text-sm'>
                    Messages
                  </Link>
                  <Link to='/profile' className='text-gray-300 hover:text-white font-medium transition-colors text-sm'>
                    Profile
                  </Link>
                  {(role === 'admin' || role === 'owner') && (
                    <Link to='/admin' className='text-purple-300 hover:text-purple-200 font-semibold transition-colors text-sm'>
                      Admin
                    </Link>
                  )}
                  {role === 'support' && (
                    <Link to='/support' className='text-blue-400 hover:text-blue-300 font-semibold transition-colors text-sm'>
                      Support
                    </Link>
                  )}
                  <button
                    onClick={() => setSupportOpen(true)}
                    className='px-4 py-1.5 bg-white/5 text-blue-400 font-semibold rounded-md hover:bg-white/10 transition-colors border border-white/10 ml-2 text-sm'
                  >
                    Support
                  </button>
                </>
              )}
            </nav>

            {user && <NotificationsBell user={user} />}

            {!user ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className='px-5 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-500 transition-colors cursor-pointer font-semibold text-sm'
              >
                Sign In / Sign Up
              </button>
            ) : (
              <button
                onClick={() => void handleSignOut()}
                className='px-5 py-2 text-red-400 border border-red-500/40 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer font-semibold text-sm'
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>
      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} user={user} />
    </>
  )
}

export default Navbar
