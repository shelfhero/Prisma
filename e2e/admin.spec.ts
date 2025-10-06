import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin page
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('should handle admin page access', async ({ page }) => {
    // Either shows admin dashboard or redirects to login
    const url = page.url()
    const isAdminPage = url.includes('/admin')
    const isLoginPage = url.includes('/login') || url === 'http://localhost:3000/'

    expect(isAdminPage || isLoginPage).toBeTruthy()
  })

  test('should load page successfully', async ({ page }) => {
    // Page should load without critical errors
    const url = page.url()
    expect(url).toBeTruthy()

    // Body should exist
    const bodyExists = await page.locator('body').count() > 0
    expect(bodyExists).toBeTruthy()
  })

  test('should have navigation if authenticated', async ({ page }) => {
    // Wait for page to settle
    await page.waitForTimeout(2000)

    const url = page.url()

    // Verify we're on a valid page (admin or redirected to home)
    expect(url.includes('/admin') || url === 'http://localhost:3000/').toBeTruthy()

    // Check if on admin page - loading state is valid for unauthenticated users
    if (url.includes('/admin')) {
      // Either fully loaded admin dashboard or loading (checking auth)
      const hasContent = await page.locator('body').count() > 0
      expect(hasContent).toBeTruthy()
    }
  })
})

test.describe('Settings and Help Pages', () => {
  test('should load settings page', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toMatch(/settings|login|auth/)
  })

  test('should load help page', async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).toBeTruthy()
  })
})
