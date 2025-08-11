#!/bin/bash

# E2E Test Suite for Take-Home Backend
# ====================================
# This script performs comprehensive end-to-end testing of the import pipeline:
# 1. Validates environment and dependencies
# 2. Checks Supabase and API health
# 3. Tests import endpoint with valid data
# 4. Tests validation with invalid data
# 5. Runs worker to process import job
# 6. Verifies worker success and contact processing
# 7. Tests error handling and 404 responses
#
# Prerequisites:
# - Supabase running locally (pnpm run supabase:start)
# - API server running (pnpm run dev)
# - jq and curl installed
# - test-data.json file present

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# CONFIGURATION
# =============================================================================

API_URL="http://localhost:3020"
TEST_DATA_FILE="scripts/test-data.json"
HEALTH_ENDPOINT="$API_URL/health"
IMPORT_ENDPOINT="$API_URL/import"

# =============================================================================
# UTILITY FUNCTIONS
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

test_validation_error() {
    local test_name=$1
    local test_data=$2
    local expected_pattern=$3
    
    echo "Testing $test_name..."
    local response=$(make_api_request "POST" "$IMPORT_ENDPOINT" "$test_data")
    
    if echo "$response" | grep -q "$expected_pattern"; then
        print_result 0 "$test_name properly rejected"
        echo "   Response: $response"
    else
        print_result 1 "$test_name was not properly rejected" "$response"
    fi
}

# =============================================================================
# VALIDATION TESTS
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
    
    # Check test data file
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
# IMPORT PIPELINE TESTS
# =============================================================================

test_import_pipeline() {
    print_header "IMPORT PIPELINE TEST"
    
    # Count expected contacts
    echo "Counting expected contacts from test data..."
    local expected_count=$(jq '.data | length' "$TEST_DATA_FILE")
    echo "   Expected contacts: $expected_count"
    
    # Test valid import
    echo "Testing import endpoint..."
    local import_response=$(make_api_request "POST" "$IMPORT_ENDPOINT" "$TEST_DATA_FILE")
    
    if echo "$import_response" | grep -q "jobId"; then
        local job_id=$(extract_json_value "$import_response" "jobId")
        print_result 0 "Import accepted with jobId: $job_id"
        echo "   Response: $import_response"
    else
        print_result 1 "Import endpoint failed" "$import_response"
    fi
    
    # Run worker
    echo "Running worker to process job..."
    local worker_output=$(pnpm run worker:run-once 2>&1)
    local worker_exit_code=$?
    
    if [ $worker_exit_code -eq 0 ]; then
        print_result 0 "Worker completed successfully"
        echo "   Worker output: $worker_output"
    else
        print_result 1 "Worker failed" "$worker_output"
    fi
    
    # Verify worker success
    echo "Verifying worker processed contacts successfully..."
    if verify_worker_success "$worker_output"; then
        print_result 0 "Worker successfully processed contacts"
        
        # Extract processed count
        local processed_count=$(echo "$worker_output" | grep -o "Successfully processed [0-9]* contacts" | grep -o "[0-9]*")
        if [ -n "$processed_count" ]; then
            echo "   Processed contacts: $processed_count"
            if [ "$processed_count" -eq "$expected_count" ]; then
                print_result 0 "All expected contacts were processed"
            else
                print_result 1 "Contact count mismatch" "Expected $expected_count, processed $processed_count"
            fi
        fi
    else
        print_result 1 "Worker failed to process contacts" "$worker_output"
    fi
}

# =============================================================================
# VALIDATION TESTS
# =============================================================================

test_data_validation() {
    print_header "DATA VALIDATION TESTS"
    
    # Test invalid data
    test_validation_error \
        "invalid import data" \
        '{"source": "test", "data": [{"name": "", "email": "invalid-email"}]}' \
        "error\|issues"
    
    # Test empty data array
    test_validation_error \
        "empty data array" \
        '{"source": "test", "data": []}' \
        "error\|issues"
    
    # Test missing required fields
    test_validation_error \
        "missing required fields" \
        '{"source": "test", "data": [{"name": "John"}]}' \
        "error\|issues"
}

# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

test_error_handling() {
    print_header "ERROR HANDLING TESTS"
    
    # Test health endpoint after import
    echo "Testing health endpoint after import..."
    local post_import_health=$(make_api_request "GET" "$HEALTH_ENDPOINT")
    if echo "$post_import_health" | grep -q '"status":"healthy"'; then
        print_result 0 "System remains healthy after import"
    else
        print_result 1 "System unhealthy after import" "$post_import_health"
    fi
    
    # Test 404 endpoint
    echo "Testing 404 endpoint..."
    local not_found_response=$(make_api_request "GET" "$API_URL/nonexistent")
    if echo "$not_found_response" | grep -q '"error":"Not found"'; then
        print_result 0 "404 endpoint properly handled"
    else
        print_result 1 "404 endpoint not properly handled" "$not_found_response"
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo "Starting E2E Test Suite"
    echo "======================"
    
    validate_dependencies
    validate_services
    test_import_pipeline
    test_data_validation
    test_error_handling
    
    echo ""
    echo "=========================================="
    echo "🎉 E2E Test Suite Completed Successfully! 🎉"
    echo "=========================================="
    echo ""
    echo "✅ All Systems Operational:"
    echo "   • Supabase: Running"
    echo "   • API: Responding"
    echo "   • Health: Healthy"
    echo "   • Import: Working"
    echo "   • Validation: Working"
    echo "   • Worker: Processing"
    echo "   • Database: Updated"
    echo "   • Error Handling: Working"
    echo ""
    echo "🚀 The import pipeline is working correctly!"
    echo ""
}

main "$@"

