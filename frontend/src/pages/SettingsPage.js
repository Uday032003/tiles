import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Save, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useUI } from '../context/UIContext.js';
import { authService } from '../services/authService.js';
import StaffAccessPanel from '../components/settings/StaffAccessPanel.js';

const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  phone: z.string().trim().max(30).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useUI();
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSaveProfile = async (values) => {
    setProfileError('');
    try {
      await updateProfile({
        fullName: values.fullName,
        phone: values.phone || null,
      });
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  const onChangePassword = async (values) => {
    setPasswordError('');
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & Profile</h1>
          <p className="page-subtitle">Manage your contractor account details and security.</p>
        </div>
        <span className="badge badge-primary">Role: {user?.role}</span>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} color="var(--primary)" />
              Account Profile
            </h2>
          </div>

          {profileError && <div className="alert alert-error">{profileError}</div>}

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="settings-email">
                Email Address
              </label>
              <input
                id="settings-email"
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
              />
              <span className="form-hint">Email address is your primary login identifier.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-name">
                Full Name
              </label>
              <input
                id="settings-name"
                type="text"
                className={`form-input ${profileForm.formState.errors.fullName ? 'form-input-error' : ''}`}
                {...profileForm.register('fullName')}
              />
              {profileForm.formState.errors.fullName && (
                <span className="form-error">{profileForm.formState.errors.fullName.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="settings-phone">
                Phone Number
              </label>
              <input
                id="settings-phone"
                type="tel"
                inputMode="tel"
                className="form-input"
                placeholder="e.g., +91 98765 43210"
                {...profileForm.register('phone')}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileForm.formState.isSubmitting}
            >
              <Save size={16} />
              {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} color="var(--warning)" />
              Change Password
            </h2>
          </div>

          {passwordError && <div className="alert alert-error">{passwordError}</div>}

          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="current-password">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                className={`form-input ${passwordForm.formState.errors.currentPassword ? 'form-input-error' : ''}`}
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword && (
                <span className="form-error">
                  {passwordForm.formState.errors.currentPassword.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                className={`form-input ${passwordForm.formState.errors.newPassword ? 'form-input-error' : ''}`}
                placeholder="At least 8 characters"
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword && (
                <span className="form-error">{passwordForm.formState.errors.newPassword.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-new-password">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                className={`form-input ${passwordForm.formState.errors.confirmPassword ? 'form-input-error' : ''}`}
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <span className="form-error">
                  {passwordForm.formState.errors.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={passwordForm.formState.isSubmitting}
            >
              <KeyRound size={16} />
              {passwordForm.formState.isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </section>
      </div>

      {user?.role === 'ADMIN' && <StaffAccessPanel />}
    </div>
  );
}

