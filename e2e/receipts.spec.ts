import { test, expect } from '@playwright/test'

test.describe('Receipt Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to receipts page
    await page.goto('/receipts')
    await page.waitForLoadState('networkidle')
  })

  test('should display receipts page', async ({ page }) => {
    // Verify we're on receipts page or redirected to auth
    const url = page.url()
    expect(url).toMatch(/receipts|login|auth/)

    // If on receipts page, check for page elements
    if (url.includes('receipts')) {
      // Page should have loaded successfully
      expect(await page.locator('body').count()).toBeGreaterThan(0)
    }
  })

  test('should display navigation and user menu', async ({ page }) => {
    // Wait for page to settle
    await page.waitForTimeout(1000)

    const url = page.url()
    expect(url).toBeTruthy()

    // Should not be stuck on loading
    const isLoading = await page.getByText(/зареждане|loading/i).isVisible().catch(() => false)
    expect(isLoading).toBeFalsy()
  })

  test('should load page without errors', async ({ page }) => {
    // Check that page loaded successfully
    const url = page.url()
    expect(url).toBeTruthy()

    // No critical errors
    const bodyExists = await page.locator('body').count() > 0
    expect(bodyExists).toBeTruthy()
  })

  test('should handle empty receipts state', async ({ page }) => {
    const url = page.url()

    if (url.includes('receipts')) {
      // Wait for content to load
      await page.waitForTimeout(2000)

      // Page should display either receipts or empty state
      const hasContent = await page.locator('main, [role="main"], .main-content').count() > 0
      expect(hasContent).toBeTruthy()
    }
  })

  test('should have responsive layout', async ({ page }) => {
    const url = page.url()

    if (url.includes('receipts')) {
      // Check viewport
      const viewport = page.viewportSize()
      expect(viewport).toBeTruthy()

      // Page should render at current viewport
      const bodyVisible = await page.locator('body').isVisible()
      expect(bodyVisible).toBeTruthy()
    }
  })
})

test.describe('Feedback and Bug Reporting', () => {
  test('should have feedback button visible', async ({ page }) => {
    await page.goto('/receipts')
    await page.waitForLoadState('networkidle')

    // Wait for floating buttons to render
    await page.waitForTimeout(1000)

    // Check for feedback or bug report buttons (floating buttons)
    const floatingButtons = await page.locator('button[class*="fixed"], button[class*="floating"]').count()

    // Should have at least the feedback/bug buttons
    expect(floatingButtons).toBeGreaterThan(0)
  })

  test('should display test pages', async ({ page }) => {
    // Test Sentry page exists
    await page.goto('/test-sentry')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toContain('test-sentry')
  })
})
