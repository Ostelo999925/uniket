const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Register function (alias for signup)
const register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // List of allowed student email domains (Ghanaian universities)
  const ALLOWED_DOMAINS = [
    'knust.edu.gh',    // Kwame Nkrumah University of Science and Technology
    'ug.edu.gh',       // University of Ghana
    'ucc.edu.gh',      // University of Cape Coast
    'uew.edu.gh',      // University of Education, Winneba
    'umat.edu.gh',     // University of Mines and Technology
    'upsa.edu.gh',     // University of Professional Studies
    'ktu.edu.gh',      // Koforidua Technical University
    'kstu.edu.gh',     // Kumasi Technical University
    'htu.edu.gh',      // Ho Technical University
    'atu.edu.gh',      // Accra Technical University
    'stu.edu.gh',      // Sunyani Technical University
    'ctu.edu.gh',      // Cape Coast Technical University
    'edu.gh'           // Generic .edu.gh domain
  ];

  try {
    // Validate phone number
    if (!phone) {
      return res.status(400).json({ 
        error: 'Phone number is required' 
      });
    }

    // Basic phone number validation (Ghana format)
    const phoneRegex = /^(?:\+233|0)[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format. Please use a valid Ghana phone number (e.g., 0201234567 or +233201234567)' 
      });
    }

    // Email validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    // Skip email domain validation for admin accounts
    if (role !== 'admin') {
      const isStudentEmail = ALLOWED_DOMAINS.some(domain => 
        emailDomain === domain || emailDomain?.endsWith('.' + domain)
      );

      if (!isStudentEmail) {
        return res.status(400).json({ 
          error: 'Only student emails from recognized Ghanaian universities are allowed. Please use your institutional email address.' 
        });
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered'
      });
    }

    // 2. Proceed if email is valid
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role || 'customer';

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        phone,
        updatedAt: new Date()
      }
    });

    await prisma.wallet.create({
      data: { userId: newUser.id, balance: 0.0 }
    });

    // Create token for auto-login after signup
    const token = jwt.sign(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed', details: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Store reset token in database
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken }
    });

    // TODO: Send reset email with token
    // For now, just return the token
    res.json({ message: 'Password reset instructions sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process password reset' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null
      }
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
    });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // TODO: Send verification email
    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        image: true,
        profileComplete: true,
        emailNotifications: true,
        smsNotifications: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true
      }
    });

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

const logout = async (req, res) => {
  // Since we're using JWT, we don't need to do anything server-side
  // The client should remove the token
  res.json({ message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout
};
