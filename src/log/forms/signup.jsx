import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { supabase } from '../../../supabaseClient'

const formSchema = z.object({
  firstname: z.string().min(1, 'First name is required'),
  lastname: z.string().min(1, 'Last name is required'),
  username: z.string().min(5, 'Username must be at least five characters long'),
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

const SignUp = ({ onSuccess }) => {
  // track error messages from server & loading status
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data) => {
    setServerError(null)
    setLoading(true)

    // send the user info to db to create new account
    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        // save extra details into the user profile
        data: {
          first_name: data.firstname,
          last_name: data.lastname,
          username: data.username,
        }
      }
    })

    if (authError) {
      setServerError(authError.message)
      setLoading(false)
      return
    }
    if (onSuccess) onSuccess()
    setLoading(false)
  }

  const inputBase = 'p-2.5 bg-[#0d1117] text-gray-100 placeholder-gray-500 border rounded-md outline-none focus:ring-2 focus:ring-blue-500/50';

  return (
    <div className='flex flex-col w-full'>
      <h2 className='mb-4 text-2xl font-extrabold text-white tracking-tight'>Create an Account</h2>

      {serverError && <p className='mb-4 text-sm text-red-400 font-medium'>{serverError}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col space-y-3'>

        <div className='flex flex-col gap-1'>
          <input
            className={`${inputBase} ${errors.firstname ? 'border-red-500' : 'border-white/10'}`}
            type='text'
            placeholder='First Name'
            {...register('firstname')}
          />
          {errors.firstname && <span className='text-xs text-red-400'>{errors.firstname.message}</span>}
        </div>

        <div className='flex flex-col gap-1'>
          <input
            className={`${inputBase} ${errors.lastname ? 'border-red-500' : 'border-white/10'}`}
            type='text'
            placeholder='Last Name'
            {...register('lastname')}
          />
          {errors.lastname && <span className='text-xs text-red-400'>{errors.lastname.message}</span>}
        </div>

        <div className='flex flex-col gap-1'>
          <input
            className={`${inputBase} ${errors.username ? 'border-red-500' : 'border-white/10'}`}
            type='text'
            placeholder='Username'
            {...register('username')}
          />
          {errors.username && <span className='text-xs text-red-400'>{errors.username.message}</span>}
        </div>

        <div className='flex flex-col gap-1'>
          <input
            className={`${inputBase} ${errors.email ? 'border-red-500' : 'border-white/10'}`}
            type='email'
            placeholder='Email Address'
            {...register('email')}
          />
          {errors.email && <span className='text-xs text-red-400'>{errors.email.message}</span>}
        </div>

        <div className='flex flex-col gap-1'>
          <input
            className={`${inputBase} ${errors.password ? 'border-red-500' : 'border-white/10'}`}
            type='password'
            placeholder='Password (6 or more characters)'
            {...register('password')}
          />
          {errors.password && <span className='text-xs text-red-400'>{errors.password.message}</span>}
        </div>

        <Button
          type='submit'
          disabled={loading}
          className='mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all active:scale-95'
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>
      </form>
    </div>
  )
}

export default SignUp