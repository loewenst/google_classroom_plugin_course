/**
 * src/pages/Login.jsx
 * Unauthenticated landing page.
 * Shows a sign-in button and an explanation of the "unverified app" warning
 * that Google displays for self-hosted OAuth deployments.
 */

import { useAuth } from '../auth/useAuth.js'
import Spinner from '../components/common/Spinner.jsx'

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-background)',
    padding: 'var(--spacing-lg)',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    padding: 'var(--spacing-xl)',
    maxWidth: '420px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  title: {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  subtitle: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-md)',
  },
  notice: {
    background: 'var(--color-warning-light)',
    border: '1px solid var(--color-warning)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--spacing-md)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text)',
    lineHeight: 1.6,
  },
  noticeTitle: {
    fontWeight: 600,
    marginBottom: 'var(--spacing-xs)',
  },
  errorBox: {
    background: 'var(--color-danger-light)',
    border: '1px solid var(--color-danger)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--spacing-md)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-danger)',
  },
  signinBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-sm)',
    background: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '12px var(--spacing-lg)',
    fontSize: 'var(--font-size-md)',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s',
  },
}

export default function Login() {
  const { signIn, loading, error } = useAuth()

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div>
          <h1 style={styles.title}>Classroom Course App</h1>
          <p style={styles.subtitle}>
            Sign in with your Google account to continue.
          </p>
        </div>

        {/* Unverified app warning — shown proactively so users aren't surprised */}
        <div style={styles.notice}>
          <p style={styles.noticeTitle}>First time signing in?</p>
          <p>
            Google may show an <strong>"unverified app"</strong> warning screen.
            This is expected for self-hosted deployments. To proceed:{' '}
            click <strong>Advanced</strong>, then{' '}
            <strong>Proceed to [site] (unsafe)</strong>.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <strong>Sign-in error:</strong> {error}
          </div>
        )}

        <button
          style={styles.signinBtn}
          onClick={signIn}
          disabled={loading}
          onMouseOver={e => e.currentTarget.style.background = 'var(--color-primary-dark)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--color-primary)'}
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            <>
              <GoogleIcon />
              Sign in with Google
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/** Minimal Google "G" icon as inline SVG. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#fff" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#fff" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#fff" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
