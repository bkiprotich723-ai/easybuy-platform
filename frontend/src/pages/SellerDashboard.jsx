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
    const [withdrawals, setWithdrawals] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [ticketForm, setTicketForm] = useState({ subject: '', message: '' });
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [form, setForm] = useState({ name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' });
    const [bulkForms, setBulkForms] = useState([{ name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' }]);
    const [profile, setProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({ name: '', profile_picture: '', mpesa_number: '' });
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [profileTab, setProfileTab] = useState('info');
    const [isActive, setIsActive] = useState(true);
    const [depositAmount] = useState('500'); // eslint-disable-line no-unused-vars
    const [mpesaNumber, setMpesaNumber] = useState('');
    const [activating, setActivating] = useState(false);
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [activationMsg, setActivationMsg] = useState('');

    useEffect(() => {
        fetchAll();
        fetchProfile();
        checkActivation();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const checkActivation = async () => {
        try {
            const res = await API.get('/api/profile');
            setIsActive(res.data.is_active);
        } catch (err) { console.error(err); }
    };
    const fetchAll = async () => {
        try {
            const [e, s, p, r, t, o, w, tk] = await Promise.all([
                API.get('/api/seller/total-earnings'),
                API.get('/api/seller/total-sales'),
                API.get('/api/products/my-products'),
                API.get('/api/seller/recent'),
                API.get('/api/seller/top-products'),
                API.get('/api/transactions/seller-orders'),
                API.get('/api/withdrawals/my'),
                API.get('/api/support/my-tickets'),
            ]);
            setEarnings(e.data.total_earnings);
            setSales(s.data.total_sales);
            setProducts(p.data);
            setRecent(r.data);
            setTopProducts(t.data);
            setOrders(o.data);
            setWithdrawals(w.data);
            setTickets(tk.data);
        } catch (err) { console.error(err); }
    };

    const fetchProfile = async () => {
        try {
            const res = await API.get('/api/profile');
            setProfile(res.data);
            setProfileForm({
                name: res.data.name,
                profile_picture: res.data.profile_picture || '',
                mpesa_number: res.data.mpesa_number || ''
            });
        } catch (err) { console.error(err); }
    };

    const handleImageUpload = async (file, index = null) => {
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
            if (index !== null) {
                const updated = [...bulkForms];
                updated[index].image = json.secure_url;
                setBulkForms(updated);
            } else {
                setForm(prev => ({ ...prev, image: json.secure_url }));
            }
        } catch {
            setMessage('❌ Image upload failed');
        } finally {
            setUploading(false);
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
            setProfileForm(prev => ({ ...prev, profile_picture: json.secure_url }));
        } catch {
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
            setForm({ name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' });
            setShowForm(false);
            fetchAll();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleBulkAdd = async (e) => {
        e.preventDefault();
        try {
            for (const product of bulkForms) {
                if (product.name && product.price) {
                    await API.post('/api/products/add', product);
                }
            }
            setMessage(`✅ ${bulkForms.filter(p => p.name && p.price).length} products added successfully`);
            setBulkForms([{ name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' }]);
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
            setForm({ name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' });
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

    const handleTicket = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/support/ticket', ticketForm);
            setMessage('✅ Support ticket submitted!');
            setTicketForm({ subject: '', message: '' });
            fetchAll();
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

    const openEdit = (p) => {
        setEditProduct(p);
        setForm({ name: p.name, description: p.description, price: p.price, image: p.image || '', stock: p.stock || 0, category: p.category || 'general', specifications: p.specifications || '' });
        setActiveTab('products');
        setShowForm(false);
    };

    const handleActivation = async (e) => {
        e.preventDefault();
        setActivating(true);
        try {
            const res = await API.post('/api/mpesa/stk-push', {
                phone: mpesaPhone,
                amount: depositAmount
            });
            setMessage('✅ ' + res.data.message);
            setDepositAmount('');
            setMpesaPhone('');
            if (res.data.checkoutRequestId) {
                pollActivation(res.data.checkoutRequestId);
            }
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        } finally {
            setActivating(false);
        }
    };

    const pollActivation = (checkoutRequestId) => {
        let attempts = 0;
        const interval = setInterval(async () => {
           attempts++;
           if (attempts > 10) { clearInterval(interval); return; }
           try {
               const res = await API.get(`/api/mpesa/status/${checkoutRequestId}`);
               if (res.data.ResultCode === '0') {
                   clearInterval(interval);
                   setMessage('✅ Payment confirmed! Account activated.');
                   setIsActive(true);
                   fetchAll();
                }
            } catch (err) { console.error(err); }
        }, 5000);
    };
    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out?')) {
            logout();
            navigate('/');
        }
    };

    const addBulkRow = () => setBulkForms([...bulkForms, { name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' }]);
    const removeBulkRow = (i) => setBulkForms(bulkForms.filter((_, idx) => idx !== i));
    const updateBulkRow = (i, field, value) => { const u = [...bulkForms]; u[i][field] = value; setBulkForms(u); };

    const tabs = ['dashboard', 'products', 'orders', 'stock', 'withdrawals', 'support', 'profile'];
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const categories = ['general', 'smartphones', 'laptops', 'tvs', 'boutique', 'appliances', 'furniture'];

    return (
        <div style={s.page}>

            {/* ── Navbar ── */}
            <div style={s.nav}>
                <div style={s.logo}>🏪 Seller Hub</div>
                <div style={s.navRight}>
                    <button style={s.addBtn} onClick={() => {
                        setShowForm(true);
                        setEditProduct(null);
                        setForm({ name: '', description: '', price: '', image: '', stock: 0, category: 'general', specifications: '' });
                        setActiveTab('products');
                    }}>+ Add</button>
                    <div style={s.avatar} onClick={() => setActiveTab('profile')}>
                        {profileForm.profile_picture
                            ? <img src={profileForm.profile_picture} alt="profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            : user?.name?.charAt(0).toUpperCase()
                        }
                    </div>
                    <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div style={s.tabBar}>
                {tabs.map(t => (
                    <div key={t} style={{ ...s.tab, ...(activeTab === t ? s.tabActive : {}) }}
                        onClick={() => setActiveTab(t)}>
                        <span>
                            {t === 'dashboard' && '📊'}
                            {t === 'products' && '📦'}
                            {t === 'orders' && '🧾'}
                            {t === 'stock' && '🗃'}
                            {t === 'withdrawals' && '💸'}
                            {t === 'support' && '🎧'}
                            {t === 'profile' && '👤'}
                        </span>
                        <span style={s.tabLabel}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                        {t === 'orders' && pendingOrders.length > 0 && <span style={s.tabBadge}>{pendingOrders.length}</span>}
                        {t === 'withdrawals' && withdrawals.filter(w => w.status === 'pending').length > 0 && <span style={s.tabBadge}>{withdrawals.filter(w => w.status === 'pending').length}</span>}
                        {t === 'support' && tickets.filter(tk => tk.status === 'open').length > 0 && <span style={s.tabBadge}>{tickets.filter(tk => tk.status === 'open').length}</span>}
                    </div>
                ))}
            </div>

            {/* ── Content ── */}
            <div style={s.content}>
                {message && (
                    <div style={message.startsWith('✅') ? s.success : s.error} onClick={() => setMessage('')}>
                        {message} <span style={{ float: 'right', cursor: 'pointer' }}>✕</span>
                    </div>
                )}
                {/* ── Activation wall — blocks ALL content until paid ── */}
                {!isActive ? (
                    <div style={s.activationWall}>
                        <div style={s.activationIcon}>🔒</div>
                        <div style={s.activationTitle}>Activate your seller account</div>
                        <div style={s.activationSub}>
                            To start selling and access all features, pay the one-time activation fee of{' '}
                            <b style={{color:'#f7c948'}}>KES 500</b>. Your account will be activated instantly after payment.
                        </div>
                        <form onSubmit={handleActivation} style={{maxWidth:320, margin:'0 auto'}}>
                            <label style={s.label}>M-Pesa phone number</label>
                            <input style={s.input} type="tel" placeholder="e.g. 0712345678"
                                value={mpesaPhone}
                                onChange={e => setMpesaPhone(e.target.value)} required />
                            <label style={s.label}>Amount (KES 500)</label>
                            <input style={s.input} type="number" placeholder="500"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)} required />
                            <button style={s.submitBtn} type="submit" disabled={activating}>
                                {activating ? 'Processing...' : '📱 Pay via M-Pesa & Activate'}
                            </button>
                            <div style={{fontSize:12, color:'#5a6480', marginTop:8}}>
                                You'll receive a PIN prompt on your phone after clicking Pay.
                            </div>
                        </form>
                        {activationMsg && (
                            <div style={{ marginTop: 14, fontSize: 13, color: activationMsg.startsWith('✅') ? '#6ee7b7' : '#f09595', textAlign:'center' }}>
                                {activationMsg}
                            </div>
                        )}
                        <div style={{marginTop:16, fontSize:12, color:'#5a6480', textAlign:'center'}}>
                            After activation your referrer will receive their KES 150 bonus automatically.
                        </div>
                    </div>
                ) : (<>

                {/* ════ Dashboard ════ */}
                {activeTab === 'dashboard' && (
                    <div>
                        <div style={s.statsRow}>
                            {[
                                { label: 'Total earnings', val: `KES ${parseFloat(earnings).toLocaleString()}` },
                                { label: 'Total sales', val: sales },
                                { label: 'Products', val: products.length },
                                { label: 'Pending orders', val: pendingOrders.length },
                            ].map((st, i) => (
                                <div key={i} style={s.stat}>
                                    <div style={s.statLabel}>{st.label}</div>
                                    <div style={s.statVal}>{st.val}</div>
                                </div>
                            ))}
                        </div>

                        <div style={s.twoCol}>
                            <div style={{ ...s.panel, padding: '14px 16px' }}>
                                <div style={s.panelTitle}>Top products</div>
                                {topProducts.length === 0 && <p style={s.empty}>No sales yet</p>}
                                {topProducts.map((p, i) => (
                                    <div key={i} style={s.row}>
                                        <div style={s.rowName}>{p.name}</div>
                                        <div style={s.rowAmt}>KES {parseFloat(p.total_earned).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ ...s.panel, padding: '14px 16px' }}>
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

                {/* ════ Products ════ */}
                {activeTab === 'products' && (
                    <div>
                        <div style={s.productModeBtns}>
                            <button style={showForm && !editProduct ? s.modeActive : s.modeBtn}
                                onClick={() => { setShowForm(true); setEditProduct(null); }}>
                                + Single product
                            </button>
                            <button style={!showForm && !editProduct ? s.modeActive : s.modeBtn}
                                onClick={() => { setShowForm(false); setEditProduct(null); }}>
                                📦 Bulk upload
                            </button>
                        </div>

                        {/* Edit product form */}
                        {editProduct && (
                            <div style={s.formBox}>
                                <div style={s.formTitle}>Edit product</div>
                                <form onSubmit={handleEditProduct}>
                                    <ProductForm form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} s={s} categories={categories} />
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button style={s.submitBtn} type="submit">Save changes</button>
                                        <button style={s.cancelBtn} type="button" onClick={() => setEditProduct(null)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Single product form */}
                        {showForm && !editProduct && (
                            <div style={s.formBox}>
                                <div style={s.formTitle}>Add single product</div>
                                <form onSubmit={handleAddProduct}>
                                    <ProductForm form={form} setForm={setForm} onUpload={handleImageUpload} uploading={uploading} s={s} categories={categories} />
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button style={s.submitBtn} type="submit">Add Product</button>
                                        <button style={s.cancelBtn} type="button" onClick={() => setShowForm(false)}>Cancel</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Bulk upload form */}
                        {!showForm && !editProduct && (
                            <div style={s.formBox}>
                                <div style={s.formTitle}>Bulk upload products</div>
                                <form onSubmit={handleBulkAdd}>
                                    {bulkForms.map((bf, index) => (
                                        <div key={index} style={s.bulkRow}>
                                            <div style={s.bulkHeader}>
                                                <div style={s.formTitle}>Product {index + 1}</div>
                                                {bulkForms.length > 1 && (
                                                    <button type="button" style={s.removeBtn} onClick={() => removeBulkRow(index)}>Remove</button>
                                                )}
                                            </div>
                                            <label style={s.label}>Name *</label>
                                            <input style={s.input} placeholder="Product name"
                                                value={bf.name} onChange={e => updateBulkRow(index, 'name', e.target.value)} required />
                                            <label style={s.label}>Description</label>
                                            <input style={s.input} placeholder="Brief description"
                                                value={bf.description} onChange={e => updateBulkRow(index, 'description', e.target.value)} />
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                <div>
                                                    <label style={s.label}>Price (KES) *</label>
                                                    <input style={s.input} type="number" placeholder="0"
                                                        value={bf.price} onChange={e => updateBulkRow(index, 'price', e.target.value)} required />
                                                </div>
                                                <div>
                                                    <label style={s.label}>Stock</label>
                                                    <input style={s.input} type="number" placeholder="0"
                                                        value={bf.stock} onChange={e => updateBulkRow(index, 'stock', e.target.value)} />
                                                </div>
                                            </div>
                                            <label style={s.label}>Category</label>
                                            <select style={s.input} value={bf.category}
                                                onChange={e => updateBulkRow(index, 'category', e.target.value)}>
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <label style={s.label}>Image</label>
                                            <input type="file" accept="image/*"
                                                onChange={e => handleImageUpload(e.target.files[0], index)}
                                                style={{ ...s.input, padding: 8 }} />
                                            {bf.image && <img src={bf.image} alt="preview" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
                                        </div>
                                    ))}
                                    <button type="button" style={s.addMoreBtn} onClick={addBulkRow}>+ Add another product</button>
                                    <button style={s.submitBtn} type="submit">
                                        Upload {bulkForms.length} product{bulkForms.length > 1 ? 's' : ''}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Products list */}
                        <div style={s.panelTitle}>My products ({products.length})</div>
                        {products.length === 0 && <p style={s.empty}>No products yet.</p>}
                        {products.map(p => (
                            <div key={p.id} style={s.productRow}>
                                {p.image && <img src={p.image} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, marginRight: 14, flexShrink: 0 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={s.rowName}>{p.name}</div>
                                    <div style={s.rowDate}>{p.category}</div>
                                    <div style={{ color: '#7c6ef7', fontSize: 14, fontWeight: 600 }}>KES {parseFloat(p.price).toLocaleString()}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ ...s.stockBadge, ...(p.stock === 0 ? s.outOfStock : s.inStock) }}>
                                        {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                                    </div>
                                    <button style={s.editBtn} onClick={() => openEdit(p)}>Edit</button>
                                    <button style={s.deleteBtn} onClick={() => handleDeleteProduct(p.id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ════ Orders ════ */}
                {activeTab === 'orders' && (
                    <div>
                        <div style={s.panelTitle}>Pending orders ({pendingOrders.length})</div>
                        <div style={s.panel}>
                            {pendingOrders.length === 0 && <p style={{ ...s.empty, padding: 16 }}>No pending orders</p>}
                            {pendingOrders.map(o => (
                                <div key={o.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>{o.product_name}</div>
                                        <div style={s.rowDate}>Buyer: {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <div style={{ color: '#5dd6a3', fontSize: 14, fontWeight: 600 }}>KES {parseFloat(o.amount).toLocaleString()}</div>
                                        <button style={s.deliverBtn} onClick={() => handleDeliver(o.id)}>Mark delivered</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ ...s.panelTitle, marginTop: 24 }}>Delivered orders ({deliveredOrders.length})</div>
                        <div style={s.panel}>
                            {deliveredOrders.length === 0 && <p style={{ ...s.empty, padding: 16 }}>No delivered orders yet</p>}
                            {deliveredOrders.map(o => (
                                <div key={o.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>{o.product_name}</div>
                                        <div style={s.rowDate}>Buyer: {o.buyer_name} · {new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ color: '#5dd6a3', fontSize: 14, fontWeight: 600 }}>KES {parseFloat(o.amount).toLocaleString()}</div>
                                        <div style={{ ...s.stockBadge, ...s.inStock }}>Delivered</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ════ Stock ════ */}
                {activeTab === 'stock' && (
                    <div>
                        <div style={s.panelTitle}>Stock management</div>
                        {products.length === 0 && <p style={s.empty}>No products yet.</p>}
                        {products.map(p => (
                            <div key={p.id} style={s.stockRow}>
                                <div style={{ flex: 1 }}>
                                    <div style={s.rowName}>{p.name}</div>
                                    <div style={{ ...s.stockBadge, ...(p.stock === 0 ? s.outOfStock : s.inStock), marginTop: 4 }}>
                                        {p.stock === 0 ? 'Out of stock' : `${p.stock} available`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="number" defaultValue={p.stock}
                                        style={{ ...s.input, width: 80, marginBottom: 0, textAlign: 'center' }}
                                        id={`stock-${p.id}`} />
                                    <button style={s.submitBtn} onClick={() => {
                                        const val = document.getElementById(`stock-${p.id}`).value;
                                        handleStockUpdate(p.id, val);
                                    }}>Update</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ════ Withdrawals ════ */}
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
                                  value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} required />
                               <div style={{fontSize:12, color:'#5a6480', marginBottom:14}}>
                                  💡 Make sure your M-Pesa number is saved in your profile for payout.
                               </div>
                               <button style={s.submitBtn} type="submit">Request Withdrawal</button>
                           </form> 
                        </div>
                        <div style={s.sectionLabel}>My withdrawal history</div>
                        <div style={s.panel}>
                            {withdrawals.length === 0 && <p style={{ ...s.empty, padding: 16 }}>No withdrawals yet.</p>}
                            {withdrawals.map(w => (
                                <div key={w.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>KES {parseFloat(w.amount).toLocaleString()}</div>
                                        <div style={s.rowDate}>{new Date(w.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ ...s.stockBadge, ...(w.status === 'approved' ? s.inStock : s.pendingBadge) }}>
                                        {w.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ════ Support ════ */}
                {activeTab === 'support' && (
                    <div>
                        <div style={s.contactBar}>
                            <div style={s.contactItem}>📞 <span style={{ color: '#e2e8f0' }}>+254 700 000 000</span></div>
                            <div style={s.contactItem}>📧 <span style={{ color: '#e2e8f0' }}>support@easybuy.co.ke</span></div>
                            <div style={s.contactItem}>💬 <span style={{ color: '#e2e8f0' }}>WhatsApp: +254 700 000 000</span></div>
                        </div>
                        <div style={s.sectionLabel}>Report a problem</div>
                        <div style={s.formBox}>
                            <form onSubmit={handleTicket}>
                                <label style={s.label}>Subject</label>
                                <input style={s.input} placeholder="e.g. Payment issue"
                                    value={ticketForm.subject}
                                    onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })} required />
                                <label style={s.label}>Message</label>
                                <textarea style={{ ...s.input, height: 100, resize: 'none' }}
                                    placeholder="Describe your issue..."
                                    value={ticketForm.message}
                                    onChange={e => setTicketForm({ ...ticketForm, message: e.target.value })} required />
                                <button style={s.submitBtn} type="submit">Submit Ticket</button>
                            </form>
                        </div>
                        <div style={s.sectionLabel}>My tickets</div>
                        <div style={s.panel}>
                            {tickets.length === 0 && <p style={{ ...s.empty, padding: 16 }}>No tickets yet.</p>}
                            {tickets.map(t => (
                                <div key={t.id} style={s.row}>
                                    <div>
                                        <div style={s.rowName}>{t.subject}</div>
                                        <div style={{ color: '#8892a4', fontSize: 13, marginTop: 2 }}>{t.message}</div>
                                        <div style={s.rowDate}>{new Date(t.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ ...s.stockBadge, ...(t.status === 'closed' ? s.inStock : s.pendingBadge) }}>
                                        {t.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ════ Profile ════ */}
                {activeTab === 'profile' && profile && (
                    <div>
                        <div style={s.profileHeader}>
                            <div style={s.avatarBox}>
                                {profileForm.profile_picture
                                    ? <img src={profileForm.profile_picture} alt="profile" style={s.avatarImg} />
                                    : <div style={s.avatarPlaceholder}>{profile.name?.charAt(0).toUpperCase()}</div>
                                }
                            </div>
                            <div>
                                <div style={s.profileName}>{profile.name}</div>
                                <div style={s.profileEmail}>{profile.email}</div>
                                <div style={s.roleBadge}>{profile.role}</div>
                            </div>
                        </div>

                        <div style={s.profileTabs}>
                            {['info', 'password'].map(t => (
                                <div key={t}
                                    style={{ ...s.profileTab, ...(profileTab === t ? s.profileTabActive : {}) }}
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
                                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />

                                    <label style={s.label}>Profile picture</label>
                                    <div style={{ marginBottom: 14, textAlign: 'center' }}>
                                        <label htmlFor="profile-pic-upload" style={{ cursor: 'pointer' }}>
                                            <div style={{ ...s.avatarPlaceholder, width: 90, height: 90, fontSize: 32, margin: '0 auto 8px', position: 'relative' }}>
                                                {profileForm.profile_picture
                                                    ? <img src={profileForm.profile_picture} alt="profile" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover' }} />
                                                    : profile?.name?.charAt(0).toUpperCase()
                                                }
                                                <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#5dd6a3', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✏️</div>
                                            </div>
                                            <div style={{ color: '#5a6480', fontSize: 12 }}>Tap to change photo</div>
                                        </label>
                                        <input id="profile-pic-upload" type="file" accept="image/*"
                                            onChange={e => handleProfileImageUpload(e.target.files[0])}
                                            style={{ display: 'none' }} />
                                    </div>
                                    {uploading && <div style={{ color: '#5a6480', fontSize: 12, marginBottom: 10 }}>Uploading...</div>}

                                    <label style={s.label}>M-Pesa number</label>
                                    <input style={s.input} placeholder="e.g. 0712345678"
                                        value={profileForm.mpesa_number}
                                        onChange={e => setProfileForm({ ...profileForm, mpesa_number: e.target.value })} />

                                    <div style={s.referralBox}>
                                        <div style={s.label}>Your referral code</div>
                                        <div style={s.referralCode}>{profile.referral_code}</div>
                                    </div>

                                    <button style={s.submitBtn} type="submit">Save changes</button>
                                </form>
                            </div>
                        )}

                        {profileTab === 'password' && (
                            <div style={s.formBox}>
                                <form onSubmit={handleChangePassword}>
                                    <label style={s.label}>Current password</label>
                                    <input style={s.input} type="password" placeholder="••••••••"
                                        value={passwordForm.current_password}
                                        onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} required />
                                    <label style={s.label}>New password</label>
                                    <input style={s.input} type="password" placeholder="••••••••"
                                        value={passwordForm.new_password}
                                        onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} required />
                                    <label style={s.label}>Confirm new password</label>
                                    <input style={s.input} type="password" placeholder="••••••••"
                                        value={passwordForm.confirm_password}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} required />
                                    <button style={s.submitBtn} type="submit">Change password</button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
                </>
                )}
            </div>
        </div>
    );
}

// ── Reusable product form ──────────────────────────────────────────────────────
function ProductForm({ form, setForm, onUpload, uploading, s, categories }) {
    return (
        <>
            <label style={s.label}>Product name *</label>
            <input style={s.input} placeholder="e.g. Wireless Earbuds"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />

            <label style={s.label}>Description</label>
            <input style={s.input} placeholder="Brief description"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                    <label style={s.label}>Price (KES) *</label>
                    <input style={s.input} type="number" placeholder="e.g. 1500"
                        value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                    <label style={s.label}>Stock quantity</label>
                    <input style={s.input} type="number" placeholder="e.g. 50"
                        value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
            </div>

            <label style={s.label}>Category</label>
            <select style={s.input} value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={s.label}>Specifications <span style={{ color: '#5a6480' }}>(optional)</span></label>
            <textarea style={{ ...s.input, height: 80, resize: 'none' }}
                placeholder="e.g. RAM: 8GB, Storage: 256GB"
                value={form.specifications}
                onChange={e => setForm({ ...form, specifications: e.target.value })} />

            <label style={s.label}>Product image <span style={{ color: '#5a6480' }}>(optional)</span></label>
            <input type="file" accept="image/*"
                onChange={e => onUpload(e.target.files[0])}
                style={{ ...s.input, padding: 8 }} />
            {uploading && <div style={{ color: '#5a6480', fontSize: 12, marginBottom: 10 }}>Uploading...</div>}
            {form.image && <img src={form.image} alt="preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 14 }} />}
        </>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { color: '#5dd6a3', fontSize: 18, fontWeight: 600 },
    navRight: { display: 'flex', alignItems: 'center', gap: 8 },
    addBtn: { background: '#5dd6a3', border: 'none', color: '#0f2820', padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    avatar: { width: 32, height: 32, borderRadius: '50%', background: '#1a3530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#5dd6a3', overflow: 'hidden', cursor: 'pointer' },
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    tabBar: { background: '#161b27', borderBottom: '0.5px solid #2d3348', display: 'flex', padding: '0 8px', gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' },
    tab: { padding: '12px 8px', fontSize: 11, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap', flexShrink: 0 },
    tabLabel: { fontSize: 11 },
    tabActive: { color: '#e2e8f0', borderBottom: '2px solid #5dd6a3' },
    tabBadge: { background: '#f97066', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 20 },
    content: { padding: 16 },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 },
    stat: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '12px 14px' },
    statLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    statVal: { fontSize: 20, fontWeight: 600, color: '#e2e8f0' },
    twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 },
    panel: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, marginBottom: 16 },
    panelTitle: { fontSize: 12, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '0.5px solid #1e2535', flexWrap: 'wrap', gap: 8 },
    rowName: { fontSize: 13, color: '#e2e8f0' },
    rowDate: { fontSize: 11, color: '#5a6480', marginTop: 2 },
    rowAmt: { fontSize: 13, fontWeight: 600, color: '#5dd6a3' },
    empty: { color: '#5a6480', fontSize: 13 },
    formBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: 16, marginBottom: 20 },
    formTitle: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 14 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
    submitBtn: { background: '#5dd6a3', border: 'none', color: '#0f2820', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    cancelBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '10px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    productModeBtns: { display: 'flex', gap: 8, marginBottom: 16 },
    modeBtn: { background: '#161b27', border: '0.5px solid #2d3348', color: '#8892a4', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    modeActive: { background: '#1a3530', border: '0.5px solid #5dd6a3', color: '#5dd6a3', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    bulkRow: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 10, padding: 14, marginBottom: 14 },
    bulkHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    addMoreBtn: { background: '#1e2535', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', width: '100%', marginBottom: 14 },
    removeBtn: { background: '#2a1018', border: 'none', color: '#f09595', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    productRow: { display: 'flex', alignItems: 'center', background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '12px 16px', marginBottom: 10, flexWrap: 'wrap', gap: 10 },
    stockRow: { display: 'flex', alignItems: 'center', background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '12px 16px', marginBottom: 10 },
    stockBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, display: 'inline-block' },
    inStock: { background: '#0f2820', color: '#5dd6a3' },
    outOfStock: { background: '#2a1018', color: '#f09595' },
    pendingBadge: { background: '#2a1f08', color: '#f7c948' },
    editBtn: { background: '#1e2535', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    deleteBtn: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    deliverBtn: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
    earningsCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'center' },
    sectionLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, marginTop: 8 },
    contactBar: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 },
    contactItem: { fontSize: 13, color: '#5a6480' },
    profileHeader: { display: 'flex', alignItems: 'center', gap: 16, background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: 20, marginBottom: 20 },
    avatarBox: { flexShrink: 0 },
    avatarImg: { width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' },
    avatarPlaceholder: { width: 70, height: 70, borderRadius: '50%', background: '#1a3530', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600, color: '#5dd6a3' },
    profileName: { fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 },
    profileEmail: { fontSize: 13, color: '#5a6480', marginBottom: 8 },
    roleBadge: { fontSize: 11, background: '#0f2820', color: '#5dd6a3', padding: '3px 10px', borderRadius: 20, display: 'inline-block' },
    profileTabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '0.5px solid #2d3348' },
    profileTab: { padding: '10px 14px', fontSize: 13, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent' },
    profileTabActive: { color: '#e2e8f0', borderBottom: '2px solid #5dd6a3' },
    referralBox: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: 12, marginBottom: 14 },
    referralCode: { fontSize: 16, color: '#5dd6a3', fontFamily: 'monospace', marginTop: 4 },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    activationWall: { background: '#161b27', border: '1px solid #f7c948', borderRadius: 16, padding: '40px 24px', textAlign: 'center', marginBottom: 24 },
    activationIcon: { fontSize: 48, marginBottom: 16 },
    activationTitle: { fontSize: 20, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 },
    activationSub: { fontSize: 14, color: '#8892a4', lineHeight: 1.7, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};
