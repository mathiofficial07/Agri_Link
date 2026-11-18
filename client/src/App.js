import React, { Suspense, lazy, Component } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { FarmerLayout } from './components/farmer/FarmerLayout';

// Core Pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RoleSelection from './pages/auth/RoleSelection';
import Dashboard from './pages/Dashboard';
import CropDetails from './pages/CropDetails';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/auth/AuthCallback';

// Direct Imports
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import MyCrops from './pages/farmer/MyCrops';

// Error Boundary to filter AbortError
class AppAbortErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    if (error.name === 'AbortError') {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (error.name !== 'AbortError') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-slate-600 mb-4">Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy Loaded AgriLink Core Pages
const LiveAuction = lazy(() => import('./pages/auction/LiveAuction'));
const BuyerDashboard = lazy(() => import('./pages/buyer/BuyerDashboard'));
const TransportMonitoring = lazy(() => import('./pages/transport/TransportMonitoring'));
// Retailer Pages
const RetailerDashboard = lazy(() => import('./pages/retailer/RetailerDashboard'));
const RetailerPayments = lazy(() => import('./pages/retailer/RetailerPayments'));
const RetailerOrders = lazy(() => import('./pages/retailer/RetailerOrders'));
const RetailerMarketplace = lazy(() => import('./pages/retailer/RetailerMarketplace'));
const RetailerDelivery = lazy(() => import('./pages/retailer/RetailerDelivery'));
const RetailerProfile = lazy(() => import('./pages/retailer/RetailerProfile'));
const RetailerSettings = lazy(() => import('./pages/retailer/RetailerSettings'));
const RetailerTraceability = lazy(() => import('./pages/retailer/RetailerTraceability'));

// Farmer Subpages
const CropUpload = lazy(() => import('./pages/farmer/CropUpload'));
const FarmerOrders = lazy(() => import('./pages/farmer/Orders'));
const FarmerPayments = lazy(() => import('./pages/farmer/Payments'));
const FarmerProfile = lazy(() => import('./pages/farmer/Profile'));
const FarmerReports = lazy(() => import('./pages/farmer/Reports'));
const FarmerSettings = lazy(() => import('./pages/farmer/Settings'));
const AIInsights = lazy(() => import('./pages/farmer/AIInsights'));
const TrainedInsights = lazy(() => import('./pages/farmer/TrainedInsights'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
  </div>
);

function App() {
  return (
    <AppAbortErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/select-role" element={
            <ProtectedRoute>
              <RoleSelection />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/crop/:id" element={<CropDetails />} />

          {/* AgriLink Real-Time Auction & Transport Routes */}
          <Route path="/auction/:id" element={<LiveAuction />} />
          
          {/* Buyer / Bidder Dashboard Routes (Handles both /buyer and /aggregator) */}
          <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/aggregator/dashboard" element={<BuyerDashboard />} />
          <Route path="/aggregator" element={<BuyerDashboard />} />

          {/* Transport Monitoring Routes */}
          <Route path="/transport/:id" element={<TransportMonitoring />} />
          <Route path="/transport" element={<TransportMonitoring />} />

          {/* Retailer Dashboard & Subpage Routes */}
          <Route path="/retailer/dashboard" element={<RetailerDashboard />} />
          <Route path="/retailer/payments" element={<RetailerPayments />} />
          <Route path="/retailer/orders" element={<RetailerOrders />} />
          <Route path="/retailer/marketplace" element={<RetailerMarketplace />} />
          <Route path="/retailer/delivery" element={<RetailerDelivery />} />
          <Route path="/retailer/profile" element={<RetailerProfile />} />
          <Route path="/retailer/settings" element={<RetailerSettings />} />
          <Route path="/retailer/traceability" element={<RetailerTraceability />} />
          <Route path="/retailer" element={<RetailerDashboard />} />

          {/* Farmer App Routes */}
          <Route path="/farmer" element={<ProtectedRoute allowedRoles={['farmer', 'admin']}><FarmerLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FarmerDashboard />} />
            <Route path="upload" element={<CropUpload />} />
            <Route path="crops" element={<MyCrops />} />
            <Route path="orders" element={<FarmerOrders />} />
            <Route path="payments" element={<FarmerPayments />} />
            <Route path="profile" element={<FarmerProfile />} />
            <Route path="reports" element={<FarmerReports />} />
            <Route path="settings" element={<FarmerSettings />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="trained-insights" element={<TrainedInsights />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppAbortErrorBoundary>
  );
}

export default App;
