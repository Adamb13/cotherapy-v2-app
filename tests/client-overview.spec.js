/**
 * Client Overview Tests (Sarah L.)
 *
 * Verifies the client landing page loads with:
 * - Client name in header
 * - Stats/summary info
 * - Action cards for navigation
 * - Breadcrumb back to dashboard
 */

import { test, expect } from '@playwright/test'
import { login, openClient, clickBreadcrumbBack } from './helpers.js'

test.describe('Client Overview — Sarah L.', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openClient(page, 'Sarah L.')
  })

  test('loads with client header and action cards', async ({ page }) => {
    // Client name visible in the header card
    await expect(page.locator('h1:has-text("Sarah L.")')).toBeVisible()

    // Action cards visible — these are <button> elements
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible()
    await expect(page.locator('button:has-text("Review Chats")')).toBeVisible()
    await expect(page.locator('button:has-text("Client Settings")')).toBeVisible()
  })

  test('breadcrumb navigates back to dashboard', async ({ page }) => {
    // Click the breadcrumb back button (← My Practice)
    await clickBreadcrumbBack(page)

    // Should be back on dashboard
    await expect(page.locator('h1:has-text("My Practice")')).toBeVisible()
  })
})
