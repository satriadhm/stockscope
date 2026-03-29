import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Payment Webhook
 * 
 * Tests Midtrans webhook endpoint:
 * - Endpoint is accessible
 * - Proper authentication/validation
 * - Error handling for invalid payloads
 * 
 * Note: These tests verify the endpoint exists and handles
 * requests properly. Full integration testing with Midtrans
 * sandbox would require separate staging environment.
 */

test.describe('Payment Webhook Smoke Tests', () => {
  test('POST /api/payment/webhook endpoint exists', async ({ request }) => {
    const response = await request.post('/api/payment/webhook', {
      data: {},
    });
    
    // Should not return 404
    expect(response.status()).not.toBe(404);
    
    // Should return 400 or 401 (bad request/unauthorized) for empty payload
    // This proves the endpoint exists and has validation
    expect([400, 401, 403]).toContain(response.status());
  });

  test('webhook rejects invalid signature', async ({ request }) => {
    const invalidPayload = {
      order_id: 'TEST-123',
      transaction_status: 'settlement',
      signature_key: 'invalid_signature',
    };
    
    const response = await request.post('/api/payment/webhook', {
      data: invalidPayload,
    });
    
    // Should reject invalid signature
    expect([400, 401, 403]).toContain(response.status());
  });

  test('webhook requires proper content-type', async ({ request }) => {
    const response = await request.post('/api/payment/webhook', {
      headers: {
        'content-type': 'text/plain',
      },
      data: 'invalid data',
    });
    
    // Should reject non-JSON content
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Payment Create Endpoint', () => {
  test('POST /api/payment/create requires authentication', async ({ request }) => {
    const response = await request.post('/api/payment/create', {
      data: {
        plan: 'premium',
      },
    });
    
    // Should require authentication
    // Either 401 (unauthorized) or 400 (bad request without auth)
    expect([400, 401, 403]).toContain(response.status());
  });

  test('payment endpoint validates plan parameter', async ({ request }) => {
    const response = await request.post('/api/payment/create', {
      data: {
        plan: 'invalid_plan',
      },
    });
    
    // Should validate plan
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Critical Path: Payment Flow', () => {
  test('unauthenticated user can see upgrade page', async ({ page }) => {
    await page.goto('/en/upgrade');
    
    // Upgrade page should load
    await expect(page).toHaveURL(/\/en\/upgrade/);
    
    // Should show pricing information
    await expect(
      page.getByText(/premium|pro|upgrade/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('upgrade page shows pricing tiers', async ({ page }) => {
    await page.goto('/en/upgrade');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Should have pricing information or upgrade CTA
    const pageContent = await page.textContent('body');
    const hasPricingKeywords = 
      /premium|pro|upgrade|plan|price|rp/i.test(pageContent || '');
    
    expect(hasPricingKeywords).toBeTruthy();
  });
});
