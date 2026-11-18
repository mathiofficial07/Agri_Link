import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;
    const role = user?.role?.toLowerCase();

    if (role === 'farmer') {
      navigate('/farmer/dashboard', { replace: true });
    } else if (role === 'retailer') {
      navigate('/retailer/dashboard', { replace: true });
    } else if (role === 'aggregator' || role === 'buyer' || role === 'bidder') {
      navigate('/buyer/dashboard', { replace: true });
    } else {
      navigate('/farmer/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
        Redirecting to {user?.role || 'AgriLink'} dashboard...
      </p>
    </div>
  );
};

export default Dashboard;
