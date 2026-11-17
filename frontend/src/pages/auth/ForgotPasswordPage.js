import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { authService } from '../../services/authService.js';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export default function ForgotPasswordPage() {
  const [statusMessage, setStatusMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    setServerError('');
    setStatusMessage('');
    setDevToken('');
    try {
      const res = await authService.forgotPassword(values);
      setStatusMessage(res.message);
      if (res.data?.devResetToken) {
        setDevToken(res.data.devResetToken);
      }
    } catch (err) {
      setServerError(err.message || 'Unable to process request');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="sidebar-logo">DM</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>DM Tiles</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Account Recovery</div>
          </div>
        </div>

        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-subtitle">Enter your email address to receive a password reset token.</p>

        {serverError && <div className="alert alert-error">{serverError}</div>}
        {statusMessage && <div className="alert alert-success">{statusMessage}</div>}
        {devToken && (
          <div className="alert alert-info" style={{ wordBreak: 'break-all' }}>
            <strong>Development Reset Token:</strong> {devToken}
            <div style={{ marginTop: '0.5rem' }}>
              <Link to={`/reset-password?token=${encodeURIComponent(devToken)}`} className="auth-link">
                Proceed to Reset Password →
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email Address
            </label>
            <input
              id="forgot-email"
              type="email"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            <KeyRound size={18} />
            {isSubmitting ? 'Submitting...' : 'Request Reset Token'}
          </button>
        </form>

        <div className="auth-footer">
          Remembered your password?{' '}
          <Link to="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

