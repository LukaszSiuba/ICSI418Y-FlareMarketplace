import React, { useState } from 'react'
import SignIn from '@/log/forms/signin.jsx'
import SignUp from '@/log/forms/signup.jsx'

const AuthModal = ({ isOpen, onClose }) => {
  // state to track whether user is signing in or signing up
  const [isLogin, setIsLogin] = useState(true)
  // render nothing if modal is not open
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md'>
      <div className='relative w-full max-w-md p-8 bg-[#161b22] border border-white/10 rounded-xl text-gray-200'>

        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-gray-500 hover:text-white text-xl'
          aria-label='Close auth modal'
        >
          X
        </button>

        {isLogin ? (<SignIn onSuccess={onClose}/>) : (<SignUp onSuccess={onClose}/>)}

        <div className='mt-4 text-center'>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className='text-sm text-blue-400 hover:text-blue-300 transition-colors'
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuthModal
