import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import Navbar from '@/components/ui/navbar.jsx'
import AuthModal from '@/log/forms/authmodal.jsx'
import EditProfileForm from '@/log/forms/editprofile.jsx'

const Profile = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState({
    username: '',
    bio: '',
    first_name: '',
    last_name: '',
    phone: null,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Get data from Supabase
  const fetchUserData = async () => {
    try {
      const { data: authResponse } = await supabase.auth.getUser()
      const authUser = authResponse?.user

      if (authUser) {
        setUser(authUser)
        const { data: dbUser } = await supabase
          .from('users')
          .select('username, bio, first_name, last_name, phone')
          .eq('id', authUser.id)
          .maybeSingle()

        if (dbUser) {
          setProfileData(dbUser)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUserData()
  }, [])

  // When the form saves successfully, refresh data and close form
  const handleUpdateSuccess = async () => {
    await fetchUserData()
    setIsEditing(false)
  }

  if (loading) return <div className="profile-loading">Loading...</div>

  return (
    <div className="profile-container">
      <Navbar user={user} setUser={setUser} setIsAuthModalOpen={setIsAuthModalOpen} />

      <main className="profile-main">
        <div className="profile-card">
          <div className="profile-banner">
            <div className="profile-banner-radial" />
          </div>

          <div className="profile-content">
            {/* Avatar Circle */}
            <div className="profile-avatar-outer">
              <div className="profile-avatar-inner">
                <div className="profile-avatar-text">
                  {profileData.first_name?.charAt(0) || user?.email?.charAt(0)}
                </div>
              </div>
            </div>

            <div className="profile-header-row">
              <div>
                <h2 className="profile-name">
                  {profileData.first_name ? `${profileData.first_name} ${profileData.last_name}` : 'Collector'}
                </h2>
                <p className="profile-username">@{profileData.username || 'username'}</p>
                <p className="profile-email">{user?.email}</p>
              </div>
              {!isEditing && user && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="profile-edit-btn"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <EditProfileForm
                user={user}
                initialData={profileData}
                onSuccess={handleUpdateSuccess}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div className="profile-bio-section">
                  <h3 className="profile-bio-label">Bio</h3>
                  <p className="profile-bio-text">{profileData.bio || 'No bio added yet.'}</p>
                </div>

              </>
            )}
          </div>
        </div>
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={async () => {
        setIsAuthModalOpen(false)
        await fetchUserData()
      }} />
    </div>
  )
}

export default Profile