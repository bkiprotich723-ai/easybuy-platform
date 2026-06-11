import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Profile() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ name: '', profile_picture: '', mpesa_number: '' });
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await API.get('/api/profile');
            setProfile(res.data);
            setForm({ name: res.data.name, profile_picture: res.data.profile_picture || '', mpesa_number: res.data.mpesa_number || '' });
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
            setForm(prev => ({...prev, profile_picture: json.secure_url}));
        } catch (err) {
            setMessage('❌ Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await API.put('/api/profile/update', form);
            setMessage('✅ Profile updated successfully');
            fetchProfile();
        } catch (err) {
            setMessage('❌ ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setMessage('❌ New passwords do not match');
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

    const handleLogout = () => { logout(); navigate('/'); };

    if (!profile) return (
        <div style={{background:'#0f1117', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{color:'#5a6480'}}>Loading...</div>
        </div>
    );

    return (
        <div style={s.page}>
            <div style={s.nav}>
                <button style={s.backBtn} onClick={() => navigate('/buyer')}>← Back</button>
                <div style={s.logo}>🛍 EasyBuy</div>
                <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
            </div>

            <div style={s.content}>
                {message && (
                    <div style={message.startsWith('✅') ? s.success : s.error} onClick={() => setMessage('')}>
                        {message} <span style={{float:'right'}}>✕</span>
                    </div>
                )}

                <div style={s.profileHeader}>
                    <div style={s.avatarBox}>
                        {form.profile_picture
                            ? <img src={form.profile_picture} alt="profile" style={s.avatarImg} />
                            : <div style={s.avatarPlaceholder}>{profile.name?.charAt(0).toUpperCase()}</div>
                        }
                    </div>
                    <div>
                        <div style={s.profileName}>{profile.name}</div>
                        <div style={s.profileEmail}>{profile.email}</div>
                        <div style={s.roleBadge}>{profile.role}</div>
                    </div>
                </div>

                <div style={s.tabBar}>
                    {['profile', 'password'].map(t => (
                        <div key={t} style={{...s.tab, ...(activeTab === t ? s.tabActive : {})}}
                            onClick={() => setActiveTab(t)}>
                            {t === 'profile' ? '👤 Profile' : '🔒 Password'}
                        </div>
                    ))}
                </div>

                {activeTab === 'profile' && (
                    <div style={s.formBox}>
                        <form onSubmit={handleUpdateProfile}>
                            <label style={s.label}>Full name</label>
                            <input style={s.input} value={form.name}
                                onChange={e => setForm({...form, name: e.target.value})} required />

                            <label style={s.label}>Profile picture</label>
                            <input type="file" accept="image/*"
                                onChange={e => handleImageUpload(e.target.files[0])}
                                style={{...s.input, padding: 8}} />
                            {uploading && <div style={{color:'#5a6480', fontSize:12, marginBottom:10}}>Uploading...</div>}
                            {form.profile_picture && (
                                <img src={form.profile_picture} alt="preview"
                                    style={{width:80, height:80, borderRadius:'50%', objectFit:'cover', marginBottom:14}} />
                            )}

                            <label style={s.label}>M-Pesa number <span style={{color:'#5a6480'}}>(for deposits)</span></label>
                            <input style={s.input} placeholder="e.g. 0712345678"
                                value={form.mpesa_number}
                                onChange={e => setForm({...form, mpesa_number: e.target.value})} />

                            <div style={s.referralBox}>
                                <div style={s.label}>Your referral code</div>
                                <div style={s.referralCode}>{profile.referral_code}</div>
                            </div>

                            <button style={s.submitBtn} type="submit">Save changes</button>
                        </form>
                    </div>
                )}

                {activeTab === 'password' && (
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

                            <button style={s.submitBtn} type="submit">Change password</button>
                        </form>
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
    logoutBtn: { background: 'transparent', border: '0.5px solid #2d3348', color: '#8892a4', padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
    content: { padding: 20, maxWidth: 600, margin: '0 auto' },
    profileHeader: { display: 'flex', alignItems: 'center', gap: 16, background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px', marginBottom: 24, marginTop: 16 },
    avatarBox: { flexShrink: 0 },
    avatarImg: { width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' },
    avatarPlaceholder: { width: 70, height: 70, borderRadius: '50%', background: '#2d3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 600, color: '#7c9ef7' },
    profileName: { fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 },
    profileEmail: { fontSize: 13, color: '#5a6480', marginBottom: 8 },
    roleBadge: { fontSize: 11, background: '#1e1a3a', color: '#a89cf7', padding: '3px 10px', borderRadius: 20, display: 'inline-block', textTransform: 'capitalize' },
    tabBar: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '0.5px solid #2d3348' },
    tab: { padding: '12px 16px', fontSize: 13, color: '#5a6480', cursor: 'pointer', borderBottom: '2px solid transparent' },
    tabActive: { color: '#e2e8f0', borderBottom: '2px solid #7c6ef7' },
    formBox: { background: '#161b27', border: '0.5px solid #2d3348', borderRadius: 12, padding: '20px' },
    label: { display: 'block', color: '#8892a4', fontSize: 12, marginBottom: 6 },
    input: { width: '100%', background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' },
    submitBtn: { background: '#7c6ef7', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    referralBox: { background: '#0f1117', border: '0.5px solid #2d3348', borderRadius: 8, padding: '12px', marginBottom: 14 },
    referralCode: { fontSize: 16, color: '#7c6ef7', fontFamily: 'monospace', marginTop: 4 },
    success: { background: '#0f2820', border: '0.5px solid #2a5048', color: '#5dd6a3', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
    error: { background: '#2a1018', border: '0.5px solid #7c2020', color: '#f09595', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, cursor: 'pointer' },
};