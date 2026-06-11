import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';


export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [message, setMessage] = useState('');

    useEffect(() => {
    fetchProduct();
    fetchReviews();
}, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchProduct = async () => {
        try {
            const res = await API.get(`/api/products/${id}`);
            setProduct(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchReviews = async () => {
        try {
            const res = await API.get(`/api/reviews/${id}`);
            setReviews(res.data);
        } catch (err) { console.error(err); }
    };

    const handleAddToCart = async () => {
        try {
            await API.post('/api/cart/add', { product_id: id });
            setMessage('✅ Added to cart!');
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleBuy = async () => {
        try {
            const res = await API.post('/api/transactions/buy', { product_id: id });
            setMessage(`✅ Purchase successful! Order #${res.data.order_id}`);
            fetchProduct();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/reviews/add', { ...reviewForm, product_id: id });
            setMessage('✅ Review submitted!');
            setReviewForm({ rating: 5, comment: '' });
            fetchReviews();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const avgRating = reviews.length
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    if (!product) return (
        <div style={{background:'#0f1117', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{color:'#5a6480'}}>Loading...</div>
        </div>
    );

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <button style={s.backBtn} onClick={() => navigate('/buyer')}>← Back</button>
                <div style={s.logo}>🛍 EasyBuy</div>
            </div>

            <div style={s.content}>
                {message && (
                    <div style={message.startsWith('✅') ? s.success : s.error} onClick={() => setMessage('')}>
                        {message} <span style={{float:'right'}}>✕</span>
                    </div>
                )}

                <div style={s.productLayout}>
                    <div style={s.imageBox}>
                        {product.image
                            ? <img src={product.image} alt={product.name} style={s.productImage} />
                            : <div style={s.imagePlaceholder}>🛒</div>
                        }
                    </div>
                    <div style={s.productDetails}>
                        <div style={s.category}>{product.category}</div>
                        <h1 style={s.productName}>{product.name}</h1>
                        {avgRating && (
                            <div style={s.ratingRow}>
                                <span style={s.stars}>{'⭐'.repeat(Math.round(avgRating))}</span>
                                <span style={s.ratingNum}>{avgRating} ({reviews.length} reviews)</span>
                            </div>
                        )}
                        <div style={s.price}>KES {parseFloat(product.price).toLocaleString()}</div>
                        <div style={{
                            ...s.stockBadge,
                            ...(product.stock === 0 ? s.outOfStock : s.inStock)
                        }}>
                            {product.stock === 0 ? '❌ Out of stock' : `✅ ${product.stock} in stock`}
                        </div>
                        <p style={s.description}>{product.description}</p>
                        {product.specifications && (
                            <div style={s.specsBox}>
                                <div style={s.specsTitle}>Specifications</div>
                                <p style={s.specsText}>{product.specifications}</p>
                            </div>
                        )}
                        <div style={s.actionRow}>
                            <button style={s.cartBtn} onClick={handleAddToCart} disabled={product.stock === 0}>
                                🛒 Add to cart
                            </button>
                            <button style={{...s.buyBtn, ...(product.stock === 0 ? s.disabled : {})}}
                                onClick={handleBuy} disabled={product.stock === 0}>
                                Buy Now
                            </button>
                        </div>
                    </div>
                </div>

                <div style={s.reviewsSection}>
                    <div style={s.sectionLabel}>Customer reviews ({reviews.length})</div>
                    <div style={s.reviewsGrid}>
                        <div style={s.reviewForm}>
                            <div style={s.formTitle}>Leave a review</div>
                            <form onSubmit={handleReview}>
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
                        <div style={s.reviewsList}>
                            {reviews.length === 0 && <p style={s.empty}>No reviews yet — be the first!</p>}
                            {reviews.map(r => (
                                <div key={r.id} style={s.reviewCard}>
                                    <div style={s.reviewHeader}>
                                        <div style={s.reviewAvatar}>{r.buyer_name?.charAt(0).toUpperCase()}</div>
                                        <div>
                                            <div style={s.reviewName}>{r.buyer_name}</div>
                                            <div style={s.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div style={s.reviewRating}>{'⭐'.repeat(r.rating)}</div>
                                    </div>
                                    <div style={s.reviewComment}>{r.comment}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#161b27', borderBottom: '0.5px solid #2d3348', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    logo: { color: '#7c6ef7', fontSize: 18, fontWeight: 600 },
    content: { padding: 20, maxWidth: 900, margin: '0 auto' },
    productLayout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 32, marginTop: 16 },
    imageBox: { borderRadius: 12, overflow: 'hidden', background: '#161b27', border: '0.5px solid #2d3348' },
    productImage: { width: '100%', height: 300, objectFit: 'cover' },
    imagePlaceholder: { height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 },
    productDetails: { display: 'flex', flexDirection: 'column', gap: 12 },
    category: { fontSize: 12, color: '#7c6ef7', textTransform: 'uppercase', letterSpacing: 1 },
    productName: { fontSize: 24, fontWeight: 600, color: '#e2e8f0' },
    ratingRow: { display: 'flex', alignItems: 'center', gap: 8 },
    stars: { fontSize: 16 },
    ratingNum: { fontSize: 13, color: '#5a6480' },
    price: { fontSize: 28, fontWeight: 700, color: '#7c6ef7' },
    stockBadge: { fontSize: 12, padding: '4px 12px', borderRadius: 20, display: 'inline-block' },
    inStock: { background: '#0f2820', color: '#5dd6a3' },
    outOfStock: { background: '#2a1018', color: '#f09595' },
    description: { fontSize: 14, color: '#8892a4', lineHeight: 1.7 },
    specsBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '14px 16px' },
    specsTitle: { fontSize: 12, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    specsText: { fontSize: 13, color: '#a3adc2', lineHeight: 1.7 },
    actionRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
    cartBtn: { flex: 1, background: '#1e2535', border: '0.5px solid #2d3348', color: '#e2e8f0', padding: '12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
    buyBtn: { flex: 1, background: '#7c6ef7', border: 'none', color: '#fff', padding: '12px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 },
    disabled: { background: '#2d3348', color: '#5a6480', cursor: 'not-allowed' },
    reviewsSection: { marginTop: 16 },
    sectionLabel: { fontSize: 11, color: '#5a6480', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
    reviewsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
    reviewForm: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '16px 18px' },
    formTitle: { fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 14 },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 12, boxSizing: 'border-box', outline: 'none' },
    submitBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    reviewsList: { display: 'flex', flexDirection: 'column', gap: 12 },
    reviewCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '14px 16px' },
    reviewHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
    reviewAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#2d3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#7c9ef7', flexShrink: 0 },
    reviewName: { fontSize: 13, color: '#e2e8f0', fontWeight: 600 },
    reviewDate: { fontSize: 11, color: '#5a6480' },
    reviewRating: { marginLeft: 'auto', fontSize: 14 },
    reviewComment: { fontSize: 13, color: '#8892a4', lineHeight: 1.6 },
    empty: { color: '#5a6480', fontSize: 13 },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};