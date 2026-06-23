const en = {
  // Navigation
  'nav.menu': 'Menu',
  'nav.dashboard': 'Dashboard',
  'nav.waiter': 'Waiter',
  'nav.cashier': 'Cashier',
  'nav.manager': 'Manager',
  'nav.admin': 'Admin',
  'nav.login': 'Login',
  'nav.logout': 'Logout',

  // Customer Menu
  'menu.title': 'Our Menu',
  'menu.search': 'Search menu items...',
  'menu.all': 'All',
  'menu.available': 'Available',
  'menu.price': 'Price',
  'menu.addToOrder': 'Add to Order',
  'menu.noItems': 'No menu items found',
  'menu.added': 'Added to order',

  // Cart
  'cart.title': 'Your Order',
  'cart.empty': 'Your cart is empty',
  'cart.total': 'Total',
  'cart.checkout': 'Place Order',
  'cart.placeOrder': 'Place Order',
  'cart.customerName': 'Your Name',
  'cart.specialInstructions': 'Special Instructions',
  'cart.orderPlaced': 'Order Placed!',
  'cart.orderPlacedDesc': 'Your order has been sent to the kitchen.',
  'cart.trackOrder': 'Track Order',
  'cart.backToMenu': 'Back to Menu',
  'cart.itemAdded': 'Item added to cart',
  'cart.itemRemoved': 'Item removed from cart',

  // Service Requests
  'service.requestWaiter': 'Request Waiter',
  'service.requestBill': 'Request Bill',
  'service.requestSent': 'Request sent successfully!',
  'service.waiterOnWay': 'A waiter will be with you shortly.',
  'service.billComing': 'Your bill will be brought to you.',
  'service.pending': 'Pending',
  'service.acknowledged': 'Acknowledged',
  'service.resolved': 'Resolved',

  // Payments
  'payment.title': 'Payment Methods',
  'payment.telebirr': 'Telebirr',
  'payment.cbeBirr': 'CBE Birr',
  'payment.bankTransfer': 'Bank Transfer',
  'payment.qrPayment': 'QR Payment',
  'payment.accountName': 'Account Name',
  'payment.accountNumber': 'Account Number',

  // Auth
  'auth.login': 'Login',
  'auth.email': 'Email',
  'auth.phone': 'Phone Number',
  'auth.password': 'Password',
  'auth.loginButton': 'Sign In',
  'auth.loggingIn': 'Signing in...',
  'auth.mfaCode': 'Authentication Code',
  'auth.mfaVerify': 'Verify',
  'auth.invalidCredentials': 'Invalid credentials',
  'auth.forgotPassword': 'Forgot password?',
  'auth.resetPassword': 'Reset Password',
  'auth.newPassword': 'New Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.sendResetLink': 'Send Reset Link',
  'auth.updatePassword': 'Update Password',
  'auth.rememberPassword': 'Remember your password?',
  'auth.signIn': 'Sign in',
  'auth.createAccount': 'Create Account',
  'auth.dontHaveAccount': 'Don\'t have an account?',
  'auth.alreadyHaveAccount': 'Already have an account?',

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.tables': 'Tables',
  'dashboard.requests': 'Service Requests',
  'dashboard.orders': 'Orders',
  'dashboard.revenue': 'Revenue',
  'dashboard.today': 'Today',
  'dashboard.thisMonth': 'This Month',
  'dashboard.overview': 'Overview',
  'dashboard.quickActions': 'Quick Actions',
  'dashboard.recentOrders': 'Recent Orders',
  'dashboard.totalRevenue': 'Total Revenue',
  'dashboard.activeOrders': 'Active Orders',
  'dashboard.occupiedTables': 'Occupied Tables',
  'dashboard.viewAll': 'View All',

  // Waiter
  'waiter.assignedTables': 'My Tables',
  'waiter.activeRequests': 'Active Requests',
  'waiter.markResolved': 'Mark Resolved',
  'waiter.acknowledge': 'Acknowledge',

  // Cashier
  'cashier.openOrders': 'Open Orders',
  'cashier.processPayment': 'Process Payment',
  'cashier.markAsPaid': 'Mark as Paid',

  // Manager
  'manager.revenueOverview': 'Revenue Overview',
  'manager.popularItems': 'Popular Items',
  'manager.employeePerformance': 'Employee Performance',
  'manager.tableUtilization': 'Table Utilization',
  'manager.payrollSummary': 'Payroll Summary',

  // Admin - Menu
  'admin.menuManagement': 'Menu Management',
  'admin.addItem': 'Add Item',
  'admin.editItem': 'Edit Item',
  'admin.deleteItem': 'Delete Item',
  'admin.categories': 'Categories',
  'admin.addCategory': 'Add Category',

  // Admin - Employees
  'admin.employeeManagement': 'Employee Management',
  'admin.addEmployee': 'Add Employee',
  'admin.editEmployee': 'Edit Employee',
  'admin.deactivateEmployee': 'Deactivate',
  'admin.verifyNationalId': 'Verify National ID',

  // Admin - Tables
  'admin.tableManagement': 'Table Management',
  'admin.addTable': 'Add Table',
  'admin.generateQR': 'Generate QR Code',

  // Admin - Payments
  'admin.paymentSettings': 'Payment Settings',
  'admin.addPaymentMethod': 'Add Payment Method',

  // Admin - Payroll
  'admin.payrollManagement': 'Payroll Management',
  'admin.processPayroll': 'Process Payroll',

  // Branches
  'branch.title': 'Branches',
  'branch.addBranch': 'Add Branch',

  // Inventory
  'inventory.title': 'Inventory',
  'inventory.ingredients': 'Ingredients',
  'inventory.suppliers': 'Suppliers',
  'inventory.purchases': 'Purchases',
  'inventory.wastage': 'Wastage',

  // Kitchen
  'kitchen.title': 'Kitchen Display',
  'kitchen.newOrders': 'New Orders',
  'kitchen.inProgress': 'In Progress',
  'kitchen.ready': 'Ready',
  'kitchen.startPreparing': 'Start Preparing',
  'kitchen.markReady': 'Mark as Ready',

  // Onboarding
  'onboarding.welcome': 'Welcome to RestaurantOS',
  'onboarding.welcomeDesc': 'Let\'s get your restaurant set up in minutes.',
  'onboarding.restaurant': 'Restaurant Info',
  'onboarding.menu': 'Add Menu Items',
  'onboarding.tables': 'Set Up Tables',
  'onboarding.complete': 'Complete Setup',
  'onboarding.next': 'Next Step',
  'onboarding.prev': 'Previous Step',
  'onboarding.finish': 'Go to Dashboard',

  // Order Tracking
  'order.title': 'Order Status',
  'order.pending': 'Pending',
  'order.accepted': 'Accepted',
  'order.preparing': 'Preparing',
  'order.ready': 'Ready',
  'order.delivered': 'Delivered',
  'order.completed': 'Completed',
  'order.cancelled': 'Cancelled',
  'order.estimatedTime': 'Estimated time',

  // Table
  'table.number': 'Table {number}',
  'table.occupied': 'Occupied',
  'table.available': 'Available',
  'table.reserved': 'Reserved',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.update': 'Update',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.success': 'Success!',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.finish': 'Finish',
  'common.noData': 'No data available',
  'common.status': 'Status',
  'common.actions': 'Actions',
  'common.phone': 'Phone',
  'common.email': 'Email',
  'common.name': 'Name',
  'common.role': 'Role',
  'common.salary': 'Salary',
  'common.language': 'Language',
  'common.id': 'ID',
  'common.type': 'Type',
  'common.details': 'Details',
  'common.description': 'Description',
  'common.amount': 'Amount',
  'common.date': 'Date',
  'common.quantity': 'Quantity',
  'common.unit': 'Unit',
  'common.total': 'Total',
  'common.subtotal': 'Subtotal',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.close': 'Close',
  'common.retry': 'Retry',
  'common.print': 'Print',
  'common.download': 'Download',
  'common.export': 'Export',
  'common.refresh': 'Refresh',
  'common.more': 'More',
  'common.less': 'Less',

  // Validation
  'validation.required': 'This field is required',
  'validation.invalidEmail': 'Please enter a valid email',
  'validation.minLength': 'Minimum {min} characters required',
  'validation.passwordMatch': 'Passwords do not match',

  // Errors
  'error.notFound': 'Page not found',
  'error.notFoundDesc': 'The page you\'re looking for doesn\'t exist.',
  'error.serverError': 'Something went wrong',
  'error.serverErrorDesc': 'Please try again later.',
  'error.unauthorized': 'Unauthorized',
  'error.unauthorizedDesc': 'You don\'t have permission to access this page.',
  'error.tableNotFound': 'Table Not Found',
  'error.tableNotFoundDesc': 'This QR code is no longer valid. Please ask your waiter for a new one.',

  // Language names
  'lang.en': 'English',
  'lang.am': 'አማርኛ',
  'lang.om': 'Afaan Oromoo',
}

export default en
