import React from 'react'
import {Routes, Route} from 'react-router-dom'
import './styles.css'
import Home from './pages/individuals/home'
import Market from './pages/individuals/Market'
import Listings from './pages/individuals/Listings'
import Messages from './pages/individuals/Messages'
import Profile from './pages/individuals/profile'
import Support from './pages/individuals/Support';
import SupportMessages from './pages/individuals/SupportMessages';
import Admin from './pages/individuals/Admin';
import Wallet from './pages/individuals/Wallet';
import UserProfile from './pages/individuals/UserProfile';
import OnlinePresenceTracker from './components/OnlinePresenceTracker';
import ModerationEnforcer from './components/ModerationEnforcer';
// import Layout from './log/layout'
import RootLayout from './rootlayout'
import ResetPassword from './pages/ResetPassword'

//Need more routing
const App = () => {
  return (
    <main className='w-full min-h-screen'>
      <OnlinePresenceTracker />
      <ModerationEnforcer />
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="market" element={<Market />} />
          <Route path="listings" element={<Listings />} />
          <Route path="messages" element={<Messages />} />
          <Route path="support-messages" element={<SupportMessages />} />
          <Route path="profile" element={<Profile />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="user/:id" element={<UserProfile />} />
          <Route path="admin" element={<Admin />} />
        </Route>
        <Route path="/support" element={<Support />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </main>
  )
}

export default App