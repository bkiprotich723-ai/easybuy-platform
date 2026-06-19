import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import API from '../api/axios';

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ?redirect= is where to send the user after they eventually log in
    // e.g. /product/42?ref=aB3@kZ9!
    const redirect = searchParams.get('redirect') || '';

    // Ref code: URL param first, then localStorage fallback
    const refFromUrl = searchParams.get('ref') || '';
    const refFromStorage = localStorage.getItem('pending_ref') || '';
    const initialRef = refFromUrl || refFromStorage;

    const [form, setForm] = useState({
        name: '', email: '', password: '', role: 'buyer',
        referral_code: initialRef,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Keep form in sync if URL param changes
    useEffect(() => {
        const ref = searchParams.get('ref') || localStorage.getItem('pending_ref') || '';
        if (ref) setForm(f => ({ ...f, referral_code: ref }));
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = { ...form };
            if (form.role === 'affiliate' || form.role === 'seller') {
                payload.payment_confirmed = true;
            }
            await API.post('/api/auth/register', payload);
            // Clear stored ref after registration — the ref stays in the URL chain
            localStorage.removeItem('pending_ref');

            // Send the user to login and carry the redirect target forward so after
            // logging in they land back on the product page (with ?ref= intact in the URL).
            if (redirect) {
                navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
            } else {
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'buyer', label: 'Buyer', desc: 'Shop products', fee: null },
        { value: 'seller', label: 'Seller', desc: 'Sell & earn 90%', fee: 500 },
        { value: 'affiliate', label: 'Affiliate', desc: 'Earn 10% commission', fee: 100 },
    ];

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h2 style={styles.logo}>EasyBuy</h2>
                <h3 style={styles.title}>Create your account</h3>
                <p style={styles.sub}>Join thousands of Kenyans on EasyBuy</p>

                {redirect && (
                    <div style={styles.redirectNotice}>
                        🔒 After registering you'll be asked to log in, then taken back to complete your purchase.
                    </div>
                )}

                <div style={styles.roleRow}>
                    {roles.map(r => (
                        <div key={r.value}
                            style={{ ...styles.roleTab, ...(form.role === r.value ? styles.roleTabActive : {}) }}
                            onClick={() => setForm({ ...form, role: r.value })}>
                            <div style={styles.roleLabel}>{r.label}</div>
                            <div style={styles.roleDesc}>{r.desc}</div>
                            {r.fee && <div style={styles.roleFee}>KES {r.fee} fee</div>}
                        </div>
                    ))}
                </div>

                {form.role === 'seller' && (
                    <div style={styles.feeNotice}>
                        💳 Seller registration requires a one-time fee of <b>KES 500</b>. After registering, go to your wallet and deposit KES 500 to activate your seller account. Your referrer earns <b>KES 150</b> when you pay.
                    </div>
                )}
                {form.role === 'affiliate' && (
                    <div style={styles.feeNotice}>
                        💳 Affiliate registration requires a one-time fee of <b>KES 100</b>. After registering, go to your wallet and deposit KES 100 to activate your affiliate account. Your referrer earns <b>KES 30</b> when you pay.
                    </div>
                )}

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Full name</label>
                    <input style={styles.input} placeholder="Jane Mwangi" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />

                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" placeholder="jane@email.com" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} required />

                    <label style={styles.label}>Password</label>
                    <input style={styles.input} type="password" placeholder="••••••••" value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} required />

                    <label style={styles.label}>
                        Referral code <span style={{ color: '#5a6480' }}>(optional)</span>
                    </label>
                    <input
                        style={{
                            ...styles.input,
                            ...(form.referral_code ? { borderColor: '#7c6ef7', color: '#a89cf7' } : {})
                        }}
                        placeholder="e.g. aB3@kZ9!"
                        value={form.referral_code}
                        onChange={e => setForm({ ...form, referral_code: e.target.value })}
                    />
                    {form.referral_code && (
                        <div style={styles.refApplied}>✅ Referral code applied</div>
                    )}

                    <button style={styles.btn} type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <p style={styles.footer}>
                    Already have an account?{' '}
                    <Link
                        to={redirect
                            ? `/login?redirect=${encodeURIComponent(redirect)}`
                            : '/login'
                        }
                        style={styles.link}>
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: { background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 420 },
    logo: { color: '#7c6ef7', fontSize: 22, fontWeight: 500, marginBottom: 20 },
    title: { color: '#e2e8f0', fontSize: 18, fontWeight: 500, marginBottom: 4 },
    sub: { color: '#5a6480', fontSize: 13, marginBottom: 20 },
    redirectNotice: { background: '#1e1a3a', border: '0.5px solid #3d3580', color: '#a89cf7', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 16, lineHeight: 1.6 },
    roleRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 },
    roleTab: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 8px', textAlign: 'center', cursor: 'pointer' },
    roleTabActive: { border: '1px solid #7c6ef7', background: '#1e1a3a' },
    roleLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: 500 },
    roleDesc: { color: '#5a6480', fontSize: 11, marginTop: 3 },
    roleFee: { color: '#f7c948', fontSize: 11, marginTop: 4, fontWeight: 600 },
    feeNotice: { background: '#2a1f08', border: '0.5px solid #4a3510', color: '#f7c948', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 16, lineHeight: 1.6 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' },
    btn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: 11, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 16 },
    refApplied: { color: '#6ee7b7', fontSize: 12, marginTop: -10, marginBottom: 14 },
    footer: { color: '#5a6480', fontSize: 13, textAlign: 'center', marginTop: 18 },
    link: { color: '#a89cf7', textDecoration: 'none' },
};
