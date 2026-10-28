import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShieldPlus, User, AlertCircle, Eye, EyeOff, Loader2, X, ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { getQuickUsers, removeQuickUserByEmail } from '../utils/cookies';
import type { QuickUser } from '../utils/cookies';
import healthcareIllustration from '../../assets/login-healthcare.png';
import '../../styles/login.css';

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [quickUsers, setQuickUsers] = useState<QuickUser[]>(() => getQuickUsers().filter(u => u.role === 'client'));

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'analyst' ? '/analyst' : '/client', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const signIn = async (targetEmail: string, targetPassword: string) => {
    setError('');
    setIsLoading(true);
    try {
      await login(targetEmail, targetPassword);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    await signIn(email.trim(), password);
  };

  const handleRemoveUser = (targetEmail: string) => {
    removeQuickUserByEmail(targetEmail);
    setQuickUsers(getQuickUsers().filter(u => u.role === 'client'));
  };

  return (
    <main className="hg-login">
      <div className="hg-login-decoration hg-login-decoration-top" aria-hidden="true" />
      <div className="hg-login-decoration hg-login-decoration-bottom" aria-hidden="true" />
      <section className="hg-login-card" aria-labelledby="login-title">
        <Link className="hg-login-brand" to="/" aria-label="HealthGuard home">
          <span className="hg-login-brand-icon"><ShieldPlus size={23} strokeWidth={1.8} /></span>
          <span>Health<span className="hg-login-brand-accent">Guard</span></span>
        </Link>
        <div className="hg-login-content">
          <div className="hg-login-visual">
            <img src={healthcareIllustration} alt="A healthcare professional and patient managing a protected health insurance claim" width="1254" height="1254" />
            <div className="hg-login-caption">
              <h2>A little care. A lot of peace of mind.</h2>
              <p>Your health claims, made simple.</p>
            </div>
          </div>
          <div className="hg-login-form-panel">
            <header>
              <h1 id="login-title">Hello,<br />Welcome back</h1>
              <p className="hg-login-intro">Sign in to your HealthGuard account.</p>
            </header>
            <form onSubmit={handleManualLogin} className="hg-login-form" aria-busy={isLoading}>
              {error && <div className="hg-login-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
              <div className="hg-login-field">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={isLoading} />
              </div>
              <div className="hg-login-field">
                <label htmlFor="password">Password</label>
                <div className="hg-login-password">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="hg-login-security"><LockKeyhole size={13} /> Your health journey starts here</div>
              <button className="hg-login-submit" type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : <>Login <ArrowRight size={17} /></>}
              </button>
            </form>
            <p className="hg-login-register">Don't have an account? <Link to="/register">Create an account</Link></p>
            {quickUsers.length > 0 && (
              <details className="hg-login-quick">
                <summary>Quick sign in with a saved account</summary>
                <div className="hg-login-quick-list">
                  {quickUsers.map(quickUser => (
                    <div className="hg-login-quick-row" key={quickUser.email}>
                      <button className="hg-login-quick-account" type="button" disabled={isLoading} onClick={() => signIn(quickUser.email, quickUser.password)}>
                        <User size={18} /><span><strong>{quickUser.name}</strong><small>{quickUser.email}</small></span>
                      </button>
                      <button className="hg-login-remove" type="button" disabled={isLoading} onClick={() => handleRemoveUser(quickUser.email)} aria-label={'Remove ' + quickUser.name + ' from this device'}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <div className="hg-login-trust"><ShieldPlus size={18} strokeWidth={1.6} /><span>One place for your care.<br /><strong>Every step of the way.</strong></span></div>
          </div>
        </div>
        <footer className="hg-login-footer">&copy; {new Date().getFullYear()} HealthGuard. All rights reserved.</footer>
      </section>
    </main>
  );
}
