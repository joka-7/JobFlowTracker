# QA Testing Guide

Comprehensive testing strategy for JobFlowTracker covering unit, integration, E2E, and performance tests.

## Test Suite Overview

### Unit Tests
**Location**: `src/__tests__/*.test.js`  
**Runner**: Vitest  
**Count**: 251+ tests  
**Command**: `npm test`

- ✅ Security (sanitization, URL validation, prompt safety)
- ✅ AI Assistant (message building, provider config)
- ✅ Status management
- ✅ Storage keys
- ✅ Task logic

### E2E Tests
**Location**: `e2e/*.spec.js`  
**Runner**: Playwright  
**Command**: `npm run test:e2e`

#### Existing Coverage (26 tests)
- Mode selection and switching
- Job seeker CRUD flows
- Recruiter CRUD flows
- Kanban drag-and-drop
- Import/export JSON
- AI chat simulation
- Keyboard shortcuts

#### New Coverage (to implement)
- **Rate Limiting** (3 tests) - `ai-rate-limiting.spec.js`
- **Performance** (5 tests) - `performance-large-dataset.spec.js`
- **Accessibility** (9 tests) - `accessibility.spec.js`

---

## Running Tests

### Run All Tests
```bash
npm run test:all
```

### Run Unit Tests Only
```bash
npm test
npm test -- --watch          # Watch mode
npm test -- src/__tests__/security.test.js  # Single file
```

### Run E2E Tests Only
```bash
npm run test:e2e
npm run test:e2e -- --debug  # Debug mode (slow, browser visible)
```

### Run Specific Test File
```bash
npm run test:e2e -- ai-rate-limiting.spec.js
npm run test:e2e -- accessibility.spec.js
```

---

## Test Coverage Matrix

| Feature | Unit | E2E | Status | Notes |
|---------|------|-----|--------|-------|
| **Authentication** | ✅ | ✅ | Complete | Google Sign-In tested |
| **Company CRUD** | ✅ | ✅ | Complete | All operations covered |
| **Candidate CRUD** | ✅ | ✅ | Complete | Recruiter mode |
| **Task CRUD** | ✅ | ⚠️ | Partial | Missing drag-drop test |
| **Import/Export** | ✅ | ✅ | Complete | JSON backup tested |
| **AI Chat** | ✅ | ✅ | Complete | Mock interview flow |
| **Offline Sync** | ⚠️ | ❌ | **Missing** | Need Firebase fallback test |
| **Rate Limiting** | ✅ | ✅ | **New** | Prevents API quota exhaustion |
| **Large Dataset** | ⚠️ | ✅ | **New** | 1000+ items performance |
| **Accessibility** | ❌ | ✅ | **New** | WCAG AA compliance |
| **Mobile** | ❌ | ⚠️ | **Missing** | Need viewport tests |
| **Dark Mode** | ❌ | ❌ | **Not Impl** | Feature incomplete |
| **Multi-Tab Sync** | ❌ | ❌ | **Missing** | BroadcastChannel needed |

---

## New Test Files Added

### 1. `e2e/ai-rate-limiting.spec.js`
Tests rate limiting (3-second throttle) on AI calls.

**Tests**:
- Throttles rapid AI calls
- Allows calls after rate limit window
- Prevents DoS via button mashing

**Run**:
```bash
npm run test:e2e -- ai-rate-limiting.spec.js
```

**Prerequisites**:
- Groq API key in localStorage
- Test setup configures it automatically

---

### 2. `e2e/performance-large-dataset.spec.js`
Tests performance with large datasets (1000+ items).

**Tests**:
- 1000 companies import/render
- 500 items kanban scrolling
- Search filter performance (< 200ms)
- Firebase batch sync (1000 items)
- 10,000 items memory usage
- Memory consumption stays < 70% of heap

**Run**:
```bash
npm run test:e2e -- performance-large-dataset.spec.js
```

**Metrics**:
- Import time: < 2 seconds
- Scroll smoothness: < 500ms for 5 scrolls
- Search filter: < 300ms with debounce
- Memory: < 70% heap usage

---

### 3. `e2e/accessibility.spec.js`
WCAG AA compliance tests using axe-core.

**Tests**:
- Home page violations (< 3)
- Keyboard navigation (Tab through elements)
- Modal focus trap (Tab, Escape)
- Form labels and aria-labels
- Button accessibility (visible labels)
- Color contrast (spot check)
- Status column descriptions
- Validation feedback
- Keyboard shortcuts documentation
- Mobile viewport accessibility
- Touch target sizing (>40px)

**Run**:
```bash
npm run test:e2e -- accessibility.spec.js
```

**Requirements**:
- axe-core loaded from CDN
- No external API calls needed

---

### 4. `src/__tests__/aiAssistant.rateLimiting.test.js`
Unit tests for rate limiting functions.

**Tests**:
- Disable rate limiting for tests
- Track separate limits per action
- Reset state between tests
- Error message clarity

**Run**:
```bash
npm test -- aiAssistant.rateLimiting.test.js
```

---

## Critical Test Scenarios

### Security
- [ ] Prompt injection blocked (newlines, brackets)
- [ ] XSS prevention in user input
- [ ] CSRF protection (if implemented)
- [ ] localStorage encryption (if implemented)

### Functionality
- [ ] Mode switching preserves data
- [ ] Import/export round-trip (export → import → same data)
- [ ] Firebase sync works offline + online
- [ ] Rate limiting prevents API quota exhaustion

### Performance
- [ ] 1000 items load < 2 seconds
- [ ] Search filter < 300ms with debounce
- [ ] Kanban smooth scroll < 500ms
- [ ] Memory < 70% of available heap

### Accessibility
- [ ] No critical axe violations (< 3 warnings)
- [ ] Keyboard navigation works (Tab, Shift+Tab)
- [ ] Screen reader compatible (labels + aria)
- [ ] Mobile touch targets > 40px
- [ ] Color contrast sufficient (WCAG AA)

---

## CI/CD Integration

All tests run in GitHub Actions on:
- Push to any branch
- Pull requests

See `.github/workflows/test.yml` (if exists) or `.github/workflows/security.yml`

### Test Status Badge
Add to README.md:
```markdown
[![Tests](https://github.com/joka-7/JobFlowTracker/actions/workflows/test.yml/badge.svg)](https://github.com/joka-7/JobFlowTracker/actions)
```

---

## Manual Testing Checklist

### Before Release
- [ ] Fresh install on new device (no browser cache)
- [ ] All three modes work (Job Seeker, Recruiter, Tasks)
- [ ] Import 1000+ items, verify performance
- [ ] AI features work (5 providers tested)
- [ ] Offline mode works → regain connectivity → sync
- [ ] Mobile layout responsive (375px width)
- [ ] Export data → delete items → import → restored
- [ ] Dark mode toggle (if implemented)
- [ ] 3 languages work (EN, HE, FR)

### Regression Testing
After changes, verify:
- Mode switching doesn't lose data
- Kanban drag-drop still works
- Import/export still valid
- AI chat doesn't crash
- Offline mode still stores data

---

## Debugging Tests

### Debug Single Test
```bash
npm run test:e2e -- --debug ai-rate-limiting.spec.js
# Browser opens, you can step through
```

### View Test Report
```bash
npm run test:e2e -- --reporter=html
# Opens HTML report in dist/playwright-report/
```

### Check Test Coverage
```bash
npm test -- --coverage
# Shows which lines are untested
```

### Mock External APIs
Already mocked:
- `@anthropic-ai/sdk` (in aiAssistant.test.js)
- Groq API (mock fetch in helpers.js)

---

## Performance Benchmarks

Target metrics:

| Operation | Target | Status |
|-----------|--------|--------|
| Page load | < 2s | ✅ Verify |
| 1000 items import | < 2s | ✅ Test added |
| Search filter | < 300ms | ✅ Test added |
| Kanban scroll | < 500ms | ✅ Test added |
| Memory (1000 items) | < 70% heap | ✅ Test added |

---

## Known Limitations

1. **Firebase Security Rules**: Not tested end-to-end (would need real Firebase project)
2. **Multi-Tab Sync**: Not tested (BroadcastChannel tests need coordination)
3. **Dark Mode**: Not implemented yet
4. **Browser Compat**: Only Chromium tested (need Firefox + WebKit)

---

## Future Test Improvements

- [ ] Add Lighthouse CI (performance + SEO)
- [ ] Visual regression tests (Percy.io)
- [ ] Load testing (k6, artillery)
- [ ] Security scanning (Snyk, npm audit)
- [ ] API integration tests (Firebase test emulator)
- [ ] Mutation testing (Stryker)

---

## Troubleshooting

### Tests Timeout
```bash
# Increase timeout
npm run test:e2e -- --timeout=30000
```

### Firebase Test Emulator Not Running
```bash
# Tests use real Firebase, not emulator
# Ensure network access to firebaseapp.com
```

### Rate Limiting Tests Fail
```bash
# Rate limiting might be enabled in test environment
# Check _setRateLimitingEnabled is called in beforeEach
```

### Accessibility Tests Fail
```bash
# axe-core might not load from CDN
# Check internet connection in CI
# Fallback: skip and implement locally
```

---

## Contact / Issues

Report test failures at:
- [GitHub Issues](https://github.com/joka-7/JobFlowTracker/issues)
- Include: test name, environment, error log
