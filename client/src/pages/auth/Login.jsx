import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Loader2, UserCheck, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSelectRole = (email, password) => {
    setFormData({ email, password });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        const role = result.user?.role?.toLowerCase() || '';
        if (role === 'farmer' || formData.email.includes('farm')) {
          navigate('/farmer/dashboard');
        } else if (role === 'retailer' || formData.email.includes('retail')) {
          navigate('/retailer/dashboard');
        } else if (role === 'buyer' || role === 'bidder' || role === 'aggregator' || formData.email.includes('collect')) {
          navigate('/buyer/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Incorrect email or password. Please try again.');
      }
    } catch (err) {
      setError('Login error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }} className="min-h-screen flex bg-slate-50">

      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-emerald-800/70 to-emerald-900/80" />

        <div className="relative z-10 flex flex-col justify-between h-full p-14">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-xl shadow-emerald-500/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-150" />
            </div>
            <span className="text-white font-black text-lg tracking-tighter uppercase">AgriLink</span>
          </Link>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white leading-snug">
              Connecting farmers<br />to live market auctions.
            </h2>
            <p className="text-emerald-100/70 text-base leading-relaxed max-w-xs">
              AI crop quality assessment, real-time live bidding, and ESP8266 IoT transit monitoring.
            </p>

            <div className="flex gap-8 pt-4">
              <div>
                <p className="text-2xl font-bold text-white">12,000+</p>
                <p className="text-emerald-200/60 text-xs mt-1">Registered farmers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">₹2.4Cr+</p>
                <p className="text-emerald-200/60 text-xs mt-1">Auctions completed</p>
              </div>
            </div>
          </div>

          <p className="text-emerald-200/40 text-[9px] font-black uppercase tracking-[0.2em]">© 2026 AgriLink. All rights reserved.</p>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Logo */}
          <div className="flex lg:hidden items-center gap-3">
            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/10">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-150" />
            </div>
            <span className="text-slate-900 font-black tracking-tighter uppercase">AgriLink</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1.5">Sign In</h1>
            <p className="text-slate-500 text-sm">Access your AgriLink role dashboard.</p>
          </div>

          {/* Quick Demo One-Click Role Selector */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <UserCheck className="w-4 h-4 text-emerald-600" /> Select Role Dashboard to Sign In:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectRole('rajesh.kumar@farm.com', 'password123')}
                className={`py-2 px-2 border text-[11px] font-bold rounded-xl transition text-center truncate shadow-sm ${
                  formData.email === 'rajesh.kumar@farm.com'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                    : 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                🧑‍🌾 Farmer
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('amit.agro@collect.com', 'password123')}
                className={`py-2 px-2 border text-[11px] font-bold rounded-xl transition text-center truncate shadow-sm ${
                  formData.email === 'amit.agro@collect.com'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                    : 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                👥 Buyer / Bidder
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('fresh.mart@retail.com', 'password123')}
                className={`py-2 px-2 border text-[11px] font-bold rounded-xl transition text-center truncate shadow-sm ${
                  formData.email === 'fresh.mart@retail.com'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                    : 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                🏪 Retailer
              </button>
            </div>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="password123"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 font-bold hover:text-emerald-700">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
