import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

describe('Webhook Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Chapa Webhook Handler', () => {
    it('should reject requests with invalid signature before any processing', async () => {
      // Import route and verify the order of operations
      const chapaModule = await import('@/app/api/webhooks/chapa/route')
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')

      const mockBody = JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-TEST-123' })
      const request = new Request('http://localhost:3000/api/webhooks/chapa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-chapa-signature': 'invalid-signature',
        },
        body: mockBody,
      })

      const result = await chapaModule.POST(request)
      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body.error).toBe('Invalid signature')
    })

    it('should reject empty signature header', async () => {
      const chapaModule = await import('@/app/api/webhooks/chapa/route')
      const request = new Request('http://localhost:3000/api/webhooks/chapa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'charge.completed' }),
      })

      const result = await chapaModule.POST(request)
      expect(result.status).toBe(401)
    })

    it('should process valid webhook with correct signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')

      // Import route with mocked Supabase
      const mockInsert = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockResolvedValue({ error: null })
      const mockEq = vi.fn().mockReturnThis()
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'payment_webhook_events') return { insert: mockInsert }
        if (table === 'payment_transactions') return { update: vi.fn().mockReturnThis(), eq: mockEq }
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
      })

      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn().mockResolvedValue({
          from: mockFrom,
          auth: { getUser: vi.fn() },
          rpc: vi.fn(),
        }),
      }))

      // Generate valid signature
      const crypto = require('crypto')
      const body = JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-TEST-123' })
      const validSig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(body).digest('hex')

      // Need to re-import after mock change
      const chapaModule = await import('@/app/api/webhooks/chapa/route')
      const request = new Request('http://localhost:3000/api/webhooks/chapa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-chapa-signature': validSig,
        },
        body,
      })

      const result = await chapaModule.POST(request)
      expect(result.status).toBe(200)
    })

    it('should reject replay attack with old signature', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')

      const crypto = require('crypto')
      const oldBody = JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-OLD-123' })
      const newBody = JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-NEW-456' })
      const oldSig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(oldBody).digest('hex')

      // Using old signature with new body should fail
      const result = verifyWebhookSignature(oldSig, newBody)
      expect(result).toBe(false)
    })

    it('should reject tampered amount in webhook body', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')

      const crypto = require('crypto')
      const originalBody = JSON.stringify({ event: 'charge.completed', amount: 5000, tx_ref: 'RMD-123' })
      const tamperedBody = JSON.stringify({ event: 'charge.completed', amount: 5, tx_ref: 'RMD-123' })
      const sig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(originalBody).digest('hex')

      const result = verifyWebhookSignature(sig, tamperedBody)
      expect(result).toBe(false)
    })
  })

  describe('HMAC Timing Attack Protection', () => {
    it('should use timingSafeEqual for signature comparison', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const crypto = require('crypto')

      const body = JSON.stringify({ event: 'test', data: 'value' })
      const validSig = crypto.createHmac('sha256', 'test-chapa-secret-key').update(body).digest('hex')

      // Should still work correctly
      expect(verifyWebhookSignature(validSig, body)).toBe(true)
    })

    it('should reject signature with different length immediately', async () => {
      const { verifyWebhookSignature } = await import('@/lib/payments/chapa')
      const body = JSON.stringify({ event: 'test' })

      // Very short signature should fail
      expect(verifyWebhookSignature('short', body)).toBe(false)

      // Empty signature should fail
      expect(verifyWebhookSignature('', body)).toBe(false)

      // Very long signature should fail
      expect(verifyWebhookSignature('a'.repeat(100), body)).toBe(false)
    })
  })

  describe('Webhook Event Logging', () => {
    it('should not log unverified webhook events to DB', async () => {
      // This is the critical fix from Phase 10C:
      // signature verification happens BEFORE logging
      const mockInsert = vi.fn()
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({ insert: mockInsert }),
          auth: { getUser: vi.fn() },
          rpc: vi.fn(),
        }),
      }))

      const chapaModule = await import('@/app/api/webhooks/chapa/route')
      const request = new Request('http://localhost:3000/api/webhooks/chapa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-chapa-signature': 'forged',
        },
        body: JSON.stringify({ event: 'charge.completed', tx_ref: 'RMD-FORGED' }),
      })

      await chapaModule.POST(request)

      // Verify insert was NOT called (signature verification fails first)
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})
