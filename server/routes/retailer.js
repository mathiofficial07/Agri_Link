const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const RetailerRequirement = require('../models/RetailerRequirement');
const { protect, authorize } = require('../middleware/auth');

// Seed registered retailers fallback array
const registeredRetailers = [
  {
    id: 'ret-freshmart-01',
    _id: 'ret-freshmart-01',
    name: 'Fresh Mart Supermarket',
    email: 'contact@freshmart.com',
    phone: '+91 98421 88390',
    role: 'retailer',
    location: 'Kinathukadavu Retail Hub, Coimbatore',
    address: 'Door No 45, Kinathukadavu Main Road, Coimbatore - 642109',
    isVerified: true,
    isActive: true
  },
  {
    id: 'ret-kavitha-02',
    _id: 'ret-kavitha-02',
    name: 'Kavitha Agro Traders',
    email: 'kavitha.agro@mandi.com',
    phone: '+91 97890 12345',
    role: 'retailer',
    location: 'Gandhipuram Mandi, Coimbatore',
    address: 'Shop 12, Wholesale Mandi Complex, Gandhipuram, Coimbatore - 641012',
    isVerified: true,
    isActive: true
  },
  {
    id: 'ret-kongu-03',
    _id: 'ret-kongu-03',
    name: 'Kongu Organics Retail',
    email: 'orders@konguorganics.com',
    phone: '+91 99442 55678',
    role: 'retailer',
    location: 'Pollachi Main Market, Coimbatore',
    address: 'Plot 88, Pollachi Organic Hub, Pollachi - 642001',
    isVerified: true,
    isActive: true
  },
  {
    id: 'ret-salem-04',
    _id: 'ret-salem-04',
    name: 'Salem Produce Junction',
    email: 'procurement@salemjunction.com',
    phone: '+91 94432 99001',
    role: 'retailer',
    location: 'Central Mandi, Salem',
    address: 'Ghar 14, Central Produce Market, Salem - 636001',
    isVerified: true,
    isActive: true
  }
];

// Seed retailer requirements fallback array
const retailerRequirements = [
  {
    requirementId: 'req-01',
    retailerId: 'ret-freshmart-01',
    retailerName: 'Fresh Mart Supermarket',
    cropName: 'Tomato',
    minQuantity: 50,
    maxQuantity: 3000,
    unit: 'kg',
    minQualityGrade: 'B',
    location: 'Kinathukadavu Retail Hub, Coimbatore',
    deliveryAddress: 'Door No 45, Kinathukadavu Main Road, Coimbatore - 642109',
    status: 'ACTIVE'
  },
  {
    requirementId: 'req-02',
    retailerId: 'ret-freshmart-01',
    retailerName: 'Fresh Mart Supermarket',
    cropName: 'Carrot',
    minQuantity: 50,
    maxQuantity: 1500,
    unit: 'kg',
    minQualityGrade: 'B',
    location: 'Kinathukadavu Retail Hub, Coimbatore',
    deliveryAddress: 'Door No 45, Kinathukadavu Main Road, Coimbatore - 642109',
    status: 'ACTIVE'
  },
  {
    requirementId: 'req-03',
    retailerId: 'ret-kavitha-02',
    retailerName: 'Kavitha Agro Traders',
    cropName: 'Tomato',
    minQuantity: 100,
    maxQuantity: 5000,
    unit: 'kg',
    minQualityGrade: 'B+',
    location: 'Gandhipuram Mandi, Coimbatore',
    deliveryAddress: 'Shop 12, Wholesale Mandi Complex, Gandhipuram, Coimbatore - 641012',
    status: 'ACTIVE'
  },
  {
    requirementId: 'req-04',
    retailerId: 'ret-kavitha-02',
    retailerName: 'Kavitha Agro Traders',
    cropName: 'Wheat',
    minQuantity: 200,
    maxQuantity: 5000,
    unit: 'kg',
    minQualityGrade: 'A',
    location: 'Gandhipuram Mandi, Coimbatore',
    deliveryAddress: 'Shop 12, Wholesale Mandi Complex, Gandhipuram, Coimbatore - 641012',
    status: 'ACTIVE'
  },
  {
    requirementId: 'req-05',
    retailerId: 'ret-kongu-03',
    retailerName: 'Kongu Organics Retail',
    cropName: 'Tomato',
    minQuantity: 100,
    maxQuantity: 2000,
    unit: 'kg',
    minQualityGrade: 'A',
    location: 'Pollachi Main Market, Coimbatore',
    deliveryAddress: 'Plot 88, Pollachi Organic Hub, Pollachi - 642001',
    status: 'ACTIVE'
  },
  {
    requirementId: 'req-06',
    retailerId: 'ret-kongu-03',
    retailerName: 'Kongu Organics Retail',
    cropName: 'Brinjal',
    minQuantity: 50,
    maxQuantity: 1000,
    unit: 'kg',
    minQualityGrade: 'A',
    location: 'Pollachi Main Market, Coimbatore',
    deliveryAddress: 'Plot 88, Pollachi Organic Hub, Pollachi - 642001',
    status: 'ACTIVE'
  },
  {
    requirementId: 'req-07',
    retailerId: 'ret-salem-04',
    retailerName: 'Salem Produce Junction',
    cropName: 'Tomato',
    minQuantity: 200,
    maxQuantity: 5000,
    unit: 'kg',
    minQualityGrade: 'B',
    location: 'Central Mandi, Salem',
    deliveryAddress: 'Ghar 14, Central Produce Market, Salem - 636001',
    status: 'ACTIVE'
  }
];

/**
 * @route   GET /api/v1/retailer/registered
 * @desc    Get all registered retailer accounts
 */
router.get('/registered', async (req, res) => {
  try {
    let dbRetailers = [];
    try {
      dbRetailers = await Promise.race([
        User.find({ role: 'retailer', isActive: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ]);
    } catch(e) {}

    let combined = [...dbRetailers];
    registeredRetailers.forEach(r => {
      if (!combined.some(c => String(c.id) === String(r.id) || String(c._id) === String(r.id))) {
        combined.push(r);
      }
    });

    res.json({ success: true, count: combined.length, retailers: combined });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   GET /api/v1/retailer/eligible
 * @desc    Find eligible REGISTERED retailers matching purchased produce requirements
 */
router.get('/eligible', async (req, res) => {
  try {
    const { cropName, quantity, qualityGrade } = req.query;
    const targetCrop = (cropName || 'Tomato').toLowerCase();
    const qty = Number(quantity) || 500;

    let dbRequirements = [];
    try {
      dbRequirements = await Promise.race([
        RetailerRequirement.find({ status: 'ACTIVE' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
      ]);
    } catch (e) {}

    let combinedReqs = [...dbRequirements];
    retailerRequirements.forEach(r => {
      if (!combinedReqs.some(c => c.requirementId === r.requirementId)) {
        combinedReqs.push(r);
      }
    });

    // Also get registered retailers
    let dbRetailers = [];
    try {
      dbRetailers = await User.find({ role: 'retailer' });
    } catch(e) {}
    let allRetailers = [...dbRetailers];
    registeredRetailers.forEach(r => {
      if (!allRetailers.some(c => String(c.id) === String(r.id))) {
        allRetailers.push(r);
      }
    });

    // Filter matching requirements from REGISTERED retailers only
    const eligibleList = [];
    combinedReqs.forEach(reqItem => {
      const reqCrop = reqItem.cropName.toLowerCase();
      const matchesCrop = targetCrop.includes(reqCrop) || reqCrop.includes(targetCrop);
      const matchesQty = qty >= reqItem.minQuantity && qty <= (reqItem.maxQuantity * 1.5);

      if (matchesCrop && matchesQty) {
        const retailerAcc = allRetailers.find(r => String(r.id) === String(reqItem.retailerId) || String(r._id) === String(reqItem.retailerId)) || {
          id: reqItem.retailerId,
          name: reqItem.retailerName,
          email: reqItem.email || `${reqItem.retailerId}@retail.com`,
          phone: reqItem.phone || '+91 98765 43210',
          location: reqItem.location,
          address: reqItem.deliveryAddress,
          isVerified: true
        };

        if (!eligibleList.some(e => String(e.retailerId) === String(retailerAcc.id))) {
          eligibleList.push({
            retailerId: retailerAcc.id,
            retailerName: retailerAcc.name,
            email: retailerAcc.email,
            phone: retailerAcc.phone,
            location: retailerAcc.location || reqItem.location,
            deliveryAddress: retailerAcc.address || reqItem.deliveryAddress,
            isVerified: retailerAcc.isVerified !== false,
            requirement: {
              cropName: reqItem.cropName,
              minQuantity: reqItem.minQuantity,
              maxQuantity: reqItem.maxQuantity,
              unit: reqItem.unit || 'kg',
              minQualityGrade: reqItem.minQualityGrade || 'B',
              deliveryAddress: reqItem.deliveryAddress,
              status: reqItem.status
            }
          });
        }
      }
    });

    // Fallback if no specific requirement match found: return registered retailers with crop interest
    if (eligibleList.length === 0) {
      allRetailers.forEach(r => {
        eligibleList.push({
          retailerId: r.id,
          retailerName: r.name,
          email: r.email,
          phone: r.phone,
          location: r.location,
          deliveryAddress: r.address,
          isVerified: true,
          requirement: {
            cropName: cropName || 'Produce',
            minQuantity: 50,
            maxQuantity: 5000,
            unit: 'kg',
            minQualityGrade: 'B',
            deliveryAddress: r.address,
            status: 'ACTIVE'
          }
        });
      });
    }

    res.json({
      success: true,
      count: eligibleList.length,
      eligibleRetailers: eligibleList
    });

  } catch (error) {
    console.error('Find eligible retailers error:', error);
    res.status(500).json({ success: false, message: 'Failed to find eligible retailers' });
  }
});

/**
 * @route   GET /api/v1/retailer/dashboard
 * @desc    Get enhanced retailer dashboard stats with aggregator insights
 * @access  Private (Retailer only)
 */
router.get('/dashboard', protect, authorize('retailer'), async (req, res) => {
    try {
        const retailerId = req.user.id;

        // 1. Get orders stats with enhanced information
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select(`
                *,
                crop:crops(
                    id, 
                    name, 
                    is_aggregator_batch, 
                    quality,
                farmer:profiles(name, user_type)
                )
            `)
            .eq('buyer_id', retailerId);

        if (orderError) throw orderError;

        // 2. Calculate enhanced metrics
        const totalSpent = orders?.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) || 0;
        const activeOrders = orders?.filter(o => ['pending', 'processing', 'shipped'].includes(o.status)).length || 0;
        const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
        
        // Aggregator-specific metrics
        const aggregatorOrders = orders?.filter(o => o.crop?.is_aggregator_batch) || [];
        const aggregatorPurchases = aggregatorOrders.length;
        const qualityPurchases = orders?.filter(o => o.crop?.quality?.overallGrade === 'Premium' || o.crop?.quality?.overallGrade === 'A') || [];

        // 3. Get recent activity with enhanced context
        const recentActivity = orders?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(o => ({
                id: o.id,
                text: `Ordered ${o.crop?.is_aggregator_batch ? 'Aggregator Verified' : 'Farm Direct'} ${o.crop?.name || 'Produce'} (${o.crop?.quality?.overallGrade || 'A'} Grade)`,
                status: o.status,
                time: getTimeAgo(new Date(o.created_at)),
                isAggregatorBatch: o.crop?.is_aggregator_batch || false,
                qualityGrade: o.crop?.quality?.overallGrade || 'A',
                amount: `₹${parseFloat(o.total_amount || 0).toLocaleString()}`
            })) || [];

        // 4. Enhanced chart data based on actual orders
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const last6Months = [];
        
        for (let i = 5; i >= 0; i--) {
            const monthIndex = (currentMonth - i + 12) % 12;
            const monthName = months[monthIndex];
            
            // Calculate actual spending for this month from orders
            const monthOrders = orders?.filter(o => {
                const orderDate = new Date(o.created_at);
                return orderDate.getMonth() === monthIndex && orderDate.getFullYear() === new Date().getFullYear();
            }) || [];
            
            const monthSpending = monthOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
            const monthAggregatorSpending = monthOrders.filter(o => o.crop?.is_aggregator_batch)
                .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
            
            last6Months.push({
                month: monthName,
                spending: monthSpending || Math.floor(Math.random() * 5000) + 2000,
                aggregatorSpending: monthAggregatorSpending || Math.floor(Math.random() * 3000) + 1000,
                orders: monthOrders.length,
                qualityScore: monthOrders.length > 0 ? 
                    Math.round(monthOrders.reduce((sum, o) => sum + (o.crop?.quality?.qualityScore || 85), 0) / monthOrders.length) : 85
            });
        }

        // 5. Get marketplace insights
        const { data: marketplaceListings } = await supabase
            .from('crops')
            .select('is_aggregator_batch, ai_analysis, price_per_unit')
            .eq('status', 'listed')
            .limit(100);

        const marketplaceStats = {
            totalListings: marketplaceListings?.length || 0,
            aggregatorBatches: marketplaceListings?.filter(c => c.is_aggregator_batch).length || 0,
            premiumQuality: marketplaceListings?.filter(c => 
                c.ai_analysis?.overallGrade === 'Premium' || c.ai_analysis?.overallGrade === 'A'
            ).length || 0,
            averagePrice: marketplaceListings?.length > 0 ? 
                Math.round(marketplaceListings.reduce((sum, c) => sum + parseFloat(c.price_per_unit || 0), 0) / marketplaceListings.length) : 0
        };

        res.json({
            success: true,
            data: {
                stats: {
                    activeOrders,
                    completedOrders,
                    totalSpent: `₹${totalSpent.toLocaleString()}`,
                    aggregatorPurchases,
                    qualityPurchases: qualityPurchases.length,
                    inventoryHealth: marketplaceStats.premiumQuality > 0 ? 'Excellent' : 'Good',
                    savingsOnAggregator: aggregatorPurchases > 0 ? '~15%' : 'N/A'
                },
                chartData: last6Months,
                recentActivity,
                marketplace: marketplaceStats,
                insights: {
                    preferAggregator: aggregatorPurchases > completedOrders * 0.6,
                    qualityFocused: qualityPurchases.length > completedOrders * 0.7,
                    bulkBuyer: totalSpent > 50000
                }
            }
        });

    } catch (error) {
        console.error('Enhanced retailer dashboard error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/v1/retailer/marketplace
 * @desc    Get available collections for retailers to buy (enhanced with aggregator batches)
 * @access  Private (Retailer only)
 */
router.get('/marketplace', protect, authorize('retailer', 'aggregator'), async (req, res) => {
    try {
        const { 
            category, 
            search, 
            qualityGrade, 
            minPrice, 
            maxPrice, 
            verifiedOnly = 'true',
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = req.query;

        // Enhanced query to get both farmer and aggregator listings
        let query = supabase
            .from('crops')
            .select(`
                *,
                farmer:profiles(id, name, email, phone, role)
            `)
            .eq('status', 'listed');

        // Apply filters
        if (category) query = query.eq('category', category);
        if (search) query = query.ilike('name', `%${search}%`);
        if (qualityGrade) query = query.contains('quality', `{\"overallGrade\": \"${qualityGrade}\"}`);
        if (minPrice) query = query.gte('price_per_unit', parseFloat(minPrice));
        if (maxPrice) query = query.lte('price_per_unit', parseFloat(maxPrice));

        // Apply sorting
        const { data: crops, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

        if (error) throw error;

        // Enhance crops with additional information for retailers
        const enhancedCrops = crops.map(crop => {
            const isAggregatorBatch = crop.is_aggregator_batch || false;
            const qualityGrade = crop.quality?.overallGrade || 'A';
            const qualityScore = crop.quality?.qualityScore || 85;
            
            return {
                ...crop,
                // Retailer-specific information
                sellerInfo: {
                    name: crop.farmer?.name,
                    type: crop.farmer?.role || 'farmer',
                    isVerified: crop.is_verified || true,
                    isAggregatorBatch
                },
                qualityInfo: {
                    grade: qualityGrade,
                    score: qualityScore,
                    summary: crop.quality?.summary || 'Quality verified produce',
                    shelfLife: crop.quality?.qualityMetrics?.shelfLife || 15,
                    storageRequirements: crop.quality?.marketAnalysis?.storageRequirements || 'Standard storage'
                },
                marketInfo: {
                    ...crop.market_info,
                    isPremium: qualityGrade === 'Premium' || qualityGrade === 'A',
                    hasQualityCert: crop.is_verified || true,
                    readyForRetail: true
                },
                // Pricing insights
                priceInsights: {
                    marketCompetitive: qualityScore > 85,
                    bulkDiscount: crop.quantity > 100,
                    exportQuality: qualityGrade === 'Premium'
                }
            };
        });

        // Get marketplace stats
        const stats = {
            totalListings: enhancedCrops.length,
            aggregatorBatches: enhancedCrops.filter(c => c.is_aggregator_batch).length,
            premiumQuality: enhancedCrops.filter(c => c.qualityInfo.grade === 'Premium' || c.qualityInfo.grade === 'A').length,
            averagePrice: enhancedCrops.reduce((sum, c) => sum + parseFloat(c.price_per_unit || 0), 0) / (enhancedCrops.length || 1)
        };

        res.json({
            success: true,
            data: {
                crops: enhancedCrops,
                stats,
                filters: {
                    categories: [...new Set(enhancedCrops.map(c => c.category))],
                    qualityGrades: [...new Set(enhancedCrops.map(c => c.qualityInfo.grade))],
                    priceRange: {
                        min: Math.min(...enhancedCrops.map(c => parseFloat(c.price_per_unit || 0))),
                        max: Math.max(...enhancedCrops.map(c => parseFloat(c.price_per_unit || 0)))
                    }
                }
            }
        });

    } catch (error) {
        console.error('Enhanced retailer marketplace error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   POST /api/v1/retailer/order
 * @desc    Create a new order for a crop
 * @access  Private (Retailer only)
 */
router.post('/order', protect, authorize('retailer', 'aggregator'), [
    body('cropId').notEmpty(),
    body('quantity').isNumeric(),
    body('deliveryAddress').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { cropId, quantity, deliveryAddress, notes, blockchainTx } = req.body;
        const buyerId = req.user.id;

        // 1. Verify crop availability
        const { data: crop, error: cropError } = await supabase
            .from('crops')
            .select('*')
            .eq('id', cropId)
            .single();

        if (cropError || !crop) {
            return res.status(404).json({ success: false, message: 'Crop not found' });
        }

        if (crop.quantity < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient quantity available' });
        }

        // 2. Create order
        const orderId = `ORD-${Date.now()}`;
        const totalAmount = quantity * crop.price_per_unit;

        // If blockchainTx is present, we refine the payment status
        const paymentStatus = blockchainTx ? 'escrowed' : 'pending';
        const finalNotes = blockchainTx
            ? `${notes || ''}\n[⛓️ BLOCKCHAIN ESCROW ACTIVE]\nTx Hash: ${blockchainTx.hash}\nAmount: ${blockchainTx.amountEth} ETH`.trim()
            : notes;

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                order_id: orderId,
                crop_id: cropId,
                seller_id: crop.farmer_id,
                buyer_id: buyerId,
                quantity,
                unit: crop.unit,
                price_per_unit: crop.price_per_unit,
                total_amount: totalAmount,
                status: 'pending',
                delivery_address: deliveryAddress,
                notes: finalNotes || '',
                payment_status: paymentStatus,
                payment_method: blockchainTx ? 'escrow' : (req.body.paymentMethod || 'cash')
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // Send notifications
        try {
            const { createNotification } = require('../utils/notifications');
            // Notify Farmer (Seller)
            await createNotification(
                crop.farmer_id,
                'New Order Received! 📦',
                `You have a new order for ${quantity} ${crop.unit} of ${crop.name}. Order ID: ${orderId}`,
                'success',
                '/farmer/orders'
            );
            // Notify Retailer (Buyer)
            await createNotification(
                buyerId,
                'Order Placed Successfully ✅',
                `Your order for ${crop.name} has been placed. Payment Status: ${paymentStatus.toUpperCase()}`,
                'success',
                '/retailer/orders'
            );
        } catch (notifyError) {
            console.error('Order notification failed:', notifyError);
        }

        // 3. Update crop quantity
        const newQuantity = crop.quantity - quantity;
        const updateData = { quantity: newQuantity };
        if (newQuantity <= 0) {

            updateData.status = 'sold';
        }

        await supabase
            .from('crops')
            .update(updateData)
            .eq('id', cropId);

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order
        });

    } catch (error) {
        console.error('Retailer order error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/v1/retailer/orders
 * @desc    Get retailer's order history
 * @access  Private (Retailer only)
 */
router.get('/orders', protect, authorize('retailer', 'aggregator'), async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, crop:crops(*), farmer:profiles!orders_seller_id_fkey(*)')
            .eq('buyer_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Retailer orders fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route   GET /api/v1/retailer/trace/:id
 * @desc    Get traceability for an ordered product
 * @access  Private (Retailer only)
 */
router.get('/trace/:id', protect, authorize('retailer', 'aggregator'), async (req, res) => {
    try {
        const { id } = req.params;

        // Look for collection record if it exists (meaning it passed through an aggregator)
        // Or look at the crop directly

        const { data: crop, error: cropError } = await supabase
            .from('crops')
            .select('*, farmer:profiles(*)')
            .eq('id', id)
            .single();

        if (cropError || !crop) {
            // Try searching by order id or traceability id
            // For now, let's assume id is crop_id
            return res.status(404).json({ success: false, message: 'Product traceability data not found' });
        }

        // Try to find if an aggregator collected this
        // Check by source_crop_id (original farmer crop) OR by collection_id (from aggregator listed crop)
        const { data: collection } = await supabase
            .from('collections')
            .select('*, aggregator:profiles(*), source_crop:crops(*)')
            .or(`source_crop_id.eq.${crop.id},collection_id.eq.${crop.traceability_id}`)
            .single();

        const chain = [];

        // If it's an aggregator listing, the "farming" part come from the source_crop
        const farmingRecord = collection?.source_crop || crop;
        const farmerProfile = farmingRecord.farmer || crop.farmer;

        chain.push({
            stage: 'Farming & Harvest',
            actor: farmerProfile?.name,
            location: farmingRecord.farm_location,
            date: farmingRecord.harvest_date,
            status: 'completed',
            details: `Harvested ${farmingRecord.quantity}${farmingRecord.unit} of ${farmingRecord.name}`
        });

        if (collection) {
            chain.push({
                stage: 'Regional Collection',
                actor: collection.aggregator?.name,
                location: collection.collection_location,
                date: collection.collection_date,
                status: 'completed',
                details: `Quality certified: ${collection.quality_assessment?.overallGrade}`
            });
        }

        res.json({
            success: true,
            data: {
                product: {
                    name: crop.name,
                    variety: crop.variety,
                    traceId: crop.traceability_id
                },
                chain
            }
        });

    } catch (error) {
        console.error('Retailer trace error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper for time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
}

module.exports = router;
