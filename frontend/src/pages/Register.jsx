import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import API from '../api/axios';

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const refFromUrl = searchParams.get('ref') || '';
    const refFromStorage = localStorage.getItem('pending_ref') || '';
    const initialRef = refFromUrl || refFromStorage;

    const [form, setForm] = useState({
        name: '', email: '', password: '', confirm_password: '',
        role: 'buyer', referral_code: initialRef,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const [stage, setStage] = useState('register'); // 'register' | 'verify'
    const [code, setCode] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [resent, setResent] = useState(false);

    useEffect(() => {
        const ref = searchParams.get('ref') || localStorage.getItem('pending_ref') || '';
        if (ref) setForm(f => ({ ...f, referral_code: ref }));
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirm_password) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                referral_code: form.referral_code || undefined,
            };
            if (form.role === 'affiliate' || form.role === 'seller') {
                payload.payment_confirmed = true;
            }
            const res = await API.post('/api/auth/register', payload);
            localStorage.removeItem('pending_ref');
            setUserId(res.data.userId);
            setStage('verify');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setVerifyError('');
        setVerifyLoading(true);
        try {
            await API.post('/api/auth/verify-email', { user_id: userId, code });
            navigate('/login', { state: { verified: true } });
        } catch (err) {
            setVerifyError(err.response?.data?.message || 'Invalid code. Try again.');
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await API.post('/api/auth/resend-code', { user_id: userId });
            setResent(true);
            setTimeout(() => setResent(false), 4000);
        } catch {
            setVerifyError('Could not resend code. Try again.');
        }
    };

    const roles = [
        { value: 'buyer', label: 'Buyer', desc: 'Shop products', fee: null },
        { value: 'seller', label: 'Seller', desc: 'Sell & earn 90%', fee: 100 },
        { value: 'affiliate', label: 'Affiliate', desc: 'Earn commissions', fee: 100 },
    ];

    // ── Verify screen ─────────────────────────────────────────────────────────
    if (stage === 'verify') {
        return (
            <div style={st.page}>
                <div style={st.card}>
                    <h2 style={st.logo}>EasyBuy</h2>
                    <h3 style={st.title}>Verify your email</h3>
                    <p style={st.sub}>
                        We sent a 6-digit code to <b style={{ color: '#e2e8f0' }}>{form.email}</b>.
                        Enter it below to activate your account.
                    </p>

                    {verifyError && <div style={st.error}>{verifyError}</div>}
                    {resent && <div style={st.success}>✅ New code sent to your email!</div>}

                    <form onSubmit={handleVerify}>
                        <label style={st.label}>Verification code</label>
                        <input
                            style={{ ...st.input, letterSpacing: 10, fontSize: 22, textAlign: 'center' }}
                            placeholder="••••••"
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            required
                            autoFocus
                        />
                        <button style={st.btn} type="submit" disabled={verifyLoading || code.length < 6}>
                            {verifyLoading ? 'Verifying…' : 'Verify & activate account'}
                        </button>
                    </form>

                    <p style={{ ...st.footer, marginTop: 16 }}>
                        Didn't receive it?{' '}
                        <span style={st.link} onClick={handleResend}>Resend code</span>
                    </p>
                    <p style={st.footer}>
                        Wrong email?{' '}
                        <span style={st.link} onClick={() => setStage('register')}>Go back</span>
                    </p>
                </div>
            </div>
        );
    }

    // ── Register screen ───────────────────────────────────────────────────────
    return (
        <div style={st.page}>
            <div style={st.card}>
                <h2 style={st.logo}>EasyBuy</h2>
                <h3 style={st.title}>Create your account</h3>
                <p style={st.sub}>Join thousands of Kenyans on EasyBuy</p>

                <div style={st.roleRow}>
                    {roles.map(r => (
                        <div key={r.value}
                            style={{ ...st.roleTab, ...(form.role === r.value ? st.roleTabActive : {}) }}
                            onClick={() => setForm({ ...form, role: r.value })}>
                            <div style={st.roleLabel}>{r.label}</div>
                            <div style={st.roleDesc}>{r.desc}</div>
                            {r.fee && <div style={st.roleFee}>KES {r.fee} fee</div>}
                        </div>
                    ))}
                </div>

                {(form.role === 'seller' || form.role === 'affiliate') && (
                    <div style={st.feeNotice}>
                        💳 A registration fee of <b>KES 100</b> will be charged to your wallet.
                        Your wallet starts at <b>-KES 100</b> — deposit to bring it to zero before withdrawing.
                    </div>
                )}

                {error && <div style={st.error}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label style={st.label}>Full name</label>
                    <input style={st.input} placeholder="Jane Mwangi" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />

                    <label style={st.label}>Email</label>
                    <input style={st.input} type="email" placeholder="jane@email.com" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} required />

                    <label style={st.label}>Password</label>
                    <input style={st.input} type="password" placeholder="At least 6 characters"
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} required />

                    <label style={st.label}>Confirm password</label>
                    <input
                        style={{
                            ...st.input,
                            borderColor: form.confirm_password && form.password !== form.confirm_password
                                ? '#7c2020' : form.confirm_password && form.password === form.confirm_password
                                    ? '#2a5048' : undefined
                        }}
                        type="password"
                        placeholder="Re-enter your password"
                        value={form.confirm_password}
                        onChange={e => setForm({ ...form, confirm_password: e.target.value })} required />
                    {form.confirm_password && form.password !== form.confirm_password && (
                        <div style={st.fieldError}>Passwords do not match</div>
                    )}
                    {form.confirm_password && form.password === form.confirm_password && (
                        <div style={st.fieldSuccess}>✓ Passwords match</div>
                    )}

                    <label style={st.label}>
                        Referral code <span style={{ color: '#5a6480' }}>(optional)</span>
                    </label>
                    <input
                        style={{ ...st.input, ...(form.referral_code ? { borderColor: '#7c6ef7', color: '#a89cf7' } : {}) }}
                        placeholder="e.g. aB3@kZ9!"
                        value={form.referral_code}
                        onChange={e => setForm({ ...form, referral_code: e.target.value })}
                    />
                    {form.referral_code && (
                        <div style={st.fieldSuccess}>✅ Referral code applied</div>
                    )}

                    <button style={st.btn} type="submit" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create account'}
                    </button>
                </form>

                <p style={st.footer}>
                    Already have an account? <Link to="/login" style={st.link}>Log in</Link>
                </p>
            </div>
        </div>
    );
}

const st = {
    page: { background: '#0f1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' },
    card: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 420 },
    logo: { color: '#7c6ef7', fontSize: 22, fontWeight: 500, marginBottom: 20 },
    title: { color: '#e2e8f0', fontSize: 18, fontWeight: 500, marginBottom: 4 },
    sub: { color: '#5a6480', fontSize: 13, marginBottom: 20, lineHeight: 1.5 },
    roleRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 },
    roleTab: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 8px', textAlign: 'center', cursor: 'pointer' },
    roleTabActive: { border: '1px solid #7c6ef7', background: '#1e1a3a' },
    roleLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: 500 },
    roleDesc: { color: '#5a6480', fontSize: 11, marginTop: 3 },
    roleFee: { color: '#f7c948', fontSize: 11, marginTop: 4, fontWeight: 600 },
    feeNotice: { background: '#2a1f08', border: '0.5px solid #4a3510', color: '#f7c948', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 16, lineHeight: 1.6 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 6, boxSizing: 'border-box' },
    btn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: 11, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 10 },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 16 },
    success: { background: '#0a2318', border: '0.5px solid #1a5c3a', color: '#6ee7b7', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 16 },
    fieldError: { color: '#f09595', fontSize: 11, marginBottom: 10, marginTop: -2 },
    fieldSuccess: { color: '#6ee7b7', fontSize: 11, marginBottom: 10, marginTop: -2 },
    footer: { color: '#5a6480', fontSize: 13, textAlign: 'center', marginTop: 14 },
    link: { color: '#a89cf7', textDecoration: 'none', cursor: 'pointer' },
};
