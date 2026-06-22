import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Chapa Payment Gateway', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe('verifyWebhookSignature', () => {
    it('should validate a correct HMAC signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const body = JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-1234-1234567890' })
      const crypto = require('crypto')
      const expectedSig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(body).digest('hex')

      const result = verifyWebhookSignature(expectedSig, body)
      expect(result).toBe(true)
    })

    it('should reject an invalid HMAC signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const body = JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-1234-1234567890' })

      const result = verifyWebhookSignature('invalid-signature', body)
      expect(result).toBe(false)
    })

    it('should reject empty signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const body = JSON.stringify({ event: 'charge.completed' })

      const result = verifyWebhookSignature('', body)
      expect(result).toBe(false)
    })

    it('should reject when signature length differs (timing attack protection)', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const body = JSON.stringify({ event: 'charge.completed' })
      const crypto = require('crypto')
      const validSig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(body).digest('hex')

      // Truncate to trigger length check before timingSafeEqual
      const result = verifyWebhookSignature(validSig.slice(0, 10), body)
      expect(result).toBe(false)
    })

    it('should reject tampered body', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const crypto = require('crypto')
      const originalBody = JSON.stringify({ event: 'charge.completed', amount: 100 })
      const tamperedBody = JSON.stringify({ event: 'charge.completed', amount: 999999 })
      const sig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(originalBody).digest('hex')

      const result = verifyWebhookSignature(sig, tamperedBody)
      expect(result).toBe(false)
    })
  })

  describe('initializePayment', () => {
    it('should call Chapa API with correct payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 'success', data: { checkout_url: 'https://checkout.chapa.co/pay/abc', tx_ref: 'RMD-TEST-123' } }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const { initializePayment } = await import('@/lib/payments/chapa')
      const result = await initializePayment({
        amount: 1500,
        currency: 'ETB',
        email: 'customer@test.com',
        first_name: 'Test',
        last_name: 'User',
        tx_ref: 'RMD-TEST-123',
        callback_url: 'https://app.com/api/webhooks/chapa',
        return_url: 'https://app.com/orders/test',
      })

      expect(result.status).toBe('success')
      expect(result.data.checkout_url).toBe('https://checkout.chapa.co/pay/abc')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.chapa.co/v1/transaction/initialize',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-chapa-secret-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should handle Chapa API failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 'failed', message: 'Insufficient balance' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const { initializePayment } = await import('@/lib/payments/chapa')
      const result = await initializePayment({
        amount: 999999,
        currency: 'ETB',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        tx_ref: 'RMD-FAIL',
        callback_url: 'https://app.com/api/webhooks/chapa',
        return_url: 'https://app.com/orders/test',
      })

      expect(result.status).toBe('failed')
    })
  })

  describe('verifyPayment', () => {
    it('should verify payment status with Chapa', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ status: 'success', data: { tx_ref: 'RMD-123', status: 'success' } }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const { verifyPayment } = await import('@/lib/payments/chapa')
      const result = await verifyPayment('RMD-123')

      expect(result.status).toBe('success')
      expect(result.data.status).toBe('success')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.chapa.co/v1/transaction/verify/RMD-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-chapa-secret-key',
          }),
        })
      )
    })
  })
})
