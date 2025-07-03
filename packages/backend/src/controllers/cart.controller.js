// controllers/cart.controller.js

const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

const addCartItem = async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the item already exists in the cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { userId, productId },
    });

    if (existingItem) {
      // If it exists, just update the quantity
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });

      return res.status(200).json(updatedItem);
    }

    // Create new cart item if it doesn't exist
    const newCartItem = await prisma.cartItem.create({
      data: {
        userId,
        productId,
        quantity,
      },
    });

    res.status(201).json(newCartItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
};

// controllers/cart.controller.js

const getCart = async (req, res) => {
    const { userId } = req.params;  // Assuming userId is passed as a URL parameter
  
    try {
      // Ensure userId is an integer
      const userIdInt = parseInt(userId);
  
      // Check if the user exists
      const user = await prisma.user.findUnique({
        where: { id: userIdInt },
      });
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Fetch cart items
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: userIdInt },  // Use the integer userId here
        include: {
          product: true,  // Optionally, include product details
        },
      });
  
      if (cartItems.length === 0) {
        return res.status(404).json({ message: 'No items in cart' });
      }
  
      res.status(200).json(cartItems);
    } catch (error) {
      console.error('Error while retrieving cart:', error);
      res.status(500).json({ error: 'Failed to retrieve cart' });
    }
  };
  
// controllers/cart.controller.js

const buyNow = async (req, res) => {
  const { userId, productId, quantity } = req.body;
  
  try {
    // Step 1: Fetch the product details (including price)
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Step 2: Fetch the user's wallet balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for the user' });
    }

    const total = product.price * quantity;

    // Step 3: Check if user has enough balance
    if (wallet.balance < total) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Step 4: Deduct the amount from user's wallet
    await prisma.wallet.update({
      where: { userId: userId },
      data: { balance: wallet.balance - total }
    });

    // Step 5: Create the order
    const order = await prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        status: 'Pending',
        total: total
      }
    });

    res.status(200).json({ message: 'Order created successfully', order });

  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
};
  
  // Controller for placing a bid on a product
// controllers/cart.controller.js
const placeBid = async (req, res) => {
  const { userId, productId, bidAmount } = req.body;

  // Check if userId, productId, and bidAmount are provided
  if (!userId || !productId || !bidAmount) {
    return res.status(400).json({ error: 'Missing required fields: userId, productId, and bidAmount' });
  }

  try {
    // Ensure the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure the product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the bid amount is greater than the current highest bid
    const highestBid = await prisma.bid.findFirst({
      where: { productId },
      orderBy: { amount: 'desc' },
    });

    if (highestBid && bidAmount <= highestBid.amount) {
      return res.status(400).json({ error: 'Bid amount must be higher than the current highest bid' });
    }

    // Create the bid
    const bid = await prisma.bid.create({
      data: {
        userId,
        productId,
        amount: bidAmount,
      },
    });

    return res.status(201).json({ message: 'Bid placed successfully', bid });
  } catch (error) {
    console.error('Error placing bid:', error);
    return res.status(500).json({ error: 'Failed to place bid' });
  }
};

module.exports = { placeBid };

  // Controller for getting all bids for a product
const getBidsForProduct = async (req, res) => {
    const { productId } = req.params;
  
    try {
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        include: { bids: true },  // Include the bids related to this product
      });
  
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
  
      return res.status(200).json({ bids: product.bids });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to retrieve bids" });
    }
  };  

  // Get the product with the highest bid
const getProductWithHighestBid = async (req, res) => {
    const { productId } = req.params;
  
    try {
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        include: {
          bids: {
            orderBy: {
              amount: 'desc',  // Order bids by the highest amount
            },
            take: 1,  // Only take the highest bid
          },
        },
      });
  
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
  
      const highestBid = product.bids.length > 0 ? product.bids[0] : null;
      return res.status(200).json({ product, highestBid });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to retrieve product with highest bid" });
    }
  };

  const createOrder = async (req, res) => {
    const { productId, quantity } = req.body;  // Assuming these are passed in the request body
    const userId = req.user.userId;            // Assuming user is authenticated and userId is available
    
    try {
      // Fetch the product price dynamically
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });
  
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      // Calculate the total price for the order
      const total = product.price * quantity;
  
      // Fetch user's wallet
      const wallet = await prisma.wallet.findUnique({
        where: { userId }
      });
  
      if (!wallet || wallet.balance < total) {
        return res.status(400).json({ error: 'Insufficient funds in wallet' });
      }
  
      // Deduct the amount from wallet
      await prisma.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: total
          }
        }
      });
  
      // Create the order
      const order = await prisma.order.create({
        data: {
          userId,
          productId,
          quantity,
          status: 'Pending',
          total,
          product: {
            connect: { id: productId }
          }
        }
      });
  
      res.status(201).json({ message: 'Order created successfully', order });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create order', details: err.message });
    }
  };
  
  
module.exports = { addCartItem, getCart, buyNow, createOrder, placeBid, getBidsForProduct, getProductWithHighestBid };
