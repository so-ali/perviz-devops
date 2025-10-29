#!/bin/bash

echo "🧪 Starting Deployment Tests..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    
    echo -n "Testing $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $response)"
        ((FAILED++))
    fi
}

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Run tests
test_endpoint "Frontend" "http://localhost" 200
test_endpoint "Backend API" "http://localhost/api/users" 200
test_endpoint "Health Check" "http://localhost/health" 200
test_endpoint "Non-existent route" "http://localhost/api/nonexistent" 404

# Test cache
echo -e "\n🔄 Testing Redis Cache..."
echo "First request (should be slow):"
time curl -s http://localhost/api/users > /dev/null

echo "Second request (should be fast - cached):"
time curl -s http://localhost/api/users > /dev/null

# Test cache headers
echo -e "\n📦 Testing Cache Headers..."
curl -I http://localhost/api/users | grep -i "x-cache-status"

# Test rate limiting
echo -e "\n🚦 Testing Rate Limiting..."
echo "Sending 15 rapid requests..."
for i in {1..15}; do
    curl -s -o /dev/null -w "%{http_code} " http://localhost/api/users
done
echo ""

# Summary
echo -e "\n📊 Test Summary:"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed!${NC}"
    exit 1
fi