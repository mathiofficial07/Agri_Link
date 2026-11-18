import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Sprout,
    TrendingUp,
    Wallet,
    ShoppingCart,
    Clock,
    ChevronRight,
    MoreHorizontal,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    Truck,
    Tag,
    ExternalLink
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { StatCard } from '../../components/farmer/StatCard';
import { StatusBadge } from '../../components/farmer/StatusBadge';
import { cropApi, farmerApi } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import brinjalImg from '../../components/farmer/crops/brinjal.jpg';
import carrotImg from '../../components/farmer/crops/carrot.jpg';
import greenChillyImg from '../../components/farmer/crops/green chilly.jpg';
import potatoImg from '../../components/farmer/crops/potato.jpg';
import redChillyImg from '../../components/farmer/crops/red chilly.jpg';
import riceImg from '../../components/farmer/crops/rice.jpg';
import wheatImg from '../../components/farmer/crops/wheat.jpg';
const getCropImage = (crop) => {
    if (!crop) return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80';
    const rawUrl =
        (typeof crop.cropImage === 'string' && crop.cropImage) ||
        (typeof crop.imageUrl === 'string' && crop.imageUrl) ||
        (typeof crop.image === 'string' && crop.image) ||
        crop.image?.url ||
        crop.images?.[0] ||
        crop.imagePreviews?.[0];

    if (rawUrl && typeof rawUrl === 'string' && rawUrl.length > 5) {
        if (rawUrl.includes('localhost:5000/uploads/')) {
            return rawUrl.replace(/^https?:\/\/localhost:5000/, '');
        }
        if (rawUrl.includes('localhost:5001/uploads/')) {
            return rawUrl.replace(/^https?:\/\/localhost:5001/, '');
        }
        return rawUrl;
    }

    const nameLower = (crop.name || crop.cropName || '').toLowerCase();
    if (nameLower.includes('tomato')) {
        return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80';
    }
    if (nameLower.includes('carrot')) return carrotImg;
    if (nameLower.includes('brinjal') || nameLower.includes('eggplant')) return brinjalImg;
    if (nameLower.includes('green chilly') || nameLower.includes('chili')) return greenChillyImg;
    if (nameLower.includes('red chilly')) return redChillyImg;
    if (nameLower.includes('potato')) return potatoImg;
    if (nameLower.includes('rice') || nameLower.includes('basmati')) return riceImg;
    if (nameLower.includes('wheat')) return wheatImg;

    return 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80';
};

const FarmerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const dummyData = {
        stats: {
            totalRevenue: 8450,
            activeOrders: 4,
            completedSales: 8,
            totalCrops: 5,
            chartData: [
                { name: 'Mon', sales: 1200 },
                { name: 'Tue', sales: 850 },
                { name: 'Wed', sales: 2100 },
                { name: 'Thu', sales: 1500 },
                { name: 'Fri', sales: 1800 },
                { name: 'Sat', sales: 600 },
                { name: 'Sun', sales: 400 },
            ]
        },
        recentActivity: [
            { id: 1, type: 'sold', text: '500kg Wheat sold to Reliance Retail', time: '2 hours ago' },
            { id: 2, type: 'listed', text: 'New Harvest: Organic Basmati Rice listed', time: '5 hours ago' },
            { id: 3, type: 'status_change', text: 'Order #ORD-772 status updated to Shipped', time: '1 day ago' },
            { id: 4, type: 'sold', text: '200kg Tomatoes sold to Local Vendor', time: '2 days ago' },
            { id: 5, type: 'payment', text: 'Payment of ₹12,500 received for Basmati Rice', time: '3 days ago' },
            { id: 6, type: 'quality_check', text: 'Quality report generated for Yellow Maize', time: '4 days ago' },
            { id: 7, type: 'order_received', text: 'New order received for 300kg Sweet Corn', time: '5 days ago' }
        ],
        cropStatusOverview: [
            { label: 'Ready for Harvest', count: 5, color: 'bg-emerald-500' },
            { label: 'Growing Phase', count: 4, color: 'bg-blue-500' },
            { label: 'Listed for Sale', count: 3, color: 'bg-orange-500' },
            { label: 'Quality Check', count: 2, color: 'bg-purple-500' }
        ],
        performanceMetrics: {
            avgQualityScore: 87.2,
            totalHarvested: 12500,
            pendingOrders: 4,
            customerSatisfaction: 4.8
        }
    };

    const dummyCrops = [
        { id: 'c1', name: 'Premium Basmati Rice', price_per_unit: 85, quantity: 1500, unit: 'KG', status: 'listed', quality: 'A', harvest_date: '2024-03-20' },
        { id: 'c2', name: 'Organic Wheat', price_per_unit: 42, quantity: 2000, unit: 'KG', status: 'processing', quality: 'B+', harvest_date: '2024-03-18' },
        { id: 'c3', name: 'Hybrid Tomatoes', price_per_unit: 25, quantity: 400, unit: 'KG', status: 'listed', quality: 'A-', harvest_date: '2024-03-22' },
        { id: 'c4', name: 'Sweet Corn', price_per_unit: 34, quantity: 600, unit: 'KG', status: 'listed', quality: 'A', harvest_date: '2024-03-21' },
        { id: 'c5', name: 'Yellow Maize', price_per_unit: 38, quantity: 800, unit: 'KG', status: 'ready', quality: 'A-', harvest_date: '2024-03-19' },
        { id: 'c6', name: 'Red Onions', price_per_unit: 22, quantity: 350, unit: 'KG', status: 'growing', quality: 'B+', harvest_date: '2024-03-25' },
        { id: 'c7', name: 'Green Peppers', price_per_unit: 28, quantity: 280, unit: 'KG', status: 'listed', quality: 'A', harvest_date: '2024-03-23' }
    ];

    const [data, setData] = useState(dummyData);
    const [loading, setLoading] = useState(false);
    const [recentCrops, setRecentCrops] = useState(dummyCrops.slice(0, 4));
    const [deletingId, setDeletingId] = useState(null);

    const userEmail = user?.email;

    const refreshDashboard = useCallback(async () => {
        setData(dummyData);
        setLoading(false);
    }, []);

    const [soldCrops, setSoldCrops] = useState([]);

    const fetchSoldCrops = useCallback(async () => {
        let items = [];
        try {
            const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
            items.push(...localSold);
        } catch (e) {}

        try {
            const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
            const res = await axios.get(`${BACKEND_URL}/api/v1/auctions`);
            if (res.data?.success && Array.isArray(res.data.auctions)) {
                const completedAuctions = res.data.auctions.filter(a => a.status === 'COMPLETED');
                completedAuctions.forEach(auc => {
                    if (!items.some(i => String(i.id) === String(auc._id) || String(i._id) === String(auc._id))) {
                        items.push({
                            id: auc._id,
                            _id: auc._id,
                            name: auc.cropName,
                            cropName: auc.cropName,
                            quantity: auc.quantity,
                            unit: auc.unit || 'kg',
                            finalPrice: auc.finalPrice || auc.currentHighestBid || 30,
                            winnerName: auc.winnerName || 'Kongu Fresh Organics',
                            transportId: auc.transportId || 'TR001',
                            status: 'Sold',
                            date: new Date(auc.endTime || Date.now()).toLocaleDateString()
                        });
                    }
                });
            }
        } catch (e) {}

        if (items.length === 0) {
            items = [
                {
                    id: 'sold-101',
                    _id: 'sold-101',
                    name: 'Farm Carrots',
                    quantity: 600,
                    unit: 'kg',
                    finalPrice: 34,
                    winnerName: 'Kongu Fresh Organics',
                    transportId: 'TR-849302',
                    status: 'Sold',
                    date: new Date().toLocaleDateString()
                },
                {
                    id: 'sold-102',
                    _id: 'sold-102',
                    name: 'Red Chilly (Guntur)',
                    quantity: 500,
                    unit: 'kg',
                    finalPrice: 140,
                    winnerName: 'Kavitha Agro Traders',
                    transportId: 'TR-593021',
                    status: 'Sold',
                    date: new Date().toLocaleDateString()
                }
            ];
        }

        setSoldCrops(items);
    }, []);

    useEffect(() => {
        fetchSoldCrops();
    }, [fetchSoldCrops]);

    const refreshRecentCrops = useCallback(async () => {
        setRecentCrops(dummyCrops.slice(0, 4));
    }, []);

    useEffect(() => {
        refreshDashboard();
        refreshRecentCrops();
    }, [refreshDashboard, refreshRecentCrops]);

    const handleEdit = useCallback((crop) => {
        navigate('/farmer/upload', { state: { editCrop: crop } });
    }, [navigate]);

    const handleDelete = useCallback(async (crop) => {
        const ok = window.confirm(`Delete "${crop?.name}"? This will remove the listing.`);
        if (!ok) return;

        try {
            setDeletingId(crop.id);
            await cropApi.delete(crop.id);

            setRecentCrops((prev) => prev.filter((c) => c.id !== crop.id));
            await refreshDashboard();
        } catch (e) {
            console.error('Error deleting crop:', e);
            alert('Failed to delete crop. Please try again.');
        } finally {
            setDeletingId(null);
        }
    }, [refreshDashboard]);

    const { stats, recentActivity, cropStatusOverview } = data || {};

    const earningsText = useMemo(() => {
        const value = parseFloat(stats?.totalRevenue || 0);
        return `₹${value.toLocaleString()}`;
    }, [stats?.totalRevenue]);

    const balanceText = useMemo(() => {
        const value = parseFloat(data?.farmer?.wallet_balance || 0);
        return `₹${value.toLocaleString()}`;
    }, [data?.farmer?.wallet_balance]);

    const formattedCrops = useMemo(() => {
        return recentCrops.map(crop => ({
            ...crop,
            displayPrice: crop.price_per_unit || crop.pricePerUnit,
            displayStatus: crop.status || 'listed'
        }));
    }, [recentCrops]);

    const handleViewAll = useCallback(() => {
        navigate('/farmer/crops');
    }, [navigate]);

    const handleViewHistory = useCallback(() => {
        // Placeholder for history navigation
        console.log('Navigate to history');
    }, []);

    const handleViewRegionalDetails = useCallback(() => {
        // Placeholder for regional details
        console.log('Navigate to regional details');
    }, []);

    if (loading) {
        return (
            <div className="w-full h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header section with profile & wallet overview */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agritrack Dashboard</h1>
                    <p className="text-sm text-slate-500 font-medium">Welcome back, {user?.name || 'Farmer'}! Check your harvest performance.</p>
                </div>

                <div className="flex bg-white p-4 rounded-2xl border border-slate-200 shadow-sm gap-8">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Earnings</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-slate-900">{earningsText}</span>
                            <span className="flex items-center text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                <ArrowUpRight className="w-3 h-3" /> 12%
                            </span>
                        </div>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Balance</p>
                        <p className="text-xl font-bold text-emerald-600">{balanceText}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Link
                    to="/farmer/upload"
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-7 py-4 text-base font-semibold text-white transition-all hover:bg-emerald-700 shadow-sm hover:shadow-md active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Add Product
                </Link>
                <Link
                    to="/farmer/crops"
                    className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-4 text-base font-semibold text-slate-700 transition-all hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md active:scale-95"
                >
                    <Sprout className="h-5 w-5 text-emerald-600" />
                    My Products
                </Link>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Crops Listed"
                    value={stats?.totalCrops || '0'}
                    icon={Sprout}
                    trend="+2 New"
                    color="blue"
                />
                <StatCard
                    title="Active Orders"
                    value={stats?.activeOrders || '0'}
                    icon={ShoppingCart}
                    trend="In processing"
                    color="orange"
                />
                <StatCard
                    title="Market Sales"
                    value={stats?.completedSales || '0'}
                    icon={TrendingUp}
                    trend="Last 30 days"
                    color="emerald"
                />
                <StatCard
                    title="Platform Rating"
                    value="4.8"
                    icon={ShieldCheck}
                    trend="Top Tier Farmer"
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Performance Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">Earnings Trends</h3>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[280px] min-h-[280px] w-full min-w-0 overflow-hidden relative">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={stats?.chartData || []}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: 600
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity Mini-Feed */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">Recent Updates</h3>
                    <div className="flex-1 space-y-5">
                        {recentActivity?.map((activity, idx) => (
                            <div key={activity.id} className="flex gap-3 group">
                                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${activity.type === 'listed' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                    activity.type === 'sold' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                        'bg-orange-50 border-orange-100 text-orange-600'
                                    }`}>
                                    {activity.type === 'listed' ? <Sprout className="w-4 h-4" /> :
                                        activity.type === 'sold' ? <CheckCircle2 className="w-4 h-4" /> :
                                            <Clock className="w-4 h-4" />}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-emerald-700 transition-colors">{activity.text}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={handleViewHistory}
                        className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        View History <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Marketplace Performance */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">Harvest Status</h3>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center space-y-6">
                        {cropStatusOverview?.map((item, idx) => (
                            <div key={idx} className="space-y-2.5">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-500">{item.label}</span>
                                    <span className="text-slate-900">{item.count} Harvests</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                                        style={{ width: `${(item.count / stats?.totalCrops || 1) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tip/Alert Card */}
                <div className="bg-emerald-600 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-all duration-700">
                        <Sprout className="w-24 h-24 text-white" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/20 rounded-md text-[9px] font-bold text-white uppercase tracking-widest border border-white/10">
                            <AlertCircle className="w-3 h-3" /> Regional Alert
                        </div>
                        <h4 className="text-lg font-bold text-white tracking-tight">Market demand for Wheat is increasing!</h4>
                        <p className="text-emerald-50 text-[11px] font-medium leading-relaxed opacity-80">Localized data suggests preparing your Wheat harvest for listing in the next 48 hours for 5-8% better pricing released by regional hubs.</p>
                    </div>
                    <button 
                        onClick={handleViewRegionalDetails}
                        className="mt-4 relative z-10 w-full py-3.5 bg-white text-emerald-600 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        View Regional Details <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Successfully Sold Crops & Concluded Auctions */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                            <CheckCircle2 className="w-5 h-5" />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">Successfully Sold Crops & Concluded Auctions</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Persisted history of completed produce sales & IoT transport assignments.</p>
                        </div>
                    </div>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                        {soldCrops.length} Sold Listings
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {soldCrops.map((item) => (
                        <div key={item.id || item._id} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <img
                                    src={getCropImage(item)}
                                    alt={item.name || item.cropName}
                                    className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0 shadow-sm"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                                        SOLD AUCTION
                                    </span>
                                    <h4 className="text-base font-extrabold text-slate-900 mt-1 truncate">{item.name || item.cropName}</h4>
                                    <p className="text-xs text-slate-500 font-semibold truncate">
                                        Quantity: {item.quantity} {item.unit || 'kg'} · Date: {item.date || 'Today'}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs text-slate-400 font-bold block uppercase">Winning Price</span>
                                    <span className="text-lg font-black text-emerald-700">₹{item.finalPrice || item.price_per_unit || 30}/{item.unit || 'kg'}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Winning Buyer</span>
                                    <span className="font-extrabold text-slate-800">{item.winnerName || 'Kongu Fresh Organics'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Deal</span>
                                    <span className="font-extrabold text-emerald-800">₹{((item.finalPrice || 30) * (Number(item.quantity) || 500)).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <Truck className="w-3.5 h-3.5 text-emerald-600" /> ID: {item.transportId || 'TR001'}
                                </span>
                                <Link
                                    to={`/transport/${item.transportId || 'TR001'}`}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                    Track Transport <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Products (minimal) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest leading-none">Recent Products</h3>
                    <button 
                        onClick={handleViewAll}
                        className="text-sm font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest hover:bg-emerald-50 px-3 py-1 rounded-lg transition-all active:scale-95"
                    >
                        View All
                    </button>
                </div>

                {formattedCrops?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formattedCrops.map((crop) => (
                            <div key={crop.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">{crop.name}</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">
                                        {crop.quantity} {crop.unit} · ₹{crop.displayPrice}
                                    </p>
                                    <div className="mt-2">
                                        <StatusBadge status={crop.displayStatus} />
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(crop)}
                                        className="p-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95 shadow-sm hover:shadow-md"
                                        title="Edit"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={deletingId === crop.id}
                                        onClick={() => handleDelete(crop)}
                                        className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-all active:scale-95 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                                        title="Delete"
                                    >
                                        {deletingId === crop.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                        No products yet. Click "Add Product" to list your first harvest.
                    </div>
                )}
            </div>
        </div>
    );
};

export default FarmerDashboard;
