-- Phase 7: Inventory Forecasting

create table if not exists inventory_forecasts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  forecast_date date not null,
  predicted_quantity numeric(12,4) not null default 0,
  confidence_score numeric(4,3),
  reorder_recommended boolean default false,
  recommended_order_quantity numeric(12,4),
  recommended_supplier_id uuid references suppliers(id) on delete set null,
  daily_usage_rate numeric(12,4),
  lead_time_days integer,
  stockout_risk text not null default 'low' check (stockout_risk in ('low','medium','high','critical')),
  model_version text default 'v1',
  created_at timestamptz default now()
);

create table if not exists reorder_suggestions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  current_stock numeric(12,4) not null default 0,
  reorder_level numeric(12,4) not null default 0,
  suggested_order_qty numeric(12,4) not null default 0,
  daily_usage_rate numeric(12,4) not null default 0,
  days_until_stockout integer not null default 0,
  lead_time_days integer not null default 0,
  urgency text not null default 'normal' check (urgency in ('normal','soon','critical','overdue')),
  preferred_supplier_id uuid references suppliers(id) on delete set null,
  estimated_cost numeric(14,2),
  is_actioned boolean default false,
  actioned_at timestamptz,
  actioned_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_inventory_forecasts_restaurant on inventory_forecasts(restaurant_id, forecast_date desc);
create index if not exists idx_inventory_forecasts_ingredient on inventory_forecasts(ingredient_id, forecast_date desc);
create index if not exists idx_inventory_forecasts_risk on inventory_forecasts(restaurant_id, stockout_risk) where stockout_risk in ('high','critical');
create index if not exists idx_reorder_suggestions_restaurant on reorder_suggestions(restaurant_id, urgency);
create index if not exists idx_reorder_suggestions_ingredient on reorder_suggestions(ingredient_id);
create index if not exists idx_reorder_suggestions_pending on reorder_suggestions(restaurant_id) where not is_actioned;

-- Enable RLS
alter table inventory_forecasts enable row level security;
alter table reorder_suggestions enable row level security;

-- RLS: inventory_forecasts
create policy "Staff can view forecasts"
  on inventory_forecasts for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid()));

create policy "Inventory managers and up can manage forecasts"
  on inventory_forecasts for all
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','inventory_manager','manager')))
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','inventory_manager','manager')));

-- RLS: reorder_suggestions
create policy "Staff can view reorder suggestions"
  on reorder_suggestions for select
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid()));

create policy "Inventory managers and up can manage suggestions"
  on reorder_suggestions for all
  using (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','inventory_manager','manager')))
  with check (restaurant_id in (select restaurant_id from profiles where id = auth.uid() and role in ('admin','inventory_manager','manager')));

-- Auto-update timestamps
create trigger update_reorder_suggestions_timestamp
  before update on reorder_suggestions
  for each row execute function update_updated_at();

-- Helper: generate forecasts for a specific ingredient
create or replace function generate_ingredient_forecast(
  p_restaurant_id uuid,
  p_ingredient_id uuid,
  p_days integer default 30
) returns setof inventory_forecasts as $$
declare
  v_daily_usage numeric(12,4);
  v_current_stock numeric(12,4);
  v_reorder_level numeric(12,4);
  v_lead_time integer;
  v_stockout_days integer;
  v_risk text;
  v_forecast_date date;
  i integer;
begin
  -- Get daily usage from actual consumption data (last 30 days)
  select coalesce(abs(sum(quantity)) / 30.0, 0)
  into v_daily_usage
  from stock_movements
  where ingredient_id = p_ingredient_id
    and restaurant_id = p_restaurant_id
    and type = 'deduction'
    and created_at >= now() - interval '30 days';

  -- Get current stock and reorder level
  select current_quantity, reorder_level
  into v_current_stock, v_reorder_level
  from stock_items
  where ingredient_id = p_ingredient_id
    and restaurant_id = p_restaurant_id;

  -- Get lead time from supplier_ingredients
  select min(si.lead_time_days)
  into v_lead_time
  from supplier_ingredients si
  join suppliers s on s.id = si.supplier_id
  where si.ingredient_id = p_ingredient_id
    and s.restaurant_id = p_restaurant_id
    and s.is_active = true;

  v_lead_time := coalesce(v_lead_time, 3); -- default 3 days

  -- Calculate stockout risk
  if v_daily_usage > 0 and v_current_stock > 0 then
    v_stockout_days := (v_current_stock / v_daily_usage)::integer;
  else
    v_stockout_days := 999;
  end if;

  if v_stockout_days <= v_lead_time then
    v_risk := 'critical';
  elsif v_stockout_days <= v_lead_time * 2 then
    v_risk := 'high';
  elsif v_stockout_days <= v_lead_time * 3 then
    v_risk := 'medium';
  else
    v_risk := 'low';
  end if;

  -- Generate forecasts for each day
  for i in 1..p_days loop
    v_forecast_date := current_date + i;
    return query
    insert into inventory_forecasts (
      restaurant_id, ingredient_id, forecast_date,
      predicted_quantity, confidence_score,
      reorder_recommended, recommended_order_quantity,
      recommended_supplier_id, daily_usage_rate,
      lead_time_days, stockout_risk, model_version
    ) values (
      p_restaurant_id, p_ingredient_id, v_forecast_date,
      greatest(v_current_stock - (v_daily_usage * i), 0),
      case when v_daily_usage > 0 then least(0.95, 0.50 + (i::numeric / p_days * 0.40)) else 0.10 end,
      (v_current_stock - (v_daily_usage * i)) <= v_reorder_level,
      greatest((v_daily_usage * (v_lead_time + 3)) - greatest(v_current_stock - (v_daily_usage * i), 0), 0),
      null,
      v_daily_usage, v_lead_time, v_risk, 'v1'
    )
    returning *;
  end loop;
end;
$$ language plpgsql volatile;

-- Helper: generate reorder suggestions for all ingredients
create or replace function generate_reorder_suggestions(
  p_restaurant_id uuid
) returns setof reorder_suggestions as $$
declare
  v_ingredient record;
  v_current_stock numeric(12,4);
  v_reorder_level numeric(12,4);
  v_daily_usage numeric(12,4);
  v_suggested_qty numeric(12,4);
  v_days_until integer;
  v_lead_time integer;
  v_urgency text;
  v_preferred_supplier_id uuid;
  v_estimated_cost numeric(14,2);
begin
  for v_ingredient in
    select si.id as stock_item_id, si.ingredient_id, si.current_quantity, si.reorder_level, si.reorder_quantity, si.unit_cost,
           i.name as ingredient_name
    from stock_items si
    join ingredients i on i.id = si.ingredient_id
    where si.restaurant_id = p_restaurant_id
      and si.current_quantity <= si.reorder_level
  loop
    -- Get daily usage rate
    select coalesce(abs(sum(quantity)) / 30.0, 0)
    into v_daily_usage
    from stock_movements
    where ingredient_id = v_ingredient.ingredient_id
      and restaurant_id = p_restaurant_id
      and type = 'deduction'
      and created_at >= now() - interval '30 days';

    -- Get lead time
    select min(si2.lead_time_days)
    into v_lead_time
    from supplier_ingredients si2
    join suppliers s on s.id = si2.supplier_id
    where si2.ingredient_id = v_ingredient.ingredient_id
      and s.restaurant_id = p_restaurant_id
      and s.is_active = true;

    v_lead_time := coalesce(v_lead_time, 3);

    -- Days until stockout
    if v_daily_usage > 0 and v_ingredient.current_quantity > 0 then
      v_days_until := (v_ingredient.current_quantity / v_daily_usage)::integer;
    else
      v_days_until := 999;
    end if;

    -- Urgency
    if v_days_until <= 0 then
      v_urgency := 'overdue';
    elsif v_days_until <= v_lead_time then
      v_urgency := 'critical';
    elsif v_days_until <= v_lead_time * 2 then
      v_urgency := 'soon';
    else
      v_urgency := 'normal';
    end if;

    -- Suggested reorder quantity
    v_suggested_qty := greatest(v_daily_usage * (v_lead_time + 3) - v_ingredient.current_quantity, 0);

    -- Preferred supplier
    select s.id into v_preferred_supplier_id
    from supplier_ingredients si2
    join suppliers s on s.id = si2.supplier_id
    where si2.ingredient_id = v_ingredient.ingredient_id
      and s.restaurant_id = p_restaurant_id
      and s.is_active = true
    order by si2.unit_cost asc nulls last, si2.lead_time_days asc nulls last
    limit 1;

    -- Estimated cost
    v_estimated_cost := coalesce(v_ingredient.unit_cost, 0) * v_suggested_qty;

    return query
    insert into reorder_suggestions (
      restaurant_id, ingredient_id, current_stock, reorder_level,
      suggested_order_qty, daily_usage_rate, days_until_stockout,
      lead_time_days, urgency, preferred_supplier_id, estimated_cost
    ) values (
      p_restaurant_id, v_ingredient.ingredient_id,
      v_ingredient.current_quantity, v_ingredient.reorder_level,
      v_suggested_qty, v_daily_usage, v_days_until,
      v_lead_time, v_urgency, v_preferred_supplier_id, v_estimated_cost
    )
    returning *;
  end loop;
end;
$$ language plpgsql volatile;
