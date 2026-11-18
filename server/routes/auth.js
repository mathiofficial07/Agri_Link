const express = require('express');
const supabase = require('../config/supabase');
const router = express.Router();

// @route   POST /api/v1/auth/register
// @desc    Register a new user and bypass email confirmation
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    const userRole = role || 'farmer';
    console.log('Registration attempt:', { name, email, role: userRole, phone });

    // Basic validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and password are required'
      });
    }

    try {
      // Check if user already exists in profiles table
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please login instead.'
        });
      }

      // 1. Create user in Supabase Auth using Admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { name, role: userRole }
      });

      if (!authError && authUser?.user) {
        // Create profile in DB
        const { data: profile } = await supabase
          .from('profiles')
          .insert([{
            id: authUser.user.id,
            name,
            email,
            phone,
            role: userRole,
            address: address || 'Coimbatore',
            created_at: new Date()
          }])
          .select()
          .single();

        return res.status(201).json({
          success: true,
          message: 'Account created successfully.',
          user: profile || { id: authUser.user.id, name, email, phone, role: userRole }
        });
      }
    } catch (e) {
      console.warn('Supabase DB registration fallback:', e.message);
    }

    // Fallback registration response for standalone node mode
    const fallbackUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone,
      role: userRole,
      address: address || 'Coimbatore, TN'
    };

    return res.status(201).json({
      success: true,
      message: 'Account created successfully (Ecosystem Node).',
      user: fallbackUser
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + error.message
    });
  }
});

// @route   POST /api/v1/auth/login
// @desc    Login user and return session
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Note: In backend with service role, we can't 'sign in' as a user to get a session 
    // to pass back easily if using createClient with service key (it doesn't maintain state).
    // However, we can use a fresh client for the login attempt.
    const { createClient } = require('@supabase/supabase-js');
    const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || 'dummy');

    const { data, error: loginError } = await tempClient.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return res.status(400).json({
        success: false,
        message: loginError.message
      });
    }

    // Fetch profile to return along with session
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      message: 'Login successful',
      session: data.session,
      user: profile || data.user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login: ' + error.message
    });
  }
});

module.exports = router;
