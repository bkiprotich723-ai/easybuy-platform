import logo from '../assets/logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Landing() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ users: '...', products: '...', payouts: '...' });
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [showAbout, setShowAbout] = useState(false);

    useEffect(() => {
        // Fetch real stats
        API.get('/api/stats/public').then(res => {
            setStats(res.data);
        }).catch(() => {
            setStats({ users: '12,400+', products: '3,800+', payouts: 'KES 4.2M' });
        });
        // Fetch products for browse section
        API.get('/api/products').then(res => {
            setProducts(res.data.slice(0, 8));
        }).catch(() => {});
    }, []);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <img src={logo} alt="EasyBuy" style={{height: 36, objectFit: 'contain'}} />
                <div style={s.navRight}>
                    <Link to="/login" style={s.ghostBtn}>Log in</Link>
                    <Link to="/register" style={s.primaryBtn}>Get started</Link>
                </div>
            </div>

            <div style={s.hero}>
                <img src={logo} alt="EasyBuy" style={{height: 120, objectFit: 'contain', marginBottom: 24, display:'block', margin:'0 auto 24px'}} />
                <div style={s.heroBadge}>🇰🇪 Kenya's fastest growing marketplace</div>
                <h1 style={s.heroTitle}>Buy, sell & earn —<br />all in <span style={s.accent}>one place</span></h1>
                <p style={s.heroSub}>Shop from thousands of products, launch your store, or earn commissions by referring friends. EasyBuy works for everyone.</p>
                <div style={s.heroBtns}>
                    <Link to="/register" style={s.primaryBtn}>Start for free</Link>
                    <a href="#browse" style={s.ghostBtn} onClick={e => { e.preventDefault(); document.querySelector('[data-browse]')?.scrollIntoView({behavior:'smooth'}); }}>Browse products</a>
                </div>
            </div>

            <div style={s.statsBar}>
                <div style={s.statItem}>
                    <div style={s.statNum}>{stats.users}</div>
                    <div style={s.statDesc}>Active users</div>
                </div>
                <div style={{...s.statItem, borderLeft:'0.5px solid #1e2535', borderRight:'0.5px solid #1e2535'}}>
                    <div style={s.statNum}>{stats.products}</div>
                    <div style={s.statDesc}>Products listed</div>
                </div>
                <div style={s.statItem}>
                    <div style={s.statNum}>{stats.payouts}</div>
                    <div style={s.statDesc}>Paid out to sellers</div>
                </div>
            </div>

            {/* ── Browse Products ── */}
            <div style={s.section} data-browse>
                <div style={s.sectionTag}>Browse products</div>
                <div style={s.sectionTitle}>Shop without signing up</div>
                <div style={s.sectionSub}>Explore what's available — create an account when you're ready to buy</div>
                <input
                    style={s.searchInput}
                    placeholder="🔍 Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <div style={s.productGrid}>
                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1/-1', color: '#5a6480', padding: 24 }}>No products found.</div>
                    )}
                    {filtered.map(p => (
                       <div key={p.id} style={s.productCard} onClick={() => navigate(`/product/${p.id}`)}>
                           {p.image
                               ? <img src={p.image} alt={p.name} style={s.productImg} />
                               : <div style={s.productImgPlaceholder}>🛒</div>
                            }
                            <div style={s.productInfo}>
                               <div style={s.productCategory}>{p.category}</div>
                               <div style={s.productName}>{p.name}</div>
                               <div style={s.productPrice}>KES {parseFloat(p.price).toLocaleString()}</div>
                               <div style={{ ...s.stockTag, ...(p.stock === 0 ? s.outOfStock : s.inStock) }}>
                                   {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                               </div>
                            </div>
                       </div>
                    ))}
                </div>
                {products.length > 0 && (
                    <Link to="/register" style={{ ...s.primaryBtn, display: 'inline-block', marginTop: 24 }}>
                        Sign up to buy →
                    </Link>
                )}
            </div>

            {/* ── About Modal ── */}
            {showAbout && (
               <div style={s.modalOverlay} onClick={() => setShowAbout(false)}>
                   <div style={s.modalBox} onClick={e => e.stopPropagation()}>
                        <button style={s.modalClose} onClick={() => setShowAbout(false)}>✕</button>
                        <h2 style={s.modalTitle}>About EasyBuy</h2>
                        <p style={s.modalText}>
                            EasyBuy is Kenya's fastest growing digital marketplace, built to connect buyers,
                            sellers, and affiliates in one seamless platform.
                        </p>
                        <p style={s.modalText}>
                            Founded in 2026, our mission is to make commerce accessible to every Kenyan —
                            whether you want to shop from the comfort of your home, launch your own online
                            store, or earn passive income by referring friends.
                        </p>
                        <p style={s.modalText}>
                            We handle the payments, the platform, and the technology — so you can focus on
                            what matters: buying, selling, and earning.
                        </p>
                        <div style={s.modalStats}>
                            <div style={s.modalStat}><b style={{ color: '#7c6ef7' }}>{stats.users}</b><br />Active users</div>
                            <div style={s.modalStat}><b style={{ color: '#5dd6a3' }}>{stats.products}</b><br />Products listed</div>
                            <div style={s.modalStat}><b style={{ color: '#f7c948' }}>{stats.payouts}</b><br />Paid to sellers</div>
                        </div>
                        <Link to="/register" style={{ ...s.primaryBtn, display: 'block', textAlign: 'center', marginTop: 20 }}>
                           Join EasyBuy today
                        </Link>
                   </div>
               </div>
             )}
            <div style={s.section}>
                <div style={s.sectionTag}>Choose your path</div>
                <div style={s.sectionTitle}>How do you want to use EasyBuy?</div>
                <div style={s.sectionSub}>Pick one to get started — you can always add more later</div>
                <div style={s.roleGrid}>
                    <div style={{...s.roleCard, border:'1.5px solid #7c6ef7'}}>
                        <div style={s.popularBadge}>Most popular</div>
                        <div style={{...s.roleIcon, background:'#1e1a3a', color:'#7c6ef7'}}>🛒</div>
                        <div style={s.roleName}>Buyer</div>
                        <div style={s.roleDesc}>Browse & buy products from verified sellers across Kenya.</div>
                        <ul style={s.perks}>
                            <li style={s.perk}>✅ Access thousands of products</li>
                            <li style={s.perk}>✅ Wallet-based checkout</li>
                            <li style={s.perk}>✅ Earn via referral program</li>
                        </ul>
                        <Link to="/register?role=buyer" style={{...s.roleCta, background:'#7c6ef7', color:'#fff'}}>Join as a buyer</Link>
                    </div>
                    <div style={s.roleCard}>
                        <div style={{...s.roleIcon, background:'#0f2820', color:'#5dd6a3'}}>🏪</div>
                        <div style={s.roleName}>Seller</div>
                        <div style={s.roleDesc}>List your products and earn 90% of every sale automatically.</div>
                        <ul style={s.perks}>
                            <li style={s.perk}>✅ 90% revenue per sale</li>
                            <li style={s.perk}>✅ Seller dashboard & analytics</li>
                            <li style={s.perk}>✅ Instant wallet payouts</li>
                        </ul>
                        <Link to="/register?role=seller" style={{...s.roleCta, background:'#1a3530', color:'#5dd6a3', border:'0.5px solid #2a5048'}}>Open a store</Link>
                    </div>
                    <div style={s.roleCard}>
                        <div style={{...s.roleIcon, background:'#2a1f08', color:'#f7c948'}}>🔗</div>
                        <div style={s.roleName}>Affiliate</div>
                        <div style={s.roleDesc}>Share your referral link and earn 10% on every purchase your referrals make.</div>
                        <ul style={s.perks}>
                            <li style={s.perk}>✅ 10% commission per order</li>
                            <li style={s.perk}>✅ Unique referral code</li>
                            <li style={s.perk}>✅ No selling required</li>
                        </ul>
                        <Link to="/register?role=affiliate" style={{...s.roleCta, background:'#2a1f08', color:'#f7c948', border:'0.5px solid #4a3510'}}>Join affiliate program</Link>
                    </div>
                </div>
            </div>

            <div style={s.howSection}>
                <div style={s.sectionTag}>How it works</div>
                <div style={s.sectionTitle}>Up and running in 3 steps</div>
                <div style={s.stepsRow}>
                    <div style={s.step}>
                        <div style={s.stepNum}>1</div>
                        <div style={s.stepTitle}>Create your account</div>
                        <div style={s.stepText}>Sign up in under a minute. Choose your role — buyer, seller, or affiliate.</div>
                    </div>
                    <div style={s.stepDivider} />
                    <div style={s.step}>
                        <div style={s.stepNum}>2</div>
                        <div style={s.stepTitle}>Fund your wallet</div>
                        <div style={s.stepText}>Top up your EasyBuy wallet to start shopping or track your earnings as a seller.</div>
                    </div>
                    <div style={s.stepDivider} />
                    <div style={s.step}>
                        <div style={s.stepNum}>3</div>
                        <div style={s.stepTitle}>Buy, sell or earn</div>
                        <div style={s.stepText}>Place orders, manage your store, or share your referral link and watch commissions roll in.</div>
                    </div>
                </div>
            </div>

            <div style={s.ctaSection}>
                <h2 style={s.ctaTitle}>Ready to get started?</h2>
                <p style={s.ctaSub}>Join thousands of Kenyans already on EasyBuy</p>
                <Link to="/register" style={{...s.primaryBtn, fontSize:15, padding:'12px 32px'}}>Create free account</Link>
            </div>

            <div style={s.footerTop}>
    <div style={s.footerBrand}>
        <img src={logo} alt="EasyBuy" style={{height: 28, objectFit: 'contain'}} />
        <div style={s.footerTagline}>Kenya's fastest growing marketplace</div>
        <div style={s.footerContact}>
            <div style={s.contactLine}>📞 +254 715 299 523</div>
            <div style={s.contactLine}>📧 platformeasybuy@gmail.com</div>
            <div style={s.contactLine}>💬 WhatsApp: +254 715 299 523</div>
        </div>
    </div>
    <div style={s.footerCol}>
        <div style={s.footerColTitle}>Company</div>
        <span style={s.footerLink} onClick={() => setShowAbout(true)}>About us</span>
        <span style={s.footerLink}>Careers</span>
        <span style={s.footerLink}>Press</span>
        <span style={s.footerLink}>Blog</span>
    </div>
    <div style={s.footerCol}>
        <div style={s.footerColTitle}>Support</div>
        <span style={s.footerLink}>Help center</span>
        <span style={s.footerLink}>Terms of service</span>
        <span style={s.footerLink}>Privacy policy</span>
        <span style={s.footerLink}>Report a problem</span>
    </div>
    <div style={s.footerCol}>
        <div style={s.footerColTitle}>Follow us</div>
        <a href="https://facebook.com" target="_blank" rel="noreferrer" style={s.socialLink}>📘 Facebook</a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" style={s.socialLink}>📸 Instagram</a>
        <a href="https://twitter.com" target="_blank" rel="noreferrer" style={s.socialLink}>🐦 Twitter / X</a>
        <a href="https://wa.me/254715299523" target="_blank" rel="noreferrer" style={s.socialLink}>💬 WhatsApp</a>
        <a href="https://tiktok.com" target="_blank" rel="noreferrer" style={s.socialLink}>🎵 TikTok</a>
    </div>
</div>
<div style={s.footerBottom}>
    <div style={s.footerCopy}>© 2026 EasyBuy. All rights reserved.</div>
    <div style={s.footerLinks}>
        <span style={s.footerLink}>Terms</span>
        <span style={s.footerLink}>Privacy</span>
        <span style={s.footerLink}>Cookies</span>
    </div>
</div>
        </div>
    );
}

const s = {
    page: { background: '#0f1117', minHeight: '100vh', fontFamily: 'sans-serif', color: '#e2e8f0', width: '100%', overflowX: 'hidden' },
    nav: { background: '#0c0f1a', borderBottom: '0.5px solid #1e2535', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
    logo: { color: '#7c6ef7', fontSize: 20, fontWeight: 600 },
    navRight: { display: 'flex', alignItems: 'center', gap: 10 },
    ghostBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#a3adc2', padding: '8px 18px', borderRadius: 8, fontSize: 13, textDecoration: 'none', cursor: 'pointer' },
    primaryBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontWeight: 600, cursor: 'pointer' },
    hero: { padding: '80px 32px 60px', textAlign: 'center', maxWidth: 700, margin: '0 auto' },
    heroBadge: { display: 'inline-block', background: '#1e1a3a', border: '0.5px solid #3d3580', color: '#a89cf7', fontSize: 13, padding: '6px 16px', borderRadius: 20, marginBottom: 24 },
    heroTitle: { fontSize: 42, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 18 },
    accent: { color: '#7c6ef7' },
    heroSub: { fontSize: 16, color: '#8892a4', lineHeight: 1.7, marginBottom: 32 },
    heroBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
    statsBar: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '0.5px solid #1e2535', borderBottom: '0.5px solid #1e2535', width: '100%' },
    statItem: { padding: '24px', textAlign: 'center' },
    statNum: { fontSize: 26, fontWeight: 700, color: '#e2e8f0' },
    statDesc: { fontSize: 13, color: '#5a6480', marginTop: 4 },
    section: { padding: '60px 32px', textAlign: 'center' },
    sectionTag: { fontSize: 12, color: '#7c6ef7', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
    sectionTitle: { fontSize: 26, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 },
    sectionSub: { fontSize: 14, color: '#5a6480', marginBottom: 32 },
    roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, width: '100%', maxWidth: 900, margin: '0 auto' },
    roleCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 14, padding: '24px 20px', textAlign: 'left' },
    popularBadge: { background: '#1e1a3a', color: '#a89cf7', fontSize: 11, padding: '3px 10px', borderRadius: 20, marginBottom: 12, display: 'inline-block' },
    roleIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 14 },
    roleName: { fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 },
    roleDesc: { fontSize: 13, color: '#5a6480', lineHeight: 1.6, marginBottom: 14 },
    perks: { listStyle: 'none', padding: 0, marginBottom: 18 },
    perk: { fontSize: 12, color: '#8892a4', padding: '3px 0' },
    roleCta: { display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: 'none' },
    howSection: { padding: '60px 32px', background: '#0c0f1a', textAlign: 'center' },
    stepsRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginTop: 40, flexWrap: 'wrap', width: '100%' },
    step: { flex: 1, minWidth: 200, maxWidth: 260, padding: '0 24px', textAlign: 'center' },
    stepDivider: { width: '0.5px', background: '#1e2535', alignSelf: 'stretch', margin: '0 8px' },
    stepNum: { width: 36, height: 36, borderRadius: '50%', background: '#1e1a3a', border: '0.5px solid #3d3580', color: '#a89cf7', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
    stepTitle: { fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 },
    stepText: { fontSize: 13, color: '#5a6480', lineHeight: 1.6 },
    ctaSection: { padding: '70px 32px', textAlign: 'center' },
    ctaTitle: { fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 },
    ctaSub: { fontSize: 15, color: '#5a6480', marginBottom: 28 },
    footer: { background: '#0c0f1a', borderTop: '0.5px solid #1e2535', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
    footerLogo: { color: '#7c6ef7', fontSize: 16, fontWeight: 600 },
    footerLinks: { display: 'flex', gap: 20 },
    footerLink: { fontSize: 13, color: '#5a6480', cursor: 'pointer' },
    footerCopy: { fontSize: 12, color: '#5a6480' },
    footerTop: { background: '#0c0f1a', borderTop: '0.5px solid #1e2535', padding: '32px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 20, width: '100%' },
    footerBrand: { display: 'flex', flexDirection: 'column', gap: 8 },
    footerTagline: { fontSize: 13, color: '#5a6480', marginTop: 4 },
    footerContact: { marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 },
    contactLine: { fontSize: 13, color: '#8892a4' },
    footerCol: { display: 'flex', flexDirection: 'column', gap: 10 },
    footerColTitle: { fontSize: 12, color: '#e2e8f0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    socialLink: { fontSize: 13, color: '#5a6480', textDecoration: 'none', cursor: 'pointer', wordBreak: 'break-word' },
    footerBottom: { background: '#0c0f1a', borderTop: '0.5px solid #1e2535', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    searchInput: { width: '100%', maxWidth: 480, background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 10, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, marginBottom: 28, outline: 'none', display: 'block', margin: '0 auto 28px' },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto', textAlign: 'left' },
    productCard: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' },
    productImg: { width: '100%', height: 140, objectFit: 'cover' },
    productImgPlaceholder: { width: '100%', height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: '#1a1f2e' },
    productInfo: { padding: '12px 14px' },
    productCategory: { fontSize: 11, color: '#7c6ef7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    productName: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 },
    productPrice: { fontSize: 15, fontWeight: 700, color: '#7c6ef7', marginBottom: 6 },
    stockTag: { fontSize: 11, padding: '2px 8px', borderRadius: 20, display: 'inline-block' },
    inStock: { background: '#0f2820', color: '#5dd6a3' },
    outOfStock: { background: '#2a1018', color: '#f09595' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 16, padding: '32px 28px', maxWidth: 520, width: '100%', position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
    modalClose: { position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#5a6480', fontSize: 18, cursor: 'pointer' },
    modalTitle: { fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 },
    modalText: { fontSize: 14, color: '#8892a4', lineHeight: 1.8, marginBottom: 14 },
    modalStats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, margin: '20px 0', textAlign: 'center' },
    modalStat: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 10, padding: '14px 8px', fontSize: 13, color: '#8892a4', lineHeight: 1.8 }, 
};