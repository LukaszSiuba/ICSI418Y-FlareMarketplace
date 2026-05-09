import React, { useState } from 'react'
import { supabase } from '../../../supabaseClient.js'
import { z } from 'zod'

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().or(z.literal('')),
})

const EditProfileForm = ({ user, initialData, onSuccess, onCancel }) => {
  // store current form values
  const [formData, setFormData] = useState({
    username: initialData.username || '',
    bio: initialData.bio || '',
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || ''
  })

  // track loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrors({})

    // check data against rules defined above
    const validation = profileSchema.safeParse(formData)

    if (!validation.success) {
      // get error messages for each field if something is wrong
      setErrors(validation.error.formErrors.fieldErrors)
      setIsSubmitting(false)
      return
    }

    // save the changes to db
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        username: formData.username,
        bio: formData.bio,
        first_name: formData.first_name,
        last_name: formData.last_name
      })

    if (error) {
      setMessage(`Update Error: ${error.message}`)
      setIsSubmitting(false)
      return
    }

    // tell parent page to refresh and close form
    onSuccess()
  }

  const inputBase = 'p-2.5 bg-[#0d1117] text-gray-100 placeholder-gray-500 border rounded-md outline-none focus:ring-2 focus:ring-blue-500/50';

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-5 pt-4 border-t border-white/5'>

      <div className='flex flex-col gap-1'>
        <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Username</label>
        <input
          type='text'
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className={`${inputBase} ${errors.username ? 'border-red-500' : 'border-white/10'}`}
          placeholder='Pick a unique username'
        />
        {errors.username && <span className='text-red-400 text-xs mt-1'>{errors.username[0]}</span>}
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='flex flex-col gap-1'>
          <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>First Name</label>
          <input
            type='text'
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className={`${inputBase} ${errors.first_name ? 'border-red-500' : 'border-white/10'}`}
          />
          {errors.first_name && <span className='text-red-400 text-xs mt-1'>{errors.first_name[0]}</span>}
        </div>

        <div className='flex flex-col gap-1'>
          <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Last Name</label>
          <input
            type='text'
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className={`${inputBase} ${errors.last_name ? 'border-red-500' : 'border-white/10'}`}
          />
          {errors.last_name && <span className='text-red-400 text-xs mt-1'>{errors.last_name[0]}</span>}
        </div>
      </div>

      <div className='flex flex-col gap-1'>
        <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className={`${inputBase} resize-none ${errors.bio ? 'border-red-500' : 'border-white/10'}`}
          placeholder='Tell us about your collection...'
        />
        {errors.bio && <span className='text-red-400 text-xs mt-1'>{errors.bio[0]}</span>}
      </div>

      {message && <p className='text-sm font-medium text-red-400'>{message}</p>}

      <div className='flex gap-3 mt-2'>
        <button
          type='button'
          onClick={onCancel}
          disabled={isSubmitting}
          className='flex-1 px-4 py-2 border border-white/10 bg-white/5 text-gray-300 rounded-md hover:bg-white/10 disabled:opacity-50 font-semibold transition-colors'
        >
          Cancel
        </button>
        <button
          type='submit'
          disabled={isSubmitting}
          className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 font-semibold transition-all active:scale-95'
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

export default EditProfileForm