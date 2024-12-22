class InventoryModule {
    constructor() {
        this.inventory = JSON.parse(localStorage.getItem('inventory')) || {};
        this.reorderThresholds = {
            Fresh: 100,   
            Frozen: 150,   
            Organic: 75    
        };
        this.salesHistory = JSON.parse(localStorage.getItem('orders')) || [];
        this.purchaseHistory = JSON.parse(localStorage.getItem('purchases')) || [];
        this.packagedCategories = JSON.parse(localStorage.getItem('packagedCategories')) || {};

        this.bindEvents();
        this.initializeInventory();
        this.checkLowStock();
        this.nextRestockDate = localStorage.getItem('nextRestockDate') || '';
        this.initializeRestockDate();
    }

    bindEvents() {
        document.getElementById('generateForecast').addEventListener('click', () => this.generateDemandForecast());
        document.getElementById('generateReport').addEventListener('click', () => this.generateReport());
    }

    generateDemandForecast() {

        const forecastPeriodSelect = document.getElementById('forecastPeriod');
        const selectedPeriod = forecastPeriodSelect.value;
        console.log(`Selected forecast period: ${selectedPeriod}`);

        const validPeriods = ['daily', 'weekly', 'monthly'];
        if (!validPeriods.includes(selectedPeriod)) {
            console.error('Invalid period selected for demand forecast.');
            return;
        }

        // Calculate forecast
        const forecast = this.calculateDemandForecast(selectedPeriod);

        // Display results
        this.displayForecast(forecast);

    }

    displayForecastResults(data) {
        const container = document.getElementById('forecastResults');
        if (!container) return;

        const tableHTML = `
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Predicted Demand</th>
                        <th>Recommended Order</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(data).map(([category, info]) => `
                        <tr>
                            <td>${category}</td>
                            <td>${info.currentStock}</td>
                            <td>${info.predictedDemand}</td>
                            <td>${info.recommendedOrder}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;

        container.innerHTML = tableHTML;
    }
    initializeInventory() {
        // Clear existing inventory first
        this.inventory = {};
        
        // Sync with packaging module
        const packagedCategories = JSON.parse(localStorage.getItem('packagedCategories')) || {};

        // Initialize inventory from packaged categories
        Object.entries(packagedCategories).forEach(([key, data]) => {
            if (!data || data.quantity <= 0) return; // Skip empty or zero quantity items

            let itemIdforNormal = `BLU-${data.category}-${data.type}`;
            let itemId = data.category === "custom" ? 
                `BLU-${data.category}-${data.weightPerPackage}-${data.type}` : 
                itemIdforNormal;

            this.inventory[itemId] = {
                itemId,
                category: data.category,
                type: data.type,
                weight: data.quantity * (data.weightPerPackage / 1000),
                quantity: data.quantity,
                reorderLevel: this.reorderThresholds[data.type] || 100,
                storageLocation: "Package Inventory",
                lastRestock: new Date().toISOString()
            };
        });

        this.saveInventory();
        this.updateInventoryDisplay();
    }

    generateStorageLocation(type) {
        const section = type.charAt(0);
        const number = Math.floor(Math.random() * 100) + 1;
        return `${section}-${number.toString().padStart(3, '0')}`;
    }
    formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
    updateInventoryDisplay() {
        const tbody = document.getElementById('inventoryBody');
        tbody.innerHTML = '';

        // First, display raw materials section
        const rawMaterials = this.getRawMaterialsInventory();
        if (rawMaterials.quantity > 0) {
            const rawRow = document.createElement('tr');
            rawRow.classList.add('raw-materials-row');
            rawRow.innerHTML = `
            <td>RAW-BLUEBERRY</td>
            <td>Raw Materials</td>
            <td>Unprocessed</td>
            <td>${(rawMaterials.quantity / 1000).toFixed(2)} kg</td>
            <td>-</td>
            <td>${rawMaterials.storageLocation}</td>
            <td>${this.formatDate(rawMaterials.lastPurchaseDate)}</td>
            <td class="status-normal">RAW</td>
        `;
            tbody.appendChild(rawRow);

            // Add separator row
            const separatorRow = document.createElement('tr');
            separatorRow.classList.add('separator-row');
            separatorRow.innerHTML = `
                <td colspan="8" class="separator-cell">Packaged Products</td>
            `;
            tbody.appendChild(separatorRow);
        }

        // Then display packaged inventory
        Object.values(this.inventory).forEach(item => {
            console.log("item :  ", item)
            const row = document.createElement('tr');
            const status = this.getStockStatus(item);

            row.innerHTML = `
            <td>${item.itemId}</td>
            <td>${item.category}</td>
            <td>${item.type}</td>
            <td>${item.quantity}</td>
            <td>${item.reorderLevel}</td>
            <td>Package Inventory
            <td>${this.formatDate(item.lastRestock)}</td>
            <td class="status-${status.toLowerCase()}">${status}</td>
        `;

            tbody.appendChild(row);
        });
    }
    getRawMaterialsInventory() {
        const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
        const packagedWeight = JSON.parse(localStorage.getItem('totalPackagedEver')) || 0;
        const totalPurchased = purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
        const lastPurchase = purchases[purchases.length - 1] || {};

        return {
            quantity: (totalPurchased * 1000) - (packagedWeight * 1000), // Convert to grams
            storageLocation: 'Raw Storage Unit',
            lastPurchaseDate: lastPurchase.date || new Date().toISOString()
        };
    }
    getStockStatus(item) {
        const ratio = item.quantity / item.reorderLevel;
        if (ratio <= 0.5) return 'CRITICAL';
        if (ratio <= 0.75) return 'WARNING';
        return 'NORMAL';
    }

    checkLowStock() {
        const alerts = [];
        const salesHistory = JSON.parse(localStorage.getItem('orders')) || [];
        
        // Get unique products from sales history
        const historicalProducts = new Set(
            salesHistory.map(sale => ({
                category: sale.category,
                type: sale.type
            }))
        );

        // Check current inventory
        Object.values(this.inventory).forEach(item => {
            if (item.quantity <= item.reorderLevel) {
                alerts.push({
                    itemId: item.itemId,
                    type: item.type,
                    category: item.category,
                    current: item.quantity,
                    threshold: item.reorderLevel,
                    severity: item.quantity <= item.reorderLevel * 0.5 ? 'danger' : 'warning'
                });
            }
        });

        // Check for out-of-stock items from historical sales
        historicalProducts.forEach(({category, type}) => {
            const inventoryKey = `BLU-${category}-${type}`;
            if (!this.inventory[inventoryKey]) {
                alerts.push({
                    itemId: inventoryKey,
                    type: type,
                    category: category,
                    current: 0,
                    threshold: this.reorderThresholds[type] || 100,
                    severity: 'danger'
                });
            }
        });

        this.displayAlerts(alerts);
        return alerts;
    }

    displayAlerts(alerts) {
        const container = document.getElementById('alertsContainer');
        
        if (!alerts.length) {
            container.innerHTML = '<div class="alert-item alert-info"><p>No historical or current stock alerts.</p></div>';
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item alert-${alert.severity}">
                <h4>${alert.type} Stock Alert</h4>
                <p>Category: ${alert.category}</p>
                <p>Current stock: ${alert.current} units</p>
                <p>Reorder threshold: ${alert.threshold} units</p>
                <p>Status: ${alert.current === 0 ? 'Out of Stock' : 'Low Stock'}</p>

            </div>
        `).join('');
    }

    calculateDemandForecast(period) {
        const salesHistory = JSON.parse(localStorage.getItem('orders')) || [];
        const packagedCategories = JSON.parse(localStorage.getItem('packagedCategories')) || {};
        const today = new Date();
        const periodStartDate = new Date();

        // Set period date range
        switch (period) {
            case 'daily': periodStartDate.setDate(today.getDate() - 1); break;
            case 'weekly': periodStartDate.setDate(today.getDate() - 7); break;
            case 'monthly': periodStartDate.setMonth(today.getMonth() - 1); break;
        }

        // Get all unique product combinations from history
        const historicalProducts = new Set(
            salesHistory
                .filter(sale => new Date(sale.date) >= periodStartDate)
                .map(sale => `${sale.category}-${sale.type}`)
        );
        console.log("historicalProducts :", historicalProducts)
        // Calculate historical demand
        const historicalDemand = salesHistory
            .filter(sale => new Date(sale.date) >= periodStartDate)
            .reduce((acc, sale) => {
                const key = `${sale.category}-${sale.type}`;
                if (!acc[key]) {
                    acc[key] = {
                        category: sale.category,
                        type: sale.type,
                        totalQuantity: 0,
                        orderCount: 0,
                        soldQuantity: 0
                    };
                }
                acc[key].totalQuantity += sale.quantity;
                acc[key].orderCount++;
                acc[key].soldQuantity += sale.quantity;
                return acc;
            }, {});

        // Generate predictions for all products (including out of stock)
        const predictions = {};
        console.log("historicalDemand", historicalDemand)

        // First add current inventory items
        Object.entries(packagedCategories).forEach(([key, data]) => {
            console.log("data", data)
            // if (data.category !== "custom") {
            const historicalData = historicalDemand[key] || {
                totalQuantity: 0,
                orderCount: 1,
                soldQuantity: 0
            };

            predictions[key] = this.createPrediction(data, historicalData, period);
            // } 

        });

        // Then add historical products not in current inventory
        historicalProducts.forEach(key => {
            if (!predictions[key] && historicalDemand[key]) {
                predictions[key] = this.createPrediction(
                    { quantity: 0, ...historicalDemand[key] },
                    historicalDemand[key],
                    period
                );
            }
        });

        return { period, predictions };
    }

    // Helper function to create prediction object
    createPrediction(data, historicalData, period) {
        console.log("historicalData ->", historicalData)
        const avgDemand = historicalData.totalQuantity / historicalData.orderCount;
        console.log("historicalData.totalQuantity :", historicalData.totalQuantity, " / historicalData.orderCount: ", historicalData.orderCount, " = ", avgDemand);
        console.log("soldQuantity : ", historicalData.soldQuantity)
        const predictedDemand = avgDemand * (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30);
        console.log("period : ", period, ", predictedDemand is :", predictedDemand)

        let recommendedOrder = Math.max(0, predictedDemand - (data.quantity || 0));
        
        console.log("recommendedOrder :", recommendedOrder)
        recommendedOrder = (recommendedOrder === 0) ? historicalData.soldQuantity : recommendedOrder;
        // const categoryReturn = (data.category === "custom" ? ${ data.category , "-",data.weightPerPackage,"-",data.type} : data.category);
        const customCategory = data.category + "-" + data.weightPerPackage;
        const categoryReturn = (data.category === "custom" ? customCategory : data.category);
        return {
            category: categoryReturn,
            type: data.type,
            currentStock: data.quantity || 0,
            soldQuantity: historicalData.soldQuantity,
            predictedDemand,
            recommendedOrder,
            status: data.quantity === 0 ? 'Out of Stock' : 'In Stock'
        };
    }

    displayForecast(forecast) {
        const resultsDiv = document.getElementById('forecastResults');
        console.log("forecast", forecast)
        resultsDiv.innerHTML = `
            <h3>Demand Forecast for ${forecast.period}</h3>
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Current Stock</th>
                        <th>Sold Quantity</th>
                        <th>Predicted Demand</th>
                        <th>Recommended Order</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(forecast.predictions)
                .map(([key, data]) => `
                            <tr class="${data.status === 'Out of Stock' ? 'out-of-stock' : ''}">
                                <td>${data.category}g ${data.type}</td>
                                <td class="status-${data.status === 'Out of Stock' ? 'warning' : 'normal'}">
                                    ${data.status}
                                </td>
                                <td>${data.currentStock} units</td>
                                <td>${data.soldQuantity} units</td>
                                <td>${data.predictedDemand.toFixed(2)} units</td>
                                <td class="${data.recommendedOrder > 0 ? 'warning' : 'good'}">
                                    ${data.recommendedOrder.toFixed(2)} units
                                </td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        `;
    }

    generateSummaryReport() {
        const summary = {
            totalStock: 0,
            categories: {},
            lowStockItems: this.checkLowStock()
        };

        console.log("summary", summary)
        Object.values(this.inventory).forEach(item => {
            summary.totalStock += item.weight;
            if (!summary.categories[item.type]) {
                summary.categories[item.type] = 0;
            }
            summary.categories[item.type] += item.weight;
        });

        return summary;
    }

    generateTurnoverReport() {
        const turnover = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Initialize standard sizes
        const standardSizes = ['100', '250', '500', '1000', '2000', '5000'];
        standardSizes.forEach(size => {
            turnover[size] = {
                initialStock: 0,
                currentStock: 0,
                costOfGoodsSold: 0,
                turnoverRate: 0,
                revenue: 0
            };
        });

        // Get purchase history and calculate average cost per kg
        const purchases = JSON.parse(localStorage.getItem('purchases')) || [];
        const totalPurchasedKg = purchases.reduce((sum, p) => sum + p.quantity, 0);
        const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
        const avgCostPerKg = totalPurchaseCost / totalPurchasedKg || 5; // Default to 5 if no purchase history

        // First, process all sales from the last 30 days
        const recentSales = (this.salesHistory || []).filter(sale => 
            new Date(sale.date) >= thirtyDaysAgo
        );

        // Process sales data first
        recentSales.forEach(sale => {
            if (!sale.category.startsWith('custom')) {
                const category = sale.category;
                if (turnover[category]) {
                    // Convert package weight to kg
                    const soldQuantityKg = (sale.quantity * parseInt(category)) / 1000;
                    
                    // Update metrics
                    turnover[category].initialStock += soldQuantityKg;
                    turnover[category].revenue += sale.totalPrice || 0;

                    // Calculate COGS
                    const rawMaterialCost = soldQuantityKg * avgCostPerKg;
                    turnover[category].costOfGoodsSold += rawMaterialCost;
                }
            }
        });

        // Then add current inventory data if available
        Object.values(this.inventory).forEach(item => {
            if (!item.category.startsWith('custom')) {
                const category = item.category;
                if (turnover[category]) {
                    turnover[category].currentStock += item.weight;
                    // Don't add current stock to initial stock as it's already accounted for
                }
            }
        });

        // Calculate final metrics for each category
        Object.keys(turnover).forEach(category => {
            const data = turnover[category];
            
            // Only keep categories with either sales or current stock
            if (data.revenue > 0 || data.currentStock > 0 || data.initialStock > 0) {
                // Calculate average inventory value
                const averageInventory = (data.initialStock + data.currentStock) / 2;
                
                // Calculate turnover rate = Total Cost of Goods Sold / Average Inventory
                if (averageInventory > 0) {
                    // Turnover rate shows how many times inventory is sold and replaced over a period
                    data.turnoverRate = (data.costOfGoodsSold / (averageInventory )).toFixed(2);
                    
                    // Gross margin percentage
                    data.grossMargin = ((data.revenue - data.costOfGoodsSold) / 
                        Math.max(data.revenue, 0.01) * 100).toFixed(2);
                } else {
                    data.turnoverRate = "0.00";
                    data.grossMargin = "0.00";
                }
            } else {
                delete turnover[category];
            }
        });

        return turnover;
    }

    generateAlertsReport() {
        return {
            alerts: this.checkLowStock(),
            timestamp: new Date().toISOString()
        };
    }

    generateReport() {
        const reportType = document.getElementById('reportType').value;
        let reportContent;

        switch (reportType) {
            case 'summary':
                reportContent = this.generateSummaryReport();
                break;
            case 'turnover':
                reportContent = this.generateTurnoverReport();
                break;
        }

        this.displayReport(reportContent);
    }

    displayReport(reportContent) {
        const resultsDiv = document.getElementById('reportResults');
        const reportType = document.getElementById('reportType').value;

        if (reportType === 'turnover') {
            resultsDiv.innerHTML = `
                <h3>Turnover Analysis (Last 30 Days)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Package Size</th>
                            <th>Initial Stock (kg)</th>
                            <th>Current Stock (kg)</th>
                            <th>Cost of Goods Sold ($)</th>
                            <th>Revenue ($)</th>
                            <th>Gross Margin (%)</th>
                            <th>Turnover Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(reportContent)
                        .map(([category, data]) => `
                            <tr>
                                <td>${category === 'custom' ? 'Custom' : category + 'g'}</td>
                                <td>${data.initialStock.toFixed(2)}</td>
                                <td>${data.currentStock.toFixed(2)}</td>
                                <td>${data.costOfGoodsSold.toFixed(2)}</td>
                                <td>${data.revenue.toFixed(2)}</td>
                                <td>${data.grossMargin !== undefined ? data.grossMargin : 0}%</td>
                                <td>${data.turnoverRate}x</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            resultsDiv.innerHTML = `
                <h3>Inventory Summary Report</h3>
                <p>Total Stock: ${reportContent.totalStock.toFixed(2)} kg</p>
                <h4>By Category:</h4>
                <ul>
                    ${Object.entries(reportContent.categories)
                    .map(([type, quantity]) =>
                        `<li>${type}: ${quantity.toFixed(2)} kg</li>`
                    ).join('')}
                </ul>
                <h4>Low Stock Alerts: ${reportContent.lowStockItems.length}</h4>
            `;
        }
    }

    saveInventory() {
        localStorage.setItem('inventory', JSON.stringify(this.inventory));
    }

    refreshInventory() {
        this.initializeInventory();
        this.updateInventoryDisplay();
    }

    initializeRestockDate() {
        const dateElement = document.getElementById('nextRestockDate');
        const setDateBtn = document.getElementById('setRestockDate');
        
        if (dateElement && this.nextRestockDate) {
            dateElement.textContent = new Date(this.nextRestockDate).toLocaleDateString();
        }

        if (setDateBtn) {
            setDateBtn.addEventListener('click', () => {
                const newDate = prompt('Enter next restock date (YYYY-MM-DD):', this.nextRestockDate);
                if (newDate && this.isValidDate(newDate)) {
                    this.nextRestockDate = newDate;
                    localStorage.setItem('nextRestockDate', newDate);
        
                    // Tarih formatını 'DD/MM/YYYY' olarak ayarlıyoruz
                    const formattedDate = new Date(newDate).toLocaleDateString('en-GB'); // 'en-GB' formatı DD/MM/YYYY için uygundur
                    dateElement.textContent = formattedDate;
                }
            });
        }
        
    }

    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
}

// Initialize the module
document.addEventListener('DOMContentLoaded', () => {
    new InventoryModule();
});