class SalesModule {
    constructor() {
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.packagedCategories = JSON.parse(localStorage.getItem('packagedCategories')) || {};
        this.pricingStructure = JSON.parse(localStorage.getItem('pricingStructure')) || {};
        this.pendingOrders = [];

        this.bindEvents();
        this.loadOrders();
        this.updateRevenueReports();
        this.updateAvailableQuantity = this.updateAvailableQuantity.bind(this);

        document.getElementById('categoryFilter').addEventListener('change', () => this.filterOrders());
        document.getElementById('exportReport').addEventListener('click', () => this.exportReport());

        this.populateCategoryFilter();
        this.populatePackageSizes();
        document.getElementById('blueberryType').addEventListener('change', this.updateAvailableQuantity);
        document.getElementById('productCategory').addEventListener('change', this.updateAvailableQuantity);
        this.checkDiscounts();
    }

    bindEvents() {
        // Order form submission
        document.getElementById('orderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addOrderToCart();
        });

        // Order quantity change handler
        document.getElementById('orderQuantity').addEventListener('input', () => {
            this.updateTotalPrice();
        });

        // Search and filter handlers
        document.getElementById('searchOrder').addEventListener('input', () => {
            this.filterOrders();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.filterOrders();
        });

        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });

        document.getElementById('blueberryType').addEventListener('change', this.updateAvailableQuantity);
        document.getElementById('productCategory').addEventListener('change', this.updateAvailableQuantity);

        // Add new button to form for final submission
        const submitAllBtn = document.createElement('button');
        submitAllBtn.type = 'button';
        submitAllBtn.id = 'submitAllOrders';
        submitAllBtn.textContent = 'Submit All Orders';
        submitAllBtn.classList.add('submit-all-btn');
        submitAllBtn.style.display = 'none';
        document.getElementById('orderForm').appendChild(submitAllBtn);

        document.getElementById('submitAllOrders').addEventListener('click', () => {
            this.submitAllOrders();
        });
    }

    updateAvailableQuantity() {
        const type = document.getElementById('blueberryType').value;
        const category = document.getElementById('productCategory').value;
        
        if (!type || !category) {
            document.getElementById('availableQuantity').textContent = '0';
            return;
        }

        // Create the correct key based on category type
        let uniqueKey;
        if (category.startsWith('custom-')) {
            const weightPerPackage = category.split('-')[1];
            uniqueKey = `custom-${weightPerPackage}-${type}`;
        } else {
            uniqueKey = `${category}-${type}`;
        }

        console.log("Looking for package with key:", uniqueKey);
        const availablePackage = this.packagedCategories[uniqueKey];
        const availableQty = availablePackage ? availablePackage.quantity : 0;

        document.getElementById('availableQuantity').textContent = availableQty;
        this.updateTotalPrice();
    }

    handleNewOrder() {
        const type = document.getElementById('blueberryType').value;
        const category = document.getElementById('productCategory').value;
        const quantity = parseInt(document.getElementById('orderQuantity').value);

        if (!type || !category) {
            alert('Please select both blueberry type and package size');
            return;
        }

        // Create the correct key based on category type
        let uniqueKey;
        if (category.startsWith('custom-')) {
            const weightPerPackage = category.split('-')[1];
            uniqueKey = `custom-${weightPerPackage}-${type}`;
        } else {
            uniqueKey = `${category}-${type}`;
        }

        console.log('Checking order for key:', uniqueKey);
        console.log('Available packages:', this.packagedCategories);

        // Check availability
        const availablePackage = this.packagedCategories[uniqueKey];
        if (!availablePackage || availablePackage.quantity < quantity) {
            const current = availablePackage ? availablePackage.quantity : 0;
            alert(`Insufficient stock! Available: ${current} packages.\nPlease package more products in the Packaging Module before placing this order.`);
            return;
        }

        // Update inventory with the correct weight per package
        const weightPerPackage = category.startsWith('custom-') 
            ? parseInt(category.split('-')[1])
            : parseInt(category);

        // Create order and update inventory
        const price = this.calculateOrderPrice(quantity, category, type);
        const order = {
            id: `ORD-${Date.now()}`,
            customerName: document.getElementById('customerName').value,
            contact: document.getElementById('customerContact').value,
            address: document.getElementById('shippingAddress').value,
            category,
            type,
            quantity,
            status: 'Pending',
            // Format the date as YYYY-MM-DD
            date: new Date().toISOString().split('T')[0],
            totalPrice: price // Make sure price is calculated before saving
        };

        // Update packagedCategories
        this.packagedCategories[uniqueKey].quantity -= quantity;
        localStorage.setItem('packagedCategories', JSON.stringify(this.packagedCategories));

        // Update inventory
        const inventory = JSON.parse(localStorage.getItem('inventory')) || {};
        let inventoryKey = `BLU-${category}-${type}`;
        if (category.startsWith('custom-')) {
            inventoryKey = `BLU-custom-${weightPerPackage}-${type}`;
        }

        if (inventory[inventoryKey]) {
            inventory[inventoryKey].quantity -= quantity;
            inventory[inventoryKey].weight -= (quantity * (weightPerPackage || parseInt(category))) / 1000;

            // Remove item from inventory if quantity becomes 0
            if (inventory[inventoryKey].quantity <= 0) {
                delete inventory[inventoryKey];
            }

            localStorage.setItem('inventory', JSON.stringify(inventory));
        }

        this.orders.push(order);
        this.saveOrders();
        this.loadOrders();
        this.updateRevenueReports();
        this.updateAvailableQuantity();

        document.getElementById('orderForm').reset();
        alert('Order placed successfully!');
    }

    addOrderToCart() {
        const type = document.getElementById('blueberryType').value;
        const category = document.getElementById('productCategory').value;
        const quantity = parseInt(document.getElementById('orderQuantity').value);
        const customerName = document.getElementById('customerName').value;
        const contact = document.getElementById('customerContact').value;
        const address = document.getElementById('shippingAddress').value;

        if (!type || !category || !customerName || !contact || !address) {
            alert('Please fill in all required fields');
            return;
        }

        // Create the correct key and check availability
        let uniqueKey = category.startsWith('custom-') ? 
            `custom-${category.split('-')[1]}-${type}` : 
            `${category}-${type}`;

        const availablePackage = this.packagedCategories[uniqueKey];
        if (!availablePackage || availablePackage.quantity < quantity) {
            const current = availablePackage ? availablePackage.quantity : 0;
            alert(`Insufficient stock! Available: ${current} packages.`);
            return;
        }

        const price = this.calculateOrderPrice(quantity, category, type);
        
        // Add to pending orders
        this.pendingOrders.push({
            customerName,
            contact,
            address,
            type,
            category,
            quantity,
            totalPrice: price
        });

        // Clear only order details, keep customer info
        document.getElementById('blueberryType').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('orderQuantity').value = '';
        document.getElementById('totalPrice').textContent = '0.00';
        document.getElementById('availableQuantity').textContent = '0';

        // Show pending orders and submit all button
        this.displayPendingOrders();
        document.getElementById('submitAllOrders').style.display = 'block';
    }

    displayPendingOrders() {
        // Create or update pending orders display
        let pendingOrdersDiv = document.getElementById('pendingOrders');
        if (!pendingOrdersDiv) {
            pendingOrdersDiv = document.createElement('div');
            pendingOrdersDiv.id = 'pendingOrders';
            document.getElementById('orderForm').insertBefore(pendingOrdersDiv, document.getElementById('submitAllOrders'));
        }

        pendingOrdersDiv.innerHTML = `
            <h4>Pending Orders</h4>
            <table>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.pendingOrders.map((order, index) => `
                        <tr>
                            <td>${order.type}</td>
                            <td>${order.category}g</td>
                            <td>${order.quantity}</td>
                            <td>$${order.totalPrice.toFixed(2)}</td>
                            <td><button onclick="salesModule.removePendingOrder(${index})">Remove</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    removePendingOrder(index) {
        this.pendingOrders.splice(index, 1);
        this.displayPendingOrders();
        if (this.pendingOrders.length === 0) {
            document.getElementById('submitAllOrders').style.display = 'none';
        }
    }

    submitAllOrders() {
        if (this.pendingOrders.length === 0) {
            alert('No orders to submit');
            return;
        }

        // Process all pending orders
        this.pendingOrders.forEach(orderData => {
            const order = {
                id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                customerName: orderData.customerName,
                contact: orderData.contact,
                address: orderData.address,
                category: orderData.category,
                type: orderData.type,
                quantity: orderData.quantity,
                status: 'Pending',
                date: new Date().toISOString().split('T')[0],
                totalPrice: orderData.totalPrice
            };

            // Update inventory and create order
            this.updateInventory(order);
            this.orders.push(order);
        });

        // Save all changes
        this.saveOrders();
        this.loadOrders();
        this.updateRevenueReports();

        // Clear form and pending orders
        document.getElementById('orderForm').reset();
        this.pendingOrders = [];
        document.getElementById('pendingOrders').innerHTML = '';
        document.getElementById('submitAllOrders').style.display = 'none';

        alert('All orders placed successfully!');
    }

    updateTotalPrice() {
        const quantity = parseInt(document.getElementById('orderQuantity').value) || 0;
        const category = document.getElementById('productCategory').value;
        const type = document.getElementById('blueberryType').value;

        const price = this.calculateOrderPrice(quantity, category, type);
        document.getElementById('totalPrice').textContent = price.toFixed(2);
    }

    calculateOrderPrice(quantity, category, type) {
        if (!quantity || !category || !type) return 0;

        // Handle custom package sizes
        if (category.startsWith('custom-')) {
            const weight = parseInt(category.split('-')[1]) / 1000; 
            const customPricePerKg = 12; 
            return quantity * weight * customPricePerKg;
        }



        const unitPrice = this.pricingStructure[category] || 0;
        const discounts = JSON.parse(localStorage.getItem('categoryDiscounts') || '{}');
        const uniqueKey = `${category}-${type}`;
        // if (discounts[uniqueKey]) {
        //     return quantity * discounts[uniqueKey].newPrice;
        // }
        return quantity * unitPrice;
    }

    updateInventory(order) {
        const category = order.category;
        const type = order.type;
        let uniqueKey;

        // Create the correct key based on category type
        if (category.startsWith('custom-')) {
            const weightPerPackage = category.split('-')[1];
            uniqueKey = `custom-${weightPerPackage}-${type}`;
        } else {
            uniqueKey = `${category}-${type}`;
        }


        const unitPrice = this.pricingStructure[category] || 0;

        if (this.packagedCategories[uniqueKey]) {
            // Update quantity
            this.packagedCategories[uniqueKey].quantity -= order.quantity;
            this.packagedCategories[uniqueKey].totalCost -= order.totalPrice;

            console.log("order.quantity :",order.quantity)
            console.log("order.quantity :",order.totalPrice)
            console.log("this.packagedCategories[uniqueKey].totalCost : ",this.packagedCategories[uniqueKey].totalCost)
            // Update total cost proportionally
  
            // Save updated packagedCategories to localStorage
            localStorage.setItem('packagedCategories', JSON.stringify(this.packagedCategories));
        }
    }

    loadOrders() {
        const tbody = document.querySelector('#ordersTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.orders.forEach(order => {
            // Ensure all required properties exist
            if (!order || !order.id || !order.customerName || !order.category || !order.quantity) {
                console.warn('Invalid order data:', order);
                return;
            }

            // Calculate price if it doesn't exist
            if (typeof order.totalPrice !== 'number') {
                order.totalPrice = this.calculateOrderPrice(order.quantity, order.category);
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customerName}</td>
                <td>${order.category}g - ${order.type}</td>
                <td>${order.quantity}</td>
                <td>$${order.totalPrice.toFixed(2)}</td>
                <td>${order.date.toString()}</td>
                <td class="status-${(order.status || 'pending').toLowerCase()}">${order.status || 'Pending'}</td>
                <td>
                    <select class="status-update" data-id="${order.id}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Processed" ${order.status === 'Processed' ? 'selected' : ''}>Processed</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for status updates
        document.querySelectorAll('.status-update').forEach(select => {
            select.addEventListener('change', (e) => {
                this.updateOrderStatus(e.target.dataset.id, e.target.value);
            });
        });
    }

    updateOrderStatus(orderId, newStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = newStatus;
            this.saveOrders();
            this.loadOrders();
        }
    }

    filterOrders() {
        const searchTerm = document.getElementById('searchOrder').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const tbody = document.querySelector('#ordersTable tbody');

        tbody.innerHTML = ''; // Clear current table

        this.orders.filter(order => {
            const matchesSearch = order.customerName.toLowerCase().includes(searchTerm) ||
                order.id.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || order.status === statusFilter;
            const matchesCategory = !categoryFilter || order.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        }).forEach(order => {
            // Reuse existing row creation logic
            const row = document.createElement('tr');
            row.dataset.id = order.id;
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.customerName}</td>
                <td>${order.category}g - ${order.type}</td>
                <td>${order.quantity}</td>
                <td>$${order.totalPrice.toFixed(2)}</td>
                <td>${order.date}</td>
                <td class="status-${order.status.toLowerCase()}">${order.status}</td>
                <td>
                    <select class="status-update" data-id="${order.id}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Processed" ${order.status === 'Processed' ? 'selected' : ''}>Processed</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        const categories = [...new Set(this.orders.map(order => order.category))];

        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            categoryFilter.innerHTML += `<option value="${category}">${category}g</option>`;
        });
    }

    generateReport() {
        const reportType = document.getElementById('reportType').value;
        let report = {};

        switch (reportType) {
            case 'category':
                report = this.generateCategoryReport();
                break;
            case 'customer':
                report = this.generateCustomerReport();
                break;
            case 'time':
                report = this.generateTimeReport();
                break;
        }

        this.displayReport(report);
    }

    saveOrders() {
        localStorage.setItem('orders', JSON.stringify(this.orders));
    }

    updateRevenueReports() {
        // Calculate revenue by category
        const categoryRevenue = {};
        const customerRevenue = {};
        let totalRevenue = 0;

        this.orders.forEach(order => {
            // Update category revenue
            if (!categoryRevenue[order.category]) {
                categoryRevenue[order.category] = 0;
            }
            categoryRevenue[order.category] += order.totalPrice || 0;

            // Update customer revenue
            if (!customerRevenue[order.customerName]) {
                customerRevenue[order.customerName] = 0;
            }
            customerRevenue[order.customerName] += order.totalPrice || 0;

            // Update total revenue
            totalRevenue += order.totalPrice || 0;
        });

        // Display revenue summary
        const revenueSummary = document.getElementById('revenueSummary');
        if (revenueSummary) {
            revenueSummary.innerHTML = `
                <h3>Revenue Summary</h3>
                <p>Total Revenue: $${totalRevenue.toFixed(2)}</p>
                <h4>By Category:</h4>
                ${Object.entries(categoryRevenue)
                    .map(([cat, rev]) => `<p>${cat}g: $${rev.toFixed(2)}</p>`)
                    .join('')}
            `;
        }

        // Store revenue data
        localStorage.setItem('categoryRevenue', JSON.stringify(categoryRevenue));
        localStorage.setItem('totalRevenue', totalRevenue.toString());
    }

    // Add these supporting methods for report generation
    generateCategoryReport() {
        const categoryRevenue = {};
        const categoryQuantity = {};

        this.orders.forEach(order => {
            if (!categoryRevenue[order.category]) {
                categoryRevenue[order.category] = 0;
                categoryQuantity[order.category] = 0;
            }
            categoryRevenue[order.category] += order.totalPrice || 0;
            categoryQuantity[order.category] += order.quantity || 0;
        });

        return { revenue: categoryRevenue, quantity: categoryQuantity };
    }

    generateCustomerReport() {
        const customerOrders = {};

        this.orders.forEach(order => {
            if (!customerOrders[order.customerName]) {
                customerOrders[order.customerName] = {
                    totalSpent: 0,
                    orderCount: 0,
                    orders: []
                };
            }
            customerOrders[order.customerName].totalSpent += order.totalPrice || 0;
            customerOrders[order.customerName].orderCount++;
            customerOrders[order.customerName].orders.push(order);
        });

        return customerOrders;
    }

    generateTimeReport() {
        const timeData = {};

        this.orders.forEach(order => {
            const date = order.date.split('T')[0]; // Get just the date part
            if (!timeData[date]) {
                timeData[date] = {
                    revenue: 0,
                    orders: 0
                };
            }
            timeData[date].revenue += order.totalPrice || 0;
            timeData[date].orders++;
        });

        return timeData;
    }

    displayReport(report) {
        const revenueCharts = document.getElementById('revenueCharts');
        if (!revenueCharts) return;

        let chartData;
        let reportHtml = '<div class="report-content">';

        const reportType = document.getElementById('reportType').value;
        switch (reportType) {
            case 'category':
                chartData = this.prepareChartData(report.revenue, 'Category Sales');
                reportHtml += this.displayCategoryReport(report);
                break;
            case 'customer':
                chartData = this.prepareCustomerChartData(report);
                reportHtml += this.displayCustomerReport(report);
                break;
            case 'time':
                chartData = this.prepareTimeChartData(report);
                reportHtml += this.displayTimeReport(report);
                break;
        }

        reportHtml += '</div>';

        // Create chart container
        const chartContainer = document.createElement('div');
        chartContainer.style.height = '400px';
        chartContainer.style.width = '100%';

        revenueCharts.innerHTML = reportHtml;
        revenueCharts.appendChild(chartContainer);

        if (chartData) {
            this.createChart(chartContainer, chartData);
        }
    }

    prepareChartData(data, label) {
        return {
            labels: Object.keys(data).map(key => `${key}g`),
            datasets: [{
                label: label,
                data: Object.values(data),
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        };
    }

    prepareCustomerChartData(report) {
        return {
            labels: Object.keys(report),
            datasets: [{
                label: 'Customer Sales',
                data: Object.values(report).map(data => data.totalSpent),
                backgroundColor: 'rgba(75, 192, 192, 0.5)'
            }]
        };
    }

    prepareTimeChartData(report) {
        return {
            labels: Object.keys(report),
            datasets: [{
                label: 'Daily Revenue',
                data: Object.values(report).map(data => data.revenue),
                backgroundColor: 'rgba(153, 102, 255, 0.5)'
            }]
        };
    }

    createChart(container, data) {
        // Destroy existing chart if it exists
        if (container._chart) {
            container._chart.destroy();
        }

        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        // Store chart instance on container for future cleanup
        container._chart = new Chart(canvas, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    exportReport() {
        const reportType = document.getElementById('reportType').value;
        let data;

        switch (reportType) {
            case 'category':
                data = this.generateCategoryReport();
                break;
            case 'customer':
                data = this.generateCustomerReport();
                break;
            case 'time':
                data = this.generateTimeReport();
                break;
        }

        // Convert to CSV
        const csv = this.convertToCSV(data, reportType);

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `sales_report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
        a.click();
    }

    convertToCSV(data, reportType) {
        let csv = '';

        switch (reportType) {
            case 'category':
                csv = 'Category,Revenue,Quantity\n';
                Object.entries(data.revenue).forEach(([category, revenue]) => {
                    csv += `${category},${revenue},${data.quantity[category]}\n`;
                });
                break;
            case 'customer':
                csv = 'Customer,Total Spent,Order Count\n';
                Object.entries(data).forEach(([customer, info]) => {
                    csv += `${customer},${info.totalSpent},${info.orderCount}\n`;
                });
                break;
            case 'time':
                csv = 'Date,Revenue,Orders\n';
                Object.entries(data).forEach(([date, info]) => {
                    csv += `${date},${info.revenue},${info.orders}\n`;
                });
                break;
        }

        return csv;
    }

    displayCategoryReport(report) {
        let html = '<h3>Category Report</h3>';
        html += '<table><tr><th>Category</th><th>Revenue</th><th>Quantity</th></tr>';

        for (const [category, data] of Object.entries(report.revenue)) {
            html += `
                <tr>
                    <td>${category}</td>
                    <td>$${data.toFixed(2)}</td>
                    <td>${report.quantity[category] || 0}</td>
                </tr>
            `;
        }

        html += '</table>';
        return html;
    }

    displayCustomerReport(report) {
        let html = '<h3>Customer Report</h3>';
        html += '<table><tr><th>Customer</th><th>Total Spent</th><th>Orders</th></tr>';

        for (const [customer, data] of Object.entries(report)) {
            html += `
                <tr>
                    <td>${customer}</td>
                    <td>$${data.totalSpent.toFixed(2)}</td>
                    <td>${data.orderCount}</td>
                </tr>
            `;
        }

        html += '</table>';
        return html;
    }

    displayTimeReport(report) {
        let html = '<h3>Time Report</h3>';
        html += '<table><tr><th>Date</th><th>Revenue</th><th>Orders</th></tr>';

        for (const [date, data] of Object.entries(report)) {
            html += `
                <tr>
                    <td>${date}</td>
                    <td>$${data.revenue.toFixed(2)}</td>
                    <td>${data.orders}</td>
                </tr>
            `;
        }

        html += '</table>';
        return html;
    }

    populatePackageSizes() {
        const select = document.getElementById('productCategory');
        select.innerHTML = '<option value="">Select Package Size</option>';

        // Add standard sizes
        const standardSizes = {
            "100": "Small (100g)",
            "250": "Medium (250g)",
            "500": "Large (500g)",
            "1000": "Extra Large (1kg)",
            "2000": "Family Pack (2kg)",
            "5000": "Bulk Pack (5kg)"
        };

        // Add standard options
        for (const [value, label] of Object.entries(standardSizes)) {
            select.innerHTML += `<option value="${value}">${label}</option>`;
        }

        // Add custom packages from packagedCategories, preventing duplicates
        const packagedCategories = JSON.parse(localStorage.getItem('packagedCategories')) || {};
        const addedCustomWeights = new Set(); // Track added custom weights

        for (const [key, data] of Object.entries(packagedCategories)) {
            if (key.startsWith('custom-')) {
                const weight = data.weightPerPackage;
                if (!addedCustomWeights.has(weight)) { // Only add if not already added
                    select.innerHTML += `<option value="custom-${weight}">Custom (${weight}g)</option>`;
                    addedCustomWeights.add(weight);
                }
            }
        }
    }

    checkDiscounts() {
        const discounts = JSON.parse(localStorage.getItem('categoryDiscounts') || '{}');
        const notificationArea = document.getElementById('discountNotifications');

        if (Object.keys(discounts).length > 0) {

            let notifications = '<div class="discount-alerts">';
            for (const [key, data] of Object.entries(discounts)) {
                if (data.category === 'custom') {
                    continue;
                }
                notifications += `
                    <div class="discount-alert">
                        <span class="discount-badge">${data.discount}% OFF!</span>
                        ${data.category}g ${data.type} packages now at 
                        $${data.newPrice.toFixed(2)} (was $${data.originalPrice.toFixed(2)})
                    </div>
                `;
            }
            notifications += '</div>';
            notificationArea.innerHTML = notifications;
        }
    }
}

// Make instance available globally for the remove button to work
let salesModule;
document.addEventListener('DOMContentLoaded', () => {
    salesModule = new SalesModule();
});
