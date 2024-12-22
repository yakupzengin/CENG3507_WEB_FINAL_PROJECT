class PackagingModule {
    constructor() {
        const purchases = JSON.parse(localStorage.getItem("purchases")) || [];
        const packagedSummary = JSON.parse(localStorage.getItem("packagedSummary")) || [];

        this.pendingWeight = 0; // Weight added but not yet confirmed
        this.packagedCategories = JSON.parse(localStorage.getItem("packagedCategories")) || {};
        this.totalWeight = this.calculateTotalWeight(purchases);
        this.initialTotalWeight = this.calculateTotalWeight(purchases); // Store initial total weight
        this.totalPackagedEver = JSON.parse(localStorage.getItem("totalPackagedEver")) || 0; // Track total weight ever packaged

        this.threshold_raw_stock =1000;
        this.totalPackagedCost = this.calculateTotalCost(packagedSummary);

        this.packagedWeight = this.calculatePackagetWeight(packagedSummary); // Confirmed total weight of packaged blueberries


        const usageHistory = JSON.parse(localStorage.getItem("usageHistory")) || []; // Track usage over time
        this.usageHistory = usageHistory; // Initialize usage history

        this.pricingStructure = JSON.parse(localStorage.getItem("pricingStructure")) || {
            "100": 1.2,
            "250": 3.0,
            "500": 5.7,
            "1000": 10.8,
            "2000": 20.4,
            "5000": 48.0,
            "custom": 0.015, // Price per gram for custom packages (15 per kg)
        };
        this.minimumStockThresholds = JSON.parse(localStorage.getItem("minimumStockThresholds")) || {
            "100": 200,
            "250": 150,
            "500": 100,
            "1000": 50,
            "2000": 20,
            "5000": 10,
        };
        this.bindEventListeners();
        this.updateDisplay();
        this.displayPricingStructure();
        this.updatePackagedCategoriesTable(); // Update table on initialization

        this.offerEndDate = localStorage.getItem('offerEndDate') || '2024-12-30';
        this.checkSeasonalPricing();
        this.initializeOfferDateManagement();

    }

    viewMinStockThresholds() {
        const thresholds = this.minimumStockThresholds;
        let thresholdDetails = "Minimum Stock Thresholds:\n\n";

        for (const [category, threshold] of Object.entries(thresholds)) {
            const displayCategory = category === "custom" ? "Custom Weight" : `${category} grams`;
            thresholdDetails += `${displayCategory}: Minimum Stock = ${threshold}\n`;
        }

        alert(thresholdDetails);
    }


    logUsage(category, quantity) {
        const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
        const entry = { date: today, category, quantity };

        // Add to usage history
        this.usageHistory.push(entry);
        localStorage.setItem("usageHistory", JSON.stringify(this.usageHistory));
    }

    analyzeTrends() {
        if (!this.usageHistory || this.usageHistory.length === 0) {
            return [];
        }

        // Group usage by date
        const usageByDate = this.usageHistory.reduce((acc, entry) => {
            const date = entry.date;
            if (!acc[date]) {
                acc[date] = 0;
            }
            acc[date] += entry.quantity;
            return acc;
        }, {});

        // Convert to array and sort by date
        return Object.entries(usageByDate)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    predictFutureNeeds(days = 7) {
        const trendData = this.analyzeTrends();
        if (!trendData || trendData.length === 0) {
            return {
                averageDailyUsage: "0.00",
                predictedNeeds: "0.00"
            };
        }

        // Calculate average daily usage
        const totalUsage = trendData.reduce((sum, entry) => sum + entry.total, 0);
        const daysCount = trendData.length;
        const averageDailyUsage = daysCount > 0 ? totalUsage / daysCount : 0;

        // Predict future needs
        const predictedNeeds = averageDailyUsage * days;

        return {
            averageDailyUsage: averageDailyUsage.toFixed(2),
            predictedNeeds: predictedNeeds.toFixed(2)
        };
    }

    generateInventoryReport() {
        const trendData = this.analyzeTrends();
        const predictions = this.predictFutureNeeds(7);

        let report = "Inventory Report:\n\n";

        // Current Inventory Status
        report += "Current Inventory Status:\n";
        report += `Total Raw Material: ${(this.totalWeight / 1000).toFixed(2)} kg\n`;
        report += `Remaining Unpackaged: ${(this.getRemainingUnpackagedWeight() / 1000).toFixed(2)} kg\n`;
        report += `Total Packaged: ${this.totalPackagedEver.toFixed(2)} kg\n\n`;

        // Usage Trends
        report += "Usage Trends:\n";
        if (trendData.length > 0) {
            trendData.forEach((entry) => {
                report += `Date: ${entry.date}, Total Used: ${(entry.total / 1000).toFixed(2)} kg\n`;
            });
        } else {
            report += "No usage data available\n";
        }

        // Predictions
        report += "\nPredictions:\n";
        report += `Average Daily Usage: ${(parseFloat(predictions.averageDailyUsage) / 1000).toFixed(2)} kg\n`;
        report += `Predicted Needs for Next 7 Days: ${(parseFloat(predictions.predictedNeeds) / 1000).toFixed(2)} kg\n`;

        console.log("this.getRemainingUnpackagedWeight()", this.getRemainingUnpackagedWeight())
        console.log("parseFloat(predictions.predictedNeeds)", parseFloat(predictions.predictedNeeds))
        alert(report);
    }
    checkStockLevels() {
        const alerts = [];

        // Group quantities by category and type
        const categoryQuantities = {};

        // Process all packaged categories
        Object.entries(this.packagedCategories).forEach(([key, data]) => {
            const category = data.category;
            const type = data.type;

            if (!categoryQuantities[category]) {
                categoryQuantities[category] = {
                    total: 0,
                    types: {}
                };
            }

            categoryQuantities[category].total += data.quantity;
            categoryQuantities[category].types[type] = data.quantity;
        });

        // Check against thresholds
        Object.entries(this.minimumStockThresholds).forEach(([category, threshold]) => {
            const categoryData = categoryQuantities[category]; // Retrieve category data

            // Case 1: If categoryData does not exist (out of stock)
            if (!categoryData) {
                alerts.push(`${category}g packages are out of stock (Threshold: ${threshold})`);
            }
            // Case 2: If total quantity is below the threshold
            else if (categoryData.total <= threshold) {
                alerts.push(
                    `${category}g packages are below minimum threshold:\n` +
                    `Current total: ${categoryData.total} (Threshold: ${threshold})\n` +
                    `Breakdown by type:\n` +
                    Object.entries(categoryData.types)
                        .map(([type, qty]) => `- ${type}: ${qty}`)
                        .join('\n')
                );
            }
        });

        // Check if any categories exist in `this.packagedCategories` but have zero quantity
        Object.entries(this.packagedCategories).forEach(([key, data]) => {
            const category = data.category;
            const type = data.type;

            if (data.quantity === 0) {
                alerts.push(`${category}g ${type} packages are out of stock (Current quantity: 0)`);
            }
        });

        // Display alerts
        if (alerts.length > 0) {
            alert("Stock Level Warnings:\n\n" + alerts.join("\n\n"));
        } else {
            alert("All categories are above minimum stock thresholds.");
        }

        // Log current stock levels for debugging
        console.log("Current Stock Levels:", categoryQuantities);
    }




    calculatePackagetWeight(packagedSummary) {
        return packagedSummary.totalPackagedWeight || 0; // Ensure fallback if not available
    }


    calculateTotalWeight(purchases) {
        // Calculate the total weight in grams
        const weightInGrams = purchases.reduce((total, purchase) => total + purchase.quantity * 1000, 0);
        return weightInGrams; // Returning weight in grams
    }
    calculateTotalCost(packagedSummary) {
        return packagedSummary.totalCost;
    }

    getRemainingUnpackagedWeight() {
        // Use initialTotalWeight instead of current packagedCategories state
        return this.initialTotalWeight - (this.totalPackagedEver * 1000);
    }

    updateDisplay() {
        const remainingWeight = this.getRemainingUnpackagedWeight(); // in grams
        const remainingWeightKg = remainingWeight / 1000; // Convert to kg for display
        const totalWeightKg = this.initialTotalWeight / 1000; // Convert to kg for display

        document.getElementById("totalWeight").textContent = `${totalWeightKg.toFixed(2)} kg`;
        console.log("this.totalWeight :", this.totalWeight)
        document.getElementById("remainingUnpackaged").textContent = `${remainingWeightKg.toFixed(2)} kg`;

        console.log("remainingWeightKg: ",remainingWeightKg)
        // Show/hide low stock alert
        const lowStockAlert = document.getElementById("lowStockAlert");
        if (remainingWeightKg < this.threshold_raw_stock) { // Less than 1kg remaining
            lowStockAlert.style.display = "block";
        } else {
            lowStockAlert.style.display = "none";
        }
    }




    displayPricingStructure() {
        const pricingTable = document.getElementById("pricingTable");
        if (!pricingTable) return;

        pricingTable.innerHTML = "";

        // Initialize originalPricing if it doesn't exist in localStorage
        if (!localStorage.getItem('originalPricingStructure')) {
            const originalPricing = {
                "100": 1.2,
                "250": 3.0,
                "500": 5.7,
                "1000": 10.8,
                "2000": 20.4,
                "5000": 48.0,
                "custom": 0.015
            };
            localStorage.setItem('originalPricingStructure', JSON.stringify(originalPricing));
        }

        const originalPricing = JSON.parse(localStorage.getItem('originalPricingStructure'));

        // Initialize current pricing structure if needed
        if (!this.pricingStructure || Object.keys(this.pricingStructure).length === 0) {
            this.pricingStructure = JSON.parse(JSON.stringify(originalPricing));
            localStorage.setItem('pricingStructure', JSON.stringify(this.pricingStructure));
        }

        for (const [weight, price] of Object.entries(this.pricingStructure)) {
            const row = document.createElement("tr");
            const originalPrice = originalPricing[weight] || price; // Fallback to current price if original not found
            const priceChange = price > originalPrice ? 'increased' : 'decreased';

            const displayPrice = weight === "custom" ?
                `$${(price * 1000).toFixed(2)} per kg` :
                `$${price.toFixed(2)} per package`;

            row.innerHTML = `
                <td>${weight === "custom" ? "Custom" : `${weight} grams`}</td>
                <td>${weight === "custom" ? "Variable" : weight}</td>
                <td id="price-${weight}" class="price-${priceChange}">
                    ${displayPrice}
                    
                </td>
                <td>
                    <button class="update-price-btn" data-weight="${weight}">Update Price</button>
                </td>
            `;
            pricingTable.appendChild(row);
        }

        // Add event listeners for update buttons
        const updateButtons = document.querySelectorAll(".update-price-btn");
        updateButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
                const weight = event.target.getAttribute("data-weight");
                this.updatePricePrompt(weight); // Call the method on the current instance
            });
        });
    }


    updatePricePrompt(weight) {
        const currentPrice = this.pricingStructure[weight];
        const promptMessage = weight === "custom" ?
            `Enter new price per kg for custom packages (current: $${(currentPrice * 1000).toFixed(2)}/kg):` :
            `Enter new price for ${weight} grams package (current: $${currentPrice.toFixed(2)}/package):`;

        const newPrice = prompt(promptMessage, weight === "custom" ? currentPrice * 1000 : currentPrice);

        if (newPrice !== null) {
            const parsedPrice = parseFloat(newPrice);
            if (isNaN(parsedPrice) || parsedPrice <= 0) {
                alert("Please enter a valid positive number.");
                return;
            }
            // Convert price per kg to price per gram for custom packages
            const finalPrice = weight === "custom" ? parsedPrice / 1000 : parsedPrice;
            this.updatePrice(weight, finalPrice);
        }
    }

    updatePrice(weight, newPrice) {
        this.pricingStructure[weight] = newPrice;
        localStorage.setItem("pricingStructure", JSON.stringify(this.pricingStructure));
        document.getElementById(`price-${weight}`).textContent = weight === "custom" ?
            `$${(newPrice * 1000).toFixed(2)} per kg` :
            `$${newPrice.toFixed(2)} per package`;
        alert(`Price for ${weight === "custom" ? "Custom" : `${weight} grams`} updated to $${weight === "custom" ? (newPrice * 1000).toFixed(2) : newPrice.toFixed(2)}.`);
    }

    bindEventListeners() {
        document.getElementById("category").addEventListener("change", this.handleCategoryChange.bind(this));
        document.getElementById("addPackageBtn").addEventListener("click", this.handleAddPackage.bind(this));
        document.getElementById("checkPackagingBtn").addEventListener("click", this.handleCheckAndPackage.bind(this));
        document.getElementById("checkStockBtn").addEventListener("click", this.checkStockLevels.bind(this));
        document.getElementById("generateReportBtn").addEventListener("click", this.generateInventoryReport.bind(this));
        document.getElementById("viewMinStocks").addEventListener("click", this.viewMinStockThresholds.bind(this)); // New button

    }

    handleCategoryChange() {
        const category = document.getElementById("category").value;
        document.getElementById("customWeightInput").style.display = category === "custom" ? "block" : "none";
    }

    handleAddPackage() {
        const category = document.getElementById("category").value;
        const quantity = parseInt(document.getElementById("quantity").value);
        const customWeight = parseInt(document.getElementById("customWeight").value);

        if (isNaN(quantity) || quantity <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        let weightPerPackage;
        if (category === "custom") {
            if (isNaN(customWeight) || customWeight <= 0) {
                alert("Please enter a valid custom weight.");
                return;
            }
            weightPerPackage = customWeight;
        } else {
            weightPerPackage = parseInt(category);
        }

        const totalWeightToPackage = weightPerPackage * quantity;
        const remainingWeight = this.getRemainingUnpackagedWeight();
        console.log("Get remainingWeight in handleAddPackage : :", remainingWeight)
        if (totalWeightToPackage > remainingWeight) {
            alert(
                `Not enough unpackaged weight to package this quantity. Available weight: ${(remainingWeight / 1000).toFixed(2)} kg.`
            );
            return;
        }

        this.pendingWeight += totalWeightToPackage;
        this.addToSummary(category, weightPerPackage, quantity);
        this.logUsage(category, totalWeightToPackage); 

    }


    addToSummary(category, weightPerPackage, quantity) {
        const type = document.getElementById("type").value;
        const uniqueKey = `${category}-${type}`;

        const existingEntry = Array.from(document.getElementById("packagingSummary").children).find(
            (item) => item.getAttribute("data-category") === category &&
                item.getAttribute("data-type") === type
        );

        if (existingEntry) {
            const currentQuantity = parseInt(existingEntry.getAttribute("data-quantity"));
            const newQuantity = currentQuantity + quantity;
            existingEntry.setAttribute("data-quantity", newQuantity);
            existingEntry.textContent = `${newQuantity} packages of ${weightPerPackage}g ${type} blueberries`;
        } else {
            const packagingSummary = document.getElementById("packagingSummary");
            const li = document.createElement("li");
            li.setAttribute("data-category", category);
            li.setAttribute("data-type", type);
            li.setAttribute("data-quantity", quantity);
            li.setAttribute("data-weight", weightPerPackage);
            li.textContent = `${quantity} packages of ${weightPerPackage}g ${type} blueberries`;
            packagingSummary.appendChild(li);
        }
    }

    handleCheckAndPackage() {
        let remainingWeight = this.getRemainingUnpackagedWeight();
        const packagingSummary = document.getElementById("packagingSummary");
        const log = [];

        Array.from(packagingSummary.children).forEach((item) => {
            const category = item.getAttribute("data-category");
            const type = item.getAttribute("data-type");
            const quantity = parseInt(item.getAttribute("data-quantity"));
            const weightPerPackage = parseInt(item.getAttribute("data-weight"));
            // const uniqueKey = `${category}-${type}`;

            const totalWeightNeeded = weightPerPackage * quantity;

            let uniqueKey;
            if (category === "custom") {
                uniqueKey = `${category}-${weightPerPackage}-${type}`;
            } else {
                uniqueKey = `${category}-${type}`;
            }
            // Calculate cost based on package type
            const calculatePackageCost = (packageCategory, packageWeight, packageQuantity) => {
                if (packageCategory === "custom") {
                    // For custom packages, calculate cost based on total weight
                    return (packageWeight * packageQuantity * this.pricingStructure.custom);
                } else {
                    // For standard packages, use fixed price per package
                    return packageQuantity * this.pricingStructure[packageCategory];
                }
            };

            if (totalWeightNeeded <= remainingWeight) {
                remainingWeight -= totalWeightNeeded;
                this.totalPackagedEver += (totalWeightNeeded / 1000);

                const packageCost = calculatePackageCost(category, weightPerPackage, quantity);

                if (this.packagedCategories[uniqueKey]) {
                    this.packagedCategories[uniqueKey].quantity += quantity;
                    this.packagedCategories[uniqueKey].totalCost += packageCost;
                } else {
                    this.packagedCategories[uniqueKey] = {
                        weightPerPackage,
                        quantity,
                        type,
                        category,
                        totalCost: packageCost,
                    };
                }

                log.push(`Successfully packaged ${quantity} packages of ${weightPerPackage} grams.`);
            } else {
                // Partial packaging logic
                const maxPackages = Math.floor(remainingWeight / weightPerPackage);

                if (maxPackages > 0) {
                    remainingWeight -= maxPackages * weightPerPackage;
                    this.totalPackagedEver += (maxPackages * weightPerPackage / 1000);

                    const packageCost = calculatePackageCost(category, weightPerPackage, maxPackages);

                    if (this.packagedCategories[uniqueKey]) {
                        this.packagedCategories[uniqueKey].quantity += maxPackages;
                        this.packagedCategories[uniqueKey].totalCost += packageCost;
                    } else {
                        this.packagedCategories[uniqueKey] = {
                            weightPerPackage,
                            quantity: maxPackages,
                            type,
                            category,
                            totalCost: packageCost,
                        };
                    }

                    // Update the list item
                    item.setAttribute("data-quantity", maxPackages);
                    item.textContent = `${maxPackages} packages of ${weightPerPackage}g ${type} blueberries`;

                    log.push(`Partially packaged ${maxPackages} out of ${quantity} packages of ${weightPerPackage} grams.`);
                } else {
                    item.remove();
                }

                log.push(`Could not package ${quantity - maxPackages} packages of ${weightPerPackage} grams due to insufficient weight.`);
            }
        });

        localStorage.setItem("packagedCategories", JSON.stringify(this.packagedCategories));
        localStorage.setItem("totalPackagedEver", this.totalPackagedEver);

        // Update displays and storage
        this.updateDisplay();
        this.updatePackagedCategoriesTable();

        alert(log.join("\n"));
        window.location.reload();
    }



    updatePackagedCategoriesTable() {
        const tableBody = document.getElementById("packagedCategoriesTable");
        if (!tableBody) {
            console.error("Could not find packagedCategoriesTable element");
            return;
        }

        tableBody.innerHTML = "";

        let totalCategoryQuantity = 0;
        let totalPackagedWeight = 0;
        let totalCost = 0;

        if (!this.packagedCategories) {
            console.warn("No packaged categories found");
            return;
        }

        // Create a cleaned version of packagedCategories without zero quantity entries
        const cleanedCategories = {};
        Object.entries(this.packagedCategories).forEach(([key, data]) => {
            if (data && data.quantity > 0) {
                cleanedCategories[key] = data;
            }
        });

        // Update localStorage with cleaned categories
        this.packagedCategories = cleanedCategories;
        localStorage.setItem("packagedCategories", JSON.stringify(cleanedCategories));

        Object.entries(cleanedCategories).forEach(([key, data]) => {
            if (!data || !data.weightPerPackage) {
                console.warn(`Invalid data for key ${key}`, data);
                return;
            }

            const weightInKg = data.weightPerPackage / 1000;
            const displayCategory = data.category === "custom" ?
                `Custom (${data.weightPerPackage}g)` :
                `${data.weightPerPackage}g`;

            const pricePerCategory = data.category === "custom" ?
                this.pricingStructure["custom"] :
                this.pricingStructure[data.weightPerPackage] || 0;

            totalCategoryQuantity += data.quantity;
            totalPackagedWeight += weightInKg * data.quantity;
            totalCost += data.totalCost || 0;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${displayCategory}</td>
                <td>${data.type || 'N/A'}</td>
                <td>${data.quantity}</td>
                <td>${(weightInKg * data.quantity).toFixed(2)}</td>
                <td>${(data.totalCost || 0).toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });

        // Only store summary if there are any packages
        if (totalCategoryQuantity > 0) {
            const summary = {
                totalCategoryQuantity,
                totalPackagedWeight: totalPackagedWeight.toFixed(2),
                totalCost: totalCost.toFixed(2),
            };
            localStorage.setItem("packagedSummary", JSON.stringify(summary));
        } else {
            // Clear summary if no packages remain
            localStorage.removeItem("packagedSummary");
        }
    }

    initializeOfferDateManagement() {
        // Add edit button next to the date
        const dateSpan = document.getElementById('offerEndDate');
        if (dateSpan) {
            dateSpan.innerHTML = `
                ${new Date(this.offerEndDate).toLocaleDateString()} 
            `;

            document.getElementById('editOfferDate').addEventListener('click', () => {
                const newDate = prompt('Enter new offer end date (YYYY-MM-DD):', this.offerEndDate);
                if (newDate && this.isValidDate(newDate)) {
                    this.updateOfferEndDate(newDate);
                } else if (newDate) {
                    alert('Please enter a valid date in YYYY-MM-DD format');
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

    updateOfferEndDate(newDate) {
        this.offerEndDate = newDate;
        localStorage.setItem('offerEndDate', newDate);
        this.checkSeasonalPricing();
        this.initializeOfferDateManagement();
        this.displayPricingStructure(); // Refresh pricing display
    }

    checkSeasonalPricing() {
        const today = new Date();
        const endDate = new Date(this.offerEndDate);
        const isOfferActive = today <= endDate;

        // Store original prices if not already stored
        if (!localStorage.getItem('originalPricingStructure')) {
            localStorage.setItem('originalPricingStructure', JSON.stringify(this.pricingStructure));
        }

        const originalPricing = JSON.parse(localStorage.getItem('originalPricingStructure'));

        // Update prices based on offer status
        if (isOfferActive) {
            // Apply 50% discount
            Object.keys(this.pricingStructure).forEach(key => {
                this.pricingStructure[key] = originalPricing[key] * 0.8;
            });
        } else {
            // Double the original prices
            Object.keys(this.pricingStructure).forEach(key => {
                this.pricingStructure[key] = originalPricing[key] * 1.2;
            });
        }

        // Update the seasonal offer banner
        this.updateSeasonalBanner(isOfferActive);

        // Save current pricing to localStorage
        localStorage.setItem('pricingStructure', JSON.stringify(this.pricingStructure));
    }

    updateSeasonalBanner(isOfferActive) {
        const banner = document.getElementById('marketDemandSection');
        if (!banner) return;

        if (isOfferActive) {
            banner.style.background = "hsla(21, 87.80%, 48.20%, 0.82)";
            banner.querySelector('.highlight-text').textContent = 'All Package Prices are 20% OFF!';
        } else {
            banner.style.background = 'linear-gradient( #2c3e50,black)';
            banner.querySelector('.highlight-text').textContent = 'Peak Season Ended - Premium Pricing in Effect';
            banner.querySelector('.offer-details p').textContent =
                ' Due to off-peak season premium pricing is now in effect';
        }
    }
}

// Initialize the packaging module
document.addEventListener("DOMContentLoaded", () => {
    new PackagingModule();
});
