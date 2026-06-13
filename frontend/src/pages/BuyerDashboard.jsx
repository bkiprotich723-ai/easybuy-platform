import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function BuyerDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [wallet, setWallet] = useState(0);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('shop');
    const [tickets, setTickets] = useState([]);
    const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [cartCount, setCartCount] = useState(0);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [profilePic, setProfilePic] = useState('');
    const categories = ['all', 'smartphones', 'laptops', 'tvs', 'boutique', 'appliances', 'furniture', 'general'];

useEffect(() => {
    fetchOrders();
    fetchWallet();
    fetchTickets();
    fetchCartCount();
    fetchProfilePic();
}, []); // eslint-disable-line react-hooks/exhaustive-deps

useEffect(() => {
    fetchProducts();
}, [search, category]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchProducts = async () => {
        try {
            const res = await API.get(`/api/products?search=${search}&category=${category}`);
            setProducts(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchOrders = async () => {
        try {
            const res = await API.get('/api/transactions/my-orders');
            setOrders(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchWallet = async () => {
        try {
            const res = await API.get('/api/transactions/wallet');
            setWallet(res.data.balance);
        } catch (err) { console.error(err); }
    };

    const fetchTickets = async () => {
        try {
            const res = await API.get('/api/support/my-tickets');
            setTickets(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchCartCount = async () => {
        try {
            const res = await API.get('/api/cart');
            setCartCount(res.data.length);
        } catch (err) { console.error(err); }
    };
    const fetchProfilePic = async () => {
    try {
        const res = await API.get('/api/profile');
        setProfilePic(res.data.profile_picture || '');
    } catch (err) { console.error(err); }
};  
    const handleAddToCart = async (product_id) => {
        try {
            await API.post('/api/cart/add', { product_id });
            setMessage('✅ Added to cart!');
            fetchCartCount();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleBuy = async (product_id) => {
        try {
            const res = await API.post('/api/transactions/buy', { product_id });
            setMessage(`✅ Purchase successful! Order #${res.data.order_id}`);
            fetchWallet();
            fetchOrders();
            fetchProducts();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Purchase failed'));
        }
    };

    const handleTicket = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/support/ticket', ticketForm);
            setMessage('✅ Support ticket submitted!');
            setTicketForm({ subject: '', message: '' });
            fetchTickets();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/withdrawals/request', { amount: withdrawAmount });
            setMessage('✅ Withdrawal request submitted!');
            setWithdrawAmount('');
            fetchWallet();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Withdrawal failed'));
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/transactions/deposit', { amount: depositAmount });
            setMessage('✅ Deposit successful!');
            setDepositAmount('');
            fetchWallet();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Deposit failed'));
        }
    };

    const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
        logout();
        navigate('/');
    }
};

    const tabs = ['shop', 'orders', 'support', 'wallet'];

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <div style={s.logo}>🛍 EasyBuy</div>
                <div style={s.navRight}>
                    <div style={s.walletPill}>💰 <b style={{color:'#7c6ef7'}}>KES {parseFloat(wallet).toLocaleString()}</b></div>
                    <div style={s.cartBtn} onClick={() => navigate('/cart')}>
                        🛒 {cartCount > 0 && <span style={s.cartBadge}>{cartCount}</span>}
                    </div>
                    <div style={s.avatar} onClick={() => navigate('/buyer/profile')}>
                        {profilePic
                            ? <img src={profilePic} alt="profile" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} />
                            : user?.name?.charAt(0).toUpperCase()
                        }
                    </div>
                    <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
                </div>
            </div>

            <div style={s.tabBar}>
                {tabs.map(t => (
                    <div key={t} style={{...s.tab, ...(activeTab === t ? s.tabActive : {})}}
                        onClick={() => setActiveTab(t)}>
                        <span>
                            {t === 'shop' && '🛒 '}
                            {t === 'orders' && '📦 '}
                            {t === 'support' && '🎧 '}
                            {t === 'wallet' && '💳 '}
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </span>
                        {t === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                            <span style={s.tabBadge}>{orders.filter(o => o.status === 'pending').length}</span>
                        )}
                        {t === 'support' && tickets.filter(tk => tk.status === 'open').length > 0 && (
                            <span style={s.tabBadge}>{tickets.filter(tk => tk.status === 'open').length}</span>
                        )}
                    </div>
                ))}
            </div>

            <div style={s.content}>
                {message && (
                    <div style={message.startsWith('✅') ? s.success : s.error} onClick={() => setMessage('')}>
                        {message} <span style={{float:'right', cursor:'pointer'}}>✕</span>
                    </div>
                )}

                {activeTab === 'shop' && (
                    <div>
                        <div style={s.searchRow}>
                            <input style={s.searchInput} placeholder="🔍 Search products..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div style={s.categoryRow}>
                            {categories.map(c => (
                                <div key={c} style={{...s.categoryPill, ...(category === c ? s.categoryActive : {})}}
                                    onClick={() => setCategory(c)}>
                                    {c === 'all' && '🌐 '}
                                    {c === 'smartphones' && '📱 '}
                                    {c === 'laptops' && '💻 '}
                                    {c === 'tvs' && '📺 '}
                                    {c === 'boutique' && '👗 '}
                                    {c === 'appliances' && '🏠 '}
                                    {c === 'furniture' && '🛋 '}
                                    {c === 'general' && '📦 '}
                                    {c.charAt(0).toUpperCase() + c.slice(1)}
                                </div>
                            ))}
                        </div>
                        <div style={s.productGrid}>
                            {products.length === 0 && <p style={{color:'#5a6480'}}>No products found.</p>}
                            {products.map(p => (
                                <div key={p.id} style={s.productCard}>
                                    <div onClick={() => navigate(`/product/${p.id}`)} style={{cursor:'pointer'}}>
                                        {p.image
                                            ? <img src={p.image} alt={p.name} style={{width:'100%', height:130, objectFit:'cover'}} />
                                            : <div style={s.productImg}>🛒</div>
                                        }
                                        <div style={s.productInfo}>
                                            <div style={s.productCategory}>{p.category}</div>
                                            <div style={s.productName}>{p.name}</div>
                                            <div style={s.productDesc}>{p.description}</div>
                                            <div style={s.productPrice}>KES {parseFloat(p.price).toLocaleString()}</div>
                                            <div style={{...s.stockBadge, ...(p.stock === 0 ? s.outOfStock : s.inStock)}}>
                                                {p.stock === 0 ? '❌ Out of stock' : `✅ ${p.stock} in stock`}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={s.productActions}>
                                        <button style={s.addCartBtn}
                                            onClick={() => handleAddToCart(p.id)}
                                            disabled={p.stock === 0}>
                                            🛒
                                        </button>
                                        <button
                                            style={{...s.buyBtn, ...(p.stock === 0 ? s.buyBtnDisabled : {})}}
                                            onClick={() => handleBuy(p.id)}
                                            disabled={p.stock === 0}>
                                            {p.stock === 0 ? 'Out of stock' : 'Buy Now'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div>
                        <div style={s.sectionLabel}>My orders</div>
                        <div style={s.panel}>
                            {orders.length === 0 && <p style={{color:'#5a6480', padding:16}}>No orders yet.</p>}
                            {orders.map(o => (
                                <div key={o.id} style={s.orderRow}>
                                    <div>
                                        <div style={s.orderName}>{o.product_name || `Product #${o.product_id}`}</div>
                                        <div style={s.orderDate}>{new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{textAlign:'right'}}>
                                        <div style={s.orderAmt}>KES {parseFloat(o.amount).toLocaleString()}</div>
                                        <div style={{...s.statusBadge, ...(o.status === 'delivered' ? s.badgeDelivered : s.badgePending)}}>
                                            {o.status || 'pending'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'support' && (
                    <div>
                        <div style={s.contactBar}>
                            <div style={s.contactItem}>📞 <span style={{color:'#e2e8f0'}}>+254 700 000 000</span></div>
                            <div style={s.contactItem}>📧 <span style={{color:'#e2e8f0'}}>support@easybuy.co.ke</span></div>
                            <div style={s.contactItem}>💬 <span style={{color:'#e2e8f0'}}>WhatsApp: +254 700 000 000</span></div>
                        </div>
                        <div style={s.sectionLabel}>Report a problem</div>
                        <div style={s.formBox}>
                            <form onSubmit={handleTicket}>
                                <label style={s.label}>Subject</label>
                                <input style={s.input} placeholder="e.g. Wrong item delivered"
                                    value={ticketForm.subject}
                                    onChange={e => setTicketForm({...ticketForm, subject: e.target.value})} required />
                                <label style={s.label}>Message</label>
                                <textarea style={{...s.input, height:100, resize:'none'}}
                                    placeholder="Describe your problem..."
                                    value={ticketForm.message}
                                    onChange={e => setTicketForm({...ticketForm, message: e.target.value})} required />
                                <button style={s.submitBtn} type="submit">Submit Ticket</button>
                            </form>
                        </div>
                        <div style={s.sectionLabel}>My tickets</div>
                        <div style={s.panel}>
                            {tickets.length === 0 && <p style={{color:'#5a6480', padding:16}}>No tickets yet.</p>}
                            {tickets.map(t => (
                                <div key={t.id} style={s.orderRow}>
                                    <div>
                                        <div style={s.orderName}>{t.subject}</div>
                                        <div style={{color:'#8892a4', fontSize:13, marginTop:2}}>{t.message}</div>
                                        <div style={s.orderDate}>{new Date(t.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{...s.statusBadge, ...(t.status === 'closed' ? s.badgeDelivered : s.badgePending)}}>
                                        {t.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'wallet' && (
                    <div>
                        <div style={s.walletCard}>
                            <div style={s.walletLabel}>Available balance</div>
                            <div style={s.walletBal}>KES {parseFloat(wallet).toLocaleString()}</div>
                        </div>
                        <div style={s.twoColWallet}>
                            <div>
                                <div style={s.sectionLabel}>Deposit funds</div>
                                <div style={s.formBox}>
                                    <form onSubmit={handleDeposit}>
                                        <label style={s.label}>Amount (KES)</label>
                                        <input style={s.input} type="number" placeholder="e.g. 1000"
                                            value={depositAmount}
                                            onChange={e => setDepositAmount(e.target.value)} required />
                                        <button style={{...s.submitBtn, background:'#5dd6a3', color:'#0f2820'}} type="submit">
                                            💰 Deposit
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div>
                                <div style={s.sectionLabel}>Request withdrawal</div>
                                <div style={s.formBox}>
                                    <form onSubmit={handleWithdraw}>
                                        <label style={s.label}>Amount (KES)</label>
                                        <input style={s.input} type="number" placeholder="e.g. 500"
                                            value={withdrawAmount}
                                            onChange={e => setWithdrawAmount(e.target.value)} required />
                                        <button style={s.submitBtn} type="submit">💸 Withdraw</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { color: '#7c6ef7', fontSize: 18, fontWeight: 600 },
    navRight: { display: 'flex', alignItems: 'center', gap: 10 },
    walletPill: { background: '#1e2535', border: '0.5px solid #2d3348', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#a3adc2' },
    cartBtn: { position: 'relative', cursor: 'pointer', fontSize: 20, padding: '0 4px' },
    cartBadge: { position: 'absolute', top: -6, right: -6, background: '#f97066', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 20 },
    avatar: { width: 32, height: 32, borderRadius: '50%', background: '#2d3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#7c9ef7', cursor: 'pointer' },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    tabBar: { background: '#161b27', borderBottom: '0.5px solid #2d3348', display: 'flex', padding: '0 16px', gap: 4, overflowX: 'auto' },
    tab: { padding: '14px 12px', fontSize: 13, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' },
    tabActive: { color: '#e2e8f0', borderBottom: '2px solid #7c6ef7' },
    tabBadge: { background: '#f97066', color: '#fff', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 20 },
    content: { padding: 16 },
    searchRow: { marginBottom: 12 },
    searchInput: { width: '100%', background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '10px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    categoryRow: { display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 },
    categoryPill: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#8892a4', cursor: 'pointer', whiteSpace: 'nowrap' },
    categoryActive: { background: '#1e1a3a', border: '0.5px solid #7c6ef7', color: '#a89cf7' },
    sectionLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, marginTop: 8 },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 },
    productCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, overflow: 'hidden' },
    productImg: { background: '#1a1f35', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 },
    productInfo: { padding: '10px 12px' },
    productCategory: { fontSize: 10, color: '#7c6ef7', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    productName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 3 },
    productDesc: { fontSize: 11, color: '#5a6480', marginBottom: 6 },
    productPrice: { fontSize: 15, fontWeight: 600, color: '#7c6ef7', marginBottom: 6 },
    stockBadge: { fontSize: 10, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginBottom: 4 },
    inStock: { background: '#0f2820', color: '#5dd6a3' },
    outOfStock: { background: '#2a1018', color: '#f09595' },
    productActions: { display: 'flex', gap: 6, padding: '0 12px 12px' },
    addCartBtn: { background: '#1e2535', border: '0.5px solid #2d3348', color: '#e2e8f0', padding: '7px 10px', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
    buyBtn: { flex: 1, background: '#7c6ef7', border: 'none', color: '#fff', padding: '7px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
    buyBtnDisabled: { background: '#2d3348', color: '#5a6480', cursor: 'not-allowed' },
    panel: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, marginBottom: 24 },
    orderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #1e2535' },
    orderName: { fontSize: 13, color: '#e2e8f0' },
    orderDate: { fontSize: 11, color: '#5a6480', marginTop: 2 },
    orderAmt: { fontSize: 14, fontWeight: 600, color: '#5dd6a3' },
    statusBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, marginTop: 4, display: 'inline-block' },
    badgeDelivered: { background: '#0f2820', color: '#5dd6a3' },
    badgePending: { background: '#2a1f08', color: '#f7c948' },
    formBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '16px', marginBottom: 20 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
    submitBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    contactBar: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '16px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 },
    contactItem: { fontSize: 13, color: '#5a6480' },
    walletCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '24px', marginBottom: 20, textAlign: 'center' },
    walletLabel: { fontSize: 12, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    walletBal: { fontSize: 32, fontWeight: 700, color: '#7c6ef7' },
    twoColWallet: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};