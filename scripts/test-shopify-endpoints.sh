#!/bin/bash

echo "🧪 Testing CrewFlow Shopify Endpoints..."
echo "========================================"

BASE_URL="http://localhost:3000"

echo ""
echo "1. Testing Shopify Diagnostics Endpoint (requires auth):"
echo "GET $BASE_URL/api/diagnostics/shopify"

# Test the diagnostics endpoint (will return 401 without auth, which is expected)
response=$(curl -s -w "HTTP_STATUS:%{http_code}" "$BASE_URL/api/diagnostics/shopify")
http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Status: $http_status"
echo "Response: $body"

if [ "$http_status" = "401" ]; then
    echo "✅ PASS - Correctly requires authentication"
else
    echo "❌ FAIL - Expected 401 status"
fi

echo ""
echo "2. Testing Shopify Products Endpoint (requires auth):"
echo "GET $BASE_URL/api/shopify/products"

response=$(curl -s -w "HTTP_STATUS:%{http_code}" "$BASE_URL/api/shopify/products")
http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Status: $http_status"
echo "Response: $body"

if [ "$http_status" = "401" ]; then
    echo "✅ PASS - Correctly requires authentication"
else
    echo "❌ FAIL - Expected 401 status"
fi

echo ""
echo "3. Testing Invalid Endpoint:"
echo "GET $BASE_URL/api/shopify/invalid"

response=$(curl -s -w "HTTP_STATUS:%{http_code}" "$BASE_URL/api/shopify/invalid")
http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

echo "Status: $http_status"

if [ "$http_status" = "404" ]; then
    echo "✅ PASS - Correctly returns 404 for invalid endpoint"
else
    echo "❌ FAIL - Expected 404 status"
fi

echo ""
echo "🎉 Endpoint Testing Complete!"
echo ""
echo "Note: To test authenticated endpoints, you need to:"
echo "1. Log in to CrewFlow at $BASE_URL"
echo "2. Connect a Shopify store"
echo "3. Visit $BASE_URL/api/diagnostics/shopify in your browser"
