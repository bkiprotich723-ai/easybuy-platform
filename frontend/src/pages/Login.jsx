import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.logo}>EasyBuy</h2>
                <h3 style={styles.title}>Welcome back</h3>
                <p style={styles.sub}>Log in to your account</p>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Email</label>
                    <input
                        style={styles.input}
                        type="email"
                        placeholder="you@email.com"
                        value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})}
                        required
                    />
                    <label style={styles.label}>Password</label>
                    <input
                        style={styles.input}
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={e => setForm({...form, password: e.target.value})}
                        required
                    />
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
    footer: { color: '#5a6480', fontSize: 13, textAlign: 'center', marginTop: 18 },
    link: { color: '#a89cf7', textDecoration: 'none' }
};