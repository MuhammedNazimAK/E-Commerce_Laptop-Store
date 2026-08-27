const Cart = require('../models/cartModel');
const Address = require('../models/addressModel');
const Product = require('../models/productModel');
const ProductOffer = require('../models/productOfferModel');
const CategoryOffer = require('../models/categoryOfferModel');
const StatusCodes = require('../public/javascript/statusCodes');
const mongoose = require('mongoose');


async function getProductWithOffers(productId) {
  const product = await Product.findById(productId).populate('categories');

  const currentDate = new Date();

  // Get product-specific offers
  const productOffers = await ProductOffer.find({
    product: productId,
    isActive: true,
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate }
  });


  // Get category offers
  const categoryOffers = await CategoryOffer.find({
    category: product.categories._id,
    isActive: true,
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate }
  });


  // Get default offers (product offers with isDefault set to true)
  const defaultOffers = await ProductOffer.find({
    isDefault: true,
    isActive: true,
    startDate: { $lte: currentDate },
    endDate: { $gte: currentDate }
  });


  const allOffers = [...productOffers, ...categoryOffers, ...defaultOffers];

  let bestOffer = { discountPercentage: 0, offerName: '' };
  let discountedPrice = product.salePrice;

  if (allOffers.length > 0) {
    bestOffer = allOffers.reduce((best, current) =>
      current.discountPercentage > best.discountPercentage ? current : best
    , { discountPercentage: 0, offerName: '' });

    discountedPrice = product.price * (1 - bestOffer.discountPercentage / 100);
  }

  return {
    ...product.toObject(),
    originalPrice: product.price,
    discountedPrice: discountedPrice,
    discount: bestOffer.discountPercentage,
    offerName: bestOffer.offerName
  };
}

const addToCart = async (req, res) => {
  let userId = req.session.user?._id || req.session.guestId;
  try {
    const { productId, quantity } = req.body;
    const qty = Number(quantity);

    const product = await Product.findById(productId);
    if (!product) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found' });
    if (product.stock < qty) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Not enough stock' });

    let cart = await Cart.findOne({ user: userId }) || new Cart({ user: userId, items: [] });
    const item = cart.items.find(i => i.product.toString() === productId);
    const newQty = (item?.quantity ?? 0) + qty;

    if (newQty > 5) return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Max quantity per item is 5' });

    if (item) item.quantity = newQty;
    else cart.items.push({ product: productId, quantity: qty });

    await cart.save();
    return res.json({ success: true, cartItemCount: cart.items.length });
  } catch (err) {
    console.error(err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

const removeFromCart = async (req, res) => {
  try {
        
    const { productId } = req.body;
    
    const userId = req.session.user?._id || req.session.guestId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Invalid product ID' });
    }
    
    const cart = await Cart.findOne({ user: userId });  
    
    if (!cart) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Cart not found' });
    }

    const result = await Cart.updateOne({ user: userId }, { $pull: { 'items': { 'product': new mongoose.Types.ObjectId(productId) } } });
    

    if (result.modifiedCount === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Product not found in cart' });
    }
    
    return res.status(StatusCodes.OK).json({ success: true, message: 'Product removed from cart successfully' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};


const getCart = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.guestId;

    const cart = await Cart.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$items' },
      { $unwind: '$productDetails' },
      {
        $match: {
          $expr: { $eq: ['$items.product', '$productDetails._id'] }
        }
      },
      {
        $group: {
          _id: '$_id',
          user: { $first: '$user' },
          items: {
            $push: {
              product: '$productDetails',
              quantity: '$items.quantity'
            }
          }
        }
      }
    ]);

    if (cart.length === 0) {
      return res.render('user/cart', { items: [], subtotal: 0, shipping: 0, total: 0 });
    }

    let subtotal = 0;
    let shipping = 25;

    const items = await Promise.all(cart[0].items.map(async (item) => {
      const productWithOffers = await getProductWithOffers(item.product._id);
      const price = productWithOffers.discountedPrice;
      const total = price * item.quantity;
      subtotal += total;
      return {
        ...productWithOffers,
        quantity: item.quantity,
        total,
      };
    }));

    const total = subtotal + shipping;

    return res.render('user/cart', {
      items,
      subtotal,
      shipping,
      total,
    });
  } catch (error) {
    console.error('Error in getCart:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};


const updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.session.user?._id || req.session.guestId;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex > -1) {


      if (quantity > 5) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Quantity cannot exceed 5 for this item', quantity: cart.items[itemIndex].quantity });
      }

      const productWithOffers = await getProductWithOffers(productId);

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = productWithOffers.discountedPrice;

      await cart.save();
      return res.status(StatusCodes.OK).json({ success: true,
        message: 'Product quantity updated successfully',
        updatedPrice: productWithOffers.discountedPrice,
        updatedTotal: productWithOffers.discountedPrice * quantity });
    } else {
      
      if (quantity > 5) {
        return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Quantity cannot exceed 5 for this item', quantity: 0 });
      }
      cart.items.push({ product: productId, quantity: 0 });
      await cart.save();
      return res.status(StatusCodes.OK).json({ success: true, message: 'Product quantity updated successfully' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
}


const checkout = async (req, res) => {
  try {
    let userId = req.session.user?._id;
    const addressId = await Address.findOne({ userId: userId });
    
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.render('user/checkout', { items: [], priceDetails: {} });
    }

    let totalSavings = 0;

    const items = await Promise.all(cart.items.map(async (item, index) => {
      const productWithOffers = await getProductWithOffers(item.product._id);
      const getValidPrice = (price) => {
        const parsedPrice = parseFloat(price);
        return isNaN(parsedPrice) ? 0 : parsedPrice;
      };
      
      const price = getValidPrice(productWithOffers.discountedPrice || productWithOffers.price);
      const originalPrice = getValidPrice(productWithOffers.price);
      const total = price * item.quantity;
      
      // Calculate savings for this item
      const itemSavings = Math.max(0, (originalPrice - price) * item.quantity);
      
      totalSavings += itemSavings;

      return {
        ...productWithOffers,
        quantity: item.quantity,
        total,
        addressId,
        itemSavings,
      };
    }));

    // Calculate price details
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const gstRate = 0.18; // 18% GST
    const gstAmount = subtotal * gstRate;
    
    let discountAmount = 0;
    if (req.session.appliedCoupon && req.session.appliedCoupon.discountAmount) {
      discountAmount = parseFloat(req.session.appliedCoupon.discountAmount);
      totalSavings += discountAmount;
    }

    const total = subtotal + gstAmount - discountAmount + 25;

    const priceDetails = {
      subtotal: subtotal.toFixed(2),
      gst: gstAmount.toFixed(2),
      discount: discountAmount.toFixed(2),
      total: total.toFixed(2),
      couponCode: req.session.appliedCoupon?.code || null,
      totalSavings: totalSavings.toFixed(2),
      shipping: 25.00.toFixed(2),
    };

    return res.render('user/checkout', { items, priceDetails, addressId });
  } catch (error) {
    console.error('Error in checkout:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};

const getCartItems = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.guestId;

    const cart = await Cart.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$items' },
      { $unwind: '$productDetails' },
      {
        $match: {
          $expr: { $eq: ['$items.product', '$productDetails._id'] }
        }
      },
      {
        $group: {
          _id: '$_id',
          user: { $first: '$user' },
          items: {
            $push: {
              product: '$productDetails',
              quantity: '$items.quantity'
            }
          }
        }
      }
    ]);

    if (cart.length === 0) {
      return res.json({ items: [], subtotal: 0, shipping: 0, total: 0 });
    }

    let subtotal = 0;
    let shipping = 25;

    const items = await Promise.all(cart[0].items.map(async (item) => {
      const productWithOffers = await getProductWithOffers(item.product._id);
      const price = productWithOffers.discountedPrice;
      const total = price * item.quantity;
      subtotal += total;
      return {
        ...productWithOffers,
        quantity: item.quantity,
        total,
      };
    }));

    const total = subtotal + shipping;

    return res.json({
      items,
      subtotal,
      shipping,
      total,
    });
  } catch (error) {
    console.error('Error in getCartItems:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
};



module.exports = {
  addToCart,
  removeFromCart,
  getCart,
  updateCart,
  checkout,
  getCartItems,
};
