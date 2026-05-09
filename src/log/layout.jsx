import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import flareLogo from '../../assets/TranspFlare.png'

const Layout = () => {
  const authenticated = false
  return (
    <>
      {authenticated ? (
        <Navigate to="/" />
      ) : (
        <section className="relative flex min-h-screen flex-1 flex-col items-center justify-center px-6 py-10">
          <img
            src={flareLogo}
            alt="Flare"
            className="absolute top-6 h-auto w-32"
          />
          <Outlet /> 
        </section>
      )}
    </>
  )
}

export default Layout

