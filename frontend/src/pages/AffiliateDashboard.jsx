import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const CLOUD_NAME = 'dalljawxl';
const UPLOAD_PRESET = 'easybuy_products';

export default function AffiliateDashboard() {
    const navigate = useNavigate();
    const fileInputRef = useRef();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [copied, setCopied] = useState('');
    const [profileForm, setProfileForm] = useState({ name: '', profile_picture: '', mpesa_number: '' });
    const [editMode, setEditMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [pwMsg, setPwMsg] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMsg, setWithdrawMsg] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [mpesaNumber, setMpesaNumber] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [depositAmount, setDepositAmount] = useState('');
    const [activating, setActivating] = useState(false);
    const [activationMsg, setActivationMsg] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');
    
    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(() => fetchDashboard(), 30000);
        return () => clearInterval(interval);
    }, []); // eslint-disable-line

    async function fetchDashboard() {
        try {
            const [dashRes, profileRes] = await Promise.all([
                API.get('/api/affiliate/dashboard'),
                API.get('/api/profile'),
            ]);
            setData(dashRes.data);
            setProfileForm({
                name: profileRes.data.name || '',
                profile_picture: profileRes.data.profile_picture || '',
                mpesa_number: profileRes.data.mpesa_number || '',
            });
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
            else setError('Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    }

    async function handleImageUpload(file) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('cloud_name', CLOUD_NAME);
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const json = await res.json();
            setProfileForm(f => ({ ...f, profile_picture: json.secure_url }));
        } catch {
            setProfileMsg('❌ Image upload failed');
        } finally {
            setUploading(false);
        }
    }

    async function handleProfileSave(e) {
        e.preventDefault();
        setProfileMsg('');
        try {
            await API.put('/api/profile/update', profileForm);
            setProfileMsg('✅ Profile updated successfully');
            setEditMode(false);
            fetchDashboard();
        } catch (err) {
            setProfileMsg('❌ ' + (err.response?.data?.message || 'Update failed'));
        }
    }

    async function handlePasswordChange(e) {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) { setPwMsg('❌ New passwords do not match'); return; }
        setPwLoading(true); setPwMsg('');
        try {
            await API.put('/api/profile/password', pwForm);
            setPwMsg('✅ Password changed successfully');
            setPwForm({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            setPwMsg('❌ ' + (err.response?.data?.message || 'Failed'));
        } finally { setPwLoading(false); }
    }

    async function handleWithdraw(e) {
        e.preventDefault();
        setWithdrawing(true); setWithdrawMsg('');
        try {
            await API.post('/api/withdrawals/request', { amount: parseFloat(withdrawAmount) });
            setWithdrawMsg('✅ Withdrawal request submitted!');
            setWithdrawAmount('');
            fetchDashboard();
        } catch (err) {
            setWithdrawMsg('❌ ' + (err.response?.data?.message || 'Withdrawal failed'));
        } finally { setWithdrawing(false); }
    }

    async function handleActivation(e) {
        e.preventDefault();
        setActivating(true);
        setActivationMsg('');
        try {
            const res = await API.post('/api/mpesa/stk-push', {
                phone: mpesaPhone,
                amount: parseFloat(depositAmount)
            });
            setActivationMsg('✅ ' + res.data.message);
            setDepositAmount('');
            setMpesaPhone('');
            if (res.data.checkoutRequestId) {
                let attempts = 0;
                const interval = setInterval(async () => {
                    attempts++;
                    if (attempts > 10) { clearInterval(interval); return; }
                    try {
                        const statusRes = await API.get(`/api/mpesa/status/${res.data.checkoutRequestId}`);
                        if (statusRes.data.ResultCode === '0') {
                           clearInterval(interval);
                           setActivationMsg('✅ Payment confirmed! Account activated.');
                           setIsActive(true);
                           fetchDashboard();
                        }
                    } catch (err) { console.error(err); }
                }, 5000);
            }
        } catch (err) {
            setActivationMsg('❌ ' + (err.response?.data?.message || 'Failed'));
        } finally {
            setActivating(false);
        }
    }


    function copyText(text, label) {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    }

    function logout() {
        if (window.confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('token');
            navigate('/login');
        }
    }

    if (loading) return (
        <div style={s.page}><div style={s.center}><p style={{ color: '#5a6480' }}>Loading dashboard…</p></div></div>
    );
    if (error) return (
        <div style={s.page}><div style={s.center}><p style={{ color: '#f09595' }}>{error}</p></div></div>
    );

    const balance = parseFloat(data.wallet_balance || 0);
    const totalEarned = parseFloat(data.total_earned || 0);
    const referralLink = `${window.location.origin}/register?ref=${data.referral_code}`;
    

    return (
        <div style={s.page}>
            {/* ── Navbar ── */}
            <div style={s.nav}>
                <span style={s.navLogo}>🛍 EasyBuy</span>
                <div style={s.navRight}>
                    <div style={s.navAvatar} onClick={() => { setActiveTab('profile'); setEditMode(false); }}>
                        {profileForm.profile_picture
                            ? <img src={profileForm.profile_picture} alt="avatar" style={s.navAvatarImg} />
                            : <span style={s.navAvatarInitial}>{data.name?.[0]?.toUpperCase()}</span>
                        }
                    </div>
                    <span style={s.navName}>{data.name}</span>
                    <span style={s.navBadge}>Affiliate</span>
                    <button style={s.logoutBtn} onClick={logout}>Log out</button>
                </div>
            </div>

            <div style={s.container}>
                {!isActive ? (
                    /* ── ACTIVATION WALL — all dashboard features hidden until paid ── */
                    <div style={s.activationWall}>
                        <div style={s.activationIcon}>🔒</div>
                        <div style={s.activationTitle}>Activate your affiliate account</div>
                        <div style={s.activationSub}>
                            Pay the one-time activation fee of <b style={{ color: '#f7c948' }}>KES 100</b> to access
                            your referral link, promo tools, and start earning commissions.
                        </div>
                        <form onSubmit={handleActivation} style={{maxWidth:320, margin:'0 auto'}}>
                            <label style={s.label}>M-Pesa phone number</label>
                            <input style={s.input} type="tel" placeholder="e.g. 0712345678"
                                value={depositAmount === '' ? '' : mpesaPhone}
                                onChange={e => setMpesaPhone(e.target.value)} required />
                            <label style={s.label}>Amount (KES 100)</label>
                            <input style={s.input} type="number" placeholder="100"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)} required />
                            <button style={s.primaryBtn} type="submit" disabled={activating}>
                                {activating ? 'Processing...' : '📱 Pay via M-Pesa & Activate'}
                            </button>
                            <div style={{fontSize:12, color:'#5a6480', marginTop:8}}>
                                You'll receive a PIN prompt on your phone after clicking Pay.
                            </div>
                        </form>
                        {activationMsg && (
                            <div style={{ marginTop: 14, fontSize: 13, textAlign: 'center', color: activationMsg.startsWith('✅') ? '#6ee7b7' : '#f09595' }}>
                                {activationMsg}
                            </div>
                        )}
                        <div style={{ marginTop: 16, fontSize: 12, color: '#5a6480', textAlign: 'center' }}>
                            After activation your referrer will receive their KES 30 bonus automatically.
                        </div>
                    </div>
                ) : (
                    /* ── FULL DASHBOARD — only shown after activation ── */
                    <div>
                        {/* Stats */}
                        <div style={s.statsRow}>
                            {[
                                { label: 'Wallet balance', value: `KES ${balance.toFixed(2)}`, color: balance >= 0 ? '#6ee7b7' : '#f09595' },
                                { label: 'Total earned', value: `KES ${totalEarned.toFixed(2)}`, color: '#a89cf7' },
                                { label: 'People referred', value: data.referrals?.length || 0, color: '#f7c948' },
                                { label: 'Commissions', value: data.transactions?.filter(t => parseFloat(t.amount) > 0).length || 0, color: '#6ee7b7' },
                            ].map((stat, i) => (
                                <div key={i} style={s.statCard}>
                                    <div style={s.statLabel}>{stat.label}</div>
                                    <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Referral card */}
                        <div style={s.refCard}>
                            <div style={s.refLeft}>
                                <div style={s.refTitle}>Your referral code</div>
                                <div style={s.refCode}>{data.referral_code}</div>
                                <div style={s.refDesc}>
                                    Earn <b style={{ color: '#f7c948' }}>KES 150</b> when a referred seller activates,{' '}
                                    <b style={{ color: '#6ee7b7' }}>KES 30</b> when a referred affiliate activates,
                                    and <b style={{ color: '#a89cf7' }}>10%</b> of every purchase they make.
                                </div>
                            </div>
                            <div style={s.refBtns}>
                                <button style={s.copyBtn} onClick={() => copyText(data.referral_code, 'code')}>
                                    {copied === 'code' ? '✅ Copied!' : '📋 Copy code'}
                                </button>
                                <button style={{ ...s.copyBtn, borderColor: '#7c6ef7', color: '#a89cf7' }}
                                    onClick={() => copyText(referralLink, 'link')}>
                                    {copied === 'link' ? '✅ Copied!' : '🔗 Copy referral link'}
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={s.tabBar}>
                            {[
                                { id: 'overview', label: '📊 Overview' },
                                { id: 'referrals', label: '👥 Referrals' },
                                { id: 'earnings', label: '💰 Earnings' },
                                { id: 'products', label: '🛍️ Products' },
                                { id: 'profile', label: '👤 Profile' },
                            ].map(t => (
                                <button key={t.id}
                                    style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }}
                                    onClick={() => setActiveTab(t.id)}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Overview */}
                        {activeTab === 'overview' && (
                            <div>
                                <div style={s.section}>
                                    <div style={s.sectionTitle}>Withdraw funds</div>
                                    <div style={s.card}>
                                        <p style={s.note}>Available: <b style={{ color: '#6ee7b7' }}>KES {balance.toFixed(2)}</b> — Minimum KES 50</p>
                                        <form onSubmit={handleWithdraw} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            <input style={s.smallInput} type="number" placeholder="Amount (KES)"
                                                min="50" max={balance} value={withdrawAmount}
                                                onChange={e => setWithdrawAmount(e.target.value)} required />
                                            <button style={s.primaryBtn} type="submit" disabled={withdrawing || balance < 50}>
                                                {withdrawing ? 'Requesting…' : 'Request withdrawal'}
                                            </button>
                                        </form>
                                        {withdrawMsg && <div style={{ ...s.msg, color: withdrawMsg.startsWith('✅') ? '#6ee7b7' : '#f09595' }}>{withdrawMsg}</div>}
                                    </div>
                                </div>
                                <div style={s.section}>
                                    <div style={s.sectionTitle}>Recent activity</div>
                                    <TxTable rows={data.transactions?.slice(0, 5)} />
                                </div>
                            </div>
                        )}

                        {/* Referrals */}
                        {activeTab === 'referrals' && (
                            <div>
                                <div style={s.sectionTitle}>People you referred ({data.referrals?.length || 0})</div>
                                {data.referrals?.length === 0
                                    ? <div style={s.empty}>No referrals yet — share your link to start earning!</div>
                                    : <div style={s.tableWrap}>
                                        <div style={{ ...s.tableRow, ...s.tableHead }}>
                                            <span>Name</span><span>Role</span><span>Joined</span>
                                        </div>
                                        {data.referrals.map((r, i) => (
                                            <div key={i} style={s.tableRow}>
                                                <span style={{ color: '#c4cad8' }}>{r.name}</span>
                                                <span style={s.badge(r.role)}>{r.role}</span>
                                                <span style={{ color: '#5a6480' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            </div>
                        )}

                        {/* Earnings */}
                        {activeTab === 'earnings' && (
                            <div>
                                <div style={s.sectionTitle}>Commission history</div>
                                <TxTable rows={data.transactions} showType />
                            </div>
                        )}

                        {/* Products */}
                        {activeTab === 'products' && (
                            <div>
                                <div style={s.sectionTitle}>Products to promote</div>
                                <p style={{ color: '#5a6480', fontSize: 13, marginBottom: 20 }}>
                                    Copy a promo link — when your referrals click it and buy, you earn 10% instantly.
                                </p>
                                {data.products?.length === 0
                                    ? <div style={s.empty}>No products listed yet.</div>
                                    : <div style={s.productGrid}>
                                        {data.products.map((p, i) => {
                                            const promoLink = `${window.location.origin}/product/${p.id}?ref=${data.referral_code}`;
                                            const label = `product-${p.id}`;
                                            return (
                                                <div key={i} style={s.productCard}>
                                                    {p.image && <img src={p.image} alt={p.name} style={s.productImg} />}
                                                    <div style={s.productName}>{p.name}</div>
                                                    <div style={s.productPrice}>KES {parseFloat(p.price).toFixed(2)}</div>
                                                    <div style={s.productCut}>Your cut: <b style={{ color: '#6ee7b7' }}>KES {(p.price * 0.1).toFixed(2)}</b></div>
                                                    <button style={s.shareBtn} onClick={() => copyText(promoLink, label)}>
                                                        {copied === label ? '✅ Copied!' : '🔗 Copy promo link'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                }
                            </div>
                        )}

                        {/* Profile */}
                        {activeTab === 'profile' && (
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div style={s.card}>
                                    <div style={s.sectionTitle}>Profile</div>
                                    <div style={s.profileHeader}>
                                        <div style={s.bigAvatar}>
                                            {profileForm.profile_picture
                                                ? <img src={profileForm.profile_picture} alt="avatar" style={s.bigAvatarImg} />
                                                : <div style={s.bigAvatarInitial}>{data.name?.[0]?.toUpperCase()}</div>
                                            }
                                        </div>
                                        <div>
                                            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 16 }}>{data.name}</div>
                                            <div style={{ color: '#5a6480', fontSize: 13 }}>{data.email}</div>
                                            <div style={{ color: '#a89cf7', fontSize: 12, marginTop: 4, fontFamily: 'monospace', letterSpacing: 2 }}>{data.referral_code}</div>
                                            <button style={{ ...s.shareBtn, marginTop: 10, padding: '6px 14px', width: 'auto' }}
                                                onClick={() => setEditMode(e => !e)}>
                                                {editMode ? 'Cancel' : '✏️ Edit profile'}
                                            </button>
                                        </div>
                                    </div>
                                    {editMode && (
                                        <form onSubmit={handleProfileSave} style={{ marginTop: 16 }}>
                                            <label style={s.label}>Full name</label>
                                            <input style={s.input} value={profileForm.name}
                                                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required />
                                            <label style={s.label}>Profile picture</label>
                                            <input type="file" accept="image/*" ref={fileInputRef}
                                                onChange={e => handleImageUpload(e.target.files[0])}
                                                style={{ ...s.input, padding: 8 }} />
                                            {uploading && <div style={{ color: '#5a6480', fontSize: 12, marginBottom: 10 }}>Uploading…</div>}
                                            {profileForm.profile_picture && (
                                                <img src={profileForm.profile_picture} alt="preview"
                                                    style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', marginBottom: 14 }} />
                                            )}
                                            <label style={s.label}>M-Pesa number <span style={{ color: '#5a6480' }}>(for withdrawals)</span></label>
                                            <input style={s.input} placeholder="e.g. 0712345678"
                                                value={profileForm.mpesa_number}
                                                onChange={e => setProfileForm(f => ({ ...f, mpesa_number: e.target.value }))} />
                                            <button style={s.primaryBtn} type="submit">Save changes</button>
                                            {profileMsg && (
                                                <div style={{ ...s.msg, marginTop: 10, color: profileMsg.startsWith('✅') ? '#6ee7b7' : '#f09595' }}>
                                                    {profileMsg}
                                                </div>
                                            )}
                                        </form>
                                    )}
                                </div>
                                <div style={s.card}>
                                    <div style={s.sectionTitle}>Change password</div>
                                    <form onSubmit={handlePasswordChange}>
                                        <label style={s.label}>Current password</label>
                                        <input style={s.input} type="password" placeholder="••••••••"
                                            value={pwForm.current_password}
                                            onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} required />
                                        <label style={s.label}>New password</label>
                                        <input style={s.input} type="password" placeholder="••••••••"
                                            value={pwForm.new_password}
                                            onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} required />
                                        <label style={s.label}>Confirm new password</label>
                                        <input style={s.input} type="password" placeholder="••••••••"
                                            value={pwForm.confirm_password}
                                            onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))} required />
                                        <button style={s.primaryBtn} type="submit" disabled={pwLoading}>
                                            {pwLoading ? 'Updating…' : 'Change password'}
                                        </button>
                                        {pwMsg && (
                                            <div style={{ ...s.msg, marginTop: 10, color: pwMsg.startsWith('✅') ? '#6ee7b7' : '#f09595' }}>
                                                {pwMsg}
                                            </div>
                                        )}
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TxTable({ rows, showType }) {
    if (!rows || rows.length === 0) return <div style={s.empty}>No transactions yet.</div>;
    const cols = showType ? '2fr 1fr 1fr 1fr' : '2fr 1fr 1fr';
    return (
        <div style={s.tableWrap}>
            <div style={{ ...s.tableRow, ...s.tableHead, gridTemplateColumns: cols }}>
                <span>Description</span>
                {showType && <span>Type</span>}
                <span>Amount</span>
                <span>Date</span>
            </div>
            {rows.map((tx, i) => (
                <div key={i} style={{ ...s.tableRow, gridTemplateColumns: cols }}>
                    <span style={{ color: '#c4cad8' }}>{tx.description}</span>
                    {showType && <span style={{ color: '#a89cf7', fontSize: 11 }}>{tx.type}</span>}
                    <span style={{ color: parseFloat(tx.amount) >= 0 ? '#6ee7b7' : '#f09595', fontWeight: 600 }}>
                        {parseFloat(tx.amount) >= 0 ? '+' : ''}KES {Math.abs(parseFloat(tx.amount)).toFixed(2)}
                    </span>
                    <span style={{ color: '#5a6480' }}>{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
            ))}
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    center: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    navLogo: { color: '#7c6ef7', fontWeight: 600, fontSize: 18 },
    navRight: { display: 'flex', alignItems: 'center', gap: 12 },
    navName: { color: '#e2e8f0', fontSize: 13 },
    navBadge: { background: '#1e1a3a', color: '#a89cf7', fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '0.5px solid #7c6ef7' },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    navAvatar: { width: 34, height: 34, borderRadius: '50%', background: '#1e1a3a', border: '2px solid #7c6ef7', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    navAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    navAvatarInitial: { color: '#a89cf7', fontWeight: 700, fontSize: 14 },
    container: { maxWidth: 920, margin: '0 auto', padding: '24px 20px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 },
    statCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '16px 18px' },
    statLabel: { color: '#5a6480', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    statValue: { fontSize: 22, fontWeight: 600 },
    refCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
    refLeft: { flex: 1 },
    refTitle: { color: '#8892a4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    refCode: { color: '#7c6ef7', fontSize: 24, fontWeight: 700, letterSpacing: 4, marginBottom: 10, fontFamily: 'monospace' },
    refDesc: { color: '#5a6480', fontSize: 13, lineHeight: 1.6 },
    refBtns: { display: 'flex', flexDirection: 'column', gap: 8 },
    copyBtn: { background: '#1a1f2e', border: '0.5px solid #2d3348', color: '#e2e8f0', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
    tabBar: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '0.5px solid #2d3348', flexWrap: 'wrap' },
    tab: { background: 'transparent', border: 'none', color: '#5a6480', padding: '12px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '2px solid transparent', marginBottom: -1 },
    tabActive: { color: '#e2e8f0', borderBottom: '2px solid #7c6ef7' },
    section: { marginBottom: 24 },
    sectionTitle: { color: '#8892a4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
    card: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px', marginBottom: 16 },
    note: { color: '#8892a4', fontSize: 13, marginBottom: 14 },
    msg: { fontSize: 13 },
    empty: { color: '#5a6480', fontSize: 13, padding: '24px 0', textAlign: 'center' },
    smallInput: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 14, width: 160 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none', display: 'block' },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    primaryBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    submitBtn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
    activationWall: { background: '#1a1520', border: '1px solid #4a3580', borderRadius: 14, padding: '40px 24px', textAlign: 'center' },
    activationIcon: { fontSize: 48, marginBottom: 12 },
    activationTitle: { color: '#e2e8f0', fontSize: 20, fontWeight: 600, marginBottom: 10 },
    activationSub: { color: '#8892a4', fontSize: 14, lineHeight: 1.7, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' },
    tableWrap: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, overflow: 'hidden' },
    tableHead: { background: '#1a1f2e', color: '#5a6480', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
    tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 16px', borderTop: '0.5px solid #1a1f2e', alignItems: 'center', fontSize: 13 },
    profileHeader: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
    bigAvatar: { width: 70, height: 70, borderRadius: '50%', background: '#2d3a5c', border: '3px solid #7c6ef7', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    bigAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    bigAvatarInitial: { color: '#7c9ef7', fontWeight: 700, fontSize: 28 },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 },
    productCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: 14 },
    productImg: { width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 10 },
    productName: { color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 4 },
    productPrice: { color: '#8892a4', fontSize: 12, marginBottom: 4 },
    productCut: { color: '#8892a4', fontSize: 12, marginBottom: 12 },
    shareBtn: { width: '100%', background: '#1a1f2e', border: '0.5px solid #2d3348', color: '#a89cf7', padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
    badge: (role) => ({
        display: 'inline-block',
        background: role === 'affiliate' ? '#1e1a3a' : role === 'seller' ? '#0a2318' : '#1a1f2e',
        color: role === 'affiliate' ? '#a89cf7' : role === 'seller' ? '#6ee7b7' : '#8892a4',
        fontSize: 11, padding: '2px 8px', borderRadius: 20,
    }),
};
