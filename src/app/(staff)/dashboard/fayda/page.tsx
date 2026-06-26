'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { FaydaList } from '@/components/fayda/fayda-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { useFaydaVerify } from '@/hooks/use-fayda'
import { Shield, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

interface Employee {
  id: string
  full_name: string
  fayda_number: string | null
  fayda_verified: boolean
}

export default function FaydaPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { verify, loading: verifyLoading, error, clearError } = useFaydaVerify()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [faydaNumber, setFaydaNumber] = useState('')
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [success, setSuccess] = useState(false)
  const [view, setView] = useState<'list' | 'verify'>('list')

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const res = await fetch('/api/employees')
      if (res.ok) {
        const body = await res.json()
        setEmployees(body.data || [])
      }
    } catch {
      // silent
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleVerify = async () => {
    clearError()
    setSuccess(false)
    if (!selectedEmployee || !faydaNumber.trim()) return
    const result = await verify(selectedEmployee, faydaNumber.trim())
    if (result) {
      setSuccess(true)
      setFaydaNumber('')
      setSelectedEmployee('')
      fetchEmployees()
    }
  }

  const selectedEmp = employees.find(e => e.id === selectedEmployee)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view === 'verify' && (
            <Button variant="ghost" size="icon" onClick={() => { setView('list'); setSuccess(false); clearError() }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('fayda.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('fayda.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {view === 'list' && profile?.role === 'admin' && (
            <Button onClick={() => setView('verify')} className="gap-2">
              <Shield className="h-4 w-4" />
              {t('fayda.verifyNow')}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={fetchEmployees}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {view === 'verify' && (
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('fayda.newVerification')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                {t('fayda.verifySuccess')}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('fayda.selectEmployee')}</Label>
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <Select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  options={[
                    { value: '', label: t('fayda.selectEmployeePlaceholder') },
                    ...employees.map(emp => ({
                      value: emp.id,
                      label: `${emp.full_name}${emp.fayda_verified ? ' ✅' : ''}`,
                    })),
                  ]}
                />
              )}
            </div>

            {selectedEmp?.fayda_verified && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {t('fayda.alreadyVerified')}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fayda-number">{t('fayda.number')}</Label>
              <Input
                id="fayda-number"
                value={faydaNumber}
                onChange={(e) => setFaydaNumber(e.target.value)}
                placeholder={t('fayda.numberPlaceholder')}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={verifyLoading || !selectedEmployee || !faydaNumber.trim()}
              className="w-full gap-2"
            >
              {verifyLoading ? <LoadingSpinner size="sm" /> : <Shield className="h-4 w-4" />}
              {t('fayda.verifyNow')}
            </Button>
          </CardContent>
        </Card>
      )}

      {view === 'list' && <FaydaList />}
    </div>
  )
}
