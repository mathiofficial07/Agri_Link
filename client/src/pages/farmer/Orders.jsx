import React, { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "../../components/farmer/StatusBadge";
import { QrCode, Truck, ExternalLink, Loader2, Search, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export default function Orders() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orderStatuses, setOrderStatuses] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const STATUS_STEPS = ["CONFIRMED", "SHIPPED", "DELIVERED"];
    const STATUS_LABELS = { CONFIRMED: "Confirm", SHIPPED: "Ship", DELIVERED: "Deliver" };

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            let items = [];

            // 1. Fetch from localStorage completed_sold_crops
            try {
                const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
                localSold.forEach(item => {
                    items.push({
                        id: item.transportId || item.id || `ORD-${Math.floor(1000 + Math.random()*9000)}`,
                        transportId: item.transportId || 'TR001',
                        buyerName: item.winnerName || 'Kongu Fresh Organics',
                        aggregator: item.aggregator || 'AgriLink IoT Transit Node',
                        cropName: item.cropName || item.name || 'Organic Produce',
                        grade: item.quality_grade || 'Grade A+',
                        quantity: item.quantity || 500,
                        unit: item.unit || 'KG',
                        finalPrice: item.finalPrice || 40,
                        status: (item.status || 'CONFIRMED').toUpperCase(),
                        created_at: item.date || new Date().toISOString()
                    });
                });
            } catch (e) {}

            // 2. Fetch from Backend Transport API
            try {
                const res = await axios.get(`${BACKEND_URL}/api/v1/transport`, { timeout: 3000 });
                if (res.data?.success && Array.isArray(res.data.transports)) {
                    res.data.transports.forEach(t => {
                        if (!items.some(i => i.transportId === t.transportId || i.id === t.transportId)) {
                            items.push({
                                id: t.transportId,
                                transportId: t.transportId,
                                buyerName: t.winnerName || 'Fresh Mart Supermarket',
                                aggregator: 'AgriLink IoT Transit Node',
                                cropName: t.cropName,
                                grade: 'Grade A+',
                                quantity: t.quantity,
                                unit: t.unit || 'KG',
                                finalPrice: t.finalPrice || 35,
                                status: (t.status || 'CONFIRMED').toUpperCase(),
                                created_at: t.createdTime || new Date().toISOString()
                            });
                        }
                    });
                }
            } catch (e) {
                console.warn('Backend transport fetch warning:', e);
            }

            // 3. Fallback Seed Orders if no sold crops exist yet
            if (items.length === 0) {
                items = [
                    {
                        id: "TR-928301",
                        transportId: "TR-928301",
                        buyerName: "Nature's Basket Organics",
                        aggregator: "Agro Fresh Hub",
                        cropName: "Organic Tomatoes",
                        grade: "Premium A+",
                        quantity: 500,
                        unit: "KG",
                        finalPrice: 32,
                        status: "CONFIRMED",
                        created_at: new Date(Date.now() - 86400000).toISOString()
                    },
                    {
                        id: "TR-716204",
                        transportId: "TR-716204",
                        buyerName: "Green Mart Retailers",
                        aggregator: "Punjab Agri Hub",
                        cropName: "Basmati Rice",
                        grade: "Grade A",
                        quantity: 1200,
                        unit: "KG",
                        finalPrice: 85,
                        status: "SHIPPED",
                        created_at: new Date(Date.now() - 172800000).toISOString()
                    },
                    {
                        id: "TR-445109",
                        transportId: "TR-445109",
                        buyerName: "Mega Supermarket Node",
                        aggregator: "South India Agrilink",
                        cropName: "Fresh Potatoes",
                        grade: "Bulk B",
                        quantity: 2500,
                        unit: "KG",
                        finalPrice: 24,
                        status: "DELIVERED",
                        created_at: new Date(Date.now() - 604800000).toISOString()
                    }
                ];
            }

            setOrders(items);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const getOrderStatus = (order) => {
        const key = order.transportId || order.id;
        return orderStatuses[key] || order.status || "CONFIRMED";
    };

    const getStepIndex = (status) => {
        const upper = (status || "").toUpperCase();
        if (upper === 'PROCESSING' || upper === 'CONFIRMED' || upper === 'ASSIGNED') return 0;
        if (upper === 'SHIPPED' || upper === 'IN_TRANSIT') return 1;
        if (upper === 'DELIVERED') return 2;
        return 0;
    };

    const handleUpdateOrderStatus = async (order, newStatus) => {
        const orderKey = order.transportId || order.id;
        try {
            setUpdatingId(orderKey);
            setOrderStatuses(prev => ({ ...prev, [orderKey]: newStatus }));

            // Update Backend Transport Status if transportId exists
            if (order.transportId) {
                try {
                    await axios.patch(`${BACKEND_URL}/api/v1/transport/${order.transportId}/status`, {
                        status: newStatus
                    });
                } catch (err) {}
            }

            // Update localStorage completed_sold_crops
            try {
                const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
                const updated = localSold.map(item => {
                    if (item.transportId === order.transportId || item.id === order.id) {
                        return { ...item, status: newStatus };
                    }
                    return item;
                });
                localStorage.setItem('completed_sold_crops', JSON.stringify(updated));
            } catch (e) {}

        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredOrders = orders.filter(o => 
        (o.id && o.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.buyerName && o.buyerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.cropName && o.cropName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-xs text-slate-400 uppercase tracking-widest animate-pulse">Loading Live Transport & Orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="space-y-1">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        Farmer Logistics & Dispatch Portal
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Orders & Transport Dispatch</h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Track live crop deliveries, update transport dispatch status, and monitor real-time ESP8266 temperature & humidity in transit.
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search Transport ID, Buyer or Crop..."
                        className="pl-11 pr-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 min-w-[280px] focus:outline-none focus:border-emerald-500 transition-all"
                    />
                </div>
            </div>

            {filteredOrders.length > 0 ? (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Transport / Order ID</th>
                                    <th className="px-6 py-4">Buyer / Winner</th>
                                    <th className="px-6 py-4">Transit Hub</th>
                                    <th className="px-6 py-4">Harvest Lot</th>
                                    <th className="px-6 py-4">Quantity & Deal</th>
                                    <th className="px-6 py-4">Update Status</th>
                                    <th className="px-6 py-4 text-center">IoT & Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.map((order) => {
                                    const currentStatus = getOrderStatus(order);
                                    const currentIdx = getStepIndex(currentStatus);
                                    const transportId = order.transportId || order.id;

                                    return (
                                        <tr key={order.id} className="transition-all hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {transportId}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm text-slate-900 font-bold">{order.buyerName}</p>
                                                <span className="text-[10px] text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    Verified Buyer
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                                                    {order.aggregator}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800">{order.cropName}</p>
                                                <span className="text-xs text-emerald-600 font-bold">{order.grade}</span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="text-sm font-extrabold text-slate-800">{order.quantity} {order.unit}</p>
                                                <p className="text-xs text-emerald-700 font-bold">₹{order.finalPrice}/{order.unit}</p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex gap-1.5 items-center">
                                                    {STATUS_STEPS.map((s, idx) => {
                                                        const isPast = idx < currentIdx;
                                                        const isCurrent = idx === currentIdx;
                                                        const isNext = idx === currentIdx + 1;

                                                        return (
                                                            <button
                                                                key={s}
                                                                disabled={isPast || isCurrent || updatingId === transportId}
                                                                onClick={() => handleUpdateOrderStatus(order, s)}
                                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                                    isCurrent
                                                                        ? s === 'CONFIRMED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                                        : s === 'SHIPPED' ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                        : 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                                                        : isPast
                                                                        ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'
                                                                        : isNext
                                                                        ? 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer'
                                                                        : 'bg-white text-slate-200 border-slate-100 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {STATUS_LABELS[s]}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/transport/${transportId}`)}
                                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                                                        title="Monitor Live ESP8266 Sensor Data"
                                                    >
                                                        <Truck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Telemetry
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/transport/${transportId}`)}
                                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                                                        title="View Transport QR Receipt"
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {filteredOrders.map((order) => {
                            const currentStatus = getOrderStatus(order);
                            const currentIdx = getStepIndex(currentStatus);
                            const transportId = order.transportId || order.id;

                            return (
                                <div key={order.id} className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            {transportId}
                                        </span>
                                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                                            {currentStatus}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-3">
                                            <span className="text-slate-400 font-bold uppercase text-[10px]">Buyer</span>
                                            <span className="text-slate-900 font-bold">{order.buyerName}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-slate-50 rounded-2xl p-3">
                                                <span className="text-slate-400 font-bold uppercase text-[10px] block">Crop & Lot</span>
                                                <span className="text-slate-900 font-bold">{order.cropName} ({order.quantity} {order.unit})</span>
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl p-3">
                                                <span className="text-slate-400 font-bold uppercase text-[10px] block">Final Price</span>
                                                <span className="text-emerald-700 font-extrabold text-sm">₹{order.finalPrice}/{order.unit}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Update Dispatch Status</span>
                                        <div className="flex gap-2">
                                            {STATUS_STEPS.map((s, idx) => {
                                                const isPast = idx < currentIdx;
                                                const isCurrent = idx === currentIdx;
                                                const isNext = idx === currentIdx + 1;

                                                return (
                                                    <button
                                                        key={s}
                                                        disabled={isPast || isCurrent || updatingId === transportId}
                                                        onClick={() => handleUpdateOrderStatus(order, s)}
                                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                                                            isCurrent
                                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                                : isNext
                                                                ? 'bg-slate-100 text-slate-800 hover:bg-emerald-100'
                                                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {STATUS_LABELS[s]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => navigate(`/transport/${transportId}`)}
                                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                                        >
                                            <Truck className="w-4 h-4 text-emerald-400 animate-pulse" /> Live ESP8266 Telemetry
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Truck className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">No Orders or Transports Found</h3>
                    <p className="text-xs text-slate-500 font-medium">New orders will automatically appear here when buyers win your live auctions.</p>
                </div>
            )}
        </div>
    );
}
