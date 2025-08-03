#!/bin/bash

# CrewFlow Shopify Local Testing Script
echo "🚀 Setting up CrewFlow for local Shopify testing..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Installing..."
    npm install -g ngrok
fi

# Start the development server in background
echo "📦 Starting Next.js development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Start ngrok tunnel
echo "🌐 Creating ngrok tunnel..."
ngrok http 3000 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get the ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

echo ""
echo "✅ Local testing setup complete!"
echo ""
echo "📋 Update your Shopify Partner Dashboard with:"
echo "   App URL: $NGROK_URL"
echo "   Redirect URL: $NGROK_URL/api/auth/shopify/callback"
echo ""
echo "🧪 Test URLs:"
echo "   Local app: http://localhost:3000"
echo "   Public URL: $NGROK_URL"
echo "   Install test: $NGROK_URL/api/auth/shopify/install?shop=your-test-shop.myshopify.com"
echo ""
echo "⏹️  To stop testing, press Ctrl+C"

# Wait for user to stop
trap "kill $DEV_PID $NGROK_PID; exit" INT
wait
