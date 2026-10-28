import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Shield, CreditCard, Building, Save, X, Loader2 } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import apiClient from '../api/client';

export function Profile() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const response = await apiClient.put('/user', form);
      // Update localStorage with new user data
      localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      setIsEditing(false);
      // Refresh the page to pick up new user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-10 text-white">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 backdrop-blur-sm">
              {user?.profile_photo ? (
                <img
                  src={`/${user.profile_photo.replace('profile-photos/', 'storage/profile-photos/')}`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? (
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-white/20 border border-white/30 rounded-lg px-3 py-1 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 w-full"
                  />
                ) : (
                  user?.name || 'User'
                )}
              </h1>
              <p className="text-blue-100 mt-1 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" />
                {user?.role === 'analyst' ? 'Claims Analyst' : 'Premium PPO Member'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Personal Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Email Address</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="text-sm text-slate-900 bg-white border border-slate-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-sm text-slate-500">{user?.email || '—'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Role</p>
                    <p className="text-sm text-slate-500 capitalize">{user?.role || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Home Address</p>
                    <p className="text-sm text-slate-500">
                      123 Healthway Drive<br />
                      Apt 4B<br />
                      San Francisco, CA 94105
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Insurance Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">
                Insurance Details
              </h3>
              <div className="space-y-4 bg-slate-50 p-5 rounded-lg border border-slate-100">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Member ID</p>
                    <p className="text-sm font-medium text-slate-900 font-mono mt-0.5">HG-987654321</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Group Number</p>
                    <p className="text-sm font-medium text-slate-900 font-mono mt-0.5">GRP-445566</p>
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Coverage Status</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <p className="text-sm font-medium text-slate-900">Active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Effective Date</p>
                    <p className="text-sm font-medium text-slate-900 mt-1">Jan 1, 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 border-t border-slate-200 p-6 px-8 flex justify-between items-center">
          {error && (
            <p className="text-sm text-rose-600 font-medium">{error}</p>
          )}
          <div className="flex gap-3 ml-auto">
            {isEditing ? (
              <>
                <button
                  onClick={() => { setIsEditing(false); setForm({ name: user?.name || '', email: user?.email || '' }); setError(''); }}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}