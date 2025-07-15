#!/bin/bash

# CrewFlow Deep Cleanup Script
# Performs comprehensive cleanup including dependency reinstall

echo "🧹 CrewFlow Deep Cleanup Starting..."
echo "===================================="
echo ""
echo "⚠️  WARNING: This will remove node_modules and reinstall dependencies"
echo "⚠️  This may take several minutes to complete"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deep cleanup cancelled"
    exit 1
fi

# Function to print status
print_status() {
    echo "📋 $1"
}

print_success() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

# 1. Clean temp directory completely
print_status "Cleaning temp directory completely..."
if [ -d "temp" ]; then
    # Keep README and examples, remove everything else
    find temp/ -type f ! -name "README.md" ! -path "temp/examples/*" -delete 2>/dev/null || true
    find temp/ -type d -empty -delete 2>/dev/null || true
    print_success "Temp directory cleaned (kept README and examples)"
else
    print_status "Creating temp directory..."
    mkdir -p temp
    print_success "Temp directory created"
fi

# 2. Remove all build artifacts
print_status "Removing all build artifacts..."
rm -f *.tsbuildinfo 2>/dev/null || true
rm -f tsconfig.tsbuildinfo 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf out 2>/dev/null || true
rm -rf build 2>/dev/null || true
print_success "Build artifacts removed"

# 3. Clean dependency cache
print_status "Cleaning dependency caches..."
npm cache clean --force > /dev/null 2>&1
rm -rf node_modules/.cache 2>/dev/null || true
print_success "Dependency caches cleaned"

# 4. Remove and reinstall dependencies
print_status "Removing node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json
print_success "Dependencies removed"

print_status "Reinstalling dependencies (this may take a while)..."
if npm install; then
    print_success "Dependencies reinstalled successfully"
else
    print_error "Failed to reinstall dependencies"
    exit 1
fi

# 5. Verify installation
print_status "Verifying installation..."
if npm run lint > /dev/null 2>&1; then
    print_success "Linting passed"
else
    print_error "Linting failed - check for issues"
fi

if npm run build > /dev/null 2>&1; then
    print_success "Build successful"
else
    print_error "Build failed - check for issues"
fi

# 6. Security audit
print_status "Running security audit..."
if npm audit --audit-level=high > /dev/null 2>&1; then
    print_success "No high-severity vulnerabilities found"
else
    print_status "Security vulnerabilities found - run 'npm audit' for details"
fi

# 7. Final summary
echo ""
echo "🎉 Deep cleanup completed successfully!"
echo ""
echo "📊 What was cleaned:"
echo "   ✅ Temp directory (kept README and examples)"
echo "   ✅ All build artifacts (.next, out, build)"
echo "   ✅ TypeScript build info files"
echo "   ✅ npm cache"
echo "   ✅ node_modules (reinstalled)"
echo "   ✅ package-lock.json (regenerated)"
echo ""
echo "🚀 Next steps:"
echo "   1. Start development server: npm run dev"
echo "   2. Run tests: npm run test:unit"
echo "   3. Check for any remaining issues"
echo ""
echo "📝 If you encounter issues:"
echo "   - Check .env.local file exists"
echo "   - Verify all required environment variables are set"
echo "   - Review DEVELOPER_SETUP_GUIDE.md"
