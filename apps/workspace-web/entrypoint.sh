#!/bin/bash

# Run Playwright tests (passed via CMD)
echo "Running Playwright tests..."
"$@"
TEST_EXIT_CODE=$?

# Always serve the report, even if tests failed
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "Tests failed with exit code $TEST_EXIT_CODE. Serving report anyway..."
else
    echo "Tests passed. Serving Playwright report on port 9323..."
fi

# Serve the report (it was generated during test run)
echo "Report server running at http://localhost:9323"
echo "Press Ctrl+C to stop"
exec npx playwright show-report --port 9323 --host 0.0.0.0
