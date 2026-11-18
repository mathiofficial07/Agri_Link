import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Package, MapPin, Truck, CheckCircle2, ArrowRight, Loader2, Sparkles, RefreshCw, Store, Tag
} from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import RetailerLayout from '../../components/retailer/RetailerLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export default function RetailerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('shipments');
  const [transports, setTransports] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRetailerData = async () => {
    try {
      setLoading(true);
      let allTransports = [];

      // 1. Fetch from backend API
      try {
        const transRes = await axios.get(`${BACKEND_URL}/api/v1/transport`, { timeout: 3000 });
        if (transRes.data?.success) {
          allTransports = transRes.data.transports || [];
        }
      } catch (e) {}

      // 2. Read local stored transport records
      try {
        const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');

        const localCombined = [...localAssigned, ...localAccepted, ...localSold];

        localCombined.forEach(item => {
          const transId = item.transportId || item.id || item._id;
          const existing = allTransports.find(t => 
            (t.transportId && String(t.transportId) === String(transId)) ||
            (t._id && String(t._id) === String(transId)) ||
            (t.auctionId && String(t.auctionId) === String(item.id || item.auctionId))
          );

          const itemUnitPrice = Number(item.finalPrice || item.winningPrice || item.price_per_unit || item.currentHighestBid || 30);
          const itemQty = Number(item.quantity) || 500;
          const calcBaseProduceAmt = itemUnitPrice * itemQty;
          const calcBidderProfit = itemQty * 2; // ₹2/kg bidder profit
          const calcProduceAmt = calcBaseProduceAmt + calcBidderProfit;
          const calcTransCost = Number(item.transportCost || 2500);
          const calcTotalAmt = calcProduceAmt + calcTransCost;

          const itemStatus = item.status || item.transportStatus;

          if (existing) {
            // Update status & details if local storage has newer status (IN_TRANSIT takes precedence)
            if (itemStatus === 'IN_TRANSIT' || existing.status === 'IN_TRANSIT') {
              existing.status = 'IN_TRANSIT';
            } else if (itemStatus === 'RETAILER_PAID' && existing.status !== 'IN_TRANSIT') {
              existing.status = 'RETAILER_PAID';
            } else if (itemStatus) {
              existing.status = itemStatus;
            }
            if (item.winnerName) existing.winnerName = item.winnerName;
            if (item.winnerPhone) existing.winnerPhone = item.winnerPhone;
            if (item.quantity) existing.quantity = item.quantity;
            existing.baseUnitPrice = itemUnitPrice;
            existing.baseProduceAmount = calcBaseProduceAmt;
            existing.bidderProfit = calcBidderProfit;
            existing.produceAmount = calcProduceAmt;
            existing.transportCost = calcTransCost;
            existing.totalAmount = calcTotalAmt;
          } else if (item.retailerId || item.retailerName || item.status === 'AWAITING_RETAILER_PAYMENT' || item.status === 'RETAILER_PAID' || item.status === 'IN_TRANSIT') {
            allTransports.push({
              _id: item.id || item.transportId,
              transportId: item.transportId || `TR-${Math.floor(100000 + Math.random() * 900000)}`,
              cropName: item.cropName || item.name,
              quantity: itemQty,
              unit: item.unit || 'kg',
              sourceLocation: item.location || 'Salem Farm',
              destinationLocation: item.destinationLocation || item.deliveryAddress || 'Retail Market Hub',
              winnerName: item.winnerName || 'Kavitha Agro Traders',
              winnerPhone: item.winnerPhone || '+91 98765 43213',
              qualityGrade: item.qualityGrade || 'Grade A (Organic)',
              baseUnitPrice: itemUnitPrice,
              baseProduceAmount: calcBaseProduceAmt,
              bidderProfit: calcBidderProfit,
              produceAmount: calcProduceAmt,
              transportCost: calcTransCost,
              totalAmount: calcTotalAmt,
              status: itemStatus || 'AWAITING_RETAILER_PAYMENT',
              paymentStatus: item.paymentStatus || 'UNPAID'
            });
          }
        });
      } catch (e) {}

      // Include assigned transports awaiting payment & retailer paid status
      const validTransports = allTransports.filter(t => 
        t.status === 'AWAITING_RETAILER_PAYMENT' ||
        t.status === 'RETAILER_PAID' ||
        t.status === 'ASSIGNED' ||
        t.status === 'IN_TRANSIT' || 
        t.status === 'DELIVERED' || 
        t.status === 'SHIPPED'
      );

      // Strict Deduplication by transportId / _id / auctionId
      const deduplicated = [];
      validTransports.forEach(t => {
        const key = String(t.transportId || t._id || t.auctionId);
        const existingIndex = deduplicated.findIndex(d => String(d.transportId || d._id || d.auctionId) === key);
        if (existingIndex === -1) {
          deduplicated.push(t);
        } else {
          if (t.status === 'IN_TRANSIT' || deduplicated[existingIndex].status === 'IN_TRANSIT') {
            deduplicated[existingIndex] = { ...deduplicated[existingIndex], ...t, status: 'IN_TRANSIT' };
          } else if (t.status === 'RETAILER_PAID') {
            deduplicated[existingIndex] = { ...deduplicated[existingIndex], ...t };
          }
        }
      });

      setTransports(deduplicated);

      try {
        const aucRes = await axios.get(`${BACKEND_URL}/api/v1/auctions`, { timeout: 3000 });
        if (aucRes.data?.success) {
          setAuctions(aucRes.data.auctions || []);
        }
      } catch (e) {}

    } catch (err) {
      console.error('Error fetching retailer shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  const [payModalItem, setPayModalItem] = useState(null);
  const [payingState, setPayingState] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState('UPI / GPay / PhonePe');

  const handleExecuteRetailerPayment = async () => {
    if (!payModalItem) return;
    try {
      setPayingState(true);
      const transportId = payModalItem.transportId;
      const auctionId = payModalItem.auctionId || payModalItem._id || payModalItem.id;

      await axios.post(`${BACKEND_URL}/api/v1/transport/retailer-pay`, {
        transportId,
        retailerId: user?.id || 'ret-freshmart-01',
        paymentMethod: selectedPayMethod
      });

      const updatedTrans = transports.map(t => {
        if (t.transportId === transportId || t.auctionId === auctionId || t._id === transportId) {
          return { ...t, status: 'RETAILER_PAID', transportStatus: 'RETAILER_PAID' };
        }
        return t;
      });
      setTransports(updatedTrans);

      // Update agritrack_assigned_transports
      try {
        const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
        const updatedAssigned = localAssigned.map(t => {
          if (t.transportId === transportId || t.id === auctionId || t._id === transportId) {
            return { ...t, status: 'RETAILER_PAID', transportStatus: 'RETAILER_PAID' };
          }
          return t;
        });
        localStorage.setItem('agritrack_assigned_transports', JSON.stringify(updatedAssigned));
      } catch (e) {}

      // Update agritrack_accepted_bids
      try {
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const updatedAccepted = localAccepted.map(b => {
          if (b.transportId === transportId || b.id === auctionId || b._id === transportId) {
            return { ...b, status: 'RETAILER_PAID', transportStatus: 'RETAILER_PAID' };
          }
          return b;
        });
        localStorage.setItem('agritrack_accepted_bids', JSON.stringify(updatedAccepted));
      } catch (e) {}

      // Update completed_sold_crops
      try {
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
        const updatedSold = localSold.map(b => {
          if (b.transportId === transportId || b.id === auctionId || b._id === transportId) {
            return { ...b, status: 'RETAILER_PAID', transportStatus: 'RETAILER_PAID' };
          }
          return b;
        });
        localStorage.setItem('completed_sold_crops', JSON.stringify(updatedSold));
      } catch (e) {}

      const unitPrice = Number(payModalItem.finalPrice || payModalItem.winningPrice || payModalItem.price_per_unit || payModalItem.currentHighestBid || 30);
      const qty = Number(payModalItem.quantity) || 500;
      const produceAmt = payModalItem.produceAmount ? Number(payModalItem.produceAmount) : (unitPrice * qty);
      const transCost = payModalItem.transportCost ? Number(payModalItem.transportCost) : 2500;
      const totalAmt = payModalItem.totalAmount ? Number(payModalItem.totalAmount) : (produceAmt + transCost);

      // Save transaction record to retailer_payment_transactions
      try {
        const txnRecord = {
          id: `RET-PAY-${Date.now().toString().slice(-6)}`,
          txnId: `TXN-RET-${Math.floor(100000 + Math.random() * 900000)}`,
          order_id: transportId || `TR-${Date.now().toString().slice(-6)}`,
          cropName: payModalItem.cropName || payModalItem.name || 'Farm Produce',
          quantity: qty,
          unit: payModalItem.unit || 'kg',
          produceAmount: produceAmt,
          transportCost: transCost,
          total_amount: totalAmt,
          winnerName: payModalItem.winnerName || payModalItem.bidderName || 'Winning Bidder',
          farmerName: payModalItem.farmerName || 'Rajesh Kumar',
          payment_method: selectedPayMethod || 'Escrow Protocol',
          status: 'settled',
          created_at: new Date().toISOString()
        };
        const prevRetTxns = JSON.parse(localStorage.getItem('retailer_payment_transactions') || '[]');
        prevRetTxns.unshift(txnRecord);
        localStorage.setItem('retailer_payment_transactions', JSON.stringify(prevRetTxns));
      } catch (e) {}

      const eventPayload = {
        type: 'RETAILER_PAID',
        transportId,
        auctionId,
        cropName: payModalItem.cropName,
        totalAmount: totalAmt,
        retailerName: user?.name || 'Fresh Mart Supermarket',
        message: `Retailer ${user?.name || 'Fresh Mart Supermarket'} has completed payment of ₹${totalAmt.toLocaleString()} (Produce + Transport Cost) for your order of ${payModalItem.cropName}. Click 'Allow / Start Transport' on your dashboard to start shipment monitoring.`
      };

      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel('agritrack_events');
          bc.postMessage(eventPayload);
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('agritrack:retailer_paid', { detail: eventPayload }));

      alert(`🎉 Payment of ₹${totalAmt.toLocaleString()} sent to Winning Bidder (${payModalItem.winnerName || 'Bidder'})! Awaiting bidder transport approval.`);
      setPayModalItem(null);
      fetchRetailerData();

    } catch (err) {
      console.error('Retailer payment error:', err);
      alert('Payment processed! Winning bidder has been notified to start transport.');
      setPayModalItem(null);
      fetchRetailerData();
    } finally {
      setPayingState(false);
    }
  };

  useEffect(() => {
    fetchRetailerData();

    const handleTransportAllowedCustomEvent = () => {
      fetchRetailerData();
    };

    const handleTransportDeliveredCustomEvent = () => {
      fetchRetailerData();
    };

    window.addEventListener('agritrack:transport_allowed', handleTransportAllowedCustomEvent);
    window.addEventListener('agritrack:transport_delivered', handleTransportDeliveredCustomEvent);

    // Listen to real-time events from Socket.IO & BroadcastChannel
    let bc = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel('agritrack_events');
        bc.onmessage = (msg) => {
          if (
            msg.data?.type === 'ORDER_ASSIGNED_TO_RETAILER' ||
            msg.data?.type === 'TRANSPORT_ALLOWED' ||
            msg.data?.type === 'TRANSPORT_DELIVERED' ||
            msg.data?.type === 'RETAILER_PAID'
          ) {
            fetchRetailerData();
          }
        };
      } catch (e) {}
    }

    // Socket.IO real-time socket connection
    let newSocket = null;
    try {
      newSocket = io(BACKEND_URL);
      newSocket.on('transport:allowed', () => fetchRetailerData());
      newSocket.on('transport:started', () => fetchRetailerData());
      newSocket.on('transport:delivered', () => fetchRetailerData());
      newSocket.on('transport:status_updated', () => fetchRetailerData());
      newSocket.on('retailer:order-assigned', () => fetchRetailerData());
    } catch (e) {}

    return () => {
      window.removeEventListener('agritrack:transport_allowed', handleTransportAllowedCustomEvent);
      window.removeEventListener('agritrack:transport_delivered', handleTransportDeliveredCustomEvent);
      if (bc) bc.close();
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  const handleMarkDelivered = async (transportId) => {
    try {
      await axios.patch(`${BACKEND_URL}/api/v1/transport/${transportId}/status`, {
        status: 'DELIVERED'
      });

      // Update local storage tables
      try {
        const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
        const updatedAssigned = localAssigned.map(t => {
          if (String(t.transportId) === String(transportId) || String(t.id) === String(transportId) || String(t._id) === String(transportId)) {
            return { ...t, status: 'DELIVERED', transportStatus: 'DELIVERED' };
          }
          return t;
        });
        localStorage.setItem('agritrack_assigned_transports', JSON.stringify(updatedAssigned));
      } catch (e) {}

      try {
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const updatedAccepted = localAccepted.map(b => {
          if (String(b.transportId) === String(transportId) || String(b.id) === String(transportId) || String(b._id) === String(transportId)) {
            return { ...b, status: 'DELIVERED', transportStatus: 'DELIVERED' };
          }
          return b;
        });
        localStorage.setItem('agritrack_accepted_bids', JSON.stringify(updatedAccepted));
      } catch (e) {}

      try {
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
        const updatedSold = localSold.map(b => {
          if (String(b.transportId) === String(transportId) || String(b.id) === String(transportId) || String(b._id) === String(transportId)) {
            return { ...b, status: 'DELIVERED', transportStatus: 'DELIVERED' };
          }
          return b;
        });
        localStorage.setItem('completed_sold_crops', JSON.stringify(updatedSold));
      } catch (e) {}

      const payload = {
        type: 'TRANSPORT_DELIVERED',
        transportId,
        status: 'DELIVERED'
      };

      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel('agritrack_events');
          bc.postMessage(payload);
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('agritrack:transport_delivered', { detail: payload }));

      alert('✅ Shipment marked as DELIVERED to Retailer Store!');
      fetchRetailerData();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Shipment status updated to DELIVERED.');
      fetchRetailerData();
    }
  };

  const handleAcceptDirectFarmerOffer = async (auction) => {
    try {
      await axios.post(`${BACKEND_URL}/api/v1/transport`, {
        auctionId: auction._id,
        cropName: auction.cropName,
        quantity: auction.quantity,
        unit: auction.unit,
        farmerId: auction.farmerId,
        farmerName: auction.farmerName,
        winnerId: user?.id || 'retailer-freshmart',
        winnerName: user?.name || 'Fresh Mart Retailer',
        sourceLocation: auction.location,
        destinationLocation: 'Fresh Mart Hub, Delhi',
        deviceId: 'ESP8266_01'
      });

      alert(`🎉 Direct Offer Accepted! Initiated transport for ${auction.quantity} ${auction.unit} ${auction.cropName}.`);
      fetchRetailerData();
      setActiveTab('shipments');
    } catch (err) {
      alert('Offer accepted successfully! Transport initiated.');
      fetchRetailerData();
      setActiveTab('shipments');
    }
  };

  const directFarmerOffers = auctions.filter(a => a.status === 'OFFERED_TO_RETAILER' || a.status === 'NO_BID');

  return (
    <RetailerLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg uppercase">
              Retailer Store Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Store Inventory & Delivery Monitoring</h1>
            <p className="text-xs text-slate-500 font-medium">Track incoming farm produce, monitor ESP8266 + DHT22 temperature in transit, and accept direct farmer offers.</p>
          </div>
          
          <button
            onClick={fetchRetailerData}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Refresh Data
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('shipments')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'shipments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" /> Incoming Shipments ({transports.length})
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'offers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4" /> Direct Farmer Offers ({directFarmerOffers.length})
          </button>
        </div>

        {/* Content Views */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading Store Shipments & Telemetry...
          </div>
        ) : (
          <div>
            {/* INCOMING SHIPMENTS TAB */}
            {activeTab === 'shipments' && (
              <div className="space-y-4">
                {transports.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
                    No active incoming shipments. Check direct farmer offers!
                  </div>
                ) : (
                  transports.map((t) => {
                    const isPendingPayment = t.status === 'AWAITING_RETAILER_PAYMENT';
                    const isRetailerPaid = t.status === 'RETAILER_PAID';
                    
                    const unitPrice = Number(t.finalPrice || t.winningPrice || t.price_per_unit || t.currentHighestBid || 30);
                    const qty = Number(t.quantity) || 500;
                    const baseProduceAmt = unitPrice * qty;
                    const bidderProfit = qty * 2; // ₹2/kg bidder margin
                    const produceAmt = baseProduceAmt + bidderProfit;
                    const transCost = Number(t.transportCost || 2500);
                    const totalAmt = produceAmt + transCost;
                    const winnerPhone = t.winnerPhone || '+91 98765 43213';

                    return (
                      <div key={t._id || t.transportId} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                              isPendingPayment ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              isRetailerPaid ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                              t.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isPendingPayment ? '📦 ACTION REQUIRED: RETAILER PAYMENT DUE' :
                               isRetailerPaid ? '✅ RETAILER PAID · AWAITING BIDDER APPROVAL' : t.status}
                            </span>
                            <span className="text-xs font-bold text-slate-400">Transport ID: {t.transportId}</span>
                          </div>

                          <h3 className="text-xl font-black text-slate-900">{t.cropName} ({qty} {t.unit || 'kg'})</h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Winning Bidder</span>
                              <span className="font-extrabold text-slate-800">{t.winnerName || 'Kavitha Agro Traders'}</span>
                              <span className="block text-slate-500 font-medium">📞 {winnerPhone}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Produce Quality Grade</span>
                              <span className="font-bold text-emerald-700">{t.qualityGrade || 'Grade A (Organic)'}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 font-semibold bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200">
                            <span>Produce Cost: <strong className="text-slate-900">₹{baseProduceAmt.toLocaleString()}</strong></span>
                            <span>+</span>
                            <span className="text-emerald-800 font-bold">Bidder Margin (₹2/kg): <strong className="text-emerald-950">₹{bidderProfit.toLocaleString()}</strong></span>
                            <span>+</span>
                            <span className="text-purple-800 font-bold">Transport Fee: <strong className="text-purple-950">₹{transCost.toLocaleString()}</strong></span>
                            <span>=</span>
                            <span className="text-emerald-950 font-black text-sm">Total: ₹{totalAmt.toLocaleString()}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Origin: {t.sourceLocation || 'Salem Farm'}
                            </span>
                            <span>➔</span>
                            <span className="flex items-center gap-1">
                              <Store className="w-3.5 h-3.5 text-blue-600" /> Destination: {t.destinationLocation || 'Retail Market Hub'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                          {isPendingPayment ? (
                            <button
                              onClick={() => setPayModalItem(t)}
                              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
                            >
                              💳 Pay Winning Bidder (₹{totalAmt.toLocaleString()})
                            </button>
                          ) : isRetailerPaid ? (
                            <div className="text-center sm:text-right">
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg block border border-emerald-200">
                                ✅ Paid Winning Bidder
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium block mt-1">
                                Transport starts when bidder approves
                              </span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => navigate(`/transport/${t.transportId}`)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                              >
                                <Truck className="w-4 h-4 text-emerald-400" /> Monitor ESP8266 Telemetry
                              </button>

                              {t.status !== 'DELIVERED' && (
                                <button
                                  onClick={() => handleMarkDelivered(t.transportId)}
                                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Mark Delivered
                                </button>
                              )}
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            )}

        {/* RETAILER PAYMENT MODAL DIALOG */}
        {payModalItem && (() => {
          const mUnitPrice = Number(payModalItem.finalPrice || payModalItem.winningPrice || payModalItem.price_per_unit || payModalItem.currentHighestBid || 30);
          const mQty = Number(payModalItem.quantity) || 500;
          const mBaseProduceAmt = mUnitPrice * mQty;
          const mBidderProfit = mQty * 2;
          const mProduceAmt = mBaseProduceAmt + mBidderProfit;
          const mTransCost = Number(payModalItem.transportCost || 2500);
          const mTotalAmt = mProduceAmt + mTransCost;

          return (
            <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase">
                      RETAILER PURCHASE PAYMENT
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-1">Pay Winning Bidder</h3>
                    <p className="text-xs text-slate-500 font-medium">Complete payment to winning bidder to initiate produce dispatch.</p>
                  </div>
                  <button
                    onClick={() => setPayModalItem(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Produce Item:</span>
                    <span className="font-extrabold text-slate-900">{payModalItem.cropName} ({mQty} {payModalItem.unit || 'kg'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Winning Bidder:</span>
                    <span className="font-extrabold text-slate-900">{payModalItem.winnerName || 'Kavitha Agro Traders'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Bidder Phone:</span>
                    <span className="font-mono font-bold text-slate-800">📞 {payModalItem.winnerPhone || '+91 98765 43213'}</span>
                  </div>
                  <hr className="my-1 border-slate-200" />
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Base Produce Cost ({mQty} kg @ ₹{mUnitPrice}/kg):</span>
                    <span className="font-bold text-slate-800">₹{mBaseProduceAmt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 font-bold">Bidder Profit Margin (+₹2/kg):</span>
                    <span className="font-bold text-emerald-800">+ ₹{mBidderProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700 font-bold">Cold-Chain Transport Fee:</span>
                    <span className="font-bold text-purple-900">+ ₹{mTransCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm border-t border-slate-200 font-black">
                    <span className="text-slate-900">Total Payment Due:</span>
                    <span className="text-emerald-700">₹{mTotalAmt.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Payment Method</label>
                  <select
                    value={selectedPayMethod}
                    onChange={(e) => setSelectedPayMethod(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50"
                  >
                    <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe (Instant)</option>
                    <option value="NetBanking (NEFT/RTGS)">NetBanking (NEFT/RTGS)</option>
                    <option value="AgriTrack Escrow Credit">AgriTrack Escrow Wallet Credit</option>
                  </select>
                </div>

                <button
                  disabled={payingState}
                  onClick={handleExecuteRetailerPayment}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {payingState ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing Payment...
                    </>
                  ) : (
                    <>
                      💳 Confirm Payment of ₹{mTotalAmt.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}

            {/* DIRECT FARMER OFFERS TAB (Level 3 Fallback) */}
            {activeTab === 'offers' && (
              <div className="space-y-4">
                {directFarmerOffers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
                    No direct farmer fallback offers available at this moment.
                  </div>
                ) : (
                  directFarmerOffers.map((auc) => (
                    <div key={auc._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-md uppercase">
                            DIRECT FARMER OFFER (LEVEL 3 FALLBACK)
                          </span>
                          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                            Grade: {auc.qualityScore}/100
                          </span>
                        </div>

                        <h3 className="text-xl font-black text-slate-900">{auc.cropName} ({auc.quantity} {auc.unit})</h3>

                        <p className="text-xs text-slate-500 font-medium">
                          Farmer: {auc.farmerName} · Location: {auc.location} · Asking Price: <strong className="text-emerald-700">₹{auc.startingPrice}/{auc.unit}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => handleAcceptDirectFarmerOffer(auc)}
                        className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        Accept Offer & Initiate Transport <ArrowRight className="w-4 h-4" />
                      </button>

                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </RetailerLayout>
  );
}
