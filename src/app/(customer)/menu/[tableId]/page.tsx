import { createServerSupabaseClient } from '@/lib/supabase/server'
import { t } from '@/lib/i18n/config'
import MenuPageClient from './MenuPageClient'

interface TableResult {
  id: string
  restaurant_id: string
  restaurant: { name: string } | null
}

export default async function MenuPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params
  const supabase = await createServerSupabaseClient()

  const tableResult = await supabase
    .from('tables')
    .select('id, restaurant_id')
    .eq('id', tableId)
    .maybeSingle()

  if (!tableResult.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">{t('error.tableNotFound')}</h1>
          <p className="text-muted-foreground">
            {t('error.tableNotFoundDesc')}
          </p>
        </div>
      </div>
    )
  }

  const restaurantResult = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', tableResult.data.restaurant_id)
    .maybeSingle()

  const table: TableResult = {
    id: tableResult.data.id,
    restaurant_id: tableResult.data.restaurant_id,
    restaurant: restaurantResult.data || null,
  }

  return <MenuPageClient table={table} />
}
