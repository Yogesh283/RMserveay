import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppChrome from './components/AppChrome';
import Layout from './components/Layout';
import AboutPage from './pages/AboutPage';
import AuthLoginPage from './pages/AuthLoginPage';
import AuthForgotPasswordPage from './pages/AuthForgotPasswordPage';
import ContactPage from './pages/ContactPage';
import DashboardPage from './pages/DashboardPage';
import FaqsPage from './pages/FaqsPage';
import HomePage from './pages/HomePage';
import WhyJoinPage from './pages/WhyJoinPage';
import PublisherShell from './publisher/PublisherShell';
import PublisherDashboardPage from './publisher/pages/PublisherDashboardPage';
import PublisherSurveysPage from './publisher/pages/PublisherSurveysPage';
import PublisherCreateSurveyPage from './publisher/pages/PublisherCreateSurveyPage';
import PublisherAudiencePage from './publisher/pages/PublisherAudiencePage';
import PublisherEarningsPage from './publisher/pages/PublisherEarningsPage';
import PublisherAnalyticsPage from './publisher/pages/PublisherAnalyticsPage';
import PublisherNotificationsPage from './publisher/pages/PublisherNotificationsPage';
import PublisherSettingsPage from './publisher/pages/PublisherSettingsPage';
import PublisherWalletDepositPage from './publisher/pages/PublisherWalletDepositPage';
import MemberShell from './member/MemberShell';
import MemberDashboardPage from './member/pages/MemberDashboardPage';
import MemberTeamPage from './member/pages/MemberTeamPage';
import MemberSurveysPage from './member/pages/MemberSurveysPage';
import MemberSurveySessionPage from './member/pages/MemberSurveySessionPage';
import MemberWalletHubPage from './member/pages/MemberWalletHubPage';
import MemberProfilePage from './member/pages/MemberProfilePage';
import MemberActivePanelsPage from './member/pages/MemberActivePanelsPage';
import MemberSubPanelsPage from './member/pages/MemberSubPanelsPage';
import MemberDirectIncomePage from './member/pages/MemberDirectIncomePage';
import MemberPanelMatchingPage from './member/pages/MemberPanelMatchingPage';
import MemberSubPanelMatchingPage from './member/pages/MemberSubPanelMatchingPage';
import MemberSuperSubPanelPage from './member/pages/MemberSuperSubPanelPage';
import MemberSuperSubPanelsPage from './member/pages/MemberSuperSubPanelsPage';
import MemberLevelIncomePage from './member/pages/MemberLevelIncomePage';
import MemberWalletInternalTransferPage from './member/pages/MemberWalletInternalTransferPage';
import MemberWalletDepositPage from './member/pages/MemberWalletDepositPage';
import MemberWalletWithdrawPage from './member/pages/MemberWalletWithdrawPage';
import MemberWalletP2pPage from './member/pages/MemberWalletP2pPage';
import MemberTermsPage from './member/pages/MemberTermsPage';
import MemberTransactionsPage from './member/pages/MemberTransactionsPage';
import MemberSupportTicketsPage from './member/pages/MemberSupportTicketsPage';
import MemberSurveyProfileFormPage from './member/pages/MemberSurveyProfileFormPage';

export default function Application() {
    return (
        <BrowserRouter>
            <AppChrome>
                <Routes>
                    <Route path="/member" element={<MemberShell />}>
                        <Route index element={<MemberDashboardPage />} />
                        <Route path="team" element={<MemberTeamPage />} />
                        <Route path="programme" element={<Navigate to="/member" replace />} />
                        <Route path="surveys/:surveyId/session" element={<MemberSurveySessionPage />} />
                        <Route path="surveys" element={<MemberSurveysPage />} />
                        <Route path="profile" element={<MemberProfilePage />} />
                        <Route path="profile-form" element={<MemberSurveyProfileFormPage />} />
                        <Route path="plans" element={<Navigate to="/member" replace />} />
                        <Route path="transactions" element={<MemberTransactionsPage />} />
                        <Route path="self-survey-income" element={<Navigate to="/member" replace />} />
                        <Route path="active-panels" element={<MemberActivePanelsPage />} />
                        <Route path="sub-panels" element={<MemberSubPanelsPage />} />
                        <Route path="super-sub-panels" element={<MemberSuperSubPanelsPage />} />
                        <Route path="direct-income" element={<MemberDirectIncomePage />} />
                        <Route path="panel-matching" element={<MemberPanelMatchingPage />} />
                        <Route path="sub-panel-matching" element={<MemberSubPanelMatchingPage />} />
                        <Route path="super-sub-panel-matching" element={<MemberSuperSubPanelPage />} />
                        <Route path="level-income" element={<MemberLevelIncomePage />} />
                        <Route path="deposit-withdrawal" element={<Navigate to="/member/wallet" replace />} />
                        <Route path="wallet/internal" element={<MemberWalletInternalTransferPage />} />
                        <Route path="wallet/deposit" element={<MemberWalletDepositPage />} />
                        <Route path="wallet/p2p" element={<MemberWalletP2pPage />} />
                        <Route path="wallet/withdraw" element={<MemberWalletWithdrawPage />} />
                        <Route path="wallet" element={<MemberWalletHubPage />} />
                        <Route path="support-tickets" element={<MemberSupportTicketsPage />} />
                        <Route path="terms" element={<MemberTermsPage />} />
                    </Route>

                    <Route path="/publisher" element={<PublisherShell />}>
                        <Route index element={<PublisherDashboardPage />} />
                        <Route path="surveys" element={<PublisherSurveysPage />} />
                        <Route path="create" element={<PublisherCreateSurveyPage />} />
                        <Route path="audience" element={<PublisherAudiencePage />} />
                        <Route path="earnings" element={<PublisherEarningsPage />} />
                        <Route path="wallet/deposit" element={<PublisherWalletDepositPage />} />
                        <Route path="analytics" element={<PublisherAnalyticsPage />} />
                        <Route path="notifications" element={<PublisherNotificationsPage />} />
                        <Route path="settings" element={<PublisherSettingsPage />} />
                    </Route>

                    <Route path="/survey/*" element={<Navigate to="/" replace />} />

                    <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route path="about" element={<AboutPage />} />
                        <Route path="why-join-us" element={<WhyJoinPage />} />
                        <Route path="faqs" element={<FaqsPage />} />
                        <Route path="contact" element={<ContactPage />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="login/forgot-password" element={<AuthForgotPasswordPage />} />
                        <Route path="login" element={<AuthLoginPage />} />
                        <Route path="signup" element={<Navigate to={{ pathname: '/', hash: 'register' }} replace />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </AppChrome>
        </BrowserRouter>
    );
}
