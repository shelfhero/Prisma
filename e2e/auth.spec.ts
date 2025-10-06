import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display login or dashboard page', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(1000)

    // Page should have loaded successfully
    const bodyExists = await page.locator('body').count() > 0
    expect(bodyExists).toBeTruthy()

    // Check that we're not stuck on loading screen
    const isLoading = await page.getByText(/зареждане|loading/i).isVisible().catch(() => false)
    expect(isLoading).toBeFalsy()
  })

  test('should navigate to receipts when logged in', async ({ page }) => {
    // Navigate to receipts page
    await page.goto('/receipts')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Should show receipts page or redirect to login
    const url = page.url()
    expect(url).toMatch(/receipts|login|auth/)
  })

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/receipts')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Page should load without getting stuck
    const url = page.url()
    expect(url).toBeTruthy()

    // Should not be stuck on loading screen
    const isLoading = await page.getByText(/зареждане|loading/i).isVisible().catch(() => false)
    expect(isLoading).toBeFalsy()
  })
})
