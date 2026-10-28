import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShieldPlus, User, AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import healthcareIllustration from '../../assets/login-healthcare.png';
import '../../styles/login.css';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Please enter your full name.';
    if (form.name.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!form.email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.password) return 'Please enter a password.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, 'client', form.dateOfBirth || undefined);
      navigate('/client', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.data?.errors) {
        const firstError = Object.values(err.response.data.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="hg-login hg-register">
      <div className="hg-login-decoration hg-login-decoration-top" aria-hidden="true" />
      <div className="hg-login-decoration hg-login-decoration-bottom" aria-hidden="true" />
      <section className="hg-login-card" aria-labelledby="register-title">
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
              <h1 id="register-title">Hello,<br />Create account</h1>
              <p className="hg-login-intro">Join HealthGuard. Let us care for the details.</p>
            </header>
            <div className="hg-register-member"><User size={16} /><span>Member account <span aria-hidden="true">&middot;</span> Submit and track your claims</span></div>
            <form onSubmit={handleSubmit} className="hg-login-form" aria-busy={isLoading}>
              {error && <div className="hg-login-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
              <div className="hg-login-field">
                <label htmlFor="reg-name">Full name</label>
                <input id="reg-name" name="name" type="text" value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} placeholder="Enter your full name" autoComplete="name" required minLength={2} disabled={isLoading} />
              </div>
              <div className="hg-login-field">
                <label htmlFor="reg-email">Email address</label>
                <input id="reg-email" name="email" type="email" value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} placeholder="you@example.com" autoComplete="email" required disabled={isLoading} />
              </div>
              <div className="hg-login-field">
                <label htmlFor="reg-dob">Date of birth <span className="hg-register-optional">(optional)</span></label>
                <input id="reg-dob" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={event => setForm(prev => ({ ...prev, dateOfBirth: event.target.value }))} autoComplete="bday" disabled={isLoading} />
              </div>
              <div className="hg-login-field">
                <label htmlFor="reg-password">Password</label>
                <div className="hg-login-password">
                  <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))} placeholder="At least 8 characters" autoComplete="new-password" required minLength={8} disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="hg-login-field">
                <label htmlFor="reg-confirm">Confirm password</label>
                <input id="reg-confirm" name="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={event => setForm(prev => ({ ...prev, confirmPassword: event.target.value }))} placeholder="Re-enter your password" autoComplete="new-password" required minLength={8} disabled={isLoading} aria-invalid={!!form.confirmPassword && form.password !== form.confirmPassword} aria-describedby={form.confirmPassword ? 'reg-password-feedback' : undefined} />
                {form.confirmPassword && (
                  <p id="reg-password-feedback" className={form.password === form.confirmPassword ? 'hg-register-feedback hg-register-match' : 'hg-register-feedback'} aria-live="polite">
                    {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>
              <button className="hg-login-submit" type="submit" disabled={isLoading}>
                {isLoading ? <><Loader2 size={18} className="animate-spin" /> Creating account...</> : <>Create Account <ArrowRight size={17} /></>}
              </button>
            </form>
            <p className="hg-login-register">Already have an account? <Link to="/">Sign in</Link></p>
          </div>
        </div>
        <footer className="hg-login-footer">&copy; {new Date().getFullYear()} HealthGuard. All rights reserved.</footer>
      </section>
    </main>
  );
}
