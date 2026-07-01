import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await API.post('/api/auth/forgot-password', { email });
            setMessage(res.data.message);
            setSent(true);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <h2 style={s.logo}>🛍 EasyBuy</h2>
                <h3 style={s.title}>Forgot password?</h3>
                <p style={s.sub}>Enter your email and we'll send you a reset link.</p>

                {sent ? (
                    <div style={s.success}>
                        ✅ Reset link sent successfully 
                        <br /><br />
                        Check your inbox at <b>{email}</b>. The link expires in 1 hour.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <label style={s.label}>Email address</label>
                        <input style={s.input} type="email" placeholder="you@email.com"
                            value={email} onChange={e => setEmail(e.target.value)} required />
                        {message && <div style={s.error}>{message}</div>}
                        <button style={s.btn} type="submit" disabled={loading}>
                            {loading ? 'Sending...' : 'Send reset link'}
                        </button>
                    </form>
                )}

                <p style={s.footer}>
                    Remember your password? <Link to="/login" style={s.link}>Log in</Link>
                </p>
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' },
    card: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 400 },
    logo: { color: '#7c6ef7', fontSize: 22, fontWeight: 600, marginBottom: 20 },
    title: { color: '#e2e8f0', fontSize: 20, fontWeight: 600, marginBottom: 4 },
    sub: { color: '#5a6480', fontSize: 13, marginBottom: 24 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 16, boxSizing: 'border-box', outline: 'none' },
    btn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '14px', fontSize: 13, lineHeight: 1.6, marginBottom: 16 },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 16 },
    footer: { color: '#5a6480', fontSize: 13, textAlign: 'center', marginTop: 20 },
    link: { color: '#a89cf7', textDecoration: 'none' },
};