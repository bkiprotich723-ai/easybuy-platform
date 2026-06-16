import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Verification pending state (if login blocked due to unverified email)
    const [pendingUserId, setPendingUserId] = useState(null);
    const [showVerify, setShowVerify] = useState(false);
    const [code, setCode] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [resent, setResent] = useState(false);

    const verified = location.state?.verified;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await API.post('/api/auth/login', form);
            login(res.data.token);
            const role = res.data.user.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'seller') navigate('/seller');
            else if (role === 'affiliate') navigate('/affiliate');
            else navigate('/buyer');
        } catch (err) {
            const data = err.response?.data;
            if (data?.needs_verification) {
                // Account exists but not verified — show verify prompt
                setPendingUserId(data.user_id);
                setShowVerify(true);
            } else {
                setError(data?.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setVerifyError('');
        setVerifyLoading(true);
        try {
            await API.post('/api/auth/verify-email', { user_id: pendingUserId, code });
            // After verifying, attempt login again automatically
            const res = await API.post('/api/auth/login', form);
            login(res.data.token);
            const role = res.data.user.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'seller') navigate('/seller');
            else if (role === 'affiliate') navigate('/affiliate');
            else navigate('/buyer');
        } catch (err) {
            setVerifyError(err.response?.data?.message || 'Invalid code. Try again.');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await API.post('/api/auth/resend-code', { user_id: pendingUserId });
            setResent(true);
            setTimeout(() => setResent(false), 4000);
        } catch {
            setVerifyError('Could not resend code.');
        }
    };

    // ── Verification prompt (shown if login blocked) ──────────────────────────
    if (showVerify) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <h2 style={styles.logo}>EasyBuy</h2>
                    <h3 style={styles.title}>Verify your email</h3>
                    <p style={styles.sub}>
                        Your account isn't verified yet. Enter the 6-digit code sent to{' '}
                        <b style={{ color: '#e2e8f0' }}>{form.email}</b>.
                    </p>

                    {verifyError && <div style={styles.error}>{verifyError}</div>}
                    {resent && <div style={styles.success}>✅ New code sent!</div>}

                    <form onSubmit={handleVerify}>
                        <label style={styles.label}>Verification code</label>
                        <input
                            style={{ ...styles.input, letterSpacing: 10, fontSize: 22, textAlign: 'center' }}
                            placeholder="••••••"
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            required
                            autoFocus
                        />
                        <button style={styles.btn} type="submit" disabled={verifyLoading || code.length < 6}>
                            {verifyLoading ? 'Verifying…' : 'Verify & log in'}
                        </button>
                    </form>

                    <p style={{ ...styles.footer, marginTop: 14 }}>
                        Didn't receive it?{' '}
                        <span style={styles.link} onClick={handleResend}>Resend code</span>
                    </p>
                    <p style={styles.footer}>
                        <span style={styles.link} onClick={() => setShowVerify(false)}>← Back to login</span>
                    </p>
                </div>
            </div>
        );
    }

    // ── Login form ────────────────────────────────────────────────────────────
    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.logo}>EasyBuy</h2>
                <h3 style={styles.title}>Welcome back</h3>
                <p style={styles.sub}>Log in to your account</p>

                {verified && (
                    <div style={styles.success}>✅ Email verified! You can now log in.</div>
                )}
                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" placeholder="you@email.com"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} required />

                    <label style={styles.label}>Password</label>
                    <input style={styles.input} type="password" placeholder="••••••••"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} required />

                    <button style={styles.btn} type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>

                <p style={styles.footer}>
                    No account? <Link to="/register" style={styles.link}>Register</Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: { background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 400 },
    logo: { color: '#7c6ef7', fontSize: 22, fontWeight: 500, marginBottom: 20 },
    title: { color: '#e2e8f0', fontSize: 18, fontWeight: 500, marginBottom: 4 },
    sub: { color: '#5a6480', fontSize: 13, marginBottom: 24 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' },
    btn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: 11, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 16 },
    success: { background: '#0a2318', border: '0.5px solid #1a5c3a', color: '#6ee7b7', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 16 },
    footer: { color: '#5a6480', fontSize: 13, textAlign: 'center', marginTop: 14 },
    link: { color: '#a89cf7', textDecoration: 'none', cursor: 'pointer' },
};
