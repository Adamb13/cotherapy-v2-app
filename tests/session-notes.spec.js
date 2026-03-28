/**
 * Session Notes (PostSession) Tests
 *
 * Verifies the 60/40 split panel page:
 * - Loads with textarea for notes
 * - Right panel (Intersession setup) is visible
 * - Save buttons present
 */

import { test, expect } from '@playwright/test'
import { login, openClient, clickActionCard, clickBreadcrumbBack } from './helpers.js'

test.describe('Session Notes page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await openClient(page, 'Sarah L.')
    // Navigate to Session Notes from Client Overview
    await clickActionCard(page, 'Add Session Notes')
    await page.waitForSelector('h2:has-text("Session notes")', { timeout: 10000 })
  })

  test('loads with text area for notes', async ({ page }) => {
    // Session notes heading visible
    await expect(page.locator('h2:has-text("Session notes")')).toBeVisible()

    // Main notes textarea present with placeholder (first textarea on the page)
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveAttribute('placeholder', /Paste your session notes here/)
  })

  test('intersession setup panel is visible', async ({ page }) => {
    // Right panel heading
    await expect(page.locator('text=Intersession setup')).toBeVisible()

    // Integration direction section
    await expect(page.locator('text=Integration direction')).toBeVisible()

    // TIM section
    await expect(page.locator('text=Therapeutic intensity')).toBeVisible()

    // Save & update button on right panel
    await expect(page.locator('button:has-text("Save & update")')).toBeVisible()
  })

  test('save buttons are present', async ({ page }) => {
    await expect(page.locator('button:has-text("Save notes")')).toBeVisible()
    await expect(page.locator('button:has-text("Save & extract moments")')).toBeVisible()
  })

  test('back navigation works', async ({ page }) => {
    // Click the breadcrumb back button (← Sarah L.)
    await clickBreadcrumbBack(page)

    // Should be back on Client Overview
    await expect(page.locator('button:has-text("Add Session Notes")')).toBeVisible({ timeout: 10000 })
  })
})
