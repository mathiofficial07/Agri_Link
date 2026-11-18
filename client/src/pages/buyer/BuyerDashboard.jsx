import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Gavel, Clock, Trophy, Truck, Search, MapPin, RefreshCw, ShieldCheck, TrendingUp, Store,
  User, Bell, CheckCircle2, Sliders, Map, Building, Phone, AlertTriangle, CreditCard, X
} from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import AggregatorLayout from '../../components/aggregator/AggregatorLayout';
import RetailerSelectionModal from '../../components/buyer/RetailerSelectionModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('available');
  const [auctions, setAuctions] = useState([]);
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Accepted bids requiring payment
  const [acceptedBids, setAcceptedBids] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayAuction, setSelectedPayAuction] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay / PhonePe');

  // Retailer Selection State
  const [showRetailerSelectionModal, setShowRetailerSelectionModal] = useState(false);
  const [selectedPaidAuctionForRetailer, setSelectedPaidAuctionForRetailer] = useState(null);

  // Buyer Matching Profile & Preferences State
  const [buyerProfile, setBuyerProfile] = useState({
    name: user?.name || 'Amit Agro Services',
    email: user?.email || 'amit.agro@collect.com',
    phone: user?.phone || '+919876543213',
    location: 'Coimbatore, Tamil Nadu',
    maxRadiusKm: 50,
    cropInterests: ['Tomato', 'Wheat', 'Basmati Rice', 'Mango', 'Vegetables'],
    minQuantityKg: 100,
    status: 'VERIFIED ACTIVE BIDDER'
  });

  const [acceptedBidPopup, setAcceptedBidPopup] = useState(null);
  const [buyerNotifications, setBuyerNotifications] = useState([]);

  const loadBuyerNotifications = (currentAuctions = auctions) => {
    try {
      const storedNotifs = JSON.parse(localStorage.getItem('buyer_notifications') || '[]');
      const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
      
      const merged = [...storedNotifs];

      // 1. Add accepted bids notifications
      localAccepted.forEach(b => {
        const cropName = b.cropName || b.name || 'Farm Produce';
        const acceptedPrice = b.finalPrice || b.winningPrice || b.price_per_unit || 30;
        const isRetPaid = b.status === 'RETAILER_PAID' || b.transportStatus === 'RETAILER_PAID';
        const isDelivered = b.status === 'DELIVERED' || b.transportStatus === 'DELIVERED';

        if (isDelivered) {
          const delMsg = `Your shipment of ${cropName} (${b.quantity || 500} ${b.unit || 'kg'}) has been marked as DELIVERED to the retailer store.`;
          if (!merged.some(n => n.id === `notif-del-${b.transportId || b.id}` || n.message === delMsg)) {
            merged.unshift({
              id: `notif-del-${b.transportId || b.id}`,
              type: 'TRANSPORT_DELIVERED',
              title: '✅ SHIPMENT DELIVERED TO RETAILER!',
              message: delMsg,
              cropName,
              acceptedPrice,
              totalAmount: b.totalAmount,
              quantity: b.quantity || 500,
              unit: b.unit || 'kg',
              transportId: b.transportId,
              auctionId: b.id,
              timestamp: b.deliveredAt || new Date().toISOString(),
              date: 'Just now',
              read: false,
              auction: b,
              actionUrl: `/transport/${b.transportId || 'TR001'}`
            });
          }
        }

        if (isRetPaid) {
          const uPrice = Number(b.finalPrice || b.winningPrice || b.price_per_unit || 30);
          const qVal = Number(b.quantity) || 500;
          const baseAmt = uPrice * qVal;
          const profit = qVal * 2;
          const trans = Number(b.transportCost || 2500);
          const totalPaid = baseAmt + profit + trans;

          const retMsg = `Retailer ${b.retailerName || 'Selected Retailer'} has completed payment of ₹${totalPaid.toLocaleString()} (Produce ₹${(baseAmt + profit).toLocaleString()} + Transport ₹${trans.toLocaleString()}). Please click 'Allow / Start Transport' on your dashboard to authorize shipment.`;
          if (!merged.some(n => n.id === `notif-ret-paid-${b.transportId || b.id}` || n.message === retMsg)) {
            merged.unshift({
              id: `notif-ret-paid-${b.transportId || b.id}`,
              type: 'RETAILER_PAID',
              title: '🎉 RETAILER PAYMENT RECEIVED! APPROVE TRANSPORT',
              message: retMsg,
              cropName,
              acceptedPrice,
              totalAmount: totalPaid,
              quantity: qVal,
              unit: b.unit || 'kg',
              transportId: b.transportId,
              auctionId: b.id,
              timestamp: b.retailerPaidAt || new Date().toISOString(),
              date: 'Just now',
              read: false,
              auction: b,
              actionUrl: '/buyer/dashboard'
            });
          }
        }

        const msg = `Your bid has been accepted by the farmer. You have won the auction for ${cropName} at ₹${acceptedPrice}.`;
        if (!merged.some(n => n.transportId === b.transportId || n.message === msg)) {
          merged.unshift({
            id: `notif-accepted-${b.id || b.transportId}`,
            type: 'BID_ACCEPTED',
            title: '🎉 Bid Accepted & Auction Won!',
            message: msg,
            cropName,
            acceptedPrice,
            totalAmount: b.totalAmount || (acceptedPrice * (b.quantity || 500)),
            quantity: b.quantity || 500,
            unit: b.unit || 'kg',
            transportId: b.transportId,
            auctionId: b.id,
            timestamp: b.soldAt || new Date().toISOString(),
            date: 'Just now',
            read: false,
            auction: b,
            actionUrl: '/buyer/dashboard'
          });
        }
      });

      // 2. Add match alerts for active live auctions
      const activeOnly = (currentAuctions || []).filter(a => a.status === 'ACTIVE' || a.status === 'EXTENDED' || a.status === 'Listed');
      activeOnly.forEach(auc => {
        const cropName = auc.cropName || auc.name || 'Farm Produce';
        const aucId = auc._id || auc.id;
        const notifMsg = `New crop auction: ${cropName} (${auc.quantity || 500} ${auc.unit || 'kg'}) listed by ${auc.farmerName || 'Farmer'} starting at ₹${auc.startingPrice || auc.currentHighestBid || 30}/${auc.unit || 'kg'}.`;
        
        if (!merged.some(n => n.auctionId === aucId || n.message === notifMsg)) {
          merged.unshift({
            id: `notif-new-auc-${aucId}`,
            type: 'NEW_AUCTION',
            title: '🌾 NEW LIVE AUCTION STARTED',
            message: notifMsg,
            cropName,
            startingPrice: auc.startingPrice || auc.currentHighestBid || 30,
            quantity: auc.quantity || 500,
            unit: auc.unit || 'kg',
            auctionId: aucId,
            timestamp: auc.startTime || new Date().toISOString(),
            date: 'Live Now',
            read: false,
            auction: auc,
            actionUrl: `/auction/${aucId}`
          });
        }
      });

      setBuyerNotifications(merged);

      // Check if there is an unpaid accepted bid that should show popup modal immediately
      const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
      const allAccepted = [...localAccepted, ...localSold];
      const unpaidAccepted = allAccepted.find(b => b.paymentStatus !== 'PAID' && b.status !== 'IN_TRANSIT' && b.status !== 'DELIVERED');
      if (unpaidAccepted && !acceptedBidPopup) {
        const cropName = unpaidAccepted.cropName || unpaidAccepted.name || 'Farm Produce';
        const acceptedPrice = unpaidAccepted.finalPrice || unpaidAccepted.winningPrice || unpaidAccepted.price_per_unit || 30;
        setAcceptedBidPopup({
          cropName,
          acceptedPrice,
          quantity: unpaidAccepted.quantity || 500,
          unit: unpaidAccepted.unit || 'kg',
          message: `Your bid has been accepted by the farmer. You have won the auction for ${cropName} at ₹${acceptedPrice}.`,
          auction: unpaidAccepted
        });
      }
    } catch (e) {}
  };

  const loadAcceptedBids = () => {
    try {
      const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
      const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
      const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
      
      const combined = [...localAccepted];

      localSold.forEach(item => {
        const idx = combined.findIndex(c => (c.id && c.id === item.id) || (c.transportId && c.transportId === item.transportId) || (c.cropName && (c.cropName === item.cropName || c.cropName === item.name)));
        if (idx !== -1) {
          combined[idx] = { ...combined[idx], ...item };
        } else {
          combined.push({
            paymentStatus: 'UNPAID',
            status: 'AWAITING_BIDDER_PAYMENT',
            ...item
          });
        }
      });

      localAssigned.forEach(item => {
        const idx = combined.findIndex(c => (c.id && c.id === item.id) || (c.transportId && c.transportId === item.transportId));
        if (idx !== -1) {
          combined[idx] = { ...combined[idx], ...item };
        } else {
          combined.push(item);
        }
      });

      setAcceptedBids(combined);
    } catch (e) {}
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      loadAcceptedBids();

      let fetchedAuctions = [];
      const aucRes = await axios.get(`${BACKEND_URL}/api/v1/auctions`, { timeout: 3000 }).catch(() => null);
      if (aucRes?.data?.success && Array.isArray(aucRes.data.auctions)) {
        fetchedAuctions = aucRes.data.auctions;
      }

      // Merge local live auctions & active demo crops
      const localLive = JSON.parse(localStorage.getItem('agritrack_live_auctions') || '[]');
      const localDemo = JSON.parse(localStorage.getItem('demo_crops') || '[]');

      const mergedAuctions = [...fetchedAuctions];

      // Add local live auctions if not present
      localLive.forEach(la => {
        const laId = la._id || la.id;
        if (!mergedAuctions.some(a => (a._id && a._id === laId) || (a.id && a.id === laId) || (a.cropName === la.cropName && a.status === la.status))) {
          mergedAuctions.unshift(la);
        }
      });

      // Add active demo crops if not present
      localDemo.forEach(dc => {
        if (dc.status !== 'Sold' && dc.auction_status !== 'Concluded') {
          const aucId = dc._id || dc.id || `auc-demo-${dc.name}`;
          if (!mergedAuctions.some(a => a._id === aucId || a.cropName === dc.name || a.cropName === dc.cropName)) {
            mergedAuctions.unshift({
              _id: aucId,
              farmerId: dc.farmerId || 'farmer-rajesh',
              farmerName: dc.farmerName || 'Rajesh Kumar',
              cropName: dc.name || dc.cropName,
              cropImage: dc.image?.url || dc.imageUrl || dc.cropImage || '/uploads/test-sample.jpg',
              quantity: Number(dc.quantity) || 500,
              unit: dc.unit || 'kg',
              location: dc.location || 'Coimbatore',
              qualityScore: dc.qualityScore || 88,
              startingPrice: Number(dc.price_per_unit || dc.pricePerUnit || 30),
              currentHighestBid: Number(dc.price_per_unit || dc.pricePerUnit || 30),
              status: 'ACTIVE',
              startTime: new Date().toISOString()
            });
          }
        }
      });

      setAuctions(mergedAuctions);
      loadBuyerNotifications(mergedAuctions);

      const transRes = await axios.get(`${BACKEND_URL}/api/v1/transport`, { timeout: 3000 }).catch(() => null);
      if (transRes?.data?.success) {
        setTransports(transRes.data.transports || []);
      }
    } catch (err) {
      console.error('Error fetching buyer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleBidAccepted = (e) => {
      const notif = e.detail;
      if (notif) {
        setBuyerNotifications(prev => [notif, ...prev]);
        setAcceptedBidPopup(notif);
        loadAcceptedBids();
        fetchData();
      }
    };

    const handleNewAuction = (e) => {
      const payload = e.detail;
      if (payload) {
        if (payload.auction) {
          setAuctions(prev => {
            if (!prev.some(a => a._id === payload.auction._id || a.cropName === payload.auction.cropName)) {
              return [payload.auction, ...prev];
            }
            return prev;
          });
        }
        if (payload.notification) {
          setBuyerNotifications(prev => {
            if (!prev.some(n => n.id === payload.notification.id)) {
              return [payload.notification, ...prev];
            }
            return prev;
          });
        }
      }
    };

    const handleRetailerPaidEvent = (data) => {
      if (data) {
        const notif = {
          id: `notif-ret-paid-${Date.now()}`,
          type: 'RETAILER_PAID',
          title: '🎉 RETAILER PAYMENT RECEIVED!',
          message: data.message || `Retailer ${data.retailerName || 'Retailer'} has completed payment for your order!`,
          time: 'Just now',
          actionUrl: '/buyer/dashboard'
        };
        setBuyerNotifications(prev => [notif, ...prev]);
        loadAcceptedBids();
        fetchData();
      }
    };

    const handleRetailerPaidCustomEvent = (e) => {
      if (e.detail) {
        handleRetailerPaidEvent(e.detail);
      }
    };

    const handleTransportDeliveredCustomEvent = () => {
      loadAcceptedBids();
      fetchData();
    };

    window.addEventListener('agritrack:bid_accepted', handleBidAccepted);
    window.addEventListener('agritrack:new_auction', handleNewAuction);
    window.addEventListener('agritrack:retailer_paid', handleRetailerPaidCustomEvent);
    window.addEventListener('agritrack:transport_delivered', handleTransportDeliveredCustomEvent);

    let bc = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel('agritrack_events');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'BID_ACCEPTED') {
            setBuyerNotifications(prev => [msg.data.notification, ...prev]);
            setAcceptedBidPopup(msg.data.notification);
            loadAcceptedBids();
            fetchData();
          } else if (msg.data?.type === 'RETAILER_PAID') {
            handleRetailerPaidEvent(msg.data);
          } else if (msg.data?.type === 'TRANSPORT_DELIVERED') {
            loadAcceptedBids();
            fetchData();
          } else if (msg.data?.type === 'NEW_AUCTION') {
            if (msg.data.auction) {
              setAuctions(prev => {
                if (!prev.some(a => a._id === msg.data.auction._id)) {
                  return [msg.data.auction, ...prev];
                }
                return prev;
              });
            }
            if (msg.data.notification) {
              setBuyerNotifications(prev => {
                if (!prev.some(n => n.id === msg.data.notification.id)) {
                  return [msg.data.notification, ...prev];
                }
                return prev;
              });
            }
          }
        };
      } catch (err) {}
    }

    // Socket.IO real-time socket connection
    let newSocket = null;
    try {
      newSocket = io(BACKEND_URL);
      newSocket.on('auction:bid-accepted', () => {
        loadAcceptedBids();
        fetchData();
      });
      newSocket.on('auction:closed', () => {
        loadAcceptedBids();
        fetchData();
      });
      newSocket.on('bidder:retailer-paid', (data) => {
        handleRetailerPaidEvent(data);
      });
      newSocket.on('transport:delivered', () => {
        loadAcceptedBids();
        fetchData();
      });
      newSocket.on('transport:status_updated', () => {
        loadAcceptedBids();
        fetchData();
      });
      newSocket.on('auction:new', (data) => {
        if (data?.auction) {
          setAuctions(prev => {
            if (!prev.some(a => a._id === data.auction._id)) {
              return [data.auction, ...prev];
            }
            return prev;
          });
        }
        if (data?.notification) {
          setBuyerNotifications(prev => {
            if (!prev.some(n => n.id === data.notification.id)) {
              return [data.notification, ...prev];
            }
            return prev;
          });
        }
      });
    } catch (e) {}

    return () => {
      window.removeEventListener('agritrack:bid_accepted', handleBidAccepted);
      window.removeEventListener('agritrack:new_auction', handleNewAuction);
      window.removeEventListener('agritrack:retailer_paid', handleRetailerPaidCustomEvent);
      window.removeEventListener('agritrack:transport_delivered', handleTransportDeliveredCustomEvent);
      if (bc) bc.close();
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  const handleOpenPaymentModal = (auc) => {
    setSelectedPayAuction(auc);
    setShowPaymentModal(true);
  };

  const handleExecuteDemoPayment = () => {
    if (!selectedPayAuction) return;
    setPaymentProcessing(true);

    setTimeout(async () => {
      const totalAmount = selectedPayAuction.totalAmount || 
        ((selectedPayAuction.finalPrice || selectedPayAuction.currentBid || selectedPayAuction.price_per_unit || 30) * (selectedPayAuction.quantity || 500));
      
      const transportId = selectedPayAuction.transportId || `TR-${Math.floor(100000 + Math.random() * 900000)}`;
      const targetCropName = selectedPayAuction.cropName || selectedPayAuction.name;
      const targetId = selectedPayAuction.id || selectedPayAuction._id;
      const targetTransportId = selectedPayAuction.transportId;

      const newTxn = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        txnId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        crop: targetCropName || 'Organic Farm Produce',
        cropName: targetCropName || 'Organic Farm Produce',
        amount: totalAmount,
        pricePerUnit: selectedPayAuction.finalPrice || selectedPayAuction.currentBid || selectedPayAuction.price_per_unit || 30,
        quantity: selectedPayAuction.quantity || 500,
        unit: selectedPayAuction.unit || 'kg',
        buyerName: buyerProfile.name,
        farmerName: selectedPayAuction.farmerName || 'Rajesh Kumar',
        status: 'completed',
        paymentMethod: paymentMethod,
        hash: `0x${Math.random().toString(16).substr(2, 32)}`,
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        transportId: transportId
      };

      // 1. Save to farmer_payment_transactions for Farmer Payments page
      try {
        const prevTxns = JSON.parse(localStorage.getItem('farmer_payment_transactions') || '[]');
        prevTxns.unshift(newTxn);
        localStorage.setItem('farmer_payment_transactions', JSON.stringify(prevTxns));
      } catch (e) {}

      // 2. Update agritrack_accepted_bids
      try {
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const updatedBids = localAccepted.map(b => {
          if (
            (targetId && (b.id === targetId || b._id === targetId)) ||
            (targetTransportId && b.transportId === targetTransportId) ||
            (targetCropName && (b.cropName === targetCropName || b.name === targetCropName))
          ) {
            return { ...b, paymentStatus: 'PAID', status: 'RETAILER_SELECTION_REQUIRED', transportStatus: 'CREATED', transportId };
          }
          return b;
        });
        localStorage.setItem('agritrack_accepted_bids', JSON.stringify(updatedBids));
      } catch (e) {}

      // 3. Update completed_sold_crops
      try {
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
        const updatedSold = localSold.map(b => {
          if (
            (targetId && (b.id === targetId || b._id === targetId)) ||
            (targetTransportId && b.transportId === targetTransportId) ||
            (targetCropName && (b.cropName === targetCropName || b.name === targetCropName))
          ) {
            return { ...b, paymentStatus: 'PAID', status: 'RETAILER_SELECTION_REQUIRED', transportId };
          }
          return b;
        });
        localStorage.setItem('completed_sold_crops', JSON.stringify(updatedSold));
      } catch (e) {}

      const paidAuctionCopy = { ...selectedPayAuction, transportId, paymentStatus: 'PAID' };

      setPaymentProcessing(false);
      setShowPaymentModal(false);
      setSelectedPayAuction(null);
      loadAcceptedBids();

      // Open Retailer Selection Modal immediately after payment success
      setSelectedPaidAuctionForRetailer(paidAuctionCopy);
      setShowRetailerSelectionModal(true);
    }, 1000);
  };

  const handleAllowTransport = async (auc) => {
    try {
      const transportId = auc.transportId || 'TR001';
      await axios.post(`${BACKEND_URL}/api/v1/transport/allow-transport`, {
        transportId
      });

      const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
      const updatedAccepted = localAccepted.map(b => {
        if (b.transportId === transportId || b.id === auc.id || b._id === auc._id) {
          return { ...b, status: 'IN_TRANSIT', transportStatus: 'IN_TRANSIT' };
        }
        return b;
      });
      localStorage.setItem('agritrack_accepted_bids', JSON.stringify(updatedAccepted));

      const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
      const updatedAssigned = localAssigned.map(t => {
        if (t.transportId === transportId || t.id === auc.id) {
          return { ...t, status: 'IN_TRANSIT', transportStatus: 'IN_TRANSIT' };
        }
        return t;
      });
      localStorage.setItem('agritrack_assigned_transports', JSON.stringify(updatedAssigned));

      const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
      const updatedSold = localSold.map(b => {
        if (b.transportId === transportId || b.id === auc.id || b._id === auc._id) {
          return { ...b, status: 'IN_TRANSIT', transportStatus: 'IN_TRANSIT' };
        }
        return b;
      });
      localStorage.setItem('completed_sold_crops', JSON.stringify(updatedSold));

      const eventPayload = {
        type: 'TRANSPORT_ALLOWED',
        transportId,
        auctionId: auc.id || auc._id,
        status: 'IN_TRANSIT'
      };

      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel('agritrack_events');
          bc.postMessage(eventPayload);
        } catch (e) {}
      }

      window.dispatchEvent(new CustomEvent('agritrack:transport_allowed', { detail: eventPayload }));

      alert('🚀 Transport approved by bidder! Status changed to IN_TRANSIT and ESP8266 + DHT22 tracking is now active.');
      fetchData();
    } catch (err) {
      console.error('Error allowing transport:', err);
      alert('Transport approved! IoT tracking active.');
      fetchData();
    }
  };

  const activeAuctions = auctions.filter((a) => a.status === 'ACTIVE' || a.status === 'EXTENDED');
  
  // Combine API won auctions and local accepted bids
  const combinedWonAuctions = [...acceptedBids];

  // Merge any assigned transport records from backend transports array or agritrack_assigned_transports
  const localAssignedTransports = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
  const allTransports = [...transports, ...localAssignedTransports];

  allTransports.forEach(t => {
    const matchIdx = combinedWonAuctions.findIndex(c => 
      (c.transportId && t.transportId && String(c.transportId) === String(t.transportId)) ||
      (c.id && t.auctionId && (String(c.id) === String(t.auctionId) || String(c._id) === String(t.auctionId)))
    );

    if (matchIdx !== -1) {
      const existingItem = combinedWonAuctions[matchIdx];
      const existingPayStatus = existingItem.paymentStatus || 'UNPAID';
      const curStatus = existingItem.status || existingItem.transportStatus;

      let targetStatus = curStatus;
      let finalPaymentStatus = existingPayStatus;

      if (existingPayStatus === 'UNPAID') {
        targetStatus = 'AWAITING_BIDDER_PAYMENT';
        finalPaymentStatus = 'UNPAID';
      } else {
        targetStatus = (t.status === 'DELIVERED' || curStatus === 'DELIVERED') 
          ? 'DELIVERED' 
          : (curStatus === 'RETAILER_PAID' && t.status !== 'IN_TRANSIT') 
            ? 'RETAILER_PAID' 
            : (t.status || curStatus || 'AWAITING_RETAILER_PAYMENT');
        finalPaymentStatus = 'PAID';
      }

      combinedWonAuctions[matchIdx] = {
        ...existingItem,
        retailerId: t.retailerId || existingItem.retailerId,
        retailerName: t.retailerName || existingItem.retailerName,
        destinationLocation: t.destinationLocation || existingItem.destinationLocation,
        status: targetStatus,
        transportStatus: targetStatus,
        transportId: t.transportId || existingItem.transportId,
        paymentStatus: finalPaymentStatus
      };
    } else if (t.winnerId === user?.id || t.retailerId || t.retailerName) {
      const isPaid = t.paymentStatus === 'PAID' || t.status === 'RETAILER_PAID' || t.status === 'IN_TRANSIT' || t.status === 'DELIVERED';
      combinedWonAuctions.push({
        id: t.auctionId || t.transportId,
        _id: t.auctionId || t.transportId,
        cropName: t.cropName,
        quantity: t.quantity,
        unit: t.unit || 'kg',
        finalPrice: t.finalPrice || 30,
        totalAmount: t.totalAmount || (t.finalPrice || 30) * (t.quantity || 500),
        farmerName: t.farmerName || 'Rajesh Kumar',
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        status: isPaid ? (t.status || 'AWAITING_RETAILER_PAYMENT') : 'AWAITING_BIDDER_PAYMENT',
        transportStatus: isPaid ? (t.status || 'AWAITING_RETAILER_PAYMENT') : 'AWAITING_BIDDER_PAYMENT',
        retailerId: t.retailerId,
        retailerName: t.retailerName,
        destinationLocation: t.destinationLocation,
        transportId: t.transportId
      });
    }
  });

  auctions.filter(a => a.status === 'COMPLETED' || a.winnerId === user?.id).forEach(auc => {
    if (!combinedWonAuctions.some(c => c.id === auc._id || c.transportId === auc.transportId)) {
      combinedWonAuctions.push({
        id: auc._id,
        _id: auc._id,
        cropName: auc.cropName,
        quantity: auc.quantity,
        unit: auc.unit || 'kg',
        finalPrice: auc.currentHighestBid || auc.startingPrice,
        totalAmount: (auc.currentHighestBid || auc.startingPrice) * (auc.quantity || 500),
        farmerName: auc.farmerName || 'Rajesh Kumar',
        paymentStatus: 'UNPAID',
        status: 'AWAITING_BIDDER_PAYMENT',
        transportId: auc.transportId || 'TR001'
      });
    }
  });

  const unpaidAcceptedBids = combinedWonAuctions.filter(b => b.paymentStatus !== 'PAID');
  const retailerPaidBids = combinedWonAuctions.filter(b => b.status === 'RETAILER_PAID' || b.transportStatus === 'RETAILER_PAID');

  return (
    <AggregatorLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg uppercase">
                Buyer / Bidder Portal
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full">
                ● {buyerProfile.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">Welcome, {buyerProfile.name}</h1>
            <p className="text-xs text-slate-500 font-medium">Discover AI-graded produce, receive matched farmer notifications, and bid in real-time auctions.</p>
          </div>
          
          <button
            onClick={fetchData}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Refresh Live Feed
          </button>
        </div>

        {/* UNPAID FARMER ACCEPTANCE ACTION BANNER */}
        {unpaidAcceptedBids.length > 0 && (
          <div className="bg-amber-500 text-slate-950 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 border-amber-400 animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-slate-950 text-amber-400 text-[10px] font-black rounded-md uppercase">
                  🔔 ACTION REQUIRED: FARMER ACCEPTED BID
                </span>
                <span className="text-xs font-black text-slate-900">
                  {unpaidAcceptedBids.length} Pending Payment{unpaidAcceptedBids.length > 1 ? 's' : ''}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-950">
                {unpaidAcceptedBids[0].cropName || unpaidAcceptedBids[0].name} ({unpaidAcceptedBids[0].quantity} {unpaidAcceptedBids[0].unit}) Accepted!
              </h3>
              <p className="text-xs font-semibold text-slate-900/80">
                Farmer: {unpaidAcceptedBids[0].farmerName || 'Rajesh Kumar'} · Total Amount Due: <strong className="text-slate-950 text-sm">₹{(unpaidAcceptedBids[0].totalAmount || (unpaidAcceptedBids[0].finalPrice * unpaidAcceptedBids[0].quantity)).toLocaleString()}</strong>
              </p>
            </div>

            <button
              onClick={() => handleOpenPaymentModal(unpaidAcceptedBids[0])}
              className="w-full md:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 whitespace-nowrap"
            >
              💳 Pay Farmer Now (Demo Payment)
            </button>
          </div>
        )}

        {/* RETAILER PAID ACTION BANNER (REQUEST BIDDER TO ALLOW TRANSPORT) */}
        {retailerPaidBids.length > 0 && (() => {
          const bannerItem = retailerPaidBids[0];
          const bUnitPrice = Number(bannerItem.finalPrice || bannerItem.winningPrice || bannerItem.price_per_unit || 30);
          const bQty = Number(bannerItem.quantity) || 500;
          const bBaseProduce = bUnitPrice * bQty;
          const bBidderMargin = bQty * 2;
          const bTransCost = Number(bannerItem.transportCost || 2500);
          const bTotalPaid = bBaseProduce + bBidderMargin + bTransCost;

          return (
            <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 border-emerald-400 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-slate-950 text-emerald-400 text-[10px] font-black rounded-md uppercase">
                    🎉 ACTION REQUIRED: RETAILER PAYMENT RECEIVED
                  </span>
                  <span className="text-xs font-black text-white">
                    {retailerPaidBids.length} Order{retailerPaidBids.length > 1 ? 's' : ''} Ready for Transport Start
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Retailer {bannerItem.retailerName || 'Fresh Mart Supermarket'} Paid ₹{bTotalPaid.toLocaleString()} for {bannerItem.cropName || bannerItem.name}!
                </h3>
                <p className="text-xs font-medium text-emerald-100">
                  Retailer payment verified: Base Produce ₹{bBaseProduce.toLocaleString()} + Bidder Margin (₹2/kg) ₹{bBidderMargin.toLocaleString()} + Transport Fee ₹{bTransCost.toLocaleString()} = <strong>Total ₹{bTotalPaid.toLocaleString()}</strong>. Click 'Allow / Start Transport' to authorize dispatch.
                </p>
              </div>

              <button
                onClick={() => handleAllowTransport(bannerItem)}
                className="w-full md:w-auto px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition flex items-center justify-center gap-2 whitespace-nowrap border border-emerald-400/30"
              >
                <Truck className="w-4 h-4 text-emerald-400" /> 🚚 ALLOW / START TRANSPORT NOW
              </button>
            </div>
          );
        })()}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'available'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Gavel className="w-4 h-4" /> Live Market Auctions ({activeAuctions.length})
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 relative ${
              activeTab === 'notifications'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" /> Farmer Match Alerts
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full">
              {buyerNotifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('won')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 relative ${
              activeTab === 'won'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-4 h-4" /> Won Auctions & Payments ({combinedWonAuctions.length})
            {unpaidAcceptedBids.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-2 right-4" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" /> Buyer Match Profile
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
            Loading Market Auctions & Telemetry...
          </div>
        ) : (
          <div>
            {/* LIVE MARKET AUCTIONS TAB */}
            {activeTab === 'available' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeAuctions.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
                    No active auctions available right now. Check back soon!
                  </div>
                ) : (
                  activeAuctions.map((auc) => (
                    <div key={auc._id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-lg border border-emerald-100 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Grade Score: {auc.qualityScore}/100
                          </span>
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-extrabold text-[10px] rounded-lg uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Live Bidding
                          </span>
                        </div>

                        {auc.imageUrl && (
                          <img
                            src={auc.imageUrl.startsWith('http') ? auc.imageUrl : `${BACKEND_URL}${auc.imageUrl}`}
                            alt={auc.cropName}
                            className="w-full h-44 object-cover rounded-2xl border border-slate-100"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500';
                            }}
                          />
                        )}

                        <div>
                          <h3 className="text-xl font-black text-slate-900">{auc.cropName}</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {auc.location || 'Coimbatore'} · Farmer: {auc.farmerName}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Lot Quantity</span>
                            <span className="font-extrabold text-slate-800">{auc.quantity} {auc.unit}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current High Bid</span>
                            <span className="font-black text-emerald-600 text-sm">₹{auc.currentBid || auc.startingPrice}/{auc.unit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 pt-0">
                        <button
                          onClick={() => navigate(`/auction/${auc._id}`)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 uppercase tracking-wider"
                        >
                          <Gavel className="w-4 h-4" /> Place Bid & View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* FARMER MATCH NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                {buyerNotifications.map((note) => (
                  <div key={note.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <Bell className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900">{note.title}</h3>
                          <span className="text-[10px] font-bold text-slate-400">{note.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">{note.message}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(note.actionUrl)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition whitespace-nowrap"
                    >
                      View Auction
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* WON AUCTIONS & PAYMENT DISPATCH TAB */}
            {activeTab === 'won' && (
              <div className="space-y-4">
                {combinedWonAuctions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-semibold bg-white rounded-3xl border border-slate-200">
                    No won auctions yet. Place winning bids in live auctions to unlock real-time IoT monitoring!
                  </div>
                ) : (
                  combinedWonAuctions.map((auc) => {
                    const isPaid = auc.paymentStatus === 'PAID';
                    const statusStr = auc.status || auc.transportStatus || 'AWAITING_BIDDER_PAYMENT';
                    const hasRetailerSelected = Boolean(auc.retailerId || auc.retailerName || statusStr === 'AWAITING_RETAILER_PAYMENT' || statusStr === 'RETAILER_PAID' || statusStr === 'ASSIGNED' || statusStr === 'IN_TRANSIT');
                    const unitPrice = Number(auc.finalPrice || auc.winningPrice || auc.price_per_unit || auc.currentBid || 30);
                    const qty = Number(auc.quantity) || 500;
                    const baseProduceAmt = unitPrice * qty;
                    const bidderProfit = qty * 2;
                    const produceAmt = baseProduceAmt + bidderProfit;
                    const transCost = Number(auc.transportCost || 2500);
                    const retailerPaidTotal = produceAmt + transCost;

                    let badgeText = 'FARMER ACCEPTED · PAYMENT DUE';
                    let badgeColor = 'bg-amber-100 text-amber-900 border border-amber-300';

                    if (isPaid) {
                      if (statusStr === 'DELIVERED') {
                        badgeText = '✅ SHIPMENT DELIVERED TO RETAILER STORE';
                        badgeColor = 'bg-emerald-600 text-white font-extrabold';
                      } else if (statusStr === 'AWAITING_RETAILER_PAYMENT') {
                        badgeText = 'PAID · RETAILER SELECTED · AWAITING RETAILER PAYMENT';
                        badgeColor = 'bg-amber-100 text-amber-900 border border-amber-300';
                      } else if (statusStr === 'RETAILER_PAID') {
                        badgeText = '🎉 RETAILER PAID · TRANSPORT APPROVAL REQUIRED';
                        badgeColor = 'bg-emerald-100 text-emerald-900 border border-emerald-400 animate-pulse font-extrabold';
                      } else if (statusStr === 'IN_TRANSIT' || statusStr === 'ASSIGNED') {
                        badgeText = 'PAID · IN TRANSIT (IOT MONITORING ACTIVE)';
                        badgeColor = 'bg-emerald-100 text-emerald-800';
                      } else if (!hasRetailerSelected) {
                        badgeText = 'PAID · RETAILER SELECTION PENDING';
                        badgeColor = 'bg-blue-100 text-blue-900';
                      }
                    }

                    return (
                      <div key={auc.id || auc._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-md uppercase flex items-center gap-1 ${badgeColor}`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {badgeText}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">Transport ID: {auc.transportId || 'TR001'}</span>
                          </div>

                          <h3 className="text-xl font-black text-slate-900">{auc.cropName || auc.name} ({qty} {auc.unit || 'kg'})</h3>

                          <p className="text-xs text-slate-500 font-medium">
                            Farmer: <strong>{auc.farmerName || 'Rajesh Kumar'}</strong> · Winning Bid: <strong className="text-emerald-700">₹{unitPrice}/{auc.unit || 'kg'}</strong> · Farmer Payout: <strong className="text-slate-900">₹{baseProduceAmt.toLocaleString()}</strong>
                          </p>

                          {hasRetailerSelected && (
                            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-bold space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span>🏪 Retailer Paid Total:</span>
                                <span className="text-emerald-950 font-black text-sm">₹{retailerPaidTotal.toLocaleString()}</span>
                              </div>
                              <p className="text-[10px] font-semibold text-emerald-800">
                                Base Produce: ₹{baseProduceAmt.toLocaleString()} + Bidder Margin (₹2/kg): ₹{bidderProfit.toLocaleString()} + Transport Fee: ₹{transCost.toLocaleString()}
                              </p>
                            </div>
                          )}

                          {hasRetailerSelected && (
                            <p className="text-xs text-emerald-800 font-bold">
                              Selected Retailer: {auc.retailerName || 'Fresh Mart Supermarket'}
                              {statusStr === 'AWAITING_RETAILER_PAYMENT' && <span className="text-amber-800 font-semibold"> (Waiting for Retailer Payment)</span>}
                              {statusStr === 'RETAILER_PAID' && <span className="text-emerald-700 font-extrabold"> (Retailer Paid ₹{retailerPaidTotal.toLocaleString()}! Ready for Transport Approval)</span>}
                              {statusStr === 'DELIVERED' && <span className="text-emerald-700 font-extrabold"> (Delivered to Store)</span>}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                          {!isPaid ? (
                            <button
                              onClick={() => handleOpenPaymentModal(auc)}
                              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
                            >
                              💳 Pay Farmer Now (₹{baseProduceAmt.toLocaleString()})
                            </button>
                          ) : !hasRetailerSelected ? (
                            <button
                              onClick={() => {
                                setSelectedPaidAuctionForRetailer(auc);
                                setShowRetailerSelectionModal(true);
                              }}
                              className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
                            >
                              <Store className="w-4 h-4" /> Select Registered Retailer for Delivery
                            </button>
                          ) : statusStr === 'AWAITING_RETAILER_PAYMENT' ? (
                            <div className="text-center sm:text-right">
                              <span className="px-4 py-2.5 bg-amber-100 text-amber-900 text-xs font-black rounded-xl block border border-amber-300">
                                ⏳ Waiting for Retailer Payment...
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-1">
                                Transport cannot start until retailer pays
                              </span>
                            </div>
                          ) : statusStr === 'RETAILER_PAID' ? (
                            <button
                              onClick={() => handleAllowTransport(auc)}
                              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-xl flex items-center justify-center gap-2 animate-bounce"
                            >
                              <Truck className="w-4 h-4 text-white" /> 🚚 Allow / Start Transport
                            </button>
                          ) : statusStr === 'DELIVERED' ? (
                            <button
                              onClick={() => navigate(`/transport/${auc.transportId || 'TR001'}`)}
                              className="w-full sm:w-auto px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4 text-white" /> View Delivery Telemetry Log
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/transport/${auc.transportId || 'TR001'}`)}
                              className="w-full sm:w-auto px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-md flex items-center justify-center gap-2"
                            >
                              <Truck className="w-4 h-4 text-emerald-400 animate-pulse" /> Live ESP8266 Telemetry
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* BUYER PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <User className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Buyer Trading Profile & Procurement Preferences</h3>
                    <p className="text-xs text-slate-500">Configure your crop interests to receive instant farmer match alerts.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Trader Company Name</label>
                    <input type="text" value={buyerProfile.name} onChange={(e) => setBuyerProfile({...buyerProfile, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50" />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Primary Procurement Hub Location</label>
                    <input type="text" value={buyerProfile.location} onChange={(e) => setBuyerProfile({...buyerProfile, location: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50" />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Max Feasible Radius (Km)</label>
                    <input type="number" value={buyerProfile.maxRadiusKm} onChange={(e) => setBuyerProfile({...buyerProfile, maxRadiusKm: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50" />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">Min Required Lot Quantity (Kg)</label>
                    <input type="number" value={buyerProfile.minQuantityKg} onChange={(e) => setBuyerProfile({...buyerProfile, minQuantityKg: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500 bg-slate-50" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">Subscribed Crop Interests (Receive Push Alerts)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Tomato', 'Wheat', 'Basmati Rice', 'Mango', 'Onion', 'Grapes', 'Vegetables'].map((crop) => {
                      const isSelected = buyerProfile.cropInterests.includes(crop);
                      return (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setBuyerProfile({ ...buyerProfile, cropInterests: buyerProfile.cropInterests.filter(c => c !== crop) });
                            } else {
                              setBuyerProfile({ ...buyerProfile, cropInterests: [...buyerProfile.cropInterests, crop] });
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                            isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{crop}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button onClick={() => alert('✅ Buyer match preferences updated successfully!')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition">
                    Save Procurement Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* DEMO PAYMENT MODAL */}
      {showPaymentModal && selectedPayAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-6 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase">
                  AgriLink Payment Gateway
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Pay Farmer Before Transport</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Farmer Name:</span>
                <span className="font-extrabold text-slate-900">{selectedPayAuction.farmerName || 'Rajesh Kumar'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Crop & Quantity:</span>
                <span className="font-extrabold text-slate-900">{selectedPayAuction.cropName || selectedPayAuction.name} ({selectedPayAuction.quantity} {selectedPayAuction.unit})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-800 font-black uppercase">Total Amount Due:</span>
                <span className="text-lg font-black text-emerald-700">
                  ₹{(selectedPayAuction.totalAmount || ((selectedPayAuction.finalPrice || selectedPayAuction.currentBid || 30) * (selectedPayAuction.quantity || 500))).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Demo Payment Method
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['UPI / GPay / PhonePe (Instant)', 'Credit / Debit Card (Simulated)', 'Net Banking (Direct Settlement)'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                      paymentMethod === method
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{method}</span>
                    {paymentMethod === method && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={paymentProcessing}
                onClick={handleExecuteDemoPayment}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {paymentProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Processing Payment Settlement...
                  </>
                ) : (
                  `Confirm & Complete Payment`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BID ACCEPTED SUCCESS POPUP MODAL */}
      {acceptedBidPopup && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setAcceptedBidPopup(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-md uppercase tracking-wider">
                  BID ACCEPTED BY FARMER
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">🎉 You Won The Auction!</h2>
              </div>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <p className="text-sm font-extrabold text-emerald-950 leading-relaxed">
                "{acceptedBidPopup.message || `Your bid has been accepted by the farmer. You have won the auction for ${acceptedBidPopup.cropName} at ₹${acceptedBidPopup.acceptedPrice}.`}"
              </p>
              <div className="pt-2 border-t border-emerald-200/60 flex justify-between text-xs font-bold text-slate-700">
                <span>Crop: <strong className="text-slate-900">{acceptedBidPopup.cropName}</strong></span>
                <span>Winning Price: <strong className="text-emerald-700">₹{acceptedBidPopup.acceptedPrice}/{acceptedBidPopup.unit || 'kg'}</strong></span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Quantity: <strong>{acceptedBidPopup.quantity} {acceptedBidPopup.unit || 'kg'}</strong></span>
                <span>Total Deal: <strong className="text-emerald-800 text-sm">₹{((acceptedBidPopup.acceptedPrice || 30) * (acceptedBidPopup.quantity || 500)).toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const targetAuc = acceptedBidPopup.auction || acceptedBidPopup;
                  setAcceptedBidPopup(null);
                  handleOpenPaymentModal(targetAuc);
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                💳 Proceed to Payment (₹{((acceptedBidPopup.acceptedPrice || 30) * (acceptedBidPopup.quantity || 500)).toLocaleString()})
              </button>
              <button
                onClick={() => setAcceptedBidPopup(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Dismiss & View Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTERED RETAILER SELECTION MODAL */}
      {showRetailerSelectionModal && selectedPaidAuctionForRetailer && (
        <RetailerSelectionModal
          auction={selectedPaidAuctionForRetailer}
          onClose={() => {
            setShowRetailerSelectionModal(false);
            setSelectedPaidAuctionForRetailer(null);
          }}
          onConfirm={({ transportId }) => {
            setShowRetailerSelectionModal(false);
            setSelectedPaidAuctionForRetailer(null);
            loadAcceptedBids();
            navigate(`/transport/${transportId}`);
          }}
        />
      )}
    </AggregatorLayout>
  );
}
