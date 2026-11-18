import React, { useState, useEffect } from "react";
import { RetailerLayout } from "../../components/retailer/RetailerLayout";
import {
  Download, DollarSign, Clock, CheckCircle, Wallet, ArrowUpRight, Loader2,
  RefreshCw, Smartphone, CreditCard, ShieldCheck, Search, Filter, FileText,
  Truck, ArrowDownRight, Printer, X, Sparkles, Building, ChevronRight
} from "lucide-react";
import { retailerApi } from "../../utils/api";

export default function RetailerPayments() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const fetchPaymentsData = async () => {
    try {
      setLoading(true);

      // 1. Fetch backend orders if available
      let backendOrders = [];
      try {
        const ordersRes = await retailerApi.getOrders();
        if (ordersRes?.data?.success && Array.isArray(ordersRes.data.data)) {
          backendOrders = ordersRes.data.data;
        }
      } catch (e) {}

      // 2. Fetch local storage transactions
      const localRetTxns = JSON.parse(localStorage.getItem("retailer_payment_transactions") || "[]");
      const localAssigned = JSON.parse(localStorage.getItem("agritrack_assigned_transports") || "[]");
      const localAccepted = JSON.parse(localStorage.getItem("agritrack_accepted_bids") || "[]");
      const localSold = JSON.parse(localStorage.getItem("completed_sold_crops") || "[]");

      const combinedTxns = [...localRetTxns];

      // Process assigned transports & local accepted bids into transaction log items
      const allLocalOrders = [...localAssigned, ...localAccepted, ...localSold];
      
      allLocalOrders.forEach((item) => {
        const tId = item.transportId || item.id || item._id;
        const cropName = item.cropName || item.name || "Organic Produce";
        const isPaid = item.status === "RETAILER_PAID" || item.status === "IN_TRANSIT" || item.status === "DELIVERED" || item.transportStatus === "RETAILER_PAID";
        const isEscrow = item.status === "AWAITING_RETAILER_PAYMENT" || item.paymentStatus === "UNPAID";

        if (tId && !combinedTxns.some((t) => t.order_id === tId || t.id === tId || (t.cropName === cropName && t.created_at === item.soldAt))) {
          const unitPrice = Number(item.finalPrice || item.winningPrice || item.price_per_unit || item.currentHighestBid || 30);
          const qty = Number(item.quantity) || 500;
          const baseProduceAmt = item.baseProduceAmount ? Number(item.baseProduceAmount) : (unitPrice * qty);
          const bidderProfitAmt = item.bidderProfit ? Number(item.bidderProfit) : (qty * 2);
          const produceAmt = item.produceAmount ? Number(item.produceAmount) : (baseProduceAmt + bidderProfitAmt);
          const transCost = item.transportCost ? Number(item.transportCost) : 2500;
          const totalAmt = item.totalAmount ? Number(item.totalAmount) : (produceAmt + transCost);

          combinedTxns.push({
            id: `RET-PAY-${Math.abs(hashCode(tId)).toString().slice(0, 6)}`,
            txnId: `TXN-RET-${Math.abs(hashCode(tId + cropName)).toString().slice(0, 6)}`,
            order_id: tId,
            cropName,
            quantity: qty,
            unit: item.unit || "kg",
            pricePerUnit: unitPrice,
            baseProduceAmount: baseProduceAmt,
            bidderProfit: bidderProfitAmt,
            produceAmount: produceAmt,
            transportCost: transCost,
            total_amount: totalAmt,
            winnerName: item.winnerName || item.bidderName || "Amit Agro Services",
            farmerName: item.farmerName || "Rajesh Kumar",
            payment_method: item.paymentMethod || "UPI / GPay (Escrow Protocol)",
            status: isPaid ? "settled" : (isEscrow ? "in escrow" : "pending"),
            created_at: item.soldAt || item.retailerPaidAt || new Date().toISOString()
          });
        }
      });

      // Merge backend orders
      backendOrders.forEach((bo) => {
        const boId = bo.order_id || bo.id;
        if (!combinedTxns.some((t) => t.order_id === boId || t.id === boId)) {
          const qty = bo.quantity || 500;
          const unitPrice = bo.price_per_unit || 30;
          const baseProduceAmt = unitPrice * qty;
          const bidderProfitAmt = qty * 2;
          const produceAmt = baseProduceAmt + bidderProfitAmt;
          const transCost = 2500;
          const totalAmt = produceAmt + transCost;

          combinedTxns.push({
            id: `RET-PAY-${boId.slice(-6)}`,
            txnId: `TXN-RET-${Math.floor(100000 + Math.random() * 900000)}`,
            order_id: boId,
            cropName: bo.cropName || bo.item_name || "Organic Farm Produce",
            quantity: qty,
            unit: bo.unit || "kg",
            pricePerUnit: unitPrice,
            baseProduceAmount: baseProduceAmt,
            bidderProfit: bidderProfitAmt,
            produceAmount: produceAmt,
            transportCost: transCost,
            total_amount: totalAmt,
            winnerName: bo.winnerName || "Amit Agro Services",
            farmerName: bo.farmerName || "Rajesh Kumar",
            payment_method: bo.payment_method || "Escrow Protocol",
            status: bo.status === "delivered" ? "settled" : "in escrow",
            created_at: bo.created_at || new Date().toISOString()
          });
        }
      });

      // Fallback demo data if no transactions exist yet
      if (combinedTxns.length === 0) {
        combinedTxns.push(
          {
            id: "RET-PAY-882101",
            txnId: "TXN-RET-901823",
            order_id: "TR-280683",
            cropName: "Tomato",
            quantity: 500,
            unit: "kg",
            pricePerUnit: 30,
            baseProduceAmount: 15000,
            bidderProfit: 1000,
            produceAmount: 16000,
            transportCost: 2500,
            total_amount: 18500,
            winnerName: "Amit Agro Services",
            farmerName: "Rajesh Kumar",
            payment_method: "UPI / GPay (Escrow Protocol)",
            status: "settled",
            created_at: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: "RET-PAY-882102",
            txnId: "TXN-RET-901824",
            order_id: "TR-280684",
            cropName: "Premium Basmati Rice",
            quantity: 1000,
            unit: "kg",
            pricePerUnit: 65,
            baseProduceAmount: 65000,
            bidderProfit: 2000,
            produceAmount: 67000,
            transportCost: 3500,
            total_amount: 70500,
            winnerName: "Kongu Fresh Organics",
            farmerName: "Senthil Nathan",
            payment_method: "Bank Transfer (NEFT)",
            status: "settled",
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        );
      }

      setTransactions(combinedTxns);
    } catch (err) {
      console.error("Retailer payments fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };

  // Filter transactions
  const filteredTxns = transactions.filter((t) => {
    const matchesFilter =
      activeFilter === "ALL"
        ? true
        : activeFilter === "SETTLED"
        ? t.status === "settled"
        : activeFilter === "ESCROW"
        ? t.status === "in escrow" || t.status === "pending"
        : true;

    const matchesSearch =
      !searchQuery ||
      t.cropName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.txnId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.winnerName?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Calculate Metrics
  const settledTxns = transactions.filter((t) => t.status === "settled");
  const escrowTxns = transactions.filter((t) => t.status === "in escrow" || t.status === "pending");

  const totalSettledAmount = settledTxns.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const activeEscrowAmount = escrowTxns.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const totalProduceCost = transactions.reduce((sum, t) => sum + Number(t.produceAmount || (t.total_amount - 2500)), 0);
  const totalLogisticsCost = transactions.reduce((sum, t) => sum + Number(t.transportCost || 2500), 0);
  const totalQtyPurchased = transactions.reduce((sum, t) => sum + Number(t.quantity || 0), 0);

  const producePct = totalSettledAmount > 0 ? Math.round((totalProduceCost / (totalProduceCost + totalLogisticsCost)) * 100) : 85;
  const transportPct = 100 - producePct;

  if (loading) {
    return (
      <RetailerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            Syncing Retailer Escrow Ledger & Financial Node...
          </p>
        </div>
      </RetailerLayout>
    );
  }

  return (
    <RetailerLayout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg uppercase">
                RETAILER FISCAL TERMINAL
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" /> ESCROW SECURED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Settlements & Financial Ledger
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Track produce purchase settlements, transport logistics fees, active escrow buffers, and instant tax invoice receipts.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchPaymentsData}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-emerald-600" /> Refresh Ledger
            </button>
            <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
              <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none mb-1">
                  Retailer Liquidity Balance
                </p>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  ₹{(452000 - totalSettledAmount).toLocaleString()}.00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Total Settlement */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Settlement</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">₹{totalSettledAmount.toLocaleString()}</h3>
              <p className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> {settledTxns.length} Completed Settlements
              </p>
            </div>
          </div>

          {/* Card 2: Active Escrow Buffer */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Escrow</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">₹{activeEscrowAmount.toLocaleString()}</h3>
              <p className="text-xs font-semibold text-amber-700 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {escrowTxns.length} Orders Awaiting Receipt
              </p>
            </div>
          </div>

          {/* Card 3: Total Produce Sourced */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Produce Sourced</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">{totalQtyPurchased.toLocaleString()} kg</h3>
              <p className="text-xs font-semibold text-blue-700 mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> AI Quality Assured Produce
              </p>
            </div>
          </div>

          {/* Card 4: Transport Logistics Total */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Logistics & Transit</span>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">₹{totalLogisticsCost.toLocaleString()}</h3>
              <p className="text-xs font-semibold text-purple-700 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Cold-Chain ESP8266 Monitored
              </p>
            </div>
          </div>

        </div>

        {/* Visual Cost Allocation & Payment Breakdown Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visual Cost Allocation Progress */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Fiscal Breakdown (Produce vs Transport)</h3>
                <p className="text-xs text-slate-500 font-medium">Visualization of retailer capital distribution across farm produce purchases and cold-chain logistics.</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                Total: ₹{(totalProduceCost + totalLogisticsCost).toLocaleString()}
              </span>
            </div>

            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="h-6 w-full bg-slate-100 rounded-2xl overflow-hidden flex p-1 border border-slate-200">
                <div
                  style={{ width: `${producePct}%` }}
                  className="bg-emerald-600 h-full rounded-xl transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
                >
                  {producePct}% Produce
                </div>
                <div
                  style={{ width: `${transportPct}%` }}
                  className="bg-purple-600 h-full rounded-xl transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
                >
                  {transportPct}% Logistics
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-600 rounded-full" />
                    <span className="text-xs font-bold text-slate-700">Farm Produce Cost</span>
                  </div>
                  <p className="text-lg font-black text-emerald-950">₹{totalProduceCost.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-800 font-semibold">Direct payment to winning bidder / farmer</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-600 rounded-full" />
                    <span className="text-xs font-bold text-slate-700">Transport & Cold-Chain Logistics</span>
                  </div>
                  <p className="text-lg font-black text-purple-950">₹{totalLogisticsCost.toLocaleString()}</p>
                  <p className="text-[10px] text-purple-800 font-semibold">ESP8266 + DHT22 tracking & driver payout</p>
                </div>
              </div>
            </div>
          </div>

          {/* Protocol Security Card */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden border border-slate-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-md uppercase tracking-wider border border-emerald-500/30">
                  SMART ESCROW GUARANTEE
                </span>
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black text-white">Cryptographically Protected Escrow</h3>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Funds are held in AgriTrack Smart Escrow and released to the winning bidder only upon physical arrival and QR verification at your retailer hub.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2 backdrop-blur-sm">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Escrow Status:</span>
                <span className="text-emerald-400">ACTIVE & SECURED</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Ledger Height:</span>
                <span className="text-white font-mono">#98,241,102</span>
              </div>
            </div>
          </div>

        </div>

        {/* Transaction History Log Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Table Control Header */}
          <div className="p-6 sm:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Financial Transaction Ledger</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Complete history of retailer produce purchases, transport fee settlements, and invoices.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search crop, ID, bidder..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    activeFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setActiveFilter("SETTLED")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    activeFilter === "SETTLED" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Settled ({settledTxns.length})
                </button>
                <button
                  onClick={() => setActiveFilter("ESCROW")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    activeFilter === "ESCROW" ? "bg-white text-amber-700 shadow-sm" : "text-slate-600"
                  }`}
                >
                  Escrow ({escrowTxns.length})
                </button>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Transaction & ID</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Produce Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Counterparties</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Cost Breakdown</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Total Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxns.length > 0 ? (
                  filteredTxns.map((txn) => {
                    const isSettled = txn.status === "settled";
                    const isEscrow = txn.status === "in escrow" || txn.status === "pending";

                    return (
                      <tr key={txn.id || txn.txnId} className="hover:bg-slate-50/80 transition cursor-pointer">
                        
                        {/* Transaction ID & Date */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-slate-900 block font-mono">{txn.txnId || txn.id}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block">Order ID: {txn.order_id}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {new Date(txn.created_at).toLocaleDateString()} {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>

                        {/* Produce Details */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-slate-900">{txn.cropName}</h4>
                            <p className="text-[10px] text-slate-500 font-bold">
                              {txn.quantity} {txn.unit} @ ₹{txn.pricePerUnit || 30}/{txn.unit}
                            </p>
                          </div>
                        </td>

                        {/* Counterparties */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-xs font-medium">
                            <p className="text-slate-800">Bidder: <strong className="text-slate-900">{txn.winnerName || 'Amit Agro Services'}</strong></p>
                            <p className="text-slate-500 text-[10px]">Farmer: {txn.farmerName || 'Rajesh Kumar'}</p>
                          </div>
                        </td>

                        {/* Cost Breakdown */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 text-[10px] font-semibold text-slate-600">
                            <p>Base Produce: <strong className="text-slate-800">₹{(txn.baseProduceAmount || ((txn.pricePerUnit || 30) * (txn.quantity || 500))).toLocaleString()}</strong></p>
                            <p>Bidder Margin (+₹2/kg): <strong className="text-emerald-700">₹{(txn.bidderProfit || ((txn.quantity || 500) * 2)).toLocaleString()}</strong></p>
                            <p>Transport: <strong className="text-purple-700">₹{(txn.transportCost || 2500).toLocaleString()}</strong></p>
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-emerald-700">
                            ₹{Number(txn.total_amount || 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-semibold">{txn.payment_method || 'UPI / Escrow'}</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {isSettled ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 w-fit border border-emerald-300">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> SETTLED
                            </span>
                          ) : isEscrow ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 w-fit border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" /> IN ESCROW
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-900 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1 w-fit border border-blue-300">
                              <Truck className="w-3 h-3 text-blue-600" /> IN TRANSIT
                            </span>
                          )}
                        </td>

                        {/* Receipt Button */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSelectedReceipt(txn)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" /> Invoice
                          </button>
                        </td>

                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400 font-bold">
                      No retailer transaction records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* TAX INVOICE & RECEIPT POPUP MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-6 relative">
            
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase">
                  OFFICIAL TAX INVOICE & RECEIPT
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">AgriTrack Financial Settlement</h2>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Receipt Ref No:</span>
                <span className="font-black text-slate-900 font-mono">{selectedReceipt.id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Transaction Hash:</span>
                <span className="font-black text-slate-900 font-mono">{selectedReceipt.txnId}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Order / Transport ID:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.order_id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Date & Time:</span>
                <span className="font-bold text-slate-900">{new Date(selectedReceipt.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Itemized Breakdown Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Itemized Line Items</h4>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100 p-3 flex justify-between font-black text-slate-700">
                  <span>Description</span>
                  <span>Amount (₹)</span>
                </div>
                <div className="p-3 border-b border-slate-100 flex justify-between font-medium text-slate-800">
                  <span>{selectedReceipt.cropName} Base Produce Cost ({selectedReceipt.quantity} {selectedReceipt.unit} @ ₹{selectedReceipt.pricePerUnit || 30}/{selectedReceipt.unit})</span>
                  <span className="font-bold">₹{(selectedReceipt.baseProduceAmount || ((selectedReceipt.pricePerUnit || 30) * (selectedReceipt.quantity || 500))).toLocaleString()}</span>
                </div>
                <div className="p-3 border-b border-slate-100 flex justify-between font-medium text-emerald-900 bg-emerald-50/50">
                  <span className="font-bold">Bidder Profit Margin (+₹2/kg)</span>
                  <span className="font-bold text-emerald-700">₹{(selectedReceipt.bidderProfit || ((selectedReceipt.quantity || 500) * 2)).toLocaleString()}</span>
                </div>
                <div className="p-3 border-b border-slate-100 flex justify-between font-medium text-slate-800">
                  <span>Cold-Chain ESP8266 Logistics & Transport Fee</span>
                  <span className="font-bold text-purple-700">₹{(selectedReceipt.transportCost || 2500).toLocaleString()}</span>
                </div>
                <div className="p-3 bg-emerald-100/70 flex justify-between font-black text-slate-900 text-sm">
                  <span>Total Amount Paid (Produce + Transport)</span>
                  <span className="text-emerald-800">₹{Number(selectedReceipt.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Counterparty & Protocol Details */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-1 text-xs">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Winning Bidder:</span>
                <strong className="text-slate-900">{selectedReceipt.winnerName || 'Amit Agro Services'}</strong>
              </div>
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Farmer:</span>
                <strong className="text-slate-900">{selectedReceipt.farmerName || 'Rajesh Kumar'}</strong>
              </div>
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Settlement Method:</span>
                <strong className="text-emerald-800">{selectedReceipt.payment_method || 'UPI / Escrow Protocol'}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print / Save Tax Invoice
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl transition"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </RetailerLayout>
  );
}
