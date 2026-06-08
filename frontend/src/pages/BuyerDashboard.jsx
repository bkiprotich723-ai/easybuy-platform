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
    const [reviews, setReviews] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [reviewForm, setReviewForm] = useState({ product_id: '', rating: 5, comment: '' });
    const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [depositAmount, setDepositAmount] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchOrders();
        fetchWallet();
        fetchReviews();
        fetchTickets();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await API.get('/api/products');
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

    const fetchReviews = async () => {
        try {
            const res = await API.get('/api/reviews/my/reviews');
            setReviews(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTickets = async () => {
        try {
            const res = await API.get('/api/support/my-tickets');
            setTickets(res.data);
        } catch (err) { console.error(err); }
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

    const handleReview = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/reviews/add', reviewForm);
            setMessage('✅ Review submitted!');
            setReviewForm({ product_id: '', rating: 5, comment: '' });
            fetchReviews();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed to submit review'));
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
            setMessage('❌ ' + (err.response?.data?.message || 'Failed to submit ticket'));
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

    const handleLogout = () => { logout(); navigate('/'); };

    const tabs = ['shop', 'orders', 'reviews', 'support', 'wallet'];

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <div style={s.logo}>🛍 EasyBuy</div>
                <div style={s.navRight}>
                    <div style={s.walletPill}>💰 <b style={{color:'#7c6ef7'}}>KES {parseFloat(wallet).toLocaleString()}</b></div>
                    <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
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
            {t === 'reviews' && '⭐ '}
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
                    <div style={message.startsWith('✅') ? s.success : s.error}
                        onClick={() => setMessage('')}>
                        {message} <span style={{float:'right', cursor:'pointer'}}>✕</span>
                    </div>
                )}

                {activeTab === 'shop' && (
                    <div>
                        <div style={s.sectionLabel}>Featured products</div>
                        <div style={s.productGrid}>
                            {products.length === 0 && <p style={{color:'#5a6480'}}>No products listed yet.</p>}
                            {products.map(p => (
                                <div key={p.id} style={s.productCard}>
                                    {p.image
                                        ? <img src={p.image} alt={p.name} style={{width:'100%', height:120, objectFit:'cover'}} />
                                        : <div style={s.productImg}>🛒</div>
                                    }
                                    <div style={s.productInfo}>
                                        <div style={s.productName}>{p.name}</div>
                                        <div style={s.productDesc}>{p.description}</div>
                                        <div style={s.productPrice}>KES {parseFloat(p.price).toLocaleString()}</div>
                                        <div style={{
                                            ...s.stockBadge,
                                            ...(p.stock === 0 ? s.outOfStock : s.inStock)
                                        }}>
                                            {p.stock === 0 ? '❌ Out of stock' : `✅ ${p.stock} in stock`}
                                        </div>
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
                                        <div style={{
                                            ...s.statusBadge,
                                            ...(o.status === 'delivered' ? s.badgeDelivered : s.badgePending)
                                        }}>
                                            {o.status || 'pending'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div>
                        <div style={s.sectionLabel}>Leave a review</div>
                        <div style={s.formBox}>
                            <form onSubmit={handleReview}>
                                <label style={s.label}>Product</label>
                                <select style={s.input} value={reviewForm.product_id}
                                    onChange={e => setReviewForm({...reviewForm, product_id: e.target.value})} required>
                                    <option value="">Select a product you bought</option>
                                    {orders.map(o => (
                                        <option key={o.id} value={o.product_id}>{o.product_name}</option>
                                    ))}
                                </select>
                                <label style={s.label}>Rating</label>
                                <select style={s.input} value={reviewForm.rating}
                                    onChange={e => setReviewForm({...reviewForm, rating: parseInt(e.target.value)})}>
                                    {[5,4,3,2,1].map(r => (
                                        <option key={r} value={r}>{'⭐'.repeat(r)} ({r}/5)</option>
                                    ))}
                                </select>
                                <label style={s.label}>Comment</label>
                                <textarea style={{...s.input, height:80, resize:'none'}}
                                    placeholder="Share your experience..."
                                    value={reviewForm.comment}
                                    onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} />
                                <button style={s.submitBtn} type="submit">Submit Review</button>
                            </form>
                        </div>
                        <div style={s.sectionLabel}>My reviews</div>
                        <div style={s.panel}>
                            {reviews.length === 0 && <p style={{color:'#5a6480', padding:16}}>No reviews yet.</p>}
                            {reviews.map(r => (
                                <div key={r.id} style={s.orderRow}>
                                    <div>
                                        <div style={s.orderName}>{r.product_name}</div>
                                        <div style={s.orderDate}>{'⭐'.repeat(r.rating)} · {new Date(r.created_at).toLocaleDateString()}</div>
                                        <div style={{color:'#8892a4', fontSize:13, marginTop:4}}>{r.comment}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'support' && (
                    <div>
                        <div style={s.sectionLabel}>Contact support</div>
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
                                    placeholder="Describe your problem in detail..."
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
                                    <div style={{
                                        ...s.statusBadge,
                                        ...(t.status === 'closed' ? s.badgeDelivered : s.badgePending)
                                    }}>
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
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { color: '#7c6ef7', fontSize: 20, fontWeight: 600 },
    navRight: { display: 'flex', alignItems: 'center', gap: 12 },
    walletPill: { background: '#1e2535', border: '0.5px solid #2d3348', borderRadius: 20, padding: '5px 14px', fontSize: 13, color: '#a3adc2' },
    avatar: { width: 32, height: 32, borderRadius: '50%', background: '#2d3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#7c9ef7' },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    tabBar: { background: '#161b27', borderBottom: '0.5px solid #2d3348', display: 'flex', padding: '0 24px', gap: 4 },
    tabActive: { color: '#e2e8f0', borderBottom: '2px solid #7c6ef7' },
    content: { padding: 24 },
    sectionLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, marginTop: 8 },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 },
    productCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, overflow: 'hidden' },
    productImg: { background: '#1a1f35', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 },
    productInfo: { padding: '12px 14px' },
    productName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 },
    productDesc: { fontSize: 12, color: '#5a6480', marginBottom: 8 },
    productPrice: { fontSize: 16, fontWeight: 600, color: '#7c6ef7', marginBottom: 8 },
    stockBadge: { fontSize: 11, padding: '3px 8px', borderRadius: 20, marginBottom: 10, display: 'inline-block' },
    inStock: { background: '#0f2820', color: '#5dd6a3' },
    outOfStock: { background: '#2a1018', color: '#f09595' },
    buyBtn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: 8, borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
    buyBtnDisabled: { background: '#2d3348', color: '#5a6480', cursor: 'not-allowed' },
    panel: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, marginBottom: 24 },
    orderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid #1e2535' },
    orderName: { fontSize: 13, color: '#e2e8f0' },
    orderDate: { fontSize: 11, color: '#5a6480', marginTop: 2 },
    orderAmt: { fontSize: 14, fontWeight: 600, color: '#5dd6a3' },
    statusBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, marginTop: 4, display: 'inline-block' },
    badgeDelivered: { background: '#0f2820', color: '#5dd6a3' },
    badgePending: { background: '#2a1f08', color: '#f7c948' },
    formBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px', marginBottom: 24 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
    submitBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    contactBar: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 },
    contactItem: { fontSize: 13, color: '#5a6480' },
    walletCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '24px', marginBottom: 24, textAlign: 'center' },
    walletLabel: { fontSize: 12, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    walletBal: { fontSize: 36, fontWeight: 700, color: '#7c6ef7' },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    twoColWallet: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    tab: { padding: '14px 16px', fontSize: 13, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 },
tabBadge: { background: '#f97066', color: '#fff', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 20, minWidth: 18, textAlign: 'center' },
};