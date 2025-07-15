#!/bin/bash

# CrewFlow Quick Cleanup Script
# Removes temporary files and build artifacts

echo "🧹 CrewFlow Quick Cleanup Starting..."
echo "=================================="

# Function to print status
print_status() {
    echo "📋 $1"
}

print_success() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
}

# 1. Clean temp directory (files older than 7 days)
print_status "Cleaning temp directory..."
if [ -d "temp" ]; then
    # Remove files older than 7 days
    find temp/ -type f -mtime +7 -delete 2>/dev/null || true
    
    # Remove empty directories
    find temp/ -type d -empty -delete 2>/dev/null || true
    
    # Count remaining files
    temp_files=$(find temp/ -type f | wc -l)
    print_success "Temp directory cleaned (${temp_files} files remaining)"
else
    print_warning "Temp directory not found"
fi

# 2. Remove build artifacts
print_status "Removing build artifacts..."
rm -f *.tsbuildinfo 2>/dev/null || true
rm -f tsconfig.tsbuildinfo 2>/dev/null || true
print_success "Build artifacts removed"

# 3. Clean Next.js cache
print_status "Cleaning Next.js cache..."
if [ -d ".next" ]; then
    rm -rf .next/cache 2>/dev/null || true
    print_success "Next.js cache cleaned"
else
    print_warning ".next directory not found"
fi

# 4. Check for stray test files in root
print_status "Checking for stray test files..."
stray_files=$(ls test-*.js debug-*.js validate-*.js 2>/dev/null | wc -l)
if [ "$stray_files" -gt 0 ]; then
    print_warning "Found ${stray_files} stray test files in root directory"
    ls test-*.js debug-*.js validate-*.js 2>/dev/null || true
    echo "   Consider moving these to temp/ directory"
else
    print_success "No stray test files found"
fi

# 5. Clean npm cache
print_status "Cleaning npm cache..."
npm cache clean --force > /dev/null 2>&1
print_success "npm cache cleaned"

# 6. Check disk space saved
print_status "Cleanup summary..."
echo ""
echo "🎉 Quick cleanup completed successfully!"
echo ""
echo "📊 Recommendations:"
echo "   - Run 'npm run lint' to check code quality"
echo "   - Run 'npm run build' to verify project builds"
echo "   - Review temp/ directory contents regularly"
echo ""
echo "🔄 For deeper cleanup, run: bash scripts/deep-cleanup.sh"
