import { test, expect } from '@playwright/test';

/**
 * Smoke Test: Stock Data APIs
 * 
 * Tests critical API endpoints:
 * - /api/stocks/enriched returns data
 * - /api/screener/filters returns sectors
 * - Data structure is valid
 * - Response times are acceptable
 */

test.describe('Stock API Smoke Tests', () => {
  test('GET /api/stocks/enriched returns data', async ({ request }) => {
    const response = await request.get('/api/stocks/enriched');
    
    // Check status code
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    // Verify response is JSON
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    // Parse and validate data structure
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    
    // If data exists, validate structure
    if (data.data.length > 0) {
      const stock = data.data[0];
      expect(stock).toHaveProperty('ticker');
      expect(stock).toHaveProperty('name');
    }
  });

  test('GET /api/stocks/enriched with search param works', async ({ request }) => {
    const response = await request.get('/api/stocks/enriched?search=BBCA');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    
    // Results should be filtered
    if (data.data.length > 0) {
      const stock = data.data[0];
      const matchesSearch = 
        stock.ticker?.includes('BBCA') || 
        stock.name?.toLowerCase().includes('bca');
      expect(matchesSearch).toBeTruthy();
    }
  });

  test('GET /api/screener/filters returns sectors', async ({ request }) => {
    const response = await request.get('/api/screener/filters');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('sectors');
    expect(Array.isArray(data.sectors)).toBeTruthy();
    expect(data.sectors.length).toBeGreaterThan(0);
    
    // Should include 'All' option
    expect(data.sectors).toContain('All');
  });

  test('API response time is acceptable', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/stocks/enriched');
    const endTime = Date.now();
    
    expect(response.ok()).toBeTruthy();
    
    const responseTime = endTime - startTime;
    // Response should be under 5 seconds
    expect(responseTime).toBeLessThan(5000);
  });
});

test.describe('Stock API Error Handling', () => {
  test('API returns proper error for invalid params', async ({ request }) => {
    const response = await request.get('/api/stocks/enriched?minScore=invalid');
    
    // Should still return 200 with success: false or handle gracefully
    expect(response.status()).toBeLessThan(500); // No server error
  });

  test('health check endpoint works', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });
});
