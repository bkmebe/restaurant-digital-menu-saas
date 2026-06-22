# Phase 8: AI Business Assistant

## Architecture
```
User Query → NLP/LLM → SQL Generator → Database → Response Formatter → User
```

## Implementation Options

### Option 1: OpenAI / GPT-4 (Recommended)
- Function calling to generate SQL queries from natural language
- Context: Schema definition + few-shot examples
- Response: Natural language answer with optional chart data

### Option 2: LangChain + Local LLM
- Self-hosted for data privacy
- Lower cost for high volume
- Requires GPU for inference

## Data Pipeline
1. User types: "What were today's sales?"
2. System fetches restaurant schema context
3. LLM generates SQL: `SELECT SUM(total_amount) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND restaurant_id = '...' AND status = 'paid'`
4. Execute SQL against Supabase
5. Format result: "Today's sales: ETB 15,450 from 42 orders."

## Query Types
| Category | Example Queries |
|----------|----------------|
| Revenue | "What were today's sales?", "Monthly revenue trend" |
| Menu | "Which item is most profitable?", "What's the least ordered item?" |
| Staff | "Which waiter served the most tables?", "Who has the best reviews?" |
| Inventory | "What needs replenishment?", "Which ingredients are low?" |
| Predictions | "Predict next week's demand for Doro Wat" |
| Operations | "Which tables are occupied?", "How many pending orders?" |

## Permissions
- Admin: All queries
- Manager: Revenue, menu, staff, inventory (no payroll)
- Waiter: Own performance, table status
- Cashier: Today's revenue, order status

## API Design
```
POST /api/ai/query
Body: { query: string, restaurant_id: string }
Response: { answer: string, data?: any, chart?: ChartConfig }
```

## Security
- Query validation: Only SELECT queries permitted
- Schema isolation: Only the user's restaurant data accessible
- Rate limiting: 30 queries per hour per user
- Audit logging: All queries and responses logged
- PII filtering: No customer names in training data
