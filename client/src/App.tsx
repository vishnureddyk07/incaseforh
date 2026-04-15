import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HomepagePremiumSections from './components/HomepagePremiumSections';
const WhyPrepare = lazy(() => import('./components/WhyPrepare'));
const SafetyTips = lazy(() => import('./components/SafetyTips'));
const EmergencyContacts = lazy(() => import('./components/EmergencyContacts'));
import EmergencyQRCode from './components/emergency/EmergencyQRCode';
import QRScanDisplay from './components/emergency/QRScanDisplay';
import EmergencyAssistPage from './components/emergency/EmergencyAssistPage';
import EmergencyInfoDisplay from './PagesForWorld/EmergencyInfoDisplay';
import QRList from './components/QRList';
import AdminLogin from './components/auth/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import ChangePassword from './components/auth/ChangePassword';
import ManagerLogin from './components/auth/ManagerLogin';
import ManagerDashboard from './components/manager/ManagerDashboard';
import EmployeeLogin from './components/auth/EmployeeLogin';
import SosPolice from './pages/SosPolice';
import SosAmbulance from './pages/SosAmbulance';
import PoliceLogin from './pages/PoliceLogin';
import PoliceDashboard from './pages/PoliceDashboard';
import AmbulanceLogin from './pages/AmbulanceLogin';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import ActivateQR from './pages/ActivateQR';
import StickerActivationSuccess from './pages/StickerActivationSuccess';
import AdminQRReassign from './pages/AdminQRReassign';
import ChatBotPage from './pages/ChatBotPage';
import ChatBotEditProfile from './pages/ChatBotEditProfile';

function RouteNormalizer() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);

  if (parts[0] === 'activate' && parts[1]) {
    return <Navigate to={`/activate/${parts[1]}`} replace />;
  }

  if (parts[0] === 'emergencyinfo' && parts[1]) {
    return <Navigate to={`/emergencyinfo/${parts[1]}`} replace />;
  }

  return <Navigate to="/" replace />;
}

function MainContent() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Navbar />
      <Hero />
      <HomepagePremiumSections />
      <section id="emergency-info" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Emergency Information QR Code</h2>
            <p className="mt-4 text-lg text-gray-600">
              Create your emergency QR code containing vital information for first responders and family members.
            </p>
          </div>
          <EmergencyQRCode />
        </div>
      </section>
      <Suspense fallback={<div className="text-center py-10">Loading tips and info…</div>}>
        <WhyPrepare />
        <SafetyTips />
        <EmergencyContacts />
      </Suspense>
      <footer className="bg-slate-950 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-lg font-bold text-white">INcase Emergency Platform</p>
              <p className="mt-2 text-sm text-slate-300">Fast responder access to life-saving profile details when every second matters.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Quick Links</p>
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                <a href="#emergency-info" className="block hover:text-white">Activate / Generate QR</a>
                <a href="#corporate" className="block hover:text-white">For Organizations</a>
                <a href="#faq" className="block hover:text-white">FAQ</a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Emergency Numbers</p>
              <p className="mt-2 text-sm text-slate-300">Ambulance: 108</p>
              <p className="text-sm text-slate-300">Police: 100</p>
              <p className="text-sm text-slate-300">Fire: 101</p>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-4 text-center">
            <p className="text-xs text-slate-400">© 2026 INcase. Privacy-focused emergency access platform.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const qrData = urlParams.get('qr');

  if (qrData) {
    try {
      const emergencyData = JSON.parse(decodeURIComponent(qrData));
      // Render the new assist experience for QR scans (privacy-first)
      return <EmergencyAssistPage emergencyData={emergencyData} />;
    } catch (error) {
      console.error('Invalid QR data', error);
    }
  }

  return (
    <Routes>
      <Route path="/" element={<MainContent />} />
      <Route path="/chatbot" element={<ChatBotPage />} />
      <Route path="/emergencyinfo/:email" element={<EmergencyInfoDisplay />} />
      <Route path="/emergencyinfo/:email/*" element={<EmergencyInfoDisplay />} />
      <Route path="/activate/:uuid" element={<ActivateQR />} />
      <Route path="/activate/:uuid/*" element={<ActivateQR />} />
      <Route path="/activation-success" element={<StickerActivationSuccess />} />
      <Route path="/qrs" element={<QRList />} />
      <Route path="/chatbot/edit" element={<ChatBotEditProfile />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/qr/reassign/:uuid" element={<AdminQRReassign />} />
      <Route path="/manager" element={<ManagerLogin />} />
      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      <Route path="/employee" element={<EmployeeLogin />} />
      <Route path="/police/login" element={<PoliceLogin />} />
      <Route path="/police/dashboard" element={<PoliceDashboard />} />
      <Route path="/ambulance/login" element={<AmbulanceLogin />} />
      <Route path="/ambulance/dashboard" element={<AmbulanceDashboard />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/emer" element={<div>hi</div>} />
      <Route path="/assist" element={<EmergencyAssistPage />} />
      <Route path="/sos/police" element={<SosPolice />} />
      <Route path="/sos/ambulance" element={<SosAmbulance />} />
      <Route path="*" element={<RouteNormalizer />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}