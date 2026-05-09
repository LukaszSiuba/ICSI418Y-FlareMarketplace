import {useState} from 'react'
import {supabase} from '../supabaseClient'

/* Used for login functionality.*/
const emailDeliminter = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ //Regex from gfg
export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [statusType, setStatusType] = useState('')
    const [loadingAction, setLoadingAction] = useState(null)

    const validateEmail = () => {
        const trimmedEmail = email.trim()

        if (!trimmedEmail) {
            return 'Email is required.'
        }

        if (!emailDeliminter.test(trimmedEmail)) {
            return 'Enter a valid email address.'
        }

        return ''
    }

    const validateCredentials = () => {
        const emailError = validateEmail()
        if (emailError) {
            return emailError
        }

        if (password.length < 10) {
            return `Password must be at least ${10} characters.`
        }

        return ''
    }

    const handleSignUp = async () => {
        setStatusMessage('')
        setLoadingAction('signup')

        const {error} = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
        })

        setLoadingAction(null)

        if (error) {
            setStatusType('error')
            setStatusMessage(error.message)
            return
        }

        setStatusType('success')
        setStatusMessage('Sign up successful. Check your inbox to confirm your email.')
    }

    const handleLogin = async () => {
        setStatusMessage('')
        setLoadingAction('login')

        const {data, error} = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
        })

        setLoadingAction(null)

        if (error) {
            setStatusType('error')
            setStatusMessage(error.message)
            return
        }

        if (!data?.user?.id) {
            setStatusType('error')
            setStatusMessage('Login failed: user record was not returned.')
            return
        }

        const {error: updateError} = await supabase.from('profiles')
            .update({last_seen: new Date()})
            .eq('id', data.user.id)

        if (updateError) {
            console.error('Failed to update last_seen:', updateError.message)
            setStatusType('success')
            setStatusMessage('Logged in, but failed to update last seen.')
            return
        }

        setStatusType('success')
        setStatusMessage('Log in successful!')
    }

    const handleForgotPassword = async () => {
        const emailError = validateEmail()
        if (emailError) {
            setStatusType('error')
            setStatusMessage(emailError)
            return
        }

        setStatusMessage('')
        setLoadingAction('reset')

        const {error} = await supabase.auth.resetPasswordForEmail(email.trim())

        setLoadingAction(null)

        if (error) {
            setStatusType('error')
            setStatusMessage(error.message)
            return
        }

        setStatusType('success')
        setStatusMessage('Password reset email sent. Check your inbox.')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationError = validateCredentials()
        if (validationError) {
            setStatusType('error')
            setStatusMessage(validationError)
            return
        }

        const action = e.nativeEvent.submitter?.value
        if (action === 'signup') {
            await handleSignUp()
            return
        }

        await handleLogin()
    }

    //JSX
    return (
        <div className="mt-5 p-5 border border-solid border-gray-300">
            <h2>Sign In / Register</h2>
            <form onSubmit={handleSubmit}>
                {statusMessage && (
                    <p
                        aria-live="polite"
                        role={statusType === 'error' ? 'alert' : 'status'}
                        className={statusType === 'error' ? 'text-red-700' : 'text-green-700'}
                    >
                        {statusMessage}
                    </p>
                )}
                <div className="mb-4">
                    <label htmlFor="email">Email: </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="password">Password: </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>

                <button
                    type="submit"
                    value="login"
                    className="mr-2"
                    disabled={loadingAction !== null}
                >
                    {loadingAction === 'login' ? 'Logging In...' : 'Log In'}
                </button>
                <button
                    type="submit"
                    value="signup"
                    disabled={loadingAction !== null}
                >
                    {loadingAction === 'signup' ? 'Signing Up...' : 'Sign Up'}
                </button>
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={loadingAction !== null}
                    >
                        {loadingAction === 'reset' ? 'Sending Reset...' : 'Forgot Password'}
                    </button>
                </div>
            </form>
        </div>
    )
}
