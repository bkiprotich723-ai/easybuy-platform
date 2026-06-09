import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function SellerDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [earnings, setEarnings] = useState(0);
    const [sales, setSales] = useState(0);
    const [products, setProducts] = useState([]);
    const [recent, setRecent] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawals, setWithdrawals] = useState([]);
    const [form, setForm] = useState({ name: '', description: '', price: '', image: '', stock: 0 });

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [e, s, p, r, t, o, w] = await Promise.all([
                API.get('/api/seller/total-earnings'),
                API.get('/api/seller/total-sales'),
                API.get('/api/products/my-products'),
                API.get('/api/seller/recent'),
                API.get('/api/seller/top-products'),
                API.get('/api/transactions/seller-orders'),
                API.get('/api/withdrawals/my'),
            ]);
            setEarnings(e.data.total_earnings);
            setSales(s.data.total_sales);
            setProducts(p.data);
            setRecent(r.data);
            setTopProducts(t.data);
            setOrders(o.data);
            setWithdrawals(w.data);
        } catch (err) { console.error(err); }
    };

    const handleImageUpload = async (file) => {
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
            setForm(prev => ({...prev, image: json.secure_url}));
        } catch (err) {
            setMessage('❌ Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/products/add', form);
            setMessage('✅ Product added successfully');
            setForm({ name: '', description: '', price: '', image: '', stock: 0 });
            setShowForm(false);
            fetchAll();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();
        try {
            await API.put(`/api/products/${editProduct.id}`, form);
            setMessage('✅ Product updated successfully');
            setEditProduct(null);
            setForm({ name: '', description: '', price: '', image: '', stock: 0 });
            fetchAll();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm('Delete this product?')) return;
        try {
            await API.delete(`/api/products/${id}`);
            setMessage('✅ Product deleted');
            fetchAll();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleStockUpdate = async (id, stock) => {
        try {
            await API.patch(`/api/products/${id}/stock`, { stock: parseInt(stock) });
            setMessage('✅ Stock updated');
            fetchAll();
        } catch (err) {
            setMessage('❌ Failed to update stock');
        }
    };

    const handleDeliver = async (id) => {
        try {
            await API.patch(`/api/transactions/${id}/deliver`);
            setMessage('✅ Order marked as delivered');
            fetchAll();
        } catch (err) {
            setMessage('❌ Failed to update order');
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/withdrawals/request', { amount: withdrawAmount });
            setMessage('✅ Withdrawal request submitted!');
            setWithdrawAmount('');
            fetchAll();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const openEdit = (p) => {
        setEditProduct(p);
        setForm({ name: p.name, description: p.description, price: p.price, image: p.image || '', stock: p.stock || 0 });
        setActiveTab('products');
    };

    const handleLogout = () => { logout(); navigate('/'); };

    const tabs = ['dashboard', 'products', 'orders', 'stock', 'withdrawals'];

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <div style={s.logo}>🏪 Seller Hub</div>
                <div style={s.navRight}>
                    <button style={s.addBtn} onClick={() => { setShowForm(true); setEditProduct(null); setForm({ name: '', description: '', price: '', image: '', stock: 0 }); setActiveTab('products'); }}>
                        + Add Product
                    </button>
                    <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
                    <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
                </div>
            </div>

            <div style={s.tabBar}>
                {tabs.map(t => (
    <div key={t} style={{...s.tab, ...(activeTab === t ? s.tabActive : {})}}
        onClick={() => setActiveTab(t)}>
        <span>
            {t === 'dashboard' && '📊 '}
            {t === 'products' && '📦 '}
            {t === 'orders' && '🧾 '}
            {t === 'stock' && '🗃 '}
            {t === 'withdrawals' && '💸 '}
            {t.charAt(0).toUpperCase() + t.slice(1)}
        </span>
        {t === 'orders' && pendingOrders.length > 0 && (
            <span style={s.tabBadge}>{pendingOrders.length}</span>
        )}
        {t === 'withdrawals' && withdrawals.filter(w => w.status === 'pending').length > 0 && (
            <span style={s.tabBadge}>{withdrawals.filter(w => w.status === 'pending').length}</span>
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

                {activeTab === 'dashboard' && (
                    <div>
                        <div style={s.statsRow}>
                            <div style={s.stat}>
                                <div style={s.statLabel}>Total earnings</div>
                                <div style={s.statVal}>KES {parseFloat(earnings).toLocaleString()}</div>
                            </div>
                            <div style={s.stat}>
                                <div style={s.statLabel}>Total sales</div>
                                <div style={s.statVal}>{sales}</div>
                            </div>
                            <div style={s.stat}>
                                <div style={s.statLabel}>Products listed</div>
                                <div style={s.statVal}>{products.length}</div>
                            </div>
                            <div style={s.stat}>
                                <div style={s.statLabel}>Pending orders</div>
                                <div style={s.statVal}>{pendingOrders.length}</div>
                            </div>
                        </div>
                        <div style={s.twoCol}>
                            <div style={s.panel}>
                                <div style={s.panelTitle}>Top products</div>
                                {topProducts.length === 0 && <p style={s.empty}>No sales yet</p>}
                                {topProducts.map((p, i) => (
                                    <div key={i} style={s.row}>
                                        <div style={s.rowName}>{p.name}</div>
                                        <div style={s.rowAmt}>KES {parseFloat(p.total_earned).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={s.panel}>
                                <div style={s.panelTitle}>Recent earnings</div>
                                {recent.length === 0 && <p style={s.empty}>No earnings yet</p>}
                                {recent.map(r => (
                                    <div key={r.id} style={s.row}>
                                        <div>
                                            <div style={s.rowName}>Order #{r.order_id}</div>
                                            <div style={s.rowDate}>{new Date(r.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div style={s.rowAmt}>+KES {parseFloat(r.amount).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div>
                        {(showForm || editProduct) && (
                            <div style={s.formBox}>
                                <div style={s.formTitle}>{editProduct ? 'Edit product' : 'Add new product'}</div>
                                <form onSubmit={editProduct ? handleEditProduct : handleAddProduct}>
                                    <label style={s.label}>Product name</label>
                                    <input style={s.input} placeholder="e.g. Wireless Earbuds"
                                        value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                                    <label style={s.label}>Description</label>
                                    <input style={s.input} placeholder="Brief description"
                                        value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                                    <label style={s.label}>Price (KES)</label>
                                    <input style={s.input} type="number" placeholder="e.g. 1500"
                                        value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                                    <label style={s.label}>Stock quantity</label>
                                    <input style={s.input} type="number" placeholder="e.g. 50"
                                        value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                                    <label style={s.label}>Product image <span style={{color:'#5a6480'}}>(optional)</span></label>
                                    <input type="file" accept="image/*"
                                        onChange={e => handleImageUpload(e.target.files[0])}
                                        style={{...s.input, padding:8}} />
                                    {uploading && <div style={{color:'#5a6480', fontSize:12, marginBottom:10}}>Uploading...</div>}
                                    {form.image && <img src={form.image} alt="preview" style={{width:'100%', height:140, objectFit:'cover', borderRadius:8, marginBottom:14}} />}
                                    <div style={{display:'flex', gap:10}}>
                                        <button style={s.submitBtn} type="submit">{editProduct ? 'Save changes' : 'Add Product'}</button>
                                        <button style={s.cancelBtn} type="button" onClick={() => { setShowForm(false); setEditProduct(null); }}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}
                        <div style={s.panelTitle}>My products</div>
                        {products.length === 0 && <p style={s.empty}>No products yet.</p>}
                        {products.map(p => (
                            <div key={p.id} style={s.productRow}>
                                {p.image && <img src={p.image} alt={p.name} style={{width:60, height:60, objectFit:'cover', borderRadius:8, marginRight:14}} />}
                                <div style={{flex:1}}>
                                    <div style={s.rowName}>{p.name}</div>
                                    <div style={s.rowDate}>{p.description}</div>
                                    <div style={{color:'#7c6ef7', fontSize:14, fontWeight:600}}>KES {parseFloat(p.price).toLocaleString()}</div>
                                </div>
                                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                    <div style={{...s.stockBadge, ...(p.stock === 0 ? s.outOfStock : s.inStock)}}>
                                        {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                                    </div>
                                    <button style={s.editBtn} onClick={() => openEdit(p)}>Edit</button>
                                    <button style={s.deleteBtn} onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div>
                        <div style={s.orderTabs}>
                            <div style={s.panelTitle}>Pending orders ({pendingOrders.length})</div>
                        </div>
                        <div style={s.panel}>
                            {pendingOrders.length === 0 && <p style={{...s.empty, padding:16}}>No pending orders</p>}
                            {pendingOrders.map(o => (
                                <div key={o.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>{o.product_name}</div>
                                        <div style={s.rowDate}>Buyer: {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                                        <div style={{color:'#5dd6a3', fontSize:14, fontWeight:600}}>KES {parseFloat(o.amount).toLocaleString()}</div>
                                        <button style={s.deliverBtn} onClick={() => handleDeliver(o.id)}>Mark delivered</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{...s.panelTitle, marginTop:24}}>Delivered orders ({deliveredOrders.length})</div>
                        <div style={s.panel}>
                            {deliveredOrders.length === 0 && <p style={{...s.empty, padding:16}}>No delivered orders yet</p>}
                            {deliveredOrders.map(o => (
                                <div key={o.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>{o.product_name}</div>
                                        <div style={s.rowDate}>Buyer: {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                                        <div style={{color:'#5dd6a3', fontSize:14, fontWeight:600}}>KES {parseFloat(o.amount).toLocaleString()}</div>
                                        <div style={{...s.stockBadge, ...s.inStock}}>Delivered</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'stock' && (
                    <div>
                        <div style={s.panelTitle}>Stock management</div>
                        {products.length === 0 && <p style={s.empty}>No products yet.</p>}
                        {products.map(p => (
                            <div key={p.id} style={s.stockRow}>
                                <div style={{flex:1}}>
                                    <div style={s.rowName}>{p.name}</div>
                                    <div style={{...s.stockBadge, ...(p.stock === 0 ? s.outOfStock : s.inStock), marginTop:4}}>
                                        {p.stock === 0 ? 'Out of stock' : `${p.stock} available`}
                                    </div>
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:8}}>
                                    <input
                                        type="number"
                                        defaultValue={p.stock}
                                        style={{...s.input, width:80, marginBottom:0, textAlign:'center'}}
                                        id={`stock-${p.id}`}
                                    />
                                    <button style={s.submitBtn} onClick={() => {
                                        const val = document.getElementById(`stock-${p.id}`).value;
                                        handleStockUpdate(p.id, val);
                                    }}>Update</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'withdrawals' && (
                    <div>
                        <div style={s.earningsCard}>
                            <div style={s.statLabel}>Total earnings</div>
                            <div style={s.statVal}>KES {parseFloat(earnings).toLocaleString()}</div>
                        </div>
                        <div style={s.sectionLabel}>Request withdrawal</div>
                        <div style={s.formBox}>
                            <form onSubmit={handleWithdraw}>
                                <label style={s.label}>Amount (KES)</label>
                                <input style={s.input} type="number" placeholder="e.g. 1000"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)} required />
                                <button style={s.submitBtn} type="submit">Request Withdrawal</button>
                            </form>
                        </div>
                        <div style={s.sectionLabel}>My withdrawal history</div>
                        <div style={s.panel}>
                            {withdrawals.length === 0 && <p style={{...s.empty, padding:16}}>No withdrawals yet.</p>}
                            {withdrawals.map(w => (
                                <div key={w.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>KES {parseFloat(w.amount).toLocaleString()}</div>
                                        <div style={s.rowDate}>{new Date(w.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{
                                        ...s.stockBadge,
                                        ...(w.status === 'approved' ? s.inStock : s.pendingBadge)
                                    }}>
                                        {w.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0' , width: '100%', overflowX: 'hidden' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { color: '#5dd6a3', fontSize: 20, fontWeight: 600 },
    navRight: { display: 'flex', alignItems: 'center', gap: 12 },
    addBtn: { background: '#5dd6a3', border: 'none', color: '#0f2820', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    avatar: { width: 32, height: 32, borderRadius: '50%', background: '#1a3530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#5dd6a3' },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    tabBar: { background: '#161b27', borderBottom: '0.5px solid #2d3348', display: 'flex', padding: '0 24px', gap: 4 },
    tab: { padding: '14px 16px', fontSize: 13, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 },
tabBadge: { background: '#f97066', color: '#fff', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 20, minWidth: 18, textAlign: 'center' },
    tabActive: { color: '#e2e8f0', borderBottom: '2px solid #5dd6a3' },
    content: { padding: 24 },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 },
    stat: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '14px 16px' },
    statLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    statVal: { fontSize: 22, fontWeight: 600, color: '#e2e8f0' },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    panel: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, marginBottom: 16 },
    panelTitle: { fontSize: 12, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid #1e2535' },
    rowName: { fontSize: 13, color: '#e2e8f0' },
    rowDate: { fontSize: 11, color: '#5a6480', marginTop: 2 },
    rowAmt: { fontSize: 13, fontWeight: 600, color: '#5dd6a3' },
    empty: { color: '#5a6480', fontSize: 13 },
    formBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px', marginBottom: 24 },
    formTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
    submitBtn: { background: '#5dd6a3', border: 'none', color: '#0f2820', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    cancelBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '10px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    productRow: { display: 'flex', alignItems: 'center', background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '12px 16px', marginBottom: 10 },
    stockRow: { display: 'flex', alignItems: 'center', background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '12px 16px', marginBottom: 10 },
    stockBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, display: 'inline-block' },
    inStock: { background: '#0f2820', color: '#5dd6a3' },
    outOfStock: { background: '#2a1018', color: '#f09595' },
    pendingBadge: { background: '#2a1f08', color: '#f7c948' },
    editBtn: { background: '#1e2535', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    deleteBtn: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    deliverBtn: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    earningsCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '24px', marginBottom: 24, textAlign: 'center' },
    sectionLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, marginTop: 8 },
    orderTabs: { marginBottom: 14 },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};