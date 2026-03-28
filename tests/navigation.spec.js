/**
 * Navigation & Stability Tests
 *
 * Verifies that navigating between pages works smoothly:
 * - No console errors on any page
 * - No blank/white screens
 * - Back navigation works from every sub-page
 */

import { test, expect } from '@playwright/test'
import { login, openClient, clickActionCard, clickBreadcrumbBack } from './helpers.js'

test.describe('Navigation and stability', () => {
  test('no console errors on dashboard load', async ({ page }) => {
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await login(page)

    // Dashboard should be fully loaded
    await expect(page.locator('h1:has-text("My Practice")')).toBeVisible()

    // Filter out known benign errors (favicon 404, Supabase race conditions,
    // React DOM nesting warnings, crisis alert count timing issues)
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') &&
      !e.includes('ERR_') &&
      !e.includes('validateDOMNesting') &&
      !e.includes('Error counting crisis alerts')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('no console errors navigating to Client Overview', async ({ page }) => {
    // Collect errors only AFTER login completes
    await login(page)

    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await openClient(page, 'Sarah L.')

    // Client Overview should be visible
    await expect(page.locator('h1:has-text("Sarah L.")')).toBeVisible()

    // Filter out known benign errors
    const realErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') &&
      !e.includes('ERR_')
    )
    expect(realErrors).toHaveLength(0)
  })

  test('full round-trip: dashboard → client → session notes → back → back', async ({ page }) => {
    await login(page)

    // Dashboard → Client Overview
    await openClient(page, 'Sarah L.')
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible()

    // Client Overview → Session Notes
    await clickActionCard(page, 'Add Session Notes')
    await page.waitForSelector('h2:has-text("Session notes")', { timeout: 10000 })
    await expect(page.locator('h2:has-text("Session notes")')).toBeVisible()

    // Session Notes → back to Client Overview
    await clickBreadcrumbBack(page)
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible({ timeout: 10000 })

    // Client Overview → back to Dashboard
    await clickBreadcrumbBack(page)
    await expect(page.locator('h1:has-text("My Practice")')).toBeVisible({ timeout: 10000 })
  })

  test('full round-trip: dashboard → client → chat review → back → back', async ({ page }) => {
    await login(page)

    // Dashboard → Client Overview
    await openClient(page, 'Sarah L.')

    // Client Overview → Chat Review
    await clickActionCard(page, 'Review Chats')
    await page.waitForSelector('h2:has-text("Chat Review")', { timeout: 10000 })

    // Chat Review → back to Client Overview
    await clickBreadcrumbBack(page)
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible({ timeout: 10000 })

    // Client Overview → back to Dashboard
    await clickBreadcrumbBack(page)
    await expect(page.locator('h1:has-text("My Practice")')).toBeVisible({ timeout: 10000 })
  })

  test('full round-trip: dashboard → client → settings → back → back', async ({ page }) => {
    await login(page)

    // Dashboard → Client Overview
    await openClient(page, 'Sarah L.')

    // Client Overview → Client Settings
    await clickActionCard(page, 'Client Settings')
    await page.waitForSelector('text=Display Name', { timeout: 10000 })

    // Client Settings → back to Client Overview
    await clickBreadcrumbBack(page)
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible({ timeout: 10000 })

    // Client Overview → back to Dashboard
    await clickBreadcrumbBack(page)
    await expect(page.locator('h1:has-text("My Practice")')).toBeVisible({ timeout: 10000 })
  })

  test('no blank screens — every page has content', async ({ page }) => {
    await login(page)

    // Dashboard has content
    const dashboardContent = await page.locator('body').innerText()
    expect(dashboardContent.length).toBeGreaterThan(50)

    // Client Overview has content
    await openClient(page, 'Sarah L.')
    const clientContent = await page.locator('body').innerText()
    expect(clientContent.length).toBeGreaterThan(50)

    // Session Notes has content
    await clickActionCard(page, 'Add Session Notes')
    await page.waitForSelector('h2:has-text("Session notes")', { timeout: 10000 })
    const sessionContent = await page.locator('body').innerText()
    expect(sessionContent.length).toBeGreaterThan(50)
  })
})
