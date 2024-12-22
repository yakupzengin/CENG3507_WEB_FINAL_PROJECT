class ComprehensiveReportModule {
    constructor() {
        this.taxRate = 0.10;
        this.salesData = JSON.parse(localStorage.getItem('orders')) || [];
        this.purchaseData = JSON.parse(localStorage.getItem('purchases')) || [];
        this.inventoryData = JSON.parse(localStorage.getItem('packagedCategories')) || {};
        
        this.bindEvents();
        this.initializeDateRange();
    }

    bindEvents() {
        document.getElementById('generateReport').addEventListener('click', () => this.generateComprehensiveReport());
        document.getElementById('reportPeriod').addEventListener('change', this.handlePeriodChange.bind(this));
        document.getElementById('exportReport').addEventListener('click', () => this.exportReport());
        document.getElementById('printReport').addEventListener('click', () => this.printReport());
    }

    initializeDateRange() {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('startDate').value = firstDayOfMonth.toISOString().split('T')[0];
        document.getElementById('endDate').value = today.toISOString().split('T')[0];
    }

    handlePeriodChange(event) {
        const period = event.target.value;
        const endDate = new Date();
        let startDate = new Date();

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

        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }

    calculateTotalIncome(startDate, endDate) {
        return this.salesData
            .filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= startDate && saleDate <= endDate;
            })
            .reduce((total, sale) => total + sale.totalPrice, 0);
    }
    calculateAllExpenses() {
        return this.purchaseData
            .reduce((total, purchase) => total + purchase.totalCost, 0);
    }
    
    calculateProductsSoldByCategory(startDate, endDate) {
        const categorySales = {};
        this.salesData
            .filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate >= startDate && saleDate <= endDate;
            })
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

    calculateRemainingStock() {
        const stock = {};
        Object.entries(this.inventoryData).forEach(([key, data]) => {
            const category = data.category;
            if (!stock[category]) {
                stock[category] = {
                    quantity: 0,
                    weightInKg: 0
                };
            }
            stock[category].quantity += data.quantity;
            stock[category].weightInKg += (data.quantity * data.weightPerPackage) / 1000;
        });
        return stock;
    }

    generateComprehensiveReport() {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);

        const totalIncome = this.calculateTotalIncome(startDate, endDate);
        const totalExpenses = this.calculateAllExpenses(startDate, endDate);
        const taxAmount = totalIncome * this.taxRate;
        const netProfit = totalIncome - totalExpenses - taxAmount;
        const salesByCategory = this.calculateProductsSoldByCategory(startDate, endDate);
        const currentStock = this.calculateRemainingStock();

        this.displayComprehensiveReport({
            period: { start: startDate, end: endDate },
            financials: {
                totalIncome,
                totalExpenses,
                taxAmount,
                netProfit
            },
            sales: salesByCategory,
            stock: currentStock
        });

        // Record tax liability
        this.recordTaxLiability(startDate, endDate, taxAmount);
        
        return {
            success: true,
            message: "Report generated successfully"
        };
    }

    displayComprehensiveReport(report) {
        // Financial Metrics
        document.getElementById('financialMetrics').innerHTML = this.generateFinancialMetricsHTML(report.financials);
        
        // Sales Metrics
        document.getElementById('salesMetrics').innerHTML = this.generateSalesMetricsHTML(report.sales);
        
        // Stock Status
        document.getElementById('stockMetrics').innerHTML = this.generateStockMetricsHTML(report.stock);
        
        // Tax Analysis
        document.getElementById('taxMetrics').innerHTML = this.generateTaxMetricsHTML(report.financials);
    }

    generateFinancialMetricsHTML(financials) {
        return `
            <div class="metric-card ${financials.netProfit >= 0 ? 'positive' : 'negative'}">
                <h4>Financial Overview</h4>
                <p>Total Income: $${financials.totalIncome.toFixed(2)}</p>
                <p>Total Expenses: $${financials.totalExpenses.toFixed(2)}</p>
                <p>Net Profit: $${financials.netProfit.toFixed(2)}</p>
            </div>
        `;
    }

    generateSalesMetricsHTML(sales) {
        return `
            <div class="metric-card">
                <h4>Sales by Category</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Units Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(sales).map(([category, data]) => `
                            <tr>
                                <td>${category}g</td>
                                <td>${data.quantity}</td>
                                <td>$${data.revenue.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    generateStockMetricsHTML(stock) {
        return `
            <div class="metric-card">
                <h4>Current Inventory</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Weight (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(stock).map(([category, data]) => `
                            <tr>
                                <td>${category}g</td>
                                <td>${data.quantity}</td>
                                <td>${data.weightInKg.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    generateTaxMetricsHTML(financials) {
        return `
            <div class="metric-card">
                <h4>Tax Analysis</h4>
                <p>Tax Rate: ${(this.taxRate * 100)}%</p>
                <p>Taxable Revenue: $${financials.totalIncome.toFixed(2)}</p>
                <p>Tax Amount: $${financials.taxAmount.toFixed(2)}</p>
            </div>
        `;
    }

    recordTaxLiability(startDate, endDate, taxAmount) {
        const taxRecord = {
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            },
            taxAmount,
            calculationDate: new Date().toISOString(),
            status: 'recorded'
        };

        // Store tax records in localStorage
        const taxRecords = JSON.parse(localStorage.getItem('taxRecords')) || [];
        taxRecords.push(taxRecord);
        localStorage.setItem('taxRecords', JSON.stringify(taxRecords));
    }


    exportReport() {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        
        const totalIncome = this.calculateTotalIncome(startDate, endDate);
        const totalExpenses = this.calculateAllExpenses(startDate, endDate);
        const taxAmount = totalIncome * this.taxRate;
        const netProfit = totalIncome - totalExpenses - taxAmount;
        const salesByCategory = this.calculateProductsSoldByCategory(startDate, endDate);
        const currentStock = this.calculateRemainingStock();

        // Create CSV content
        let csvContent = "Comprehensive Financial Report\n";
        csvContent += `Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n\n`;

        // Financial Summary
        csvContent += "Financial Summary\n";
        csvContent += `Total Income,$${totalIncome.toFixed(2)}\n`;
        csvContent += `Total Expenses,$${totalExpenses.toFixed(2)}\n`;
        csvContent += `Tax (${(this.taxRate * 100)}%),$${taxAmount.toFixed(2)}\n`;
        csvContent += `Net Profit,$${netProfit.toFixed(2)}\n\n`;

        // Sales by Category
        csvContent += "Sales by Category\n";
        csvContent += "Category,Units Sold,Revenue\n";
        Object.entries(salesByCategory).forEach(([category, data]) => {
            csvContent += `${category}g,${data.quantity},$${data.revenue.toFixed(2)}\n`;
        });
        csvContent += "\n";

        // Current Stock Status
        csvContent += "Current Inventory Status\n";
        csvContent += "Package Size,Quantity,Weight (kg)\n";
        Object.entries(currentStock).forEach(([category, data]) => {
            csvContent += `${category}g,${data.quantity},${data.weightInKg.toFixed(2)}\n`;
        });

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `comprehensive_report_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    printReport() {
        window.print();
    }
}

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    new ComprehensiveReportModule();
});
