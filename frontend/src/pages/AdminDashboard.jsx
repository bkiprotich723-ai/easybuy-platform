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
    const [tickets, setTickets] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [message, setMessage] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profile, setProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({ name: '', profile_picture: '', mpesa_number: '' });
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [profileTab, setProfileTab] = useState('info');
    const [uploading, setUploading] = useState(false);
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });     
    useEffect(() => {
        fetchStats();
        fetchUsers();
        fetchOrders();
        fetchWithdrawals();
        fetchTickets();
        fetchProfile();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchStats = async () => {
        try {
            const res = await API.get('/api/revenue/summary');
            setStats(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await API.get('/api/admin/users');
            setUsers(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchOrders = async () => {
        try {
            const res = await API.get('/api/admin/orders');
            setOrders(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchWithdrawals = async () => {
        try {
            const res = await API.get('/api/admin/withdrawals');
            setWithdrawals(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTickets = async () => {
        try {
            const res = await API.get('/api/support/all');
            setTickets(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProfile = async () => {
        try {
            const res = await API.get('/api/profile');
            setProfile(res.data);
            setProfileForm({ name: res.data.name, profile_picture: res.data.profile_picture || '', mpesa_number: res.data.mpesa_number || '' });
        } catch (err) { console.error(err); }
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

    const handleCloseTicket = async (id) => {
        try {
            await API.post(`/api/support/close/${id}`);
            setMessage('✅ Ticket closed');
            fetchTickets();
        } catch (err) {
            setMessage('❌ Failed to close ticket');
        }
    };

    const handleUserStatus = async (id, status) => {
        const action = status === 'banned' ? 'ban' : status === 'restricted' ? 'restrict' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            await API.post(`/api/admin/users/${id}/status`, { status });
            setMessage(`✅ User ${status} successfully`);
            fetchUsers();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
        try {
            await API.delete(`/api/admin/users/${id}`);
            setMessage('✅ User deleted');
            fetchUsers();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleProfileImageUpload = async (file) => {
        setUploading(true);
        const data = new FormData();
        data.append('file', file);
        data.append('upload_preset', 'easybuy_products');
        data.append('cloud_name', 'dalljawxl');
        try {
            const res = await fetch('https://api.cloudinary.com/v1_1/dalljawxl/image/upload', {
                method: 'POST', body: data
            });
            const json = await res.json();
            setProfileForm(prev => ({...prev, profile_picture: json.secure_url}));
        } catch (err) {
            setMessage('❌ Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
        await API.post('/api/admin/create-admin', adminForm);
        setMessage('✅ Admin created successfully');
        setAdminForm({ name: '', email: '', password: '' });
        fetchUsers();
    } catch (err) {
        setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
    }
};

const handlePromoteAdmin = async (id) => {
    if (!window.confirm('Promote this user to admin?')) return;
    try {
        await API.post(`/api/admin/users/${id}/promote`);
        setMessage('✅ User promoted to admin');
        fetchUsers();
    } catch (err) {
        setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
    }
};
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await API.put('/api/profile/update', profileForm);
            setMessage('✅ Profile updated successfully');
            fetchProfile();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setMessage('❌ Passwords do not match');
            return;
        }
        try {
            await API.put('/api/profile/password', passwordForm);
            setMessage('✅ Password changed successfully');
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
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

    const tabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'users', icon: '👥', label: 'Users', badge: users.filter(u => u.status === 'banned').length },
    { id: 'orders', icon: '📦', label: 'Orders', badge: orders.filter(o => o.status === 'pending').length },
    { id: 'withdrawals', icon: '💸', label: 'Withdrawals', badge: withdrawals.filter(w => w.status === 'pending').length },
    { id: 'support', icon: '🎧', label: 'Support', badge: tickets.filter(t => t.status === 'open').length },
    { id: 'admins', icon: '🛡', label: 'Admins' },
    { id: 'profile', icon: '👤', label: 'Profile' },
];

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <div style={s.navLeft}>
                    <button style={s.collapseBtn} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                        {sidebarCollapsed ? '☰' : '✕'}
                    </button>
                    <div style={s.logo}>🛡 Admin</div>
                </div>
                <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
            </div>

            <div style={s.layout}>
                <div style={{...s.sidebar, ...(sidebarCollapsed ? s.sidebarCollapsed : {})}}>
                    {tabs.map(tab => (
                        <div key={tab.id}
                            style={{...s.sideItem, ...(activeTab === tab.id ? s.sideActive : {})}}
                            onClick={() => setActiveTab(tab.id)}
                            title={tab.label}>
                            <span style={s.sideIcon}>{tab.icon}</span>
                            {!sidebarCollapsed && <span style={s.sideLabel}>{tab.label}</span>}
                            {!sidebarCollapsed && tab.badge > 0 && (
                                <span style={s.sideBadge}>{tab.badge}</span>
                            )}
                            {sidebarCollapsed && tab.badge > 0 && (
                                <span style={s.sideBadgeCollapsed}>{tab.badge}</span>
                            )}
                        </div>
                    ))}
                </div>

                <div style={s.main}>
                    {message && (
                        <div style={message.startsWith('✅') ? s.success : s.error} onClick={() => setMessage('')}>
                            {message} <span style={{float:'right', cursor:'pointer'}}>✕</span>
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
                                    <div style={s.statLabel}>Withdrawals</div>
                                    <div style={s.statVal}>KES {parseFloat(stats.totalWithdrawals || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <div style={s.pageTitle}>All Users ({users.length})</div>
                            {users.map(u => (
                                <div key={u.id} style={s.userCard}>
                                    <div style={s.userInfo}>
                                        <div style={s.userAvatar}>{u.name?.charAt(0).toUpperCase()}</div>
                                        <div>
                                            <div style={s.userName}>{u.name}</div>
                                            <div style={s.userEmail}>{u.email}</div>
                                            <div style={s.userMeta}>
                                                <span style={{...s.roleBadge, ...(u.role === 'admin' ? s.badgeAdmin : u.role === 'seller' ? s.badgeSeller : s.badgeBuyer)}}>
                                                    {u.role}
                                                </span>
                                                <span style={{...s.statusBadge, ...(u.status === 'banned' ? s.badgeBanned : u.status === 'restricted' ? s.badgeRestricted : s.badgeActive)}}>
                                                    {u.status || 'active'}
                                                </span>
                                                <span style={s.userDate}>{new Date(u.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={s.userActions}>
                                        {u.status !== 'banned' && (
                                            <button style={s.banBtn} onClick={() => handleUserStatus(u.id, 'banned')}>Ban</button>
                                        )}
                                        {u.status !== 'restricted' && (
                                            <button style={s.restrictBtn} onClick={() => handleUserStatus(u.id, 'restricted')}>Restrict</button>
                                        )}
                                        {u.status !== 'active' && (
                                            <button style={s.activateBtn} onClick={() => handleUserStatus(u.id, 'active')}>Activate</button>
                                        )}
                                        <button style={s.deleteBtn} onClick={() => handleDeleteUser(u.id)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div>
                            <div style={s.pageTitle}>All Orders ({orders.length})</div>
                            {orders.map(o => (
                                <div key={o.id} style={s.card}>
                                    <div>
                                        <div style={s.cardTitle}>{o.product_name}</div>
                                        <div style={s.cardSub}>Order #{o.id} · {new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                        <div style={{color:'#5dd6a3', fontSize:14, fontWeight:600}}>KES {parseFloat(o.amount).toLocaleString()}</div>
                                        <div style={{...s.statusBadge, ...(o.status === 'delivered' ? s.badgeActive : s.badgePending)}}>
                                            {o.status || 'pending'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'withdrawals' && (
                        <div>
                            <div style={s.pageTitle}>Withdrawals</div>
                            {withdrawals.map(w => (
                                <div key={w.id} style={s.card}>
                                    <div>
                                        <div style={s.cardTitle}>User #{w.user_id}</div>
                                        <div style={s.cardSub}>{new Date(w.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                                        <div style={{fontSize:14, fontWeight:600, color:'#e2e8f0'}}>KES {parseFloat(w.amount).toLocaleString()}</div>
                                        <span style={{...s.statusBadge, ...(w.status === 'approved' ? s.badgeActive : s.badgePending)}}>
                                            {w.status}
                                        </span>
                                        {w.status === 'pending' && (
                                            <button style={s.approveBtn} onClick={() => handleApprove(w.id)}>Approve</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'support' && (
                        <div>
                            <div style={s.pageTitle}>Support Tickets</div>
                            {tickets.map(t => (
                                <div key={t.id} style={s.card}>
                                    <div style={{flex:1}}>
                                        <div style={s.cardTitle}>{t.subject}</div>
                                        <div style={s.cardSub}>{t.user_name} · {t.user_email}</div>
                                        <div style={{color:'#8892a4', fontSize:13, marginTop:4}}>{t.message}</div>
                                        <div style={s.cardSub}>{new Date(t.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                                        <span style={{...s.statusBadge, ...(t.status === 'closed' ? s.badgeActive : s.badgePending)}}>
                                            {t.status}
                                        </span>
                                        {t.status === 'open' && (
                                            <button style={s.approveBtn} onClick={() => handleCloseTicket(t.id)}>Close</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {tickets.length === 0 && <p style={s.empty}>No tickets yet.</p>}
                        </div>
                    )}
                    {activeTab === 'admins' && (
    <div>
        <div style={s.pageTitle}>Admin Management</div>
        <div style={s.formBox}>
            <div style={{fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:14}}>Create new admin</div>
            <form onSubmit={handleCreateAdmin}>
                <label style={s.label}>Full name</label>
                <input style={s.input} placeholder="Admin name"
                    value={adminForm.name}
                    onChange={e => setAdminForm({...adminForm, name: e.target.value})} required />
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" placeholder="admin@easybuy.co.ke"
                    value={adminForm.email}
                    onChange={e => setAdminForm({...adminForm, email: e.target.value})} required />
                <label style={s.label}>Password</label>
                <input style={s.input} type="password" placeholder="••••••••"
                    value={adminForm.password}
                    onChange={e => setAdminForm({...adminForm, password: e.target.value})} required />
                <button style={s.approveBtn} type="submit">Create Admin</button>
            </form>
        </div>
        <div style={{fontSize:12, color:'#5a6480', textTransform:'uppercase', letterSpacing:0.8, marginBottom:14}}>
            Promote existing user to admin
        </div>
        {users.filter(u => u.role !== 'admin').map(u => (
            <div key={u.id} style={s.card}>
                <div style={s.userInfo}>
                    <div style={s.userAvatar}>{u.name?.charAt(0).toUpperCase()}</div>
                    <div>
                        <div style={s.userName}>{u.name}</div>
                        <div style={s.userEmail}>{u.email}</div>
                        <span style={{...s.roleBadge, ...(u.role === 'seller' ? s.badgeSeller : s.badgeBuyer)}}>
                            {u.role}
                        </span>
                    </div>
                </div>
                <button style={s.approveBtn} onClick={() => handlePromoteAdmin(u.id)}>
                    Promote to admin
                </button>
            </div>
        ))}
    </div>
)}

                    {activeTab === 'profile' && profile && (
                        <div>
                            <div style={s.pageTitle}>My Profile</div>
                            <div style={s.profileHeader}>
                                <div>
                                    {profileForm.profile_picture
                                        ? <img src={profileForm.profile_picture} alt="profile" style={s.avatarImg} />
                                        : <div style={s.avatarPlaceholder}>{profile.name?.charAt(0).toUpperCase()}</div>
                                    }
                                </div>
                                <div>
                                    <div style={s.userName}>{profile.name}</div>
                                    <div style={s.userEmail}>{profile.email}</div>
                                    <div style={{...s.roleBadge, ...s.badgeAdmin, marginTop:6}}>Admin</div>
                                </div>
                            </div>

                            <div style={s.profileTabs}>
                                {['info', 'password'].map(t => (
                                    <div key={t} style={{...s.profileTab, ...(profileTab === t ? s.profileTabActive : {})}}
                                        onClick={() => setProfileTab(t)}>
                                        {t === 'info' ? '👤 Profile info' : '🔒 Change password'}
                                    </div>
                                ))}
                            </div>

                            {profileTab === 'info' && (
                                <div style={s.formBox}>
                                    <form onSubmit={handleUpdateProfile}>
                                        <label style={s.label}>Full name</label>
                                        <input style={s.input} value={profileForm.name}
                                            onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
                                        <label style={s.label}>Profile picture</label>
                                        <input type="file" accept="image/*"
                                            onChange={e => handleProfileImageUpload(e.target.files[0])}
                                            style={{...s.input, padding:8}} />
                                        {uploading && <div style={{color:'#5a6480', fontSize:12, marginBottom:10}}>Uploading...</div>}
                                        {profileForm.profile_picture && (
                                            <img src={profileForm.profile_picture} alt="preview"
                                                style={{width:80, height:80, borderRadius:'50%', objectFit:'cover', marginBottom:14}} />
                                        )}
                                        <button style={s.approveBtn} type="submit">Save changes</button>
                                    </form>
                                </div>
                            )}

                            {profileTab === 'password' && (
                                <div style={s.formBox}>
                                    <form onSubmit={handleChangePassword}>
                                        <label style={s.label}>Current password</label>
                                        <input style={s.input} type="password" placeholder="••••••••"
                                            value={passwordForm.current_password}
                                            onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} required />
                                        <label style={s.label}>New password</label>
                                        <input style={s.input} type="password" placeholder="••••••••"
                                            value={passwordForm.new_password}
                                            onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} required />
                                        <label style={s.label}>Confirm new password</label>
                                        <input style={s.input} type="password" placeholder="••••••••"
                                            value={passwordForm.confirm_password}
                                            onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} required />
                                        <button style={s.approveBtn} type="submit">Change password</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#0c0f1a', borderBottom: '0.5px solid #1e2535', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    collapseBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    logo: { color: '#f97066', fontSize: 18, fontWeight: 600 },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    layout: { display: 'flex', minHeight: 'calc(100vh - 54px)', width: '100%' },
    sidebar: { width: 200, minWidth: 200, background: '#0c0f1a', borderRight: '0.5px solid #1e2535', padding: '12px 0', flexShrink: 0, transition: 'width 0.2s, min-width 0.2s' },
    sidebarCollapsed: { width: 52, minWidth: 52 },
    sideItem: { padding: '10px 14px', fontSize: 13, color: '#8892a4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', whiteSpace: 'nowrap' },
    sideActive: { color: '#e2e8f0', background: '#161b27', borderLeft: '2px solid #f97066' },
    sideIcon: { fontSize: 18, flexShrink: 0 },
    sideLabel: { fontSize: 13, flex: 1 },
    sideBadge: { background: '#f97066', color: '#fff', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 20 },
    sideBadgeCollapsed: { position: 'absolute', top: 6, right: 6, background: '#f97066', color: '#fff', fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 20 },
    main: { flex: 1, padding: 20, minWidth: 0, overflowX: 'hidden' },
    pageTitle: { fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
    stat: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '14px' },
    statLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    statVal: { fontSize: 20, fontWeight: 600, color: '#e2e8f0' },
    userCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    userInfo: { display: 'flex', alignItems: 'flex-start', gap: 12 },
    userAvatar: { width: 40, height: 40, borderRadius: '50%', background: '#1e2535', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: '#7c9ef7', flexShrink: 0 },
    userName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 },
    userEmail: { fontSize: 12, color: '#5a6480', marginBottom: 6 },
    userMeta: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    userDate: { fontSize: 11, color: '#5a6480' },
    userActions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
    card: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
    cardTitle: { fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 4 },
    cardSub: { fontSize: 12, color: '#5a6480', marginTop: 2 },
    roleBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 20 },
    statusBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 20 },
    badgeAdmin: { background: '#2a1018', color: '#f97066' },
    badgeSeller: { background: '#0f2820', color: '#5dd6a3' },
    badgeBuyer: { background: '#1a1f35', color: '#7c6ef7' },
    badgeActive: { background: '#0f2820', color: '#5dd6a3' },
    badgePending: { background: '#2a1f08', color: '#f7c948' },
    badgeBanned: { background: '#2a1018', color: '#f09595' },
    badgeRestricted: { background: '#2a1f08', color: '#f7c948' },
    banBtn: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
    restrictBtn: { background: '#2a1f08', border: '0.5px solid #4a3510', color: '#f7c948', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
    activateBtn: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
    deleteBtn: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' },
    approveBtn: { background: '#1e2535', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    empty: { color: '#5a6480', fontSize: 13 },
    formBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '16px', marginBottom: 20 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
    profileHeader: { display: 'flex', alignItems: 'center', gap: 16, background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px', marginBottom: 20 },
    avatarImg: { width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' },
    avatarPlaceholder: { width: 70, height: 70, borderRadius: '50%', background: '#2a1018', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600, color: '#f97066' },
    profileTabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '0.5px solid #2d3348' },
    profileTab: { padding: '10px 14px', fontSize: 13, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent' },
    profileTabActive: { color: '#e2e8f0', borderBottom: '2px solid #f97066' },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};