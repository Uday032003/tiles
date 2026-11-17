import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService.js';
import { useUI } from '../../context/UIContext.js';

const schema = z
  .object({
    token: z.string().trim().min(16, 'Enter the reset token'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useUI();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      token: searchParams.get('token') || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await authService.resetPassword({
        token: values.token,
        newPassword: values.newPassword,
      });
      showToast('Password reset successfully. Please sign in.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to reset password');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="sidebar-logo">DM</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>DM Tiles</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reset Password</div>
          </div>
        </div>

        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-subtitle">Paste your reset token and choose a strong password.</p>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-token">
              Reset Token
            </label>
            <input
              id="reset-token"
              type="text"
              className={`form-input ${errors.token ? 'form-input-error' : ''}`}
              placeholder="Paste reset token"
              {...register('token')}
            />
            {errors.token && <span className="form-error">{errors.token.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-new-password">
              New Password
            </label>
            <input
              id="reset-new-password"
              type="password"
              className={`form-input ${errors.newPassword ? 'form-input-error' : ''}`}
              placeholder="At least 8 characters"
              {...register('newPassword')}
            />
            {errors.newPassword && <span className="form-error">{errors.newPassword.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm-password">
              Confirm New Password
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
              placeholder="Re-enter new password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <span className="form-error">{errors.confirmPassword.message}</span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            <ShieldCheck size={18} />
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

