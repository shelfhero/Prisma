/**
 * Simple script to check if receipts exist in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkReceipts() {
  try {
    console.log('Checking receipts in database...');

    // Check total receipts
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('*');

    if (error) {
      console.error('Error fetching receipts:', error);
      return;
    }

    console.log(`Found ${receipts.length} receipts in database:`);

    receipts.forEach((receipt, index) => {
      console.log(`${index + 1}. ID: ${receipt.id}`);
      console.log(`   User: ${receipt.user_id}`);
      console.log(`   Total: ${receipt.total_amount} ${receipt.currency}`);
      console.log(`   Date: ${receipt.purchased_at}`);
      console.log(`   Retailer ID: ${receipt.retailer_id}`);
      console.log('');
    });

    // Check users
    console.log('Checking users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.users.length} users:`);
    users.users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}`);
    });

    // Check retailers
    console.log('\nChecking retailers...');
    const { data: retailers, error: retailersError } = await supabase
      .from('retailers')
      .select('*');

    if (retailersError) {
      console.error('Error fetching retailers:', retailersError);
      return;
    }

    console.log(`Found ${retailers.length} retailers:`);
    retailers.forEach((retailer, index) => {
      console.log(`${index + 1}. ID: ${retailer.id}, Name: ${retailer.name}`);
    });

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkReceipts();