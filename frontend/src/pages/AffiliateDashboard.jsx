import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function AffiliateDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMsg, setWithdrawMsg] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    
    useEffect(() => {
    fetchDashboard();
}, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchDashboard() {
        try {
            const res = await API.get('/api/affiliate/dashboard');
            setData(res.data);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
            } else {
                setError('Failed to load dashboard.');
            }
        } finally {
            setLoading(false);
        }
    }

    function copyReferralCode() {
        navigator.clipboard.writeText(data.referral_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function copyReferralLink() {
        const link = `${window.location.origin}/register?ref=${data.referral_code}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function handleWithdraw(e) {
        e.preventDefault();
        setWithdrawing(true);
        setWithdrawMsg('');
        try {
            await API.post('/api/withdrawals/request', { amount: parseFloat(withdrawAmount) });
            setWithdrawMsg('✅ Withdrawal request submitted!');
            setWithdrawAmount('');
            fetchDashboard(); // refresh balance
        } catch (err) {
            setWithdrawMsg(err.response?.data?.message || 'Withdrawal failed.');
        } finally {
            setWithdrawing(false);
        }
    }

    function logout() {
        localStorage.removeItem('token');
        navigate('/login');
    }

    if (loading) return (
        <div style={s.page}>
            <div style={s.loadingBox}>
                <div style={s.spinner} />
                <p style={{ color: '#5a6480', marginTop: 12 }}>Loading your dashboard…</p>
            </div>
        </div>
    );

    if (error) return (
        <div style={s.page}>
            <div style={{ color: '#f09595', textAlign: 'center' }}>{error}</div>
        </div>
    );

    const balance = parseFloat(data.wallet_balance || 0);
    const totalEarned = parseFloat(data.total_earned || 0);

    return (
        <div style={s.page}>
            {/* ── Top nav ── */}
            <div style={s.nav}>
                <span style={s.navLogo}>EasyBuy</span>
                <div style={s.navRight}>
                    <span style={s.navName}>👋 {data.name}</span>
                    <span style={s.navRole}>Affiliate</span>
                    <button style={s.logoutBtn} onClick={logout}>Log out</button>
                </div>
            </div>

            <div style={s.container}>

                {/* ── Stats row ── */}
                <div style={s.statsRow}>
                    <div style={s.statCard}>
                        <div style={s.statLabel}>Wallet balance</div>
                        <div style={s.statValue}>
                            KES <span style={{ color: balance >= 0 ? '#6ee7b7' : '#f09595' }}>
                                {balance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div style={s.statCard}>
                        <div style={s.statLabel}>Total earned</div>
                        <div style={s.statValue}>KES <span style={{ color: '#a89cf7' }}>{totalEarned.toFixed(2)}</span></div>
                    </div>
                    <div style={s.statCard}>
                        <div style={s.statLabel}>People referred</div>
                        <div style={s.statValue}><span style={{ color: '#f7c948' }}>{data.referrals?.length || 0}</span></div>
                    </div>
                    <div style={s.statCard}>
                        <div style={s.statLabel}>Commissions paid</div>
                        <div style={s.statValue}><span style={{ color: '#6ee7b7' }}>{data.transactions?.length || 0}</span></div>
                    </div>
                </div>

                {/* ── Referral code card ── */}
                <div style={s.refCard}>
                    <div style={s.refLeft}>
                        <div style={s.refTitle}>Your referral code</div>
                        <div style={s.refCode}>{data.referral_code}</div>
                        <div style={s.refDesc}>
                            Share this code or link. You earn <b style={{ color: '#6ee7b7' }}>KES 30</b> when someone registers
                            as an affiliate or seller, and <b style={{ color: '#a89cf7' }}>10%</b> of every purchase they make.
                        </div>
                    </div>
                    <div style={s.refBtns}>
                        <button style={s.copyBtn} onClick={copyReferralCode}>
                            {copied ? '✅ Copied!' : '📋 Copy code'}
                        </button>
                        <button style={{ ...s.copyBtn, background: '#1e1a3a', borderColor: '#7c6ef7' }} onClick={copyReferralLink}>
                            🔗 Copy link
                        </button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div style={s.tabRow}>
                    {['overview', 'referrals', 'earnings', 'products'].map(tab => (
                        <button key={tab} style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                            onClick={() => setActiveTab(tab)}>
                            {{ overview: '📊 Overview', referrals: '👥 Referrals', earnings: '💰 Earnings', products: '🛍️ Products' }[tab]}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Overview (withdraw) ── */}
                {activeTab === 'overview' && (
                    <div style={s.tabContent}>
                        <div style={s.section}>
                            <div style={s.sectionTitle}>Withdraw funds</div>
                            <div style={s.withdrawCard}>
                                <p style={s.withdrawNote}>
                                    Available balance: <b style={{ color: '#6ee7b7' }}>KES {balance.toFixed(2)}</b>.
                                    Minimum withdrawal is KES 50.
                                </p>
                                <form onSubmit={handleWithdraw} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <input
                                        style={s.withdrawInput}
                                        type="number"
                                        placeholder="Amount (KES)"
                                        min="50"
                                        max={balance}
                                        value={withdrawAmount}
                                        onChange={e => setWithdrawAmount(e.target.value)}
                                        required
                                    />
                                    <button style={s.withdrawBtn} type="submit" disabled={withdrawing || balance < 50}>
                                        {withdrawing ? 'Requesting…' : 'Request withdrawal'}
                                    </button>
                                </form>
                                {withdrawMsg && (
                                    <div style={{ ...s.withdrawMsg, color: withdrawMsg.startsWith('✅') ? '#6ee7b7' : '#f09595' }}>
                                        {withdrawMsg}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent activity */}
                        <div style={s.section}>
                            <div style={s.sectionTitle}>Recent activity</div>
                            {data.transactions?.length === 0 ? (
                                <div style={s.empty}>No earnings yet. Share your referral code to start earning!</div>
                            ) : (
                                <div style={s.table}>
                                    <div style={s.tableHead}>
                                        <span>Description</span><span>Amount</span><span>Date</span>
                                    </div>
                                    {data.transactions?.slice(0, 5).map((tx, i) => (
                                        <div key={i} style={s.tableRow}>
                                            <span style={{ color: '#c4cad8' }}>{tx.description}</span>
                                            <span style={{ color: '#6ee7b7', fontWeight: 600 }}>+KES {parseFloat(tx.amount).toFixed(2)}</span>
                                            <span style={{ color: '#5a6480' }}>{new Date(tx.created_at).toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab: Referrals ── */}
                {activeTab === 'referrals' && (
                    <div style={s.tabContent}>
                        <div style={s.sectionTitle}>People you referred ({data.referrals?.length || 0})</div>
                        {data.referrals?.length === 0 ? (
                            <div style={s.empty}>No referrals yet. Share your code to get started!</div>
                        ) : (
                            <div style={s.table}>
                                <div style={s.tableHead}>
                                    <span>Name</span><span>Role</span><span>Joined</span>
                                </div>
                                {data.referrals.map((r, i) => (
                                    <div key={i} style={s.tableRow}>
                                        <span style={{ color: '#c4cad8' }}>{r.name}</span>
                                        <span style={s.roleBadge(r.role)}>{r.role}</span>
                                        <span style={{ color: '#5a6480' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Earnings ── */}
                {activeTab === 'earnings' && (
                    <div style={s.tabContent}>
                        <div style={s.sectionTitle}>Commission history</div>
                        {data.transactions?.length === 0 ? (
                            <div style={s.empty}>No commissions yet.</div>
                        ) : (
                            <div style={s.table}>
                                <div style={s.tableHead}>
                                    <span>Description</span><span>Type</span><span>Amount</span><span>Date</span>
                                </div>
                                {data.transactions.map((tx, i) => (
                                    <div key={i} style={s.tableRow}>
                                        <span style={{ color: '#c4cad8' }}>{tx.description}</span>
                                        <span style={{ color: '#a89cf7', fontSize: 11 }}>{tx.type}</span>
                                        <span style={{ color: '#6ee7b7', fontWeight: 600 }}>+KES {parseFloat(tx.amount).toFixed(2)}</span>
                                        <span style={{ color: '#5a6480' }}>{new Date(tx.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Products ── */}
                {activeTab === 'products' && (
                    <div style={s.tabContent}>
                        <div style={s.sectionTitle}>Products to promote</div>
                        <p style={{ color: '#5a6480', fontSize: 13, marginBottom: 20 }}>
                            Share any product link with your referral code — you earn 10% when your referrals buy.
                        </p>
                        {data.products?.length === 0 ? (
                            <div style={s.empty}>No products listed yet.</div>
                        ) : (
                            <div style={s.productGrid}>
                                {data.products.map((p, i) => (
                                    <div key={i} style={s.productCard}>
                                        {p.image && (
                                            <img src={p.image} alt={p.name} style={s.productImg} />
                                        )}
                                        <div style={s.productName}>{p.name}</div>
                                        <div style={s.productPrice}>KES {parseFloat(p.price).toFixed(2)}</div>
                                        <div style={s.productCommission}>
                                            Your cut: <b style={{ color: '#6ee7b7' }}>KES {(p.price * 0.1).toFixed(2)}</b>
                                        </div>
                                        <button style={s.shareBtn} onClick={() => {
                                            const link = `${window.location.origin}/product/${p.id}?ref=${data.referral_code}`;
                                            navigator.clipboard.writeText(link);
                                        }}>
                                            🔗 Copy promo link
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' },
    loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
    spinner: { width: 32, height: 32, border: '3px solid #2d3348', borderTop: '3px solid #7c6ef7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    navLogo: { color: '#7c6ef7', fontWeight: 600, fontSize: 18 },
    navRight: { display: 'flex', alignItems: 'center', gap: 14 },
    navName: { color: '#e2e8f0', fontSize: 13 },
    navRole: { background: '#1e1a3a', color: '#a89cf7', fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '0.5px solid #7c6ef7' },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#5a6480', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },

    container: { maxWidth: 900, margin: '0 auto', padding: '28px 20px' },

    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 },
    statCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '16px 18px' },
    statLabel: { color: '#5a6480', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
    statValue: { color: '#e2e8f0', fontSize: 22, fontWeight: 600 },

    refCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
    refLeft: { flex: 1 },
    refTitle: { color: '#8892a4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    refCode: { color: '#7c6ef7', fontSize: 26, fontWeight: 700, letterSpacing: 4, marginBottom: 10, fontFamily: 'monospace' },
    refDesc: { color: '#5a6480', fontSize: 13, lineHeight: 1.6 },
    refBtns: { display: 'flex', flexDirection: 'column', gap: 8 },
    copyBtn: { background: '#1a1f2e', border: '0.5px solid #2d3348', color: '#e2e8f0', padding: '9px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },

    tabRow: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '0.5px solid #2d3348', paddingBottom: 0 },
    tab: { background: 'transparent', border: 'none', color: '#5a6480', padding: '10px 16px', cursor: 'pointer', fontSize: 13, borderBottom: '2px solid transparent', marginBottom: -1 },
    tabActive: { color: '#a89cf7', borderBottom: '2px solid #7c6ef7' },
    tabContent: {},

    section: { marginBottom: 28 },
    sectionTitle: { color: '#8892a4', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

    withdrawCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '20px 24px' },
    withdrawNote: { color: '#8892a4', fontSize: 13, marginBottom: 16 },
    withdrawInput: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 14, width: 180 },
    withdrawBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 },
    withdrawMsg: { marginTop: 12, fontSize: 13 },

    table: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, overflow: 'hidden' },
    tableHead: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '10px 16px', background: '#1a1f2e', color: '#5a6480', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
    tableRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 16px', borderTop: '0.5px solid #1a1f2e', alignItems: 'center', fontSize: 13 },

    empty: { color: '#5a6480', fontSize: 13, padding: '24px 0', textAlign: 'center' },

    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
    productCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: 16 },
    productImg: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 10 },
    productName: { color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 4 },
    productPrice: { color: '#8892a4', fontSize: 12, marginBottom: 4 },
    productCommission: { color: '#8892a4', fontSize: 12, marginBottom: 12 },
    shareBtn: { width: '100%', background: '#1a1f2e', border: '0.5px solid #2d3348', color: '#a89cf7', padding: '7px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12 },

    roleBadge: (role) => ({
        display: 'inline-block',
        background: role === 'affiliate' ? '#1e1a3a' : role === 'seller' ? '#0a2318' : '#1a1f2e',
        color: role === 'affiliate' ? '#a89cf7' : role === 'seller' ? '#6ee7b7' : '#8892a4',
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 20,
    }),
};
