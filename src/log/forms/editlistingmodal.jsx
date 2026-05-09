import React, { useState } from 'react'
import { supabase } from '../../../supabaseClient.js'
import { z } from 'zod'

const editSchema = z.object({
  price: z.coerce
    .number()
    .positive("Price must be more than 0")
    .max(100000, "Price is too high"),
  condition: z.enum(['Mint', 'Near Mint', 'Lightly Played', 'Heavily Played', 'Damaged']),
})

const EditListingModal = ({ listing, onClose, onSuccess }) => {
  // syncd local state to existing listing data
  const [price, setPrice] = useState(listing.price || 0)
  const [condition, setCondition] = useState(listing.condition || 'Near Mint')

  // track submission status & validation errors
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const handleUpdate = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrors({})

    // check if updated values follow the Zod 
    const validation = editSchema.safeParse({ price, condition })

    if (!validation.success) {
      // catch and show errors if price or condition is invalid
      setErrors(validation.error.formErrors.fieldErrors)
      setIsSubmitting(false)
      return
    }

    // send updated data to db
    const { error } = await supabase
      .from('listings')
      .update({
        price: Number(price),
        condition: condition,
      })
      .eq('id', listing.id)

    if (error) {
      // show an error message if db update fails
      setMessage(`Update Error: ${error.message}`)
      setIsSubmitting(false)
      return
    }

    // refresh list and close modal on success
    onSuccess()
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4'>
      <div className='bg-[#161b22] border border-white/10 rounded-xl w-full max-w-md overflow-hidden text-gray-200'>

        <header className='p-6 border-b border-white/5 flex justify-between items-center'>
          <h3 className='text-xl font-extrabold text-white tracking-tight'>Edit {listing.cards?.name}</h3>
          <button onClick={onClose} className='text-gray-500 hover:text-white text-xl cursor-pointer' aria-label='Close edit listing modal'>X</button>
        </header>

        <form onSubmit={handleUpdate} className='p-6 flex flex-col gap-5'>

          <div className='flex flex-col gap-1'>
            <label className='font-semibold text-gray-500 text-xs uppercase tracking-wider'>Price ($)</label>
            <input
              type='number'
              step='0.01'
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`p-2.5 bg-[#0d1117] border text-gray-100 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.price ? 'border-red-500' : 'border-white/10'}`}
            />
            {errors.price && <span className="text-red-400 text-xs mt-1">{errors.price[0]}</span>}
          </div>

          <div className='flex flex-col gap-1'>
            <label className='font-semibold text-gray-500 text-xs uppercase tracking-wider'>Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className='p-2.5 bg-[#0d1117] border border-white/10 text-gray-100 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50'
            >
              <option value='Mint'>Mint</option>
              <option value='Near Mint'>Near Mint</option>
              <option value='Lightly Played'>Lightly Played</option>
              <option value='Heavily Played'>Heavily Played</option>
              <option value='Damaged'>Damaged</option>
            </select>
          </div>

          {message && <p className='text-red-400 text-sm font-medium'>{message}</p>}

          <div className='flex gap-3 mt-4'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='flex-1 px-4 py-2 border border-white/10 bg-white/5 text-gray-300 rounded-md hover:bg-white/10 transition-colors font-semibold'
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
      </div>
    </div>
  )
}

export default EditListingModal
