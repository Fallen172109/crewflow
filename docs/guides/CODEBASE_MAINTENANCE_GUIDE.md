# 🧹 CrewFlow Codebase Maintenance Guide

## 📋 Overview

This guide establishes regular maintenance procedures to keep the CrewFlow codebase clean, organized, and maintainable. Following these practices prevents accumulation of temporary files, outdated code, and technical debt.

## 🗓️ Maintenance Schedule

### Monthly Cleanup (1st of each month)
- [ ] Review and clean `/temp` directory
- [ ] Check for unused test files
- [ ] Update documentation
- [ ] Review and remove outdated comments

### Quarterly Review (Every 3 months)
- [ ] Comprehensive dependency audit
- [ ] Performance optimization review
- [ ] Security vulnerability scan
- [ ] Architecture review

### Annual Cleanup (January)
- [ ] Major dependency updates
- [ ] Legacy code removal
- [ ] Documentation overhaul
- [ ] Performance benchmarking

## 🧪 Temporary Files Management

### Daily Practice
- Use `/temp` directory for all temporary testing
- Follow naming conventions: `test-[feature].js`, `debug-[issue].js`
- Clean up after completing tasks

### Weekly Review
- Remove files older than 7 days from `/temp`
- Archive important experiments
- Update `.gitignore` if needed

### Monthly Cleanup
```bash
# Clean temp directory
find temp/ -type f -mtime +30 -delete

# Remove empty directories
find temp/ -type d -empty -delete

# Check for stray test files in root
ls test-*.js debug-*.js validate-*.js 2>/dev/null || echo "No stray test files found"
```

## 📁 File Organization Checklist

### ✅ Proper Locations
- **Production code**: `src/`
- **Tests**: `src/__tests__/` or `*.test.ts`
- **Documentation**: Root level `.md` files
- **Scripts**: `scripts/` directory
- **Temporary files**: `temp/` directory
- **Configuration**: Root level config files

### ❌ Avoid These Locations
- Test files in root directory
- Temporary routes in `src/app/test-*`
- Debug files scattered throughout project
- Outdated documentation files

## 🔍 Regular Audit Procedures

### 1. Unused File Detection
```bash
# Find potentially unused files
grep -r "import.*test-" src/ || echo "No test imports found"
grep -r "require.*test-" src/ || echo "No test requires found"

# Check for unused components
find src/components -name "*.tsx" -exec basename {} \; | sort > components.list
grep -r "import.*from.*components" src/ | grep -o "[A-Z][a-zA-Z]*" | sort | uniq > used-components.list
comm -23 components.list used-components.list
```

### 2. Dependency Audit
```bash
# Check for unused dependencies
npm ls --depth=0
npx depcheck

# Security audit
npm audit
npm audit fix
```

### 3. Code Quality Check
```bash
# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Test coverage
npm run test:unit -- --coverage
```

## 📝 Documentation Maintenance

### Keep Updated
- `README.md` - Project overview and setup
- `DEVELOPER_SETUP_GUIDE.md` - Development instructions
- `API_REFERENCE.md` - API documentation
- Component documentation

### Remove When Outdated
- Implementation summaries for completed features
- Temporary debugging guides
- Outdated setup instructions
- Duplicate documentation

## 🚨 Warning Signs

Watch for these indicators that cleanup is needed:

### File System
- Multiple `test-*.js` files in root directory
- Unused routes in `src/app/test-*`
- Large `/temp` directory (>50MB)
- Many `.log` or `.debug` files

### Code Quality
- Linting errors increasing
- Build warnings
- Unused imports/variables
- Dead code paths

### Performance
- Slow build times
- Large bundle sizes
- Memory leaks in development
- Slow test execution

## 🛠️ Cleanup Scripts

### Quick Cleanup Script
Create `scripts/quick-cleanup.sh`:
```bash
#!/bin/bash
echo "🧹 Running quick cleanup..."

# Remove temp files older than 7 days
find temp/ -type f -mtime +7 -delete 2>/dev/null || true

# Remove build artifacts
rm -f *.tsbuildinfo
rm -rf .next/cache

# Clean node_modules cache
npm cache clean --force

echo "✅ Quick cleanup completed"
```

### Deep Cleanup Script
Create `scripts/deep-cleanup.sh`:
```bash
#!/bin/bash
echo "🧹 Running deep cleanup..."

# Remove all temp files
rm -rf temp/*

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild project
npm run build

echo "✅ Deep cleanup completed"
```

## 📊 Maintenance Metrics

Track these metrics to measure codebase health:

### File Count Metrics
- Total files in project
- Test files in root directory (should be 0)
- Files in `/temp` directory
- Unused component files

### Code Quality Metrics
- Linting error count
- TypeScript error count
- Test coverage percentage
- Bundle size

### Performance Metrics
- Build time
- Test execution time
- Development server startup time
- Hot reload speed

## 🎯 Best Practices

### For Developers
1. **Use `/temp` for all temporary work**
2. **Clean up after each feature**
3. **Follow naming conventions**
4. **Document temporary decisions**
5. **Regular local cleanup**

### For Team Leads
1. **Schedule regular reviews**
2. **Enforce cleanup policies**
3. **Monitor codebase metrics**
4. **Update maintenance procedures**
5. **Train team on best practices**

## 📞 Getting Help

If you encounter issues during maintenance:

1. **Check this guide first**
2. **Review recent changes** in git history
3. **Ask team members** for context
4. **Document new procedures** for future reference

## 🔄 Continuous Improvement

This maintenance guide should evolve with the project:

- **Update procedures** based on experience
- **Add new checks** as the project grows
- **Automate repetitive tasks** where possible
- **Share learnings** with the team

---

**Remember**: Regular maintenance prevents major cleanup efforts and keeps the codebase healthy and productive! 🌊⚓
