import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, AlertCircle, Loader2,
  MapPin, Sprout, Building, Store, ShieldCheck, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'farmer',
    location: '',
    primaryCrops: '',
    businessName: '',
    storeName: '',
    licenseNo: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('Please enter your full name or contact person.');
    if (!formData.email.trim()) return setError('Please enter your email address.');
    if (!formData.phone.trim()) return setError('Please enter your phone number.');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters long.');
    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');

    const { confirmPassword, ...registerData } = formData;
    registerData.role = formData.role || 'farmer';

    // Format display name if business or store name is provided
    if (formData.role === 'retailer' && formData.storeName) {
      registerData.name = formData.storeName;
    } else if ((formData.role === 'aggregator' || formData.role === 'buyer') && formData.businessName) {
      registerData.name = formData.businessName;
    }

    localStorage.setItem('agritrack_onboarding', 'false');

    const result = await register(registerData);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium";

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }} className="min-h-screen flex bg-white">

      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=2000")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-emerald-800/70 to-emerald-900/80" />

        <div className="relative z-10 flex flex-col justify-between h-full p-14">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-xl shadow-emerald-500/20">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-150" />
            </div>
            <span className="text-white font-black text-lg tracking-tighter uppercase">AgriTrack</span>
          </Link>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white leading-snug">
              AI Farm-to-Market<br />
              <span className="text-emerald-300">Auction & Transit Network.</span>
            </h2>
            <p className="text-emerald-100/70 text-base leading-relaxed max-w-xs">
              Connect Farmers, Winning Bidders, and Retailers directly with real-time auctions, cold-chain IoT tracking, and transparent payouts.
            </p>

            <div className="space-y-4 pt-4">
              {[
                '🧑‍🌾 Farmers: AI quality grading & live auctions',
                '👥 Bidders: Real-time live bidding & retailer dispatch',
                '🏪 Retailers: ESP8266 IoT transit tracking & escrow payments',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-300" />
                  </div>
                  <p className="text-emerald-100/90 text-xs font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-emerald-200/40 text-[9px] font-black uppercase tracking-[0.2em]">© 2026 AgriTrack. All rights reserved.</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md py-8 space-y-6"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3">
            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/10">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-150" />
            </div>
            <span className="text-slate-900 font-black tracking-tighter uppercase">AgriTrack</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1.5">Create your account</h1>
            <p className="text-slate-500 text-sm">Select your platform role to configure your ecosystem node.</p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Role Selection Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Account Type / Platform Role</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'farmer' })}
                  className={`py-3 px-2 rounded-xl border text-xs font-extrabold transition flex flex-col items-center justify-center gap-1 ${
                    formData.role === 'farmer'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">🧑‍🌾</span>
                  <span>Farmer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'aggregator' })}
                  className={`py-3 px-2 rounded-xl border text-xs font-extrabold transition flex flex-col items-center justify-center gap-1 ${
                    formData.role === 'aggregator' || formData.role === 'buyer'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">👥</span>
                  <span>Bidder / Buyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'retailer' })}
                  className={`py-3 px-2 rounded-xl border text-xs font-extrabold transition flex flex-col items-center justify-center gap-1 ${
                    formData.role === 'retailer'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-sm">🏪</span>
                  <span>Retailer</span>
                </button>
              </div>
            </div>

            {/* Role Info Tag */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
              {formData.role === 'farmer' && (
                <>
                  <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Farmer Node: Access AI quality grading, harvest uploads, & live auctions.</span>
                </>
              )}
              {(formData.role === 'aggregator' || formData.role === 'buyer') && (
                <>
                  <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bidder Node: Bid on live farm auctions & dispatch produce to eligible retailers.</span>
                </>
              )}
              {formData.role === 'retailer' && (
                <>
                  <Store className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Retailer Node: Monitor IoT telemetry, pay winning bidders, & confirm store deliveries.</span>
                </>
              )}
            </div>

            {/* Dynamic Business / Store / Full Name Field */}
            {formData.role === 'farmer' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Farmer Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="name" type="text" required value={formData.name} onChange={handleChange}
                    placeholder="e.g. Rajesh Kumar" className={inputClass} />
                </div>
              </div>
            )}

            {(formData.role === 'aggregator' || formData.role === 'buyer') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Contact Person Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="name" type="text" required value={formData.name} onChange={handleChange}
                      placeholder="e.g. Amit Sharma" className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Trading / Business Name</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="businessName" type="text" value={formData.businessName} onChange={handleChange}
                      placeholder="e.g. Amit Agro Services" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'retailer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Store Representative Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="name" type="text" required value={formData.name} onChange={handleChange}
                      placeholder="e.g. Suresh Patel" className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Retail Supermarket / Store Name</label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="storeName" type="text" value={formData.storeName} onChange={handleChange}
                      placeholder="e.g. Fresh Mart Supermarket" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="email" type="email" required value={formData.email} onChange={handleChange}
                    placeholder="you@example.com" className={inputClass} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="phone" type="tel" required value={formData.phone} onChange={handleChange}
                    placeholder="+91 98765 43210" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Role-Specific Additional Fields */}
            {formData.role === 'farmer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Farm Location / District</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="location" type="text" value={formData.location} onChange={handleChange}
                      placeholder="Kinathukadavu, Coimbatore" className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Primary Crops Grown</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="primaryCrops" type="text" value={formData.primaryCrops} onChange={handleChange}
                      placeholder="Tomato, Wheat, Basmati Rice" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {(formData.role === 'aggregator' || formData.role === 'buyer') && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Market Yard / Warehouse Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="location" type="text" value={formData.location} onChange={handleChange}
                    placeholder="Coimbatore Market Yard, Tamil Nadu" className={inputClass} />
                </div>
              </div>
            )}

            {formData.role === 'retailer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Store / Delivery Hub Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="location" type="text" value={formData.location} onChange={handleChange}
                      placeholder="Chennai Central Retail Yard, TN" className={inputClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">FSSAI / License No. (Optional)</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input name="licenseNo" type="text" value={formData.licenseNo} onChange={handleChange}
                      placeholder="FSSAI-100200300400" className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="password" type={showPassword ? 'text' : 'password'} required
                    value={formData.password} onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input name="confirmPassword" type="password" required
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Re-enter password" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input type="checkbox" required id="terms" className="mt-0.5 w-4 h-4 accent-emerald-600 cursor-pointer" />
              <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
                I agree to AgriTrack's{' '}
                <Link to="/terms" className="text-emerald-600 hover:underline font-medium">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-emerald-600 hover:underline font-medium">Privacy Policy</Link>.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account & Enter Dashboard <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 pt-2">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-bold hover:text-emerald-700">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
