'use client'

import { useTenant } from '@/hooks/use-tenant'
import { useBranches } from '@/hooks/use-branches'
import { useSelectedBranch } from '@/hooks/use-selected-branch'
import { useLanguage } from '@/hooks/use-language'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

interface BranchSelectorProps {
  className?: string
}

export function BranchSelector({ className }: BranchSelectorProps) {
  const { t } = useLanguage()
  const { organizationId, restaurantId, isLoaded } = useTenant()
  const { branches, loading } = useBranches(isLoaded ? organizationId : null)
  const { selectedBranchId, setSelectedBranchId } = useSelectedBranch(isLoaded ? restaurantId : null)

  if (!isLoaded || loading || branches.length <= 1) return null

  const options = [
    { value: '', label: t('branchSelector.allBranches') },
    ...branches.map(b => ({ value: b.id, label: b.name })),
  ]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={selectedBranchId || ''}
        onChange={(e) => setSelectedBranchId(e.target.value || null)}
        options={options}
        className="w-56"
      />
    </div>
  )
}
