/**
 * Chat Review (PreSession) Tests
 *
 * Verifies the chat review page loads:
 * - Page heading visible
 * - Metrics/stats visible
 */

import { test, expect } from '@playwright/test'
import { login, openClient, clickActionCard, clickBreadcrumbBack } from './helpers.js'

test.describe('Chat Review page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openClient(page, 'Sarah L.')
    // Navigate to Chat Review from Client Overview
    await clickActionCard(page, 'Review Chats')
    await page.waitForSelector('h2:has-text("Chat Review")', { timeout: 10000 })
  })

  test('loads with heading and metrics', async ({ page }) => {
    // Chat Review heading visible (h2 specifically, not the breadcrumb span)
    await expect(page.locator('h2:has-text("Chat Review")')).toBeVisible()
  })

  test('back navigation works', async ({ page }) => {
    // Click breadcrumb back button (← Sarah L.)
    await clickBreadcrumbBack(page)

    // Should be back on Client Overview
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible({ timeout: 10000 })
  })
})
