import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { supabase } from '../../../supabaseClient'

const formSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

const forgotSchema = z.object({
  resetEmail: z.email('Invalid email address'),
})

const SignIn = ({ onSuccess }) => {
  // track errors
  const [serverError, setServerError] = useState(null)
  const [loading, setLoading] = useState(false)
  // toggle sign-in & forgot-password view
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState(null)
  // set up sign-in form with zod validation rules
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
  })

  // set up for forgot-password form
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm({ resolver: zodResolver(forgotSchema) })

  const navigate = useNavigate();
  const onSubmit = async (data) => {
    setServerError(null);
    setLoading(true);

    // attempt to log user in with their email and password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setServerError(authError.message);
      setLoading(false);
      return;
    }

    // get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setServerError('User not found after login.');
      setLoading(false);
      return;
    }

    // check moderation status for suspended & banned users
    // they are signed out immediately with a message instead of being let in
    const { data: profile } = await supabase
      .from('users')
      .select('status, status_until, status_reason')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.status === 'banned') {
      await supabase.auth.signOut();
      setServerError(`This account is banned${profile.status_reason ? `: ${profile.status_reason}` : '.'}`);
      setLoading(false);
      return;
    }
    if (profile?.status === 'suspended') {
      const until = profile.status_until ? new Date(profile.status_until) : null;
      if (until && until > new Date()) {
        await supabase.auth.signOut();
        setServerError(`Account suspended until ${until.toLocaleDateString()}${profile.status_reason ? ` - ${profile.status_reason}` : '.'}`);
        setLoading(false);
        return;
      }
      // suspension expired: clear it
      await supabase.from('users').update({ status: 'active', status_until: null, status_reason: null }).eq('id', user.id);
    }

    // check user role in user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError && roleError.code !== 'PGRST116') { // no rows found
      setServerError('Error checking user role.');
      setLoading(false);
      return;
    }

    if (roleData && roleData.role === 'support') {
      navigate('/support');
    } else {
      navigate('/home');
    }

    if (onSuccess) onSuccess();
    setLoading(false);
  };

  const onResetSubmit = async (data) => {
    setResetError(null);
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
  };

  // forgot pass view
  if (forgotMode) {
    return (
      <div className='flex flex-col w-full'>
        <h2 className='mb-1 text-2xl font-extrabold text-white tracking-tight'>Reset Password</h2>
        <p className='mb-4 text-sm text-gray-400'>
          Enter your email and we'll send you a link to reset your password.
        </p>

        {resetSent ? (
          <div className='flex flex-col gap-4'>
            <p className='text-sm text-green-400 font-medium'>
              Check your inbox — a reset link is on its way!
            </p>
            <button
              onClick={() => { setForgotMode(false); setResetSent(false); }}
              className='text-sm text-blue-400 hover:text-blue-300 transition-colors text-left'
            >
              ← Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit(onResetSubmit)} className='flex flex-col space-y-4'>
            {resetError && <p className='text-sm text-red-400 font-medium'>{resetError}</p>}

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Email</label>
              <input
                className={`p-2.5 bg-[#0d1117] border text-gray-100 placeholder-gray-500 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50 ${resetErrors.resetEmail ? 'border-red-500' : 'border-white/10'}`}
                type='email'
                placeholder='your@email.com'
                {...registerReset('resetEmail')}
              />
              {resetErrors.resetEmail && <span className='text-xs text-red-400'>{resetErrors.resetEmail.message}</span>}
            </div>

            <Button
              type='submit'
              disabled={resetLoading}
              className='mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all active:scale-95'
            >
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <button
              type='button'
              onClick={() => setForgotMode(false)}
              className='text-sm text-blue-400 hover:text-blue-300 transition-colors text-left'
            >
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>
    );
  }

  // normal sign-in view
  return (
    <div className='flex flex-col w-full'>
      <h2 className='mb-4 text-2xl font-extrabold text-white tracking-tight'>Sign In</h2>

      {serverError && <p className='mb-4 text-sm text-red-400 font-medium'>{serverError}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col space-y-4'>

        <div className='flex flex-col gap-1'>
          <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Email</label>
          <input
            className={`p-2.5 bg-[#0d1117] border text-gray-100 placeholder-gray-500 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.email ? 'border-red-500' : 'border-white/10'}`}
            type='email'
            placeholder='your@email.com'
            {...register('email')}
          />
          {errors.email && <span className='text-xs text-red-400'>{errors.email.message}</span>}
        </div>

        <div className='flex flex-col gap-1'>
          <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider'>Password</label>
          <input
            className={`p-2.5 bg-[#0d1117] border text-gray-100 placeholder-gray-500 rounded-md outline-none focus:ring-2 focus:ring-blue-500/50 ${errors.password ? 'border-red-500' : 'border-white/10'}`}
            type='password'
            placeholder='Password'
            {...register('password')}
          />
          {errors.password && <span className='text-xs text-red-400'>{errors.password.message}</span>}
        </div>

        <Button
          type='submit'
          disabled={loading}
          className='mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all active:scale-95'
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>

        <button
          type='button'
          onClick={() => { setForgotMode(true); setServerError(null); }}
          className='mt-1 text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors text-center'
        >
          Forgot your password?
        </button>
      </form>
    </div>
  )
}

export default SignIn
