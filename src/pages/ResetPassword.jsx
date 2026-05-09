import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { supabase } from '../../supabaseClient'

const formSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
const ResetPassword = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
  })
  
  const onSubmit = async (data) => {
    setServerError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    setLoading(false)
    if (error) {
      setServerError(error.message)
    } else {
      setSuccess(true)
      await supabase.auth.signOut()
      setTimeout(() => navigate('/'), 3000)
    }
  }

  return (
    <div className='support-container' style={{alignItems: 'center', justifyContent: 'center'}}>
      <div className='card' style={{width: '100%', maxWidth: '28rem'}}>
        <h2 style={{marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: 800}}>Set New Password</h2>
        <p className='support-label' style={{marginBottom: '1.5rem', textTransform: 'none'}}>Choose a new password for your account.</p>

        {success ? (
          <p style={{color: '#34d399', fontWeight: 500}}>Updated Password.</p>
        ) : !sessionReady ? (
          <p className='support-label'>Reset Link</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {serverError && <div className='alert-error'>{serverError}</div>}

            <div>
              <label className='support-label'>New Password</label>
              <input
                className='support-input'
                type='password'
                placeholder='At least 8 characters'
                {...register('password')}
              />
              {errors.password && <span className='alert-error' style={{display: 'block', marginTop: '0.25rem', marginBottom: 0}}>{errors.password.message}</span>}
            </div>

            <div>
              <label className='support-label'>Confirm Password</label>
              <input
                className='support-input'
                type='password'
                placeholder='Repeat your password'
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <span className='alert-error' style={{display: 'block', marginTop: '0.25rem', marginBottom: 0}}>{errors.confirmPassword.message}</span>}
            </div>

            <Button type='submit' disabled={loading} className='btn btn-blue' style={{width: '100%'}}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
