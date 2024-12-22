class FinancialModule {
    constructor() {
        this.salesData = JSON.parse(localStorage.getItem('orders')) || [];
        this.purchaseData = JSON.parse(localStorage.getItem('purchases')) || [];
        this.packagedCategories = JSON.parse(localStorage.getItem('packagedCategories')) || {};
        this.taxRate = 0.10; // 10% tax rate
        
        this.bindEvents();
        this.initializeDateRange();
    }

    bindEvents() {
        document.getElementById('generateReport').addEventListener('click', this.handleReportGeneration.bind(this));
        document.getElementById('periodSelect').addEventListener('change', this.handlePeriodChange.bind(this));
        document.getElementById('exportReport').addEventListener('click', this.exportReport.bind(this));
    }

    initializeDateRange() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('startDate').value = firstDayOfMonth.toISOString().split('T')[0];
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
    }
    calculateIncome(startDate, endDate) {
        return this.salesData
            .filter(sale => this.isWithinPeriod(sale.date, startDate, endDate))
            .reduce((total, sale) => total + sale.totalPrice, 0);
    }

    calculateExpenses(startDate, endDate) {
        return this.purchaseData
            .filter(purchase => this.isWithinPeriod(purchase.date, startDate, endDate))
            .reduce((total, purchase) => total + purchase.totalCost, 0);
    }
    calculateAllExpenses() {
        return this.purchaseData
            .reduce((total, purchase) => total + purchase.totalCost, 0);
    }
    

    calculateTax(income) {
        return income * this.taxRate;
    }

    calculateNetProfit(income, expenses, tax) {
        return income - expenses - tax;
    }

    getSalesByCategory(startDate, endDate) {
        const categorySales = {};
        this.salesData
            .filter(sale => this.isWithinPeriod(sale.date, startDate, endDate))
            .forEach(sale => {
                if (!categorySales[sale.category]) {
                    categorySales[sale.category] = {
                        quantity: 0,
                        revenue: 0
                    };
                }
                categorySales[sale.category].quantity += sale.quantity;
                categorySales[sale.category].revenue += sale.totalPrice;
            });
        return categorySales;
    }

    getCurrentStock() {
        const stock = {};
        Object.entries(this.packagedCategories).forEach(([key, data]) => {
            const category = data.category;
            const type = data.type;
            if (!stock[category]) {
                stock[category] = {};
            }
            if (!stock[category][type]) {
                stock[category][type] = 0;
            }
            stock[category][type] += data.quantity;
        });
        return stock;
    }

    isWithinPeriod(date, startDate, endDate) {
        // Convert the ISO date string to YYYY-MM-DD format
        const formattedDate = date.split('T')[0];
        const compareDate = new Date(formattedDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Set all times to midnight for consistent comparison
        compareDate.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        return compareDate >= start && compareDate <= end;
    }

    handlePeriodChange(event) {
        const period = event.target.value;
        const { startDate, endDate } = this.calculateDateRange(period);
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }

    calculateDateRange(period) {
        const endDate = new Date();
        const startDate = new Date();
        
        switch(period) {
            case 'monthly':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case 'quarterly':
                startDate.setMonth(endDate.getMonth() - 3);
                break;
            case 'yearly':
                startDate.setFullYear(endDate.getFullYear() - 1);
                break;
        }
        
        return { startDate, endDate };
    }

    async handleReportGeneration() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        console.log('Date range:', startDate, 'to', endDate);
        console.log('Sample order date:', this.salesData[0]?.date);

        const income = this.calculateIncome(startDate, endDate);
        const expenses = this.calculateAllExpenses(startDate, endDate);
        const tax = this.calculateTax(income);
        const netProfit = this.calculateNetProfit(income, expenses, tax);
        const salesByCategory = this.getSalesByCategory(startDate, endDate);
        const currentStock = this.getCurrentStock();

        // Log for debugging
        console.log('Income:', income);
        console.log('Expenses:', expenses);
        console.log('Tax:', tax);
        console.log('Net Profit:', netProfit);

        this.displayReport({
            income,
            expenses,
            tax,
            netProfit,
            salesByCategory,
            currentStock,
            period: { startDate, endDate }
        });
    }

    displayReport(data) {
        const reportContainer = document.getElementById('reportContainer');
        reportContainer.innerHTML = `
            <div class="financial-summary">
                <h3>Financial Summary (${data.period.startDate} to ${data.period.endDate})</h3>
                <div class="summary-item">
                    <span>Total Income:</span>
                    <span class="amount">$${data.income.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Total Expenses (All time):</span>
                    <span class="amount">$${data.expenses.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Tax (${(this.taxRate * 100)}%):</span>
                    <span class="amount">$${data.tax.toFixed(2)}</span>
                </div>
                <div class="summary-item total">
                    <span>Net Profit:</span>
                    <span class="amount ${data.netProfit >= 0 ? 'positive' : 'negative'}">
                        $${data.netProfit.toFixed(2)}
                    </span>
                </div>
            </div>
            ${this.generateCategoryReport(data.salesByCategory)}
            ${this.generateStockReport(data.currentStock)}
        `;
    }

    generateCategoryReport(salesByCategory) {
        let html = `
            <div class="sales-category-report">
                <h3>Sales by Category</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Units Sold</th>
                            <th>Revenue</th>
                            <th>Current Stock</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Get current stock levels
        const currentStock = this.getCurrentStock();

        for (const [category, data] of Object.entries(salesByCategory)) {
            const stockInfo = this.getStockByCategory(category);
            html += `
                <tr>
                    <td>${category}g</td>
                    <td>${data.quantity} units</td>
                    <td>$${data.revenue.toFixed(2)}</td>
                    <td>${this.formatStockInfo(stockInfo)}</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    getStockByCategory(category) {
        const stock = { Fresh: 0, Frozen: 0, Organic: 0 };
        Object.entries(this.packagedCategories).forEach(([key, data]) => {
            if (data.category === category) {
                stock[data.type] = data.quantity;
            }
        });
        return stock;
    }

    formatStockInfo(stockInfo) {
        return Object.entries(stockInfo)
            .map(([type, quantity]) => quantity > 0 ? `${type}: ${quantity}` : null)
            .filter(item => item !== null)
            .join('<br>');
    }

    generateStockReport(currentStock) {
        let html = `
            <div class="current-stock-report">
                <h3>Current Inventory Status</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Package Size</th>
                            <th>Fresh</th>
                            <th>Frozen</th>
                            <th>Organic</th>
                            <th>Total Units</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const stockBySize = this.aggregateStockBySize();
        
        for (const [size, types] of Object.entries(stockBySize)) {
            const total = Object.values(types).reduce((sum, qty) => sum + qty, 0);
            html += `
                <tr>
                    <td>${size === 'custom' ? 'Custom' : size + 'g'}</td>
                    <td>${types.Fresh || 0}</td>
                    <td>${types.Frozen || 0}</td>
                    <td>${types.Organic || 0}</td>
                    <td>${total}</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    aggregateStockBySize() {
        const stockBySize = {};
        
        Object.entries(this.packagedCategories).forEach(([key, data]) => {
            const size = data.category;
            if (!stockBySize[size]) {
                stockBySize[size] = {
                    Fresh: 0,
                    Frozen: 0,
                    Organic: 0
                };
            }
            stockBySize[size][data.type] = data.quantity;
        });

        return stockBySize;
    }

    exportReport() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        const income = this.calculateIncome(startDate, endDate);
        const expenses = this.calculateAllExpenses(startDate, endDate);
        const tax = this.calculateTax(income);
        const netProfit = this.calculateNetProfit(income, expenses, tax);
        const salesByCategory = this.getSalesByCategory(startDate, endDate);
        const currentStock = this.getCurrentStock();

        // Prepare CSV content
        let csvContent = "Financial Report\n";
        csvContent += `Period: ${startDate} to ${endDate}\n\n`;

        // Financial Summary
        csvContent += "Financial Summary\n";
        csvContent += `Total Income,$${income.toFixed(2)}\n`;
        csvContent += `Total Expenses,$${expenses.toFixed(2)}\n`;
        csvContent += `Tax (${(this.taxRate * 100)}%),$${tax.toFixed(2)}\n`;
        csvContent += `Net Profit,$${netProfit.toFixed(2)}\n\n`;

        // Sales by Category
        csvContent += "Sales by Category\n";
        csvContent += "Category,Units Sold,Revenue\n";
        Object.entries(salesByCategory).forEach(([category, data]) => {
            csvContent += `${category}g,${data.quantity},$${data.revenue.toFixed(2)}\n`;
        });
        csvContent += "\n";

        // Current Stock
        csvContent += "Current Inventory\n";
        csvContent += "Package Size,Fresh,Frozen,Organic,Total Units\n";
        const stockBySize = this.aggregateStockBySize();
        Object.entries(stockBySize).forEach(([size, types]) => {
            const total = Object.values(types).reduce((sum, qty) => sum + qty, 0);
            csvContent += `${size === 'custom' ? 'Custom' : size + 'g'},${types.Fresh || 0},${types.Frozen || 0},${types.Organic || 0},${total}\n`;
        });

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `financial_report_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    new FinancialModule();
});
