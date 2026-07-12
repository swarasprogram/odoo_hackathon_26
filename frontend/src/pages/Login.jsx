import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.phone);
      toast.success('Account created! Please log in.');
      setTab('login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: 'var(--black)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: -1 }}>AF</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -.4 }}>AssetFlow</h1>
          <p style={{ fontSize: 13, marginTop: 4 }}>Enterprise Asset Management</p>
        </div>

        <div className="card slide-up">
          <div className="card-body" style={{ padding: '28px 28px 24px' }}>
            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 24 }}>
              <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Sign In</button>
              <button className={`tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Create Account</button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
                </div>
                <button className="btn btn-primary w-full" style={{ marginTop: 8 }} disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="John Smith" value={form.name} onChange={set('name')} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input className="form-input" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone <span className="text-muted">(optional)</span></label>
                  <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="min. 8 characters" value={form.password} onChange={set('password')} required />
                </div>
                <div style={{ background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12.5, color: 'var(--text-3)' }}>
                  ℹ️ New accounts start as <b>Employee</b> role. An administrator promotes roles from the Org Setup screen.
                </div>
                <button className="btn btn-primary w-full" disabled={loading}>
                  {loading ? <span className="spinner" /> : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
