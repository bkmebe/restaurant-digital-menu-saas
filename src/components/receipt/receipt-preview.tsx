'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, Copy, Download } from 'lucide-react'
import type { Receipt } from '@/hooks/use-receipts'

interface ReceiptPreviewProps {
  receipt: Receipt
}

export function ReceiptPreview({ receipt }: ReceiptPreviewProps) {
  const { t } = useLanguage()
  const [view, setView] = useState<'thermal' | 'html'>('thermal')

  const handlePrint = () => {
    if (view === 'html' && receipt.receipt_html) {
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(receipt.receipt_html)
        win.document.close()
        win.focus()
        win.print()
      }
    } else {
      window.print()
    }
  }

  const handleCopy = async () => {
    const text = receipt.receipt_text || ''
    await navigator.clipboard.writeText(text)
  }

  // Strip receipts are typically 80mm wide (32-48 chars per line)
  const monoStyle = 'font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium">{receipt.receipt_number}</CardTitle>
          <p className="text-xs text-muted-foreground">{t('receipt.preview')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={handlePrint}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as 'thermal' | 'html')}>
          <TabsList className="mb-4">
            <TabsTrigger value="thermal">{t('receipt.thermalView')}</TabsTrigger>
            <TabsTrigger value="html">{t('receipt.htmlView')}</TabsTrigger>
          </TabsList>
          <TabsContent value="thermal">
            <div className="mx-auto max-w-[320px] rounded-lg border bg-white p-6 shadow-sm">
              <pre className={monoStyle}>{receipt.receipt_text}</pre>
            </div>
          </TabsContent>
          <TabsContent value="html">
            <div className="mx-auto max-w-[320px] rounded-lg border bg-white shadow-sm">
              <div
                className="receipt-html"
                dangerouslySetInnerHTML={{ __html: receipt.receipt_html || '' }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
