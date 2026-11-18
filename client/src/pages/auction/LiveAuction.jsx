import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Gavel, Clock, ShieldCheck, TrendingUp, AlertTriangle, ArrowLeft,
  User, CheckCircle2, MapPin, Sparkles, RefreshCw, X
} from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';
import RetailerSelectionModal from '../../components/buyer/RetailerSelectionModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export default function LiveAuction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [socket, setSocket] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  // Payment states
  const [acceptedBid, setAcceptedBid] = useState(null);
  const [showAcceptedPopup, setShowAcceptedPopup] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRetailerModal, setShowRetailerModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay / PhonePe');

  // Fetch auction details
  const fetchAuction = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/v1/auctions/${id}`, { timeout: 3000 }).catch(() => null);
      if (res?.data?.success && res.data.auction) {
        setAuction(res.data.auction);
        setBids(res.data.bids || []);
        const minNextBid = Math.ceil(res.data.auction.currentHighestBid * 1.05);
        setBidAmount(minNextBid.toString());
        return;
      }
    } catch (err) {
      console.warn('Backend auction fetch failed, using local storage fallback:', err);
    } finally {
      // Local storage fallback if auction state is not set from backend
      setAuction(prev => {
        if (prev) return prev;

        const localLive = JSON.parse(localStorage.getItem('agritrack_live_auctions') || '[]');
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
        const localDemo = JSON.parse(localStorage.getItem('demo_crops') || '[]');

        const allLocal = [...localLive, ...localAccepted, ...localSold, ...localDemo];
        const match = allLocal.find(a => 
          String(a._id) === String(id) || 
          String(a.id) === String(id) || 
          String(a.auction_id) === String(id) || 
          String(a.transportId) === String(id)
        );

        if (match) {
          const startPrice = match.startingPrice || match.price_per_unit || match.finalPrice || 30;
          const currentBid = match.currentHighestBid || match.winningPrice || match.finalPrice || startPrice;
          setBidAmount(Math.ceil(currentBid * 1.05).toString());
          return {
            _id: match._id || match.id || id,
            farmerId: match.farmerId || 'farmer-rajesh',
            farmerName: match.farmerName || 'Rajesh Kumar',
            cropName: match.cropName || match.name || 'Organic Farm Produce',
            cropImage: match.cropImage || match.imageUrl || match.image?.url || match.image || '/uploads/test-sample.jpg',
            quantity: Number(match.quantity) || 500,
            unit: match.unit || 'kg',
            location: match.location || 'Coimbatore',
            deliveryLocation: match.deliveryLocation || match.pickup_address || 'Central Retail Mandi',
            qualityScore: match.qualityScore || 88,
            startingPrice: startPrice,
            currentHighestBid: currentBid,
            currentHighestBidderName: match.winnerName || match.currentHighestBidderName || 'Kavitha Agro Traders',
            status: match.status === 'Sold' || match.auction_status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
            startTime: match.startTime || new Date().toISOString(),
            endTime: match.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString()
          };
        }

        // Default mock auction if ID matches sample
        return {
          _id: id,
          farmerId: 'farmer-rajesh',
          farmerName: 'Rajesh Kumar',
          cropName: 'Organic Produce',
          cropImage: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80',
          quantity: 500,
          unit: 'kg',
          location: 'Salem Farm, Coimbatore',
          deliveryLocation: 'Chennai Retail Yard',
          qualityScore: 88,
          aiSuggestedPrice: 28,
          startingPrice: 25,
          currentHighestBid: 29,
          currentHighestBidderName: 'Fresh Mart Supermarket',
          status: 'ACTIVE',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        };
      });

      setLoading(false);
    }
  };

  const checkAcceptedBids = () => {
    try {
      const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
      const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
      const localDemo = JSON.parse(localStorage.getItem('demo_crops') || '[]');

      const allAccepted = [...localAccepted, ...localSold, ...localDemo.filter(d => d.status === 'Sold')];

      // STRICT ID MATCHING ONLY to avoid matching old paid crops with same name
      const match = allAccepted.find(b => 
        (b.id && String(b.id) === String(id)) || 
        (b._id && String(b._id) === String(id)) ||
        (b.auctionId && String(b.auctionId) === String(id)) ||
        (b.transportId && String(b.transportId) === String(id))
      );

      if (match) {
        setAcceptedBid(match);
        if (!acceptedBid) {
          setShowAcceptedPopup(true);
        }
        if (match.paymentStatus === 'PAID') {
          setPaymentComplete(true);
        }
        setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
      } else {
        // Reset payment state if it's a new active auction
        setAcceptedBid(null);
        setPaymentComplete(false);
        setShowAcceptedPopup(false);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAuction();

    // Initialize Socket.IO connection
    let newSocket = null;
    try {
      newSocket = io(BACKEND_URL, { reconnectionAttempts: 3, timeout: 3000 });
      setSocket(newSocket);

      newSocket.emit('auction:join', id);

      newSocket.on('auction:bid-update', (data) => {
        setBidError('');
        setAuction((prev) => prev ? {
          ...prev,
          currentHighestBid: data.currentHighestBid,
          currentHighestBidder: data.currentHighestBidder,
          currentHighestBidderName: data.currentHighestBidderName
        } : prev);

        if (data.bid) {
          setBids((prev) => [data.bid, ...prev]);
        }
      });

      const handleAcceptedData = (data) => {
        if (
          (data.auctionId && String(data.auctionId) === String(id)) ||
          (data.id && String(data.id) === String(id)) ||
          (data.transportId && String(data.transportId) === String(id)) ||
          (auction && String(auction._id) === String(id) && (data.cropName === auction.cropName || data.name === auction.cropName))
        ) {
          const acceptedObj = {
            id: id,
            _id: id,
            auctionId: id,
            cropName: data.cropName || auction?.cropName,
            acceptedPrice: data.acceptedPrice || data.finalPrice || auction?.currentHighestBid,
            finalPrice: data.acceptedPrice || data.finalPrice || auction?.currentHighestBid,
            winningPrice: data.acceptedPrice || data.finalPrice || auction?.currentHighestBid,
            quantity: data.quantity || auction?.quantity || 500,
            unit: data.unit || auction?.unit || 'kg',
            transportId: data.transportId || 'TR001',
            farmerName: data.farmerName || auction?.farmerName || 'Rajesh Kumar',
            message: `Your bid has been accepted by the farmer. You have won the auction for ${data.cropName || auction?.cropName} at ₹${data.acceptedPrice || data.finalPrice || auction?.currentHighestBid}.`
          };
          setAcceptedBid(acceptedObj);
          setShowAcceptedPopup(true);
          setAuction(prev => prev ? { ...prev, status: 'COMPLETED', finalPrice: acceptedObj.finalPrice } : prev);
        }
      };

      newSocket.on('auction:closed', handleAcceptedData);
      newSocket.on('auction:bid-accepted', handleAcceptedData);

      newSocket.on('auction:error', (data) => {
        setBidError(data.message);
      });
    } catch (e) {}

    return () => {
      if (newSocket) {
        try {
          newSocket.emit('auction:leave', id);
          newSocket.disconnect();
        } catch (e) {}
      }
    };
  }, [id]);

  useEffect(() => {
    checkAcceptedBids();

    const handleBidAcceptedEvent = (e) => {
      const detail = e.detail;
      if (
        detail && (
          (detail.auctionId && String(detail.auctionId) === String(id)) ||
          (detail.id && String(detail.id) === String(id)) ||
          (detail._id && String(detail._id) === String(id)) ||
          (detail.transportId && String(detail.transportId) === String(id))
        )
      ) {
        setAcceptedBid(detail);
        setShowAcceptedPopup(true);
        setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
      }
    };

    window.addEventListener('agritrack:bid_accepted', handleBidAcceptedEvent);

    let bc = null;
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel('agritrack_events');
        bc.onmessage = (msg) => {
          if (msg.data?.type === 'BID_ACCEPTED') {
            const detail = msg.data.notification || msg.data.auction;
            if (
              detail && (
                (detail.auctionId && String(detail.auctionId) === String(id)) ||
                (detail.id && String(detail.id) === String(id)) ||
                (detail._id && String(detail._id) === String(id)) ||
                (detail.transportId && String(detail.transportId) === String(id))
              )
            ) {
              setAcceptedBid(detail);
              setShowAcceptedPopup(true);
              setAuction(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
            }
          }
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('agritrack:bid_accepted', handleBidAcceptedEvent);
      if (bc) bc.close();
    };
  }, [id, auction]);

  // Countdown Timer Hook
  useEffect(() => {
    if (!auction?.endTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.endTime).getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeLeft('AUCTION CLOSED');
        clearInterval(timer);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.endTime]);

  const handlePlaceBid = (e) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    const val = Number(bidAmount);
    if (isNaN(val) || val <= auction.currentHighestBid) {
      setBidError(`Bid must be higher than current highest bid of ₹${auction.currentHighestBid}`);
      return;
    }

    if (socket && socket.connected) {
      socket.emit('auction:bid', {
        auctionId: id,
        buyerId: user?.id || 'buyer-101',
        buyerName: user?.name || 'Trader Bidder',
        amount: val
      });
      setBidSuccess(`Submitted bid of ₹${val}!`);
      setBidAmount((val + 2).toString());
    } else {
      axios.post(`${BACKEND_URL}/api/v1/auctions/${id}/bid`, {
        buyerId: user?.id || 'buyer-101',
        buyerName: user?.name || 'Trader Bidder',
        amount: val
      }).then((res) => {
        if (res.data.success) {
          setAuction(res.data.auction);
          setBidSuccess('Bid placed successfully!');
        }
      }).catch((err) => {
        setBidError(err.response?.data?.message || 'Failed to place bid');
      });
    }
  };

  const handleExecuteDemoPayment = () => {
    setPaymentProcessing(true);
    setTimeout(async () => {
      const totalAmount = acceptedBid?.totalAmount || ((acceptedBid?.finalPrice || auction?.currentHighestBid || 30) * (acceptedBid?.quantity || auction?.quantity || 500));
      const transportId = acceptedBid?.transportId || `TR-${Math.floor(100000 + Math.random() * 900000)}`;

      const newTxn = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        txnId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        crop: acceptedBid?.cropName || auction?.cropName || 'Organic Farm Produce',
        cropName: acceptedBid?.cropName || auction?.cropName || 'Organic Farm Produce',
        amount: totalAmount,
        pricePerUnit: acceptedBid?.finalPrice || auction?.currentHighestBid || 30,
        quantity: acceptedBid?.quantity || auction?.quantity || 500,
        unit: acceptedBid?.unit || auction?.unit || 'kg',
        buyerName: user?.name || 'Kavitha Agro Traders',
        farmerName: acceptedBid?.farmerName || 'Rajesh Kumar',
        status: 'completed',
        paymentMethod: paymentMethod,
        hash: `0x${Math.random().toString(16).substr(2, 32)}`,
        date: new Date().toLocaleDateString(),
        timestamp: new Date().toISOString(),
        transportId: transportId
      };

      // 1. Save payment to farmer_payment_transactions
      try {
        const prevTxns = JSON.parse(localStorage.getItem('farmer_payment_transactions') || '[]');
        prevTxns.unshift(newTxn);
        localStorage.setItem('farmer_payment_transactions', JSON.stringify(prevTxns));
      } catch (e) {}

      // 2. Update agritrack_accepted_bids
      try {
        const acceptedBids = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        const updatedBids = acceptedBids.map(b => {
          if (String(b.id) === String(id) || String(b.auctionId) === String(id) || b.cropName === acceptedBid?.cropName) {
            return { ...b, paymentStatus: 'PAID', status: 'RETAILER_SELECTION_REQUIRED', transportId };
          }
          return b;
        });
        localStorage.setItem('agritrack_accepted_bids', JSON.stringify(updatedBids));
      } catch (e) {}

      // 3. Update completed_sold_crops
      try {
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
        const updatedSold = localSold.map(b => {
          if (String(b.id) === String(id) || String(b.auctionId) === String(id) || b.cropName === acceptedBid?.cropName) {
            return { ...b, paymentStatus: 'PAID', status: 'RETAILER_SELECTION_REQUIRED', transportId };
          }
          return b;
        });
        localStorage.setItem('completed_sold_crops', JSON.stringify(updatedSold));
      } catch (e) {}

      setPaymentProcessing(false);
      setShowPaymentModal(false);
      setAcceptedBid(prev => ({ ...(prev || {}), paymentStatus: 'PAID', status: 'RETAILER_SELECTION_REQUIRED', transportId }));
      setShowRetailerModal(true);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Connecting to AgriLink Live Auction Engine...</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-800">Auction Not Found</h2>
        <button
          onClick={() => {
            if (user?.role === 'farmer') navigate('/farmer/dashboard');
            else if (user?.role === 'retailer') navigate('/retailer/dashboard');
            else navigate('/buyer/dashboard');
          }}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalPayableAmount = acceptedBid?.totalAmount || ((acceptedBid?.finalPrice || auction.currentHighestBid || 30) * (acceptedBid?.quantity || auction.quantity || 500));

  return (
    <div className="min-h-screen bg-slate-50/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (user?.role === 'farmer') navigate('/farmer/dashboard');
              else if (user?.role === 'retailer') navigate('/retailer/dashboard');
              else navigate('/buyer/dashboard');
            }}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE REAL-TIME AUCTION
          </span>
        </div>

        {/* Main Auction Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Crop Info & AI Analysis */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="relative h-72 sm:h-96 bg-slate-100">
                <img
                  src={auction.cropImage || '/uploads/test-sample.jpg'}
                  alt={auction.cropName}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800'; }}
                />
                <div className="absolute top-4 left-4 bg-emerald-950/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {auction.location}
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white/50 flex items-center justify-between shadow-lg">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">{auction.cropName}</h1>
                    <p className="text-xs text-slate-500 font-semibold">Quantity: {auction.quantity} {auction.unit}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Quality Grade</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-lg">
                      Grade A ({auction.qualityScore}/100)
                    </span>
                  </div>
                </div>
              </div>

              {/* AI & ML Insights Reference */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100">
                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                    AI Suggested Market Price
                  </span>
                  <div className="text-2xl font-black text-emerald-700">₹{auction.aiSuggestedPrice} <span className="text-xs font-normal">/{auction.unit}</span></div>
                  <p className="text-[11px] text-emerald-700/80 mt-1">Based on Gemini AI produce assessment & regional 2026 market trend.</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Auction Starting Floor
                  </span>
                  <div className="text-2xl font-black text-slate-800">₹{auction.startingPrice} <span className="text-xs font-normal">/{auction.unit}</span></div>
                  <p className="text-[11px] text-slate-500 mt-1">Set directly by farmer ({auction.farmerName}).</p>
                </div>
              </div>
            </div>

            {/* Live Bidding History */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" /> Real-Time Bid History
                </h3>
                <span className="text-xs text-slate-400 font-semibold">{bids.length} total bids</span>
              </div>

              {bids.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No bids placed yet. Be the first to bid!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {bids.map((bid, index) => (
                    <div
                      key={bid._id || index}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                        index === 0 ? 'bg-emerald-50/70 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          index === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {bid.buyerName?.charAt(0) || 'B'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{bid.buyerName}</p>
                          <p className="text-[10px] text-slate-400">{new Date(bid.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">₹{bid.amount}</span>
                        <span className="text-[10px] text-slate-400 block">/{auction.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Bidding & Payment Prompt Card */}
          <div className="space-y-6">
            
            {/* FARMER ACCEPTED BID & BIDDER PAYMENT PROMPT */}
            {acceptedBid && !paymentComplete && (
              <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-300 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-500 text-white rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-amber-950">Farmer Accepted Your Bid!</h3>
                    <p className="text-xs text-amber-800 font-semibold">Payment required before transport dispatch.</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Winning Price:</span>
                    <span className="font-extrabold text-slate-800">₹{acceptedBid.finalPrice} / {acceptedBid.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Lot Quantity:</span>
                    <span className="font-extrabold text-slate-800">{acceptedBid.quantity} {acceptedBid.unit}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2">
                    <span className="text-slate-700 font-black uppercase">Total Due:</span>
                    <span className="text-base font-black text-emerald-700">₹{totalPayableAmount.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  💳 Pay Farmer Now (Demo Payment - ₹{totalPayableAmount.toLocaleString()})
                </button>
              </div>
            )}

            {/* PAYMENT COMPLETED & TRANSPORT INITIATED CARD */}
            {paymentComplete && acceptedBid && (
              <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-emerald-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-black text-white">Payment Received & Verified!</h3>
                    <p className="text-xs text-emerald-200">Transaction logged to Farmer Dashboard.</p>
                  </div>
                </div>

                <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-emerald-300">Amount Paid:</span>
                    <span className="font-black text-emerald-400">₹{totalPayableAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-300">Transport ID:</span>
                    <span className="font-mono font-bold text-white">{acceptedBid.transportId || 'TR001'}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/transport/${acceptedBid.transportId || 'TR001'}`)}
                  className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2"
                >
                  🚚 Monitor Live ESP8266 Telemetry
                </button>
              </div>
            )}

            {/* Live Timer & Highest Bid Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6 border border-slate-800">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400 animate-pulse" /> Time Remaining
                </span>
                <span className="text-xl font-mono font-black text-emerald-400 tracking-wider">
                  {timeLeft || '00:00'}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Current Highest Bid
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">₹{auction.currentHighestBid}</span>
                  <span className="text-slate-400 text-xs">/ {auction.unit}</span>
                </div>
                <p className="text-xs text-emerald-400 mt-2 font-semibold flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Highest Bidder: {auction.currentHighestBidderName || 'None'}
                </p>
              </div>

              {/* Bidding Form */}
              <form onSubmit={handlePlaceBid} className="space-y-3 pt-2">
                {bidError && (
                  <div className="p-3 rounded-xl bg-red-900/50 border border-red-700 text-red-200 text-xs">
                    {bidError}
                  </div>
                )}
                {bidSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-900/50 border border-emerald-700 text-emerald-200 text-xs">
                    {bidSuccess}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Your Bid Amount (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Min ₹${auction.currentHighestBid + 1}`}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-black text-lg focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-4 top-3.5 text-xs text-slate-400 font-bold">₹/{auction.unit}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                >
                  <Gavel className="w-5 h-5" /> Place Live Bid Now
                </button>
              </form>

            </div>

            {/* Transport & Safety Guarantee Badge */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> AgriLink Guarantee
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Winning bidders automatically initiate <strong>ESP8266 + DHT22 IoT transport monitoring</strong> with live temperature & humidity tracking directly to your retail warehouse.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* DEMO PAYMENT MODAL */}
      {showPaymentModal && (
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
                <span className="font-extrabold text-slate-900">{acceptedBid?.farmerName || 'Rajesh Kumar'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Crop & Quantity:</span>
                <span className="font-extrabold text-slate-900">{acceptedBid?.cropName || auction?.cropName} ({acceptedBid?.quantity || auction?.quantity} {acceptedBid?.unit || auction?.unit})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-800 font-black uppercase">Total Payable Amount:</span>
                <span className="text-lg font-black text-emerald-700">₹{totalPayableAmount.toLocaleString()}</span>
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
                  `Confirm & Complete Payment (₹${totalPayableAmount.toLocaleString()})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMMEDIATE BID ACCEPTED NOTIFICATION POPUP FOR WINNING BIDDER */}
      {showAcceptedPopup && acceptedBid && !paymentComplete && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setShowAcceptedPopup(false)}
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
                "Your bid has been accepted by the farmer. You have won the auction for {acceptedBid.cropName || auction?.cropName} at ₹{acceptedBid.finalPrice || auction?.currentHighestBid}."
              </p>
              <div className="pt-2 border-t border-emerald-200/60 flex justify-between text-xs font-bold text-slate-700">
                <span>Crop: <strong className="text-slate-900">{acceptedBid.cropName || auction?.cropName}</strong></span>
                <span>Winning Price: <strong className="text-emerald-700">₹{acceptedBid.finalPrice || auction?.currentHighestBid}/{acceptedBid.unit || 'kg'}</strong></span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Quantity: <strong>{acceptedBid.quantity || auction?.quantity} {acceptedBid.unit || 'kg'}</strong></span>
                <span>Total Deal: <strong className="text-emerald-800 text-sm">₹{totalPayableAmount.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowAcceptedPopup(false);
                  setShowPaymentModal(true);
                }}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                💳 Proceed to Payment (₹{totalPayableAmount.toLocaleString()})
              </button>
              <button
                onClick={() => setShowAcceptedPopup(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Dismiss & View Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETAILER SELECTION MODAL */}
      {showRetailerModal && (
        <RetailerSelectionModal
          auction={{
            id: id || auction?._id,
            cropName: auction?.cropName,
            quantity: auction?.quantity,
            unit: auction?.unit,
            farmerId: auction?.farmerId,
            farmerName: auction?.farmerName,
            winnerId: user?.id,
            winnerName: user?.name,
            transportId: acceptedBid?.transportId || `TR-${Math.floor(100000 + Math.random() * 900000)}`
          }}
          onClose={() => setShowRetailerModal(false)}
          onConfirm={({ transportId }) => {
            setShowRetailerModal(false);
            setPaymentComplete(true);
            setAcceptedBid(prev => ({ ...(prev || {}), paymentStatus: 'PAID', status: 'ASSIGNED', transportId }));
            navigate(`/transport/${transportId}`);
          }}
        />
      )}
    </div>
  );
}

