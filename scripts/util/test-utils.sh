#!/bin/bash

# Test Utilities
# =============
# Consolidated utility functions for test scripts
# Combines print, HTTP, validation, and cleanup utilities

# =============================================================================
# PRINT AND OUTPUT UTILITIES
# =============================================================================

print_header() {
    echo ""
    echo "=== $1 ==="
    echo ""
}

print_result() {
    local exit_code=$1
    local message=$2
    local details=${3:-}
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $message"
    else
        echo "❌ $message"
        if [ -n "$details" ]; then
            echo "   Details: $details"
        fi
        exit 1
    fi
}

# =============================================================================
# HTTP AND API UTILITIES
# =============================================================================

make_api_request() {
    local method=$1
    local endpoint=$2
    local data=${3:-}
    local headers=${4:-"Content-Type: application/json"}
    
    local curl_args=("-s" "-X" "$method" "$endpoint")
    
    if [ -n "$headers" ]; then
        curl_args+=("-H" "$headers")
    fi
    
    if [ -n "$data" ]; then
        if [ -f "$data" ]; then
            curl_args+=("-d" "@$data")
        else
            curl_args+=("-d" "$data")
        fi
    fi
    
    curl "${curl_args[@]}"
}

wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    echo "Waiting for service at $url to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts - service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    return 1
}

extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# =============================================================================
# VALIDATION AND TESTING UTILITIES
# =============================================================================

test_validation_error() {
    local test_name=$1
    local test_data=$2
    local expected_pattern=$3
    local import_endpoint=$4
    
    echo "Testing $test_name..."
    local response=$(make_api_request "POST" "$import_endpoint" "$test_data")
    
    if echo "$response" | grep -q "$expected_pattern"; then
        print_result 0 "$test_name properly rejected"
        echo "   Response: $response"
    else
        print_result 1 "$test_name was not properly rejected" "$response"
    fi
}

verify_worker_success() {
    local worker_output=$1
    if echo "$worker_output" | grep -q "Successfully processed.*contacts"; then
        return 0
    elif echo "$worker_output" | grep -q "Worker completed successfully\|Worker.*stopping"; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# DEPENDENCY AND SERVICE VALIDATION
# =============================================================================

validate_dependencies() {
    print_header "DEPENDENCY VALIDATION"
    
    echo "Checking required dependencies..."
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        print_result 1 "curl is not installed" "Please install curl"
    fi
    print_result 0 "curl is available"
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        print_result 1 "jq is not installed" "Please install jq: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    print_result 0 "jq is available"
    
    # Check test data files
    echo "Checking test data file..."
    if [ ! -f "$TEST_DATA_FILE" ]; then
        print_result 1 "Test data file not found" "Expected: $TEST_DATA_FILE"
    fi
    print_result 0 "Test data file exists"
}

validate_services() {
    print_header "SERVICE VALIDATION"
    
    # Check Supabase
    echo "Checking Supabase status..."
    local supabase_status=$(pnpm supabase status 2>&1)
    if echo "$supabase_status" | grep -q "running"; then
        print_result 0 "Supabase is running"
    else
        print_result 1 "Supabase is not running" "Run 'pnpm run supabase:start' first"
    fi
    
    # Check API
    if ! wait_for_service "$API_URL"; then
        print_result 1 "API is not responding" "Run 'pnpm run dev' first"
    fi
    print_result 0 "API is responding"
    
    # Test health endpoint
    echo "Testing health endpoint..."
    local health_response=$(make_api_request "GET" "$HEALTH_ENDPOINT")
    if echo "$health_response" | grep -q '"status":"healthy"'; then
        print_result 0 "Health endpoint reports healthy status"
    else
        print_result 1 "Health endpoint reports unhealthy status" "$health_response"
    fi
}

# =============================================================================
# CLEANUP UTILITIES
# =============================================================================

cleanup() {
    echo "Cleaning up temporary files..."
    rm -f /tmp/json_upload_job_id
    rm -f /tmp/multipart_upload_job_ids
    rm -f /tmp/stream_upload_job_ids
    rm -f /tmp/resumable_upload_job_ids
    print_result 0 "Cleanup completed"
}
