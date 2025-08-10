#!/bin/bash

# Test configuration
API_URL="http://localhost:3000"
TEST_DATA_FILE="scripts/test-data.json"

echo "Starting E2E Test Suite"
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
        if [ ! -z "$3" ]; then
            echo "   Details: $3"
        fi
        exit 1
    fi
}

# Check Supabase Status
echo "Checking Supabase status..."
SUPABASE_STATUS=$(pnpm supabase status 2>&1)
if echo "$SUPABASE_STATUS" | grep -q "running"; then
    print_result 0 "Supabase is running"
else
    print_result 1 "Supabase is not running" "Run 'pnpm run supabase:start' first"
fi

# Check if API is ready
echo "Checking if API is ready..."
if curl -s "$API_URL" > /dev/null 2>&1; then
    print_result 0 "API is responding"
else
    print_result 1 "API is not responding" "Run 'pnpm run dev' first"
fi

# Test Import Endpoint
echo "Testing import endpoint..."
RESPONSE=$(curl -s -X POST "$API_URL/import" \
    -H "Content-Type: application/json" \
    -d @"$TEST_DATA_FILE")

if echo "$RESPONSE" | grep -q "jobId"; then
    JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
    print_result 0 "Import accepted with jobId: $JOB_ID"
else
    print_result 1 "Import endpoint failed" "$RESPONSE"
fi

# Run Worker
echo "Running worker to process job..."
pnpm run worker:run-once

echo "Done"

