const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing in environment variables. Supabase features will run with fallback mode. (Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render environment settings)');

  // Fallback safe client to prevent startup and runtime crashes if credentials are omitted
  const createFallbackQuery = () => {
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      upsert: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: async () => ({ data: null, error: new Error('Supabase credentials not configured in environment') }),
      then: (resolve) => resolve({ data: [], error: null, count: 0 })
    };
    return chain;
  };

  supabase = {
    auth: {
      admin: {
        createUser: async () => ({ data: null, error: new Error('Supabase credentials not configured in environment') }),
        listUsers: async () => ({ data: { users: [] }, error: null }),
        updateUserById: async () => ({ data: null, error: new Error('Supabase credentials not configured in environment') }),
        deleteUser: async () => ({ data: null, error: new Error('Supabase credentials not configured in environment') })
      },
      getUser: async () => ({ data: { user: null }, error: new Error('Supabase credentials not configured in environment') }),
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase credentials not configured in environment') })
    },
    from: () => createFallbackQuery()
  };
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        disableSignup: false,
        disableEmail: true,
        confirmEmail: false
      }
    });
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
}

module.exports = supabase;
