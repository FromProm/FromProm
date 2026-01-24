import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import MarketplacePage from './pages/MarketplacePage';
import PromptDetailPage from './pages/PromptDetailPage';
import PurchasePage from './pages/PurchasePage';
import CartPage from './pages/CartPage';
import PromptCreatePage from './pages/PromptCreatePage';
import CreditPage from './pages/CreditPage';
import MyprofilePage from './pages/dashboard/MyprofilePage';
import PurchasedPromptsPage from './pages/dashboard/PurchasedPromptsPage';
import SellingPromptsPage from './pages/dashboard/SellingPromptsPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import CreditHistoryPage from './pages/dashboard/CreditHistoryPage';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ScrollToTop from './components/ScrollToTop';

const queryClient = new QueryClient();

function App() {
    const { setUser } = useAuthStore();

    useEffect(() => {
        // 페이지 로드 시 로컬 스토리지에서 사용자 정보 복원
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                setUser(user);
            } catch (error) {
                console.error('Failed to parse saved user:', error);
                localStorage.removeItem('user');
            }
        }
    }, [setUser]);

    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <ScrollToTop />
                <Routes>
                    {/* 공개 라우트 - Header 없음 */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                    <Route path="/auth/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                    <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />

                    {/* Header가 있는 라우트 */}
                    <Route element={<Layout />}>
                        <Route path="/marketplace" element={<MarketplacePage />} />
                        <Route path="/prompt/:id" element={<PromptDetailPage />} />
                        <Route
                            path="/prompt/create"
                            element={
                                <ProtectedRoute>
                                    <PromptCreatePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/credit"
                            element={
                                <ProtectedRoute>
                                    <CreditPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/purchase/:id"
                            element={
                                <ProtectedRoute>
                                    <PurchasePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <MyprofilePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/purchased"
                            element={
                                <ProtectedRoute>
                                    <PurchasedPromptsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/selling"
                            element={
                                <ProtectedRoute>
                                    <SellingPromptsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/analytics"
                            element={
                                <ProtectedRoute>
                                    <AnalyticsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/settings"
                            element={
                                <ProtectedRoute>
                                    <SettingsPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/credit-history"
                            element={
                                <ProtectedRoute>
                                    <CreditHistoryPage />
                                </ProtectedRoute>
                            }
                        />
                    </Route>
                </Routes>
            </Router>
        </QueryClientProvider>
    );
}

export default App;