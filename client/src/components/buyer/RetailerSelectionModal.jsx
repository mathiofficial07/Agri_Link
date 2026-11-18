import React, { useState, useEffect } from 'react';
import { Store, MapPin, CheckCircle2, ShieldCheck, ArrowRight, Loader2, Sparkles, X, Truck } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

export default function RetailerSelectionModal({ auction, onClose, onConfirm }) {
  const [eligibleRetailers, setEligibleRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  const cropName = auction?.cropName || auction?.name || 'Farm Produce';
  const quantity = auction?.quantity || 500;
  const unit = auction?.unit || 'kg';
  const transportId = auction?.transportId || `TR-${Math.floor(100000 + Math.random() * 900000)}`;

  useEffect(() => {
    const fetchEligibleRetailers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BACKEND_URL}/api/v1/retailer/eligible`, {
          params: {
            cropName,
            quantity,
            qualityGrade: auction?.qualityGrade || 'A'
          },
          timeout: 4000
        });

        if (res.data?.success && Array.isArray(res.data.eligibleRetailers)) {
          setEligibleRetailers(res.data.eligibleRetailers);
        } else {
          setEligibleRetailers([]);
        }
      } catch (err) {
        console.error('Error fetching registered retailers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEligibleRetailers();
  }, [cropName, quantity, auction?.qualityGrade]);

  const handleConfirmAssignment = async () => {
    if (!selectedRetailer) return;

    try {
      setSubmitting(true);
      const unitPrice = Number(auction?.finalPrice || auction?.winningPrice || auction?.price_per_unit || 30);
      const baseProduceAmount = unitPrice * quantity;
      const bidderProfit = quantity * 2;
      const totalProduceAmount = baseProduceAmount + bidderProfit;
      const transportCost = Number(auction?.transportCost || 2500);
      const totalAmount = totalProduceAmount + transportCost;

      const payload = {
        transportId,
        auctionId: auction?.id || auction?._id || `auc-${Date.now()}`,
        farmerId: auction?.farmerId || 'farmer-rajesh',
        farmerName: auction?.farmerName || 'Rajesh Kumar',
        winnerId: auction?.winnerId || 'buyer-101',
        winnerName: auction?.winnerName || 'Kavitha Agro Traders',
        winnerPhone: auction?.winnerPhone || '+91 98765 43213',
        retailerId: selectedRetailer.retailerId,
        retailerName: selectedRetailer.retailerName,
        destinationLocation: selectedRetailer.deliveryAddress || selectedRetailer.location,
        cropName,
        quantity,
        unit,
        qualityGrade: auction?.qualityGrade || 'Grade A (Organic)',
        finalPrice: unitPrice,
        baseProduceAmount,
        bidderProfit,
        totalProduceAmount,
        produceAmount: totalProduceAmount,
        transportCost,
        totalAmount
      };

      const res = await axios.post(`${BACKEND_URL}/api/v1/transport/assign-retailer`, payload);

      // Broadcast event locally for instant cross-tab / window response
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel('agritrack_events');
          bc.postMessage({ type: 'ORDER_ASSIGNED_TO_RETAILER', transport: payload });
        } catch (e) {}
      }

      // Persist in localStorage for instant frontend reactivity
      const updatedItem = {
        ...(auction || {}),
        id: auction?.id || auction?._id || `auc-${Date.now()}`,
        _id: auction?._id || auction?.id || `auc-${Date.now()}`,
        cropName,
        quantity,
        unit,
        paymentStatus: 'PAID',
        status: 'AWAITING_RETAILER_PAYMENT',
        transportStatus: 'AWAITING_RETAILER_PAYMENT',
        retailerId: selectedRetailer.retailerId,
        retailerName: selectedRetailer.retailerName,
        winnerPhone: payload.winnerPhone,
        destinationLocation: selectedRetailer.deliveryAddress || selectedRetailer.location,
        finalPrice: unitPrice,
        baseProduceAmount,
        bidderProfit,
        produceAmount: totalProduceAmount,
        transportCost,
        totalAmount,
        transportId
      };

      try {
        const localAccepted = JSON.parse(localStorage.getItem('agritrack_accepted_bids') || '[]');
        let found = false;
        const updatedBids = localAccepted.map(b => {
          if (
            (b.id && (b.id === auction?.id || b.id === auction?._id)) ||
            (b._id && (b._id === auction?.id || b._id === auction?._id)) ||
            (b.transportId && b.transportId === transportId) ||
            (b.cropName && (b.cropName === cropName || b.name === cropName))
          ) {
            found = true;
            return { ...b, ...updatedItem };
          }
          return b;
        });

        if (!found) {
          updatedBids.unshift(updatedItem);
        }
        localStorage.setItem('agritrack_accepted_bids', JSON.stringify(updatedBids));
      } catch(e) {}

      try {
        const localSold = JSON.parse(localStorage.getItem('completed_sold_crops') || '[]');
        let found = false;
        const updatedSold = localSold.map(b => {
          if (
            (b.id && (b.id === auction?.id || b.id === auction?._id)) ||
            (b._id && (b._id === auction?.id || b._id === auction?._id)) ||
            (b.transportId && b.transportId === transportId) ||
            (b.cropName && (b.cropName === cropName || b.name === cropName))
          ) {
            found = true;
            return { ...b, ...updatedItem };
          }
          return b;
        });

        if (!found) {
          updatedSold.unshift(updatedItem);
        }
        localStorage.setItem('completed_sold_crops', JSON.stringify(updatedSold));
      } catch(e) {}

      try {
        const localAssigned = JSON.parse(localStorage.getItem('agritrack_assigned_transports') || '[]');
        const existingIdx = localAssigned.findIndex(t => t.transportId === transportId);
        if (existingIdx !== -1) {
          localAssigned[existingIdx] = updatedItem;
        } else {
          localAssigned.unshift(updatedItem);
        }
        localStorage.setItem('agritrack_assigned_transports', JSON.stringify(localAssigned));
      } catch(e) {}

      setConfirmedSuccess(true);
      setTimeout(() => {
        if (onConfirm) {
          onConfirm({
            transportId,
            selectedRetailer,
            payload
          });
        }
      }, 1000);

    } catch (error) {
      console.error('Error confirming retailer assignment:', error);
      alert('Failed to assign retailer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> REGISTERED RETAILERS ONLY
              </span>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md uppercase">
                PAYMENT CONFIRMED
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">Select Registered Retailer for Delivery</h2>
            <p className="text-xs text-slate-500 font-medium">
              Match your purchased produce ({quantity} {unit} {cropName}) with active registered retailer requirements.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Purchase Context Banner */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Purchased Harvest</span>
            <span className="font-extrabold text-slate-900">{cropName} ({quantity} {unit})</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Transport ID</span>
            <span className="font-mono font-bold text-emerald-700">{transportId}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Farmer Origin</span>
            <span className="font-extrabold text-slate-800">{auction?.farmerName || 'Rajesh Kumar'}</span>
          </div>
        </div>

        {/* Retailers List */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Querying database for registered retailers with matching requirements...
            </p>
          </div>
        ) : eligibleRetailers.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <Store className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No Eligible Registered Retailer Found</p>
            <p className="text-xs text-slate-500 mt-1">Please try again later as registered retailers update their active requirements.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Matching Registered Retailers ({eligibleRetailers.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleRetailers.map((retailer) => {
                const isSelected = selectedRetailer?.retailerId === retailer.retailerId;

                return (
                  <div
                    key={retailer.retailerId}
                    onClick={() => setSelectedRetailer(retailer)}
                    className={`cursor-pointer rounded-2xl p-4 border-2 transition flex flex-col justify-between space-y-3 relative ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase">
                            🟢 VERIFIED REGISTERED
                          </span>
                          <h4 className="text-base font-extrabold text-slate-900 mt-1">{retailer.retailerName}</h4>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <p className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{retailer.location}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium pl-4 truncate">
                          {retailer.deliveryAddress}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Required Produce:</span>
                        <span className="font-extrabold text-slate-800">{retailer.requirement?.cropName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Accepted Quantity:</span>
                        <span className="font-bold text-slate-800">
                          {retailer.requirement?.minQuantity} - {retailer.requirement?.maxQuantity} {retailer.requirement?.unit || 'kg'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Quality Requirement:</span>
                        <span className="font-bold text-emerald-700">Grade {retailer.requirement?.minQualityGrade || 'B'} & Above</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRetailer(retailer);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ Selected Retailer' : 'Select Retailer'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Confirmation Panel */}
        {selectedRetailer && (
          <div className="bg-emerald-950 text-white p-5 rounded-2xl border border-emerald-800 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Selected Registered Retailer</span>
                <h4 className="text-lg font-black text-white">{selectedRetailer.retailerName}</h4>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg">
                READY FOR ASSIGNMENT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-100 border-t border-emerald-800/80 pt-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">Destination Location</span>
                <span className="font-medium">{selectedRetailer.deliveryAddress || selectedRetailer.location}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 uppercase font-bold block">Dynamic Transport ID</span>
                <span className="font-mono font-bold text-emerald-300">{transportId}</span>
              </div>
            </div>

            <button
              disabled={submitting || confirmedSuccess}
              onClick={handleConfirmAssignment}
              className="w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Updating Transport & Notifying Retailer...
                </>
              ) : confirmedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                  Retailer Confirmed! Initiating Transport...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  Confirm Retailer & Start Transportation
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
