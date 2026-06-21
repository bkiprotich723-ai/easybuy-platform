import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import AffiliateDashboard from './pages/AffiliateDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div style={{ width: '100%', overflowX: 'hidden' }}>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        <Route path="/product/:id" element={<ProductDetail />} />

                        <Route path="/affiliate" element={
                            <PrivateRoute roles={['affiliate']}>
                                <AffiliateDashboard />
                            </PrivateRoute>
                        } />

                        <Route path="/buyer/profile" element={
                            <PrivateRoute roles={['buyer']}>
                                <Profile />
                            </PrivateRoute>
                        } />

                        <Route path="/seller/profile" element={
                            <PrivateRoute roles={['seller']}>
                                <Profile />
                            </PrivateRoute>
                        } />

                        <Route path="/admin/profile" element={
                            <PrivateRoute roles={['admin']}>
                                <Profile />
                            </PrivateRoute>
                        } />

                        <Route path="/affiliate/profile" element={
                            <PrivateRoute roles={['affiliate']}>
                                <Profile />
                            </PrivateRoute>
                        } />

                        <Route path="/cart" element={
                            <PrivateRoute roles={['buyer']}>
                                <Cart />
                            </PrivateRoute>
                        } />

                        <Route path="/buyer" element={
                            <PrivateRoute roles={['buyer']}>
                                <BuyerDashboard />
                            </PrivateRoute>
                        } />

                        <Route path="/seller" element={
                            <PrivateRoute roles={['seller']}>
                                <SellerDashboard />
                            </PrivateRoute>
                        } />

                        <Route path="/admin" element={
                            <PrivateRoute roles={['admin']}>
                                <AdminDashboard />
                            </PrivateRoute>
                        } />
                    </Routes>
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}
