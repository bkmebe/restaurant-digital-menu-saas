# Product Requirements Document
## Restaurant Digital Menu & Management System — Ethiopia

### 1. Executive Summary
A QR-code-based digital menu and restaurant management system designed for the Ethiopian market. Customers scan a QR code at their table to browse multilingual menus (English, Amharic, Afaan Oromo), request service, and pay via local payment methods. Staff roles (waiter, cashier, manager, admin) manage operations through role-specific dashboards.

### 2. Product Vision
Empower Ethiopian restaurants with a modern, contactless dining experience that bridges traditional hospitality with digital convenience, supporting local languages and payment systems.

### 3. Target Users
- **Customers**: Dine-in guests who scan QR codes at tables
- **Waiters**: Floor staff managing table service
- **Cashiers**: Staff handling payments and order closure
- **Managers**: Oversee daily operations, staff, and analytics
- **Admins**: Full system control including menu, employees, payroll, and payments

### 4. Core Features by Role

#### Customer
- QR-based table-specific menu access (no login required)
- Browse menu by categories with images and prices
- Search and filter menu items
- Multi-language toggle (EN, AM, OM)
- Request waiter assistance
- Request bill
- View available payment methods
- Mobile-first responsive design

#### Waiter
- Secure login with phone number
- View assigned tables dashboard
- Real-time service request notifications
- Order tracking and status updates
- Table status management (occupied, available, cleaning)
- Customer assistance workflow

#### Cashier
- View open orders and bills
- Process payments
- Close orders
- Generate receipts
- Manage payment methods (Telebirr, CBE Birr, bank)

#### Manager
- Revenue dashboard with charts (daily, monthly)
- Popular menu items analytics
- Employee performance metrics
- Table utilization reports
- View payroll summaries

#### Admin
- **Menu Management**: CRUD items, categories, images, availability
- **Employee Management**: CRUD employees with profile, national ID verification
- **Payroll Management**: Monthly payroll processing, salary history, attendance
- **Table Management**: Create tables, assign QR codes, assign waiters
- **Payment Management**: Configure Telebirr, CBE Birr, bank accounts, QR payment links
- **Security**: Role-based access, audit logs, admin MFA

### 5. Non-Functional Requirements
- **Performance**: Page load < 2s, API response < 500ms
- **Security**: OWASP Top 10 compliance, data encryption, rate limiting
- **Scalability**: Support 1000+ concurrent restaurant sessions
- **Availability**: 99.9% uptime target
- **Mobile**: Fully responsive for devices 320px and up
