/**
 * Special Client States Tests
 *
 * Verifies that clients with non-standard states display correctly:
 * - Emily K. (pending_config) — shows Pending badge on dashboard
 * - Michael T. (post-crisis) — shows crisis alert banner
 */

import { test, expect } from '@playwright/test'
import { login, openClient } from './helpers.js'

test.describe('Special client states', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Emily K. shows Pending status badge on dashboard', async ({ page }) => {
    // Emily K. should be visible on the dashboard
    await expect(page.locator('td:has-text("Emily K.")')).toBeVisible()

    // Her row should show a Pending badge
    const emilyRow = page.locator('tr', { has: page.locator('text=Emily K.') })
    await expect(emilyRow.locator('text=Pending')).toBeVisible()
  })

  test('Michael T. shows crisis alert on Client Overview', async ({ page }) => {
    await openClient(page, 'Michael T.')

    // Crisis alert banner should show "Crisis event detected" text
    await expect(page.locator('text=Crisis event detected')).toBeVisible({ timeout: 10000 })
  })

  test('Michael T. shows alert indicator on dashboard', async ({ page }) => {
    // Michael T. should have an alert indicator in the Alerts column
    const michaelRow = page.locator('tr', { has: page.locator('text=Michael T.') })
    await expect(michaelRow).toBeVisible()

    // Alert rows are sorted to the top of the table
    const firstDataRow = page.locator('tbody tr').first()
    await expect(firstDataRow.locator('text=Michael T.')).toBeVisible()
  })
})
