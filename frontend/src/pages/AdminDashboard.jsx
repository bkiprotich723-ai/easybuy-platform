import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function AdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [tickets, setTickets] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchStats();
        fetchUsers();
        fetchOrders();
        fetchWithdrawals();
        fetchTickets();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await API.get('/api/revenue/summary');
            setStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await API.get('/api/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await API.get('/api/admin/orders');
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTickets = async () => {
        try {
            const res = await API.get('/api/support/all');
            setTickets(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchWithdrawals = async () => {
        try {
            const res = await API.get('/api/admin/withdrawals');
            setWithdrawals(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleApprove = async (id) => {
        try {
            await API.post(`/api/admin/withdrawals/${id}/approve`);
            setMessage('✅ Withdrawal approved');
            fetchWithdrawals();
            fetchStats();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
        logout();
        navigate('/');
    }
};

    const handleCloseTicket = async (id) => {
        try {
            await API.post(`/api/support/close/${id}`);
            setMessage('✅ Ticket closed');
            fetchTickets();
            fetchStats();
        } catch (err) {
            setMessage('❌ Failed to close ticket');
        }
    };

    const tabs = ['overview', 'users', 'orders', 'withdrawals', 'support'];

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <div style={s.logo}>🛡 Admin Panel</div>
                <div style={s.navRight}>
                    <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
                </div>
            </div>

            <div style={s.layout}>
                <div style={s.sidebar}>
                    {tabs.map(tab => (
                        <div key={tab} style={{...s.sideItem, ...(activeTab === tab ? s.sideActive : {})}}
                            onClick={() => setActiveTab(tab)}>
                            <span>
                                {tab === 'overview' && '📊 '}
                                {tab === 'users' && '👥 '}
                                {tab === 'orders' && '📦 '}
                                {tab === 'withdrawals' && '💸 '}
                                {tab === 'support' && '🎧 '}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </span>
                            {tab === 'withdrawals' && withdrawals.filter(w => w.status === 'pending').length > 0 && (
                                <span style={s.badge2}>{withdrawals.filter(w => w.status === 'pending').length}</span>
                            )}
                            {tab === 'support' && tickets.filter(t => t.status === 'open').length > 0 && (
                                <span style={s.badge2}>{tickets.filter(t => t.status === 'open').length}</span>
                            )}
                            {tab === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                                <span style={s.badge2}>{orders.filter(o => o.status === 'pending').length}</span>
                            )}
                        </div>
                    ))}
                </div>

                <div style={s.mainContent}>
                    {message && (
                        <div style={message.startsWith('✅') ? s.success : s.error}>
                            {message}
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div>
                            <div style={s.pageTitle}>Platform Overview</div>
                            <div style={s.statsGrid}>
                                <div style={s.stat}>
                                    <div style={s.statLabel}>Total Users</div>
                                    <div style={s.statVal}>{stats.totalUsers || 0}</div>
                                </div>
                                <div style={s.stat}>
                                    <div style={s.statLabel}>Total Orders</div>
                                    <div style={s.statVal}>{stats.totalOrders || 0}</div>
                                </div>
                                <div style={s.stat}>
                                    <div style={s.statLabel}>Total Revenue</div>
                                    <div style={s.statVal}>KES {parseFloat(stats.totalRevenue || 0).toLocaleString()}</div>
                                </div>
                                <div style={s.stat}>
                                    <div style={s.statLabel}>Total Withdrawals</div>
                                    <div style={s.statVal}>KES {parseFloat(stats.totalWithdrawals || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <div style={s.pageTitle}>All Users</div>
                            <div style={s.tableWrap}>
                                <div style={s.tableHeader}>
                                    <span>Name</span>
                                    <span>Email</span>
                                    <span>Role</span>
                                    <span>Joined</span>
                                </div>
                                {users.map(u => (
                                    <div key={u.id} style={s.tableRow}>
                                        <span style={s.cell}>{u.name}</span>
                                        <span style={s.cellMuted}>{u.email}</span>
                                        <span>
                                            <span style={{
                                                ...s.badge,
                                                ...(u.role === 'admin' ? s.badgeAdmin :
                                                    u.role === 'seller' ? s.badgeSeller : s.badgeBuyer)
                                            }}>
                                                {u.role}
                                            </span>
                                        </span>
                                        <span style={s.cellMuted}>{new Date(u.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div>
                            <div style={s.pageTitle}>All Orders</div>
                            <div style={s.tableWrap}>
                                <div style={s.tableHeader}>
                                    <span>Order ID</span>
                                    <span>Product</span>
                                    <span>Amount</span>
                                    <span>Date</span>
                                </div>
                                {orders.map(o => (
                                    <div key={o.id} style={s.tableRow}>
                                        <span style={s.cellMuted}>#{o.id}</span>
                                        <span style={s.cell}>{o.product_name}</span>
                                        <span style={{...s.cell, color:'#5dd6a3'}}>KES {parseFloat(o.amount).toLocaleString()}</span>
                                        <span style={s.cellMuted}>{new Date(o.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'withdrawals' && (
                        <div>
                            <div style={s.pageTitle}>Withdrawals</div>
                            <div style={s.tableWrap}>
                                <div style={{...s.tableHeader, gridTemplateColumns: 'repeat(5, 1fr)'}}>
                                    <span>ID</span>
                                    <span>User ID</span>
                                    <span>Amount</span>
                                    <span>Status</span>
                                    <span>Action</span>
                                </div>
                                {withdrawals.map(w => (
                                    <div key={w.id} style={{...s.tableRow, gridTemplateColumns: 'repeat(5, 1fr)'}}>
                                        <span style={s.cellMuted}>#{w.id}</span>
                                        <span style={s.cellMuted}>User #{w.user_id}</span>
                                        <span style={s.cell}>KES {parseFloat(w.amount).toLocaleString()}</span>
                                        <span>
                                            <span style={{
                                                ...s.badge,
                                                ...(w.status === 'approved' ? s.badgeSeller : s.badgeAdmin)
                                            }}>
                                                {w.status}
                                            </span>
                                        </span>
                                        <span>
                                            {w.status === 'pending' && (
                                                <button style={s.approveBtn} onClick={() => handleApprove(w.id)}>
                                                    Approve
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div>
                            <div style={s.pageTitle}>Support Tickets</div>
                            <div style={s.tableWrap}>
                                <div style={{...s.tableHeader, gridTemplateColumns: 'repeat(5,1fr)'}}>
                                    <span>User</span>
                                    <span>Email</span>
                                    <span>Subject</span>
                                    <span>Status</span>
                                    <span>Action</span>
                                </div>
                                {tickets.map(t => (
                                    <div key={t.id} style={{...s.tableRow, gridTemplateColumns: 'repeat(5,1fr)'}}>
                                        <span style={s.cell}>{t.user_name}</span>
                                        <span style={s.cellMuted}>{t.user_email}</span>
                                        <span style={s.cell}>{t.subject}</span>
                                        <span>
                                            <span style={{
                                                ...s.badge,
                                                ...(t.status === 'closed' ? s.badgeSeller : s.badgeAdmin)
                                            }}>
                                                {t.status}
                                            </span>
                                        </span>
                                        <span>
                                            {t.status === 'open' && (
                                                <button style={s.approveBtn} onClick={() => handleCloseTicket(t.id)}>
                                                    Close
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                ))}
                                {tickets.length === 0 && (
                                    <div style={{padding: '16px', color: '#5a6480', fontSize: 13}}>No tickets yet.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#0c0f1a', borderBottom: '0.5px solid #1e2535', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { color: '#f97066', fontSize: 20, fontWeight: 600 },
    navRight: { display: 'flex', alignItems: 'center', gap: 12 },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    layout: { display: 'flex', minHeight: 'calc(100vh - 54px)', width: '100%' },
    sidebar: { width: 160, minWidth: 160, background: '#0c0f1a', borderRight: '0.5px solid #1e2535', padding: '16px 0', flexShrink: 0 },
    mainContent: { flex: 1, padding: 24, minWidth: 0 },
    sideItem: { padding: '10px 20px', fontSize: 14, color: '#8892a4', cursor: 'pointer', textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    badge2: { background: '#f97066', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, minWidth: 20, textAlign: 'center' },
    sideActive: { color: '#e2e8f0', background: '#161b27', borderLeft: '2px solid #f97066' },
    pageTitle: { fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 20 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 },
    stat: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '16px 18px' },
    statLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    statVal: { fontSize: 22, fontWeight: 600, color: '#e2e8f0' },
    tableWrap: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, overflow: 'auto' },
    tableHeader: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '10px 16px', background: '#0c0f1a', fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8 },
    tableRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 16px', borderTop: '0.5px solid #1e2535', alignItems: 'center', minWidth: 0 },
    cell: { fontSize: 13, color: '#e2e8f0' },
    cellMuted: { fontSize: 13, color: '#5a6480' },
    badge: { fontSize: 11, padding: '3px 10px', borderRadius: 20 },
    badgeAdmin: { background: '#2a1018', color: '#f97066' },
    badgeSeller: { background: '#0f2820', color: '#5dd6a3' },
    badgeBuyer: { background: '#1a1f35', color: '#7c6ef7' },
    approveBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 },
};
