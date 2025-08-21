#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('🚀 Setting up CrewFlow Image Upload Database...')

  try {
    // 1. Create the chat_images table directly
    console.log('📝 Creating chat_images table...')

    const success = await createChatImagesTable()
    if (!success) {
      return false
    }

    console.log('✅ Database tables created')

    // 2. Create storage bucket
    console.log('🪣 Creating storage bucket...')
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      return false
    }

    const bucketExists = buckets.some(bucket => bucket.id === 'chat-images')
    
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket('chat-images', {
        public: false,
        fileSizeLimit: 15728640, // 15MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      })

      if (bucketError) {
        console.error('❌ Failed to create bucket:', bucketError.message)
        return false
      }

      console.log('✅ Storage bucket created')
    } else {
      console.log('✅ Storage bucket already exists')
    }

    // 3. Test database connection
    console.log('🔍 Testing database setup...')
    
    const { data: testData, error: testError } = await supabase
      .from('chat_images')
      .select('count')
      .limit(1)

    if (testError && !testError.message.includes('relation "chat_images" does not exist')) {
      console.error('❌ Database test failed:', testError.message)
      return false
    }

    console.log('✅ Database setup completed successfully!')
    console.log('')
    console.log('🎉 You can now test the image upload functionality at:')
    console.log('   http://localhost:3000/test/image-upload')
    
    return true

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    return false
  }
}

// Create the chat_images table using direct queries
async function createChatImagesTable() {
  console.log('📝 Creating chat_images table...')

  try {
    // First, check if the table already exists
    const { data: existingTables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'chat_images')

    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('❌ Error checking existing tables:', checkError.message)
    }

    // Since we can't execute raw SQL easily, let's create a simple version
    // The user will need to run the SQL manually in Supabase dashboard
    console.log('⚠️  Direct table creation requires manual setup in Supabase dashboard')
    console.log('')
    console.log('📋 Please copy and paste this SQL in your Supabase SQL Editor:')
    console.log('=' .repeat(60))
    console.log(`
-- Create chat_images table for CrewFlow
CREATE TABLE IF NOT EXISTS public.chat_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID,
  message_id UUID,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  bucket_name TEXT DEFAULT 'chat-images',
  public_url TEXT,
  upload_status TEXT DEFAULT 'completed',
  analysis_completed BOOLEAN DEFAULT FALSE,
  analysis_description TEXT,
  analysis_tags TEXT[],
  quality_score DECIMAL(3,2),
  suitable_for_ecommerce BOOLEAN,
  use_for_product BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can manage their own images"
ON public.chat_images FOR ALL
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_images_user
ON public.chat_images(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_images_created_at
ON public.chat_images(created_at DESC);
`)
    console.log('=' .repeat(60))
    console.log('')
    console.log('🌐 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
    console.log('')

    return true
  } catch (error) {
    console.error('❌ Setup preparation failed:', error.message)
    return false
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { setupDatabase, createChatImagesTable }
