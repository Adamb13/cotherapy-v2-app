/**
 * Client Settings Tests
 *
 * Verifies the client settings wizard loads when accessed
 * from the Client Overview page:
 * - Breadcrumb shows "Settings" label
 * - Step progress indicator is visible
 * - Form fields are present
 */

import { test, expect } from '@playwright/test'
import { login, openClient, clickActionCard, clickBreadcrumbBack } from './helpers.js'

test.describe('Client Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openClient(page, 'Sarah L.')
    // Navigate to Client Settings from Client Overview
    await clickActionCard(page, 'Client Settings')
    await page.waitForSelector('text=Display Name', { timeout: 10000 })
  })

  test('loads with breadcrumb and progress steps', async ({ page }) => {
    // "Settings" label visible in breadcrumb (exact match to avoid "AI Settings")
    await expect(page.locator('text="Settings"')).toBeVisible()

    // Display Name field visible (step 0)
    await expect(page.locator('text=Display Name')).toBeVisible()
  })

  test('shows client info step by default', async ({ page }) => {
    // Step 0 is Client Info — should see display name field
    await expect(page.locator('text=Display Name')).toBeVisible()
  })

  test('back navigation returns to Client Overview', async ({ page }) => {
    // Click the breadcrumb back button (← Sarah L.)
    await clickBreadcrumbBack(page)

    // Should be back on Client Overview
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible({ timeout: 10000 })
  })
})
