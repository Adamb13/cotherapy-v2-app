/**
 * My Practice Dashboard Tests
 *
 * Verifies the therapist's home screen loads correctly:
 * - Client table visible with real data
 * - Search filters clients by name
 * - Filter chips narrow by status
 * - Open buttons navigate to Client Overview
 */

import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('My Practice dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('loads and shows client table', async ({ page }) => {
    // Dashboard heading visible
    await expect(page.locator('h1:has-text("My Practice")')).toBeVisible()

    // Client table headers visible
    await expect(page.locator('th:has-text("Client")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    await expect(page.locator('th:has-text("Alerts")')).toBeVisible()

    // At least one client name visible (Sarah L. is the primary demo client)
    await expect(page.locator('text=Sarah L.')).toBeVisible()
  })

  test('search filters clients by name', async ({ page }) => {
    // Type a client name into search
    await page.fill('input[placeholder="Search clients..."]', 'Sarah')

    // Sarah L. should still be visible
    await expect(page.locator('td:has-text("Sarah L.")')).toBeVisible()

    // Another client (David R.) should be filtered out
    await expect(page.locator('td:has-text("David R.")')).not.toBeVisible()
  })

  test('filter chips narrow results by status', async ({ page }) => {
    // Click the "Active" filter chip
    await page.click('button:has-text("Active")')

    // Active clients should be visible (Sarah L. is active)
    await expect(page.locator('td:has-text("Sarah L.")')).toBeVisible()

    // Emily K. is "Pending" — should be filtered out when Active is selected
    await expect(page.locator('td:has-text("Emily K.")')).not.toBeVisible()

    // Click "All" to reset
    await page.click('button:has-text("All")')
    await expect(page.locator('td:has-text("Emily K.")')).toBeVisible()
  })

  test('Open button navigates to Client Overview', async ({ page }) => {
    // Click the Open button in Sarah L.'s row
    const sarahRow = page.locator('tr', { has: page.locator('text=Sarah L.') })
    await sarahRow.locator('button:has-text("Open")').click()

    // Should land on Client Overview with action cards
    await expect(page.locator('text=Add Session Notes')).toBeVisible({ timeout: 10000 })
  })
})
