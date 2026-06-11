import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function Cart() {
    const navigate = useNavigate();
    const [cart, setCart] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => { fetchCart(); }, []);

    const fetchCart = async () => {
        try {
            const res = await API.get('/api/cart');
            setCart(res.data);
        } catch (err) { console.error(err); }
    };

    const handleRemove = async (product_id) => {
        try {
            await API.delete(`/api/cart/${product_id}`);
            fetchCart();
        } catch (err) { console.error(err); }
    };

    const handleQuantity = async (product_id, quantity) => {
        try {
            await API.patch(`/api/cart/${product_id}`, { quantity });
            fetchCart();
        } catch (err) { console.error(err); }
    };

    const handleBuyAll = async () => {
        try {
            for (const item of cart) {
                await API.post('/api/transactions/buy', { product_id: item.product_id });
            }
            await API.delete('/api/cart');
            setMessage('✅ All items purchased successfully!');
            setCart([]);
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Purchase failed'));
        }
    };

    const total = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <button style={s.backBtn} onClick={() => navigate('/buyer')}>← Back</button>
                <div style={s.logo}>🛍 EasyBuy</div>
                <div style={s.navRight}>🛒 Cart ({cart.length})</div>
            </div>

            <div style={s.content}>
                {message && (
                    <div style={message.startsWith('✅') ? s.success : s.error} onClick={() => setMessage('')}>
                        {message} <span style={{float:'right'}}>✕</span>
                    </div>
                )}

                {cart.length === 0 ? (
                    <div style={s.empty}>
                        <div style={{fontSize:48, marginBottom:16}}>🛒</div>
                        <div style={{color:'#5a6480', fontSize:16}}>Your cart is empty</div>
                        <button style={{...s.buyBtn, marginTop:20}} onClick={() => navigate('/buyer')}>
                            Browse products
                        </button>
                    </div>
                ) : (
                    <div style={s.cartLayout}>
                        <div style={s.cartItems}>
                            {cart.map(item => (
                                <div key={item.id} style={s.cartItem}>
                                    {item.image
                                        ? <img src={item.image} alt={item.name} style={s.itemImage} />
                                        : <div style={s.itemImagePlaceholder}>🛒</div>
                                    }
                                    <div style={s.itemDetails}>
                                        <div style={s.itemName}>{item.name}</div>
                                        <div style={s.itemPrice}>KES {parseFloat(item.price).toLocaleString()}</div>
                                    </div>
                                    <div style={s.itemActions}>
                                        <div style={s.qtyRow}>
                                            <button style={s.qtyBtn} onClick={() => handleQuantity(item.product_id, item.quantity - 1)}>−</button>
                                            <span style={s.qty}>{item.quantity}</span>
                                            <button style={s.qtyBtn} onClick={() => handleQuantity(item.product_id, item.quantity + 1)}>+</button>
                                        </div>
                                        <button style={s.removeBtn} onClick={() => handleRemove(item.product_id)}>Remove</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={s.cartSummary}>
                            <div style={s.summaryTitle}>Order summary</div>
                            <div style={s.summaryRow}>
                                <span style={{color:'#5a6480'}}>Items ({cart.length})</span>
                                <span>KES {total.toLocaleString()}</span>
                            </div>
                            <div style={s.summaryTotal}>
                                <span>Total</span>
                                <span style={{color:'#7c6ef7'}}>KES {total.toLocaleString()}</span>
                            </div>
                            <button style={s.buyBtn} onClick={handleBuyAll}>
                                Buy all items
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    logo: { color: '#7c6ef7', fontSize: 18, fontWeight: 600 },
    navRight: { color: '#a3adc2', fontSize: 13 },
    content: { padding: 20, maxWidth: 900, margin: '0 auto' },
    empty: { textAlign: 'center', padding: '60px 20px' },
    cartLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 16 },
    cartItems: { display: 'flex', flexDirection: 'column', gap: 12 },
    cartItem: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '14px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
    itemImage: { width: 70, height: 70, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
    itemImagePlaceholder: { width: 70, height: 70, background: '#1a1f35', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
    itemDetails: { flex: 1, minWidth: 120 },
    itemName: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 },
    itemPrice: { fontSize: 15, color: '#7c6ef7', fontWeight: 600 },
    itemActions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
    qtyRow: { display: 'flex', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 28, height: 28, background: '#1e2535', border: '0.5px solid #2d3348', color: '#e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
    qty: { fontSize: 14, color: '#e2e8f0', minWidth: 20, textAlign: 'center' },
    removeBtn: { background: 'transparent', border: 'none', color: '#f09595', fontSize: 12, cursor: 'pointer' },
    cartSummary: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px', height: 'fit-content' },
    summaryTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 },
    summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 },
    summaryTotal: { display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, borderTop: '0.5px solid #2d3348', paddingTop: 12, marginBottom: 16 },
    buyBtn: { width: '100%', background: '#7c6ef7', border: 'none', color: '#fff', padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};