import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
//Root layout, useLocation for cleaner page transitions.
const RootLayout = () => {
  const location = useLocation() 
  return (
    <div key={location.pathname} className='route-fade-enter w-full min-h-screen'>
      <Outlet />
    </div>
  )
}

export default RootLayout
