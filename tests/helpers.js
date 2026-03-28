/**
 * Shared test helpers for CoTherapy Playwright tests
 *
 * login() — authenticates past the demo password screen
 * openClient() — navigates to a client's overview page
 * clickActionCard() — clicks an action card by its title text
 * clickBreadcrumbBack() — clicks the breadcrumb back button
 *
 * All tests start at the My Practice dashboard after login.
 */

const DEMO_PASSWORD = 'c0Therapy2025!'

/**
 * Log in to the app and wait for the dashboard to load.
 * Call this at the start of every test (or in beforeEach).
 */
export async function login(page) {
  await page.goto('/')
  await page.fill('input[type="password"]', DEMO_PASSWORD)
  await page.click('button[type="submit"]')
  // Wait for dashboard heading AND client data to load from Supabase.
  // The heading appears immediately but client rows load async.
  await page.waitForSelector('h1:has-text("My Practice")', { timeout: 15000 })
  await page.waitForSelector('td:has-text("Sarah L.")', { timeout: 30000 })
}

/**
 * Navigate to a specific client's overview by clicking their row in the dashboard.
 * Assumes we're already on the My Practice dashboard.
 */
export async function openClient(page, clientName) {
  // Click the client's row in the table
  const clientRow = page.locator('tr', { hasText: clientName })
  await clientRow.locator('button:has-text("Open")').click()
  // Wait for Client Overview to load — action cards confirm it
  await page.waitForSelector('button:has-text("Add Session Notes")', { timeout: 10000 })
}

/**
 * Click an action card by its title text (e.g., "Add Session Notes").
 * ActionCards are <button> elements containing the title.
 */
export async function clickActionCard(page, title) {
  await page.locator('.page button', { hasText: title }).click()
}

/**
 * Click the breadcrumb back button (contains ← arrow).
 * Uses a narrow selector: buttons with background:none (breadcrumb style)
 * that contain the ← arrow character.
 */
export async function clickBreadcrumbBack(page) {
  // Target buttons that contain the ← character — there may be one in
  // the nav bar and one in the breadcrumb. The nav bar one has class "nav-link",
  // so we exclude it by targeting buttons WITHOUT that class.
  await page.locator('button:not(.nav-link):has-text("←")').first().click()
}
