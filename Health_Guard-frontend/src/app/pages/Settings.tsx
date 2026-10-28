import React, { useState, useRef } from 'react';
import { User, Mail, Shield, Save, X, Loader2, Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Phone, MapPin, AtSign, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import apiClient from '../api/client';

export function Settings() {
  const { user, refreshUser } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Profile form state
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  // Password form state
  const [editingPassword, setEditingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const response = await apiClient.put('/user', {
        name: profileForm.name,
        username: profileForm.username || undefined,
        email: profileForm.email,
        phone: profileForm.phone || undefined,
        address: profileForm.address || undefined,
      });
      localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      setProfileSuccess('Profile updated successfully');
      setEditingProfile(false);
      await refreshUser();
    } catch (err: any) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Photo must be smaller than 2MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setPhotoError('Only JPG and PNG photos are allowed');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError('');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await apiClient.post('/user/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
    } catch (err: any) {
      setPhotoError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      await apiClient.delete('/user/photo');
      await refreshUser();
    } catch (err: any) {
      setPhotoError(err.response?.data?.message || 'Failed to remove photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordForm.password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      await apiClient.put('/user', {
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
      setPasswordSuccess('Password changed successfully');
      setEditingPassword(false);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const cancelPassword = () => {
    setEditingPassword(false);
    setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account information and security.</p>
      </div>

      {/* Account Information */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-8 py-8 text-white">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoUpload}
                className="hidden"
                id="profile-photo-input"
              />
              <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 backdrop-blur-sm relative">
                {user?.profile_photo ? (
                  <img
                    src={`/${user.profile_photo.replace('profile-photos/', 'storage/profile-photos/')}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-9 h-9 text-white" />
                  </div>
                )}
                {/* Overlay on hover */}
                <label
                  htmlFor="profile-photo-input"
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </label>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold tracking-tight">
                {editingProfile ? (
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="bg-white/20 border border-white/30 rounded-lg px-3 py-1 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 w-full"
                  />
                ) : (
                  user?.name || 'Analyst'
                )}
              </h3>
              <p className="text-indigo-100 mt-1 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" />
                Claims Analyst
              </p>
              {/* Photo actions */}
              <div className="flex items-center gap-2 mt-2">
                <label
                  htmlFor="profile-photo-input"
                  className="text-xs text-indigo-200 hover:text-white cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {user?.profile_photo ? 'Change Photo' : 'Add Photo'}
                </label>
                {user?.profile_photo && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="text-xs text-indigo-200 hover:text-red-300 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
              {photoError && (
                <p className="text-xs text-red-300 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {photoError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-6">
            Account Information
          </h3>

          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <AtSign className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Username</p>
                {editingProfile ? (
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    placeholder="Choose a username"
                    className="text-sm text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 w-full max-w-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">{user?.username || '—'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Email Address</p>
                {editingProfile ? (
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="text-sm text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 w-full max-w-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">{user?.email || '—'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Phone Number</p>
                {editingProfile ? (
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="e.g. +62 812-3456-7890"
                    className="text-sm text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 w-full max-w-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5">{user?.phone || '—'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Address</p>
                {editingProfile ? (
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="Enter your address"
                    rows={3}
                    className="text-sm text-slate-900 bg-white border border-slate-200 rounded px-2 py-1.5 w-full max-w-sm mt-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-500 mt-0.5 whitespace-pre-line">{user?.address || '—'}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">Role</p>
                <p className="text-sm text-slate-500 mt-0.5 capitalize">{user?.role || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 p-6 px-8 flex justify-between items-center">
          {profileSuccess && (
            <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {profileSuccess}
            </p>
          )}
          {profileError && (
            <p className="text-sm text-rose-600 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> {profileError}
            </p>
          )}
          <div className="flex gap-3 ml-auto">
            {editingProfile ? (
              <>
                <button
                  onClick={() => { setEditingProfile(false); setProfileForm({ name: user?.name || '', username: user?.username || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '' }); setProfileError(''); setProfileSuccess(''); }}
                  disabled={savingProfile}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingProfile(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-8">
          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-slate-400" />
            Change Password
          </h3>

          {!editingPassword ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Update your password regularly to keep your account secure.</p>
              <button
                onClick={() => setEditingPassword(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                Change Password
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={passwordForm.password_confirmation}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className="text-sm text-rose-600 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {passwordSuccess}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={cancelPassword}
                  disabled={savingPassword}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingPassword ? 'Changing...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-8">
          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-400" />
            Security
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Authentication Method</p>
                <p className="text-xs text-slate-500 mt-0.5">Token-based API authentication</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Active</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Session</p>
                <p className="text-xs text-slate-500 mt-0.5">Active session via Sanctum token</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Secured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
