import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API from '../api/axios';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [form, setForm] = useState({ password: '', confirm_password: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm_password) {
            setMessage('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            setMessage('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await API.post('/api/auth/reset-password', {
                token,
                password: form.password
            });
            setMessage(res.data.message);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    if (!token) return (
        <div style={s.page}>
            <div style={s.card}>
                <h2 style={s.logo}>🛍 EasyBuy</h2>
                <div style={s.error}>Invalid reset link. Please request a new one.</div>
                <Link to="/forgot-password" style={s.link}>Request new link</Link>
            </div>
        </div>
    );

    return (
        <div style={s.page}>
            <div style={s.card}>
                <h2 style={s.logo}>🛍 EasyBuy</h2>
                <h3 style={s.title}>Set new password</h3>
                <p style={s.sub}>Enter your new password below.</p>

                {success ? (
                    <div style={s.success}>
                        ✅ {message}
                        <br /><br />
                        Redirecting to login in 3 seconds...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <label style={s.label}>New password</label>
                        <input style={s.input} type="password" placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm({...form, password: e.target.value})} required />
                        <label style={s.label}>Confirm new password</label>
                        <input style={s.input} type="password" placeholder="••••••••"
                            value={form.confirm_password}
                            onChange={e => setForm({...form, confirm_password: e.target.value})} required />
                        {form.confirm_password && form.password !== form.confirm_password && (
                            <div style={{color:'#f09595', fontSize:12, marginTop:-10, marginBottom:14}}>❌ Passwords do not match</div>
                        )}
                        {form.confirm_password && form.password === form.confirm_password && (
                            <div style={{color:'#5dd6a3', fontSize:12, marginTop:-10, marginBottom:14}}>✅ Passwords match</div>
                        )}
                        {message && <div style={s.error}>{message}</div>}
                        <button style={s.btn} type="submit" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset password'}
                        </button>
                    </form>
                )}

                <p style={s.footer}>
                    <Link to="/login" style={s.link}>Back to login</Link>
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