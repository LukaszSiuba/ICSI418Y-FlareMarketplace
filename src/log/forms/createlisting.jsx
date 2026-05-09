import React, { useState } from 'react'
import { supabase } from '../../../supabaseClient.js'
import { z } from 'zod'

// define the rules for the form data
const listingSchema = z.object({
  selectedCardId: z.string().min(1, 'You must select a card'),
  price: z.coerce
    .number()
    .positive('Price must be more than 0')
    .max(100000, 'Price is too high'),
  condition: z.enum(['Mint', 'Near Mint', 'Lightly Played', 'Heavily Played', 'Damaged']),
})

const CreateListingForm = ({ user, cards, onSuccess }) => {
  // store form data in state
  const [selectedCardId, setSelectedCardId] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState('Near Mint')
  const [imageFile, setImageFile] = useState(null)

  // track status and error messages
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const handleCreateListing = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrors({})
    try {
      // check if input data follows the zod 
      const validation = listingSchema.safeParse({ selectedCardId, price, condition })

      if (!validation.success) {
        setErrors(validation.error.formErrors.fieldErrors)
        setIsSubmitting(false)
        return
      }

      let imageUrl = null

      // if photo was selected, upload to storage
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('listing_images')
          .upload(fileName, imageFile)

        if (uploadError) {
          console.error('Photo upload failed:', uploadError)
          setMessage(`Photo upload failed: ${uploadError.message}`)
          setIsSubmitting(false)
          return
        }

        // get link for uploaded photo
        const { data: { publicUrl } } = supabase.storage
          .from('listing_images')
          .getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      // save new listing to db
      const { error: dbError } = await supabase
        .from('listings')
        .insert([
          {
            seller_id: user.id,
            card_id: selectedCardId,
            price: Number(price),
            condition: condition,
            image_url: imageUrl,
            is_active: true,
          }
        ])

      if (dbError) {
        console.error('Database error:', dbError)
        setMessage(`Database error: ${dbError.message}`)
        setIsSubmitting(false)
        return
      }

      // clear form and trigger success callback
      setSelectedCardId('')
      setPrice('')
      setCondition('Near Mint')
      setImageFile(null)
      setMessage('Listing created successfully!')
      onSuccess()
      setIsSubmitting(false)
    } catch (err) {
      console.error('Unexpected error:', err)
      setMessage(`Unexpected error: ${err.message || err}`)
      setIsSubmitting(false)
    }
  }

  const inputBase = 'p-2.5 bg-[#0d1117] text-gray-100 placeholder-gray-500 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50';

  return (
    <section className='bg-[#161b22] p-6 md:p-8 rounded-xl border border-white/5'>
      <h3 className='text-xl font-bold mb-6 border-b border-white/5 pb-4 text-white tracking-tight'>Create New Listing</h3>

      <form onSubmit={handleCreateListing} className='flex flex-col gap-5 max-w-md'>

        <div className='flex flex-col gap-1'>
          <label className='font-semibold text-gray-500 text-xs uppercase tracking-wider'>Card Photo (Optional)</label>
          <input
            type='file'
            accept='image/*'
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className='p-2 bg-[#0d1117] border border-white/10 text-gray-300 rounded-md text-sm file:bg-white/5 file:border-0 file:text-gray-200 file:px-3 file:py-1 file:rounded file:mr-3'
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label className='font-semibold text-gray-500 text-xs uppercase tracking-wider'>Select Card</label>
          <select
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
            className={`${inputBase} ${errors.selectedCardId ? 'border-red-500' : 'border-white/10'}`}
          >
            <option value='' disabled>-- Choose a card --</option>
            {cards.map(card => (
              <option key={card.id} value={card.id}>{card.name} ({card.rarity})</option>
            ))}
          </select>
          {errors.selectedCardId && <span className='text-red-400 text-xs mt-1'>{errors.selectedCardId[0]}</span>}
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='flex flex-col gap-1'>
            <label className='font-semibold text-gray-500 text-xs uppercase tracking-wider'>Price ($)</label>
            <input
              type='number'
              step='0.01'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${inputBase} ${errors.price ? 'border-red-500' : 'border-white/10'}`}
              placeholder='0.00'
            />
            {errors.price && <span className='text-red-400 text-xs mt-1'>{errors.price[0]}</span>}
          </div>

          <div className='flex flex-col gap-1'>
            <label className='font-semibold text-gray-500 text-xs uppercase tracking-wider'>Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className={`${inputBase} border-white/10`}
            >
              <option value='Mint'>Mint</option>
              <option value='Near Mint'>Near Mint</option>
              <option value='Lightly Played'>Lightly Played</option>
              <option value='Heavily Played'>Heavily Played</option>
              <option value='Damaged'>Damaged</option>
            </select>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-md text-sm font-medium ${message.includes('failed') || message.includes('error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
            {message}
          </div>
        )}

        <button
          type='submit'
          disabled={isSubmitting}
          className='mt-4 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50'
        >
          {isSubmitting ? 'Posting...' : 'Post Listing'}
        </button>
      </form>
    </section>
  )
}

export default CreateListingForm