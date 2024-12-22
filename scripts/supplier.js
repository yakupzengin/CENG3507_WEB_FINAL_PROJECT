class Farmer {
  constructor(name, phone, email, country, city) {
    this.id = Farmer.generateID();
    this.name = name;
    this.phone = phone;
    this.email = email;
    this.country = country;
    this.city = city;
  }

  static generateID() {
    return `F${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }
}

class Purchase {
  constructor(farmerID, date, quantity, pricePerKg) {
    this.id = Purchase.generateID();
    this.farmerID = farmerID;
    this.date = date;
    this.quantity = quantity;
    this.pricePerKg = pricePerKg;
    this.totalCost = quantity * pricePerKg;
  }

  static generateID() {
    return `P${Date.now()}-${Math.floor(Math.random())}`;
  }
}

// Data Storage
let farmers = JSON.parse(localStorage.getItem("farmers")) || [];
let purchases = JSON.parse(localStorage.getItem("purchases")) || [];

// Save Data to Local Storage
const saveToLocalStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Update Farmer List Display
// Update Farmer List Display as Table
const updateFarmerList = () => {
  const farmerList = document.getElementById("farmerList");
  const purchaseFarmerID = document.getElementById("purchaseFarmerID");

  if (farmers.length === 0) {
    farmerList.innerHTML = "<p>No farmers available.</p>";
    purchaseFarmerID.innerHTML = "<option value=''>No farmers available</option>";
    return;
  }

  farmerList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Country</th>
          <th>City</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${farmers
      .map(
        (farmer) => `
          <tr>
            <td>${farmer.id}</td>
            <td>${farmer.name}</td>
            <td>${farmer.phone}</td>
            <td>${farmer.email}</td>
            <td>${farmer.country}</td>
            <td>${farmer.city}</td>
            <td>
              <button onclick="editFarmer('${farmer.id}')">Edit</button>
            </td>
          </tr>`
      )
      .join("")}
      </tbody>
    </table>
  `;

  purchaseFarmerID.innerHTML = farmers
    .map(farmer => `<option value="${farmer.id}">${farmer.name} (${farmer.id})</option>`)
    .join('');
};

const editFarmer = (farmerID) => {
  const farmer = farmers.find(farmer => farmer.id === farmerID);
  if (farmer) {
    document.getElementById("farmerID").value = farmer.id;
    document.getElementById("farmerName").value = farmer.name;
    document.getElementById("farmerPhone").value = farmer.phone;
    document.getElementById("farmerEmail").value = farmer.email;
    document.getElementById("farmerCountry").value = farmer.country;
    document.getElementById("farmerCity").value = farmer.city;
  }
};

// Add/Update Farmer
const handleFarmerFormSubmit = (e) => {
  e.preventDefault();

  const farmerID = document.getElementById("farmerID").value.trim();
  const farmerName = document.getElementById("farmerName").value.trim();
  const farmerPhone = document.getElementById("farmerPhone").value.trim();
  const farmerEmail = document.getElementById("farmerEmail").value.trim();
  const farmerCountry = document.getElementById("farmerCountry").value.trim();
  const farmerCity = document.getElementById("farmerCity").value.trim();

  if (!farmerName || !farmerPhone || !farmerEmail || !farmerCountry || !farmerCity) {
    alert("All fields are required!");
    return;
  }

  // Check for duplicate farmer 
  const duplicateFarmer = farmers.find((farmer) => farmer.name === farmerName && farmer.phone === farmerPhone && farmer.email === farmerEmail && farmer.city === farmerCity && farmer.id !== farmerID);
  if (duplicateFarmer) {
    alert("A farmer with the same information already exists!");
    return;
  }

  const existingFarmerIndex = farmers.findIndex((farmer) => farmer.id === farmerID);

  if (existingFarmerIndex !== -1) {
    // Update Farmer
    farmers[existingFarmerIndex].name = farmerName;
    farmers[existingFarmerIndex].phone = farmerPhone;
    farmers[existingFarmerIndex].email = farmerEmail;
    farmers[existingFarmerIndex].country = farmerCountry;
    farmers[existingFarmerIndex].city = farmerCity;
    alert("Farmer information updated successfully!");
  } else {
    // Add New Farmer
    const newFarmer = new Farmer(farmerName, farmerPhone, farmerEmail, farmerCountry, farmerCity);
    farmers.push(newFarmer);
    alert(`Farmer added successfully! Generated ID: ${newFarmer.id}`);
  }

  saveToLocalStorage("farmers", farmers);
  updateFarmerList();
};

// Search Farmers by Name, City, or Country
const handleSearchFarmer = (e) => {
  e.preventDefault();
  const searchQuery = document.getElementById("searchFarmer").value.trim().toLowerCase();

  if (!searchQuery) {
    alert("Please enter a search query!");
    updateFarmerList();
    return;
  }

  const filteredFarmers = farmers.filter(
    (farmer) =>
      farmer.name.toLowerCase().includes(searchQuery) ||
      farmer.city.toLowerCase().includes(searchQuery) ||
      farmer.country.toLowerCase().includes(searchQuery)
  );

  const farmerList = document.getElementById("farmerListSearched");
  farmerList.innerHTML = filteredFarmers.length
    ? filteredFarmers
      .map(
        (farmer) => `
            <div class="result-item">
              <h3>${farmer.name}</h3>
              <p><strong>ID:</strong> ${farmer.id}</p>
              <p><strong>Phone:</strong> ${farmer.phone}</p>
              <p><strong>Email:</strong> ${farmer.email}</p>
              <p><strong>Country:</strong> ${farmer.country}</p>
              <p><strong>City:</strong> ${farmer.city}</p>
            </div>`
      )
      .join("")
    : "<div class='result-item'>No matching farmers found.</div>";
};

// Add/Update Purchase
const handlePurchaseFormSubmit = (e) => {
  e.preventDefault();

  const purchaseFarmerID = document.getElementById("purchaseFarmerID").value.trim();
  const purchaseDate = document.getElementById("purchaseDate").value;
  const quantity = parseFloat(document.getElementById("quantity").value);
  const pricePerKg = parseFloat(document.getElementById("pricePerKg").value);

  // Validate Farmer ID existence
  if (!farmers.some((farmer) => farmer.id === purchaseFarmerID)) {
    alert("Farmer ID does not exist!");
    return;
  }

  // Validate numeric inputs
  if (isNaN(quantity) || quantity <= 0 || isNaN(pricePerKg) || pricePerKg <= 0) {
    alert("Quantity and Price per Kg must be valid positive numbers!");
    return;
  }

  // Add Purchase
  const newPurchase = new Purchase(purchaseFarmerID, purchaseDate, quantity, pricePerKg);
  purchases.push(newPurchase);

  // Update initial total weight in localStorage
  const currentInitialWeight = parseFloat(localStorage.getItem("initialTotalWeight") || "0");
  const newInitialWeight = currentInitialWeight + (quantity * 1000); // Convert kg to grams
  localStorage.setItem("initialTotalWeight", newInitialWeight);

  alert(`Purchase logged successfully! Generated ID: ${newPurchase.id}`);
  saveToLocalStorage("purchases", purchases);
  updatePurchaseList();
};


// Update Purchase List Display
const updatePurchaseList = () => {
  const purchaseList = document.getElementById("purchaseList");
  if (purchases.length === 0) {
    purchaseList.innerHTML = "<p>No purchases recorded yet.</p>";
    return;
  }
  const totalCost = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0); // Calculate total cost
  purchaseList.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Farmer ID</th>
          <th>Date</th>
          <th>Quantity (kg)</th>
          <th>Price per Kg</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${purchases
      .map(
        (purchase) => `
          <tr>
            <td>${purchase.id}</td>
            <td>${purchase.farmerID}</td>
            <td>${purchase.date}</td>
            <td>${purchase.quantity}</td>
            <td>${purchase.pricePerKg}</td>
            <td>$${purchase.totalCost.toFixed(2)}</td>
          </tr>`
      )
      .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5"><strong>Total Cost</strong></td>
          <td><strong>$${totalCost.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
};



// Calculate and display total cost dynamically
const calculateTotalCost = () => {

  const quantity = parseFloat(document.getElementById("quantity").value) || 0;
  const pricePerKg = parseFloat(document.getElementById("pricePerKg").value) || 0;
  const totalCostElement = document.getElementById("totalCost");
  console.log("quantity", quantity)
  const totalCost = quantity * pricePerKg;
  totalCostElement.textContent = `Total Cost: $${totalCost.toFixed(2)}`;



};



// Search Purchases by Farmer ID
const handleSearchPurchaseByFarmer = (e) => {
  e.preventDefault();

  const farmerID = document.getElementById("filterFarmerID").value.trim();
  if (!farmerID) {
    alert("Please enter a Farmer ID to filter!");
    return;
  }

  const filteredPurchases = purchases.filter((purchase) => purchase.farmerID === farmerID);

  const purchaseList = document.getElementById("purchaseListFiltered");
  const totalCost = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalCost, 0); // Calculate total cost

  purchaseList.innerHTML = filteredPurchases.length
    ? `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Farmer ID</th>
          <th>Date</th>
          <th>Quantity (kg)</th>
          <th>Price per Kg</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${filteredPurchases
      .map(
        (purchase) => `
          <tr>
            <td>${purchase.id}</td>
            <td>${purchase.farmerID}</td>
            <td>${purchase.date}</td>
            <td>${purchase.quantity}</td>
            <td>${purchase.pricePerKg}</td>
            <td>${purchase.totalCost.toFixed(2)}</td>
          </tr>`
      )
      .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5"><strong>Total Cost</strong></td>
          <td><strong>${totalCost.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
    `
    : "<p>No purchases found for the given Farmer ID.</p>";
};


const handleSearchPurchaseByDate = (e) => {
  e.preventDefault();

  const startDate = document.getElementById("filterDateStart").value;
  const endDate = document.getElementById("filterDateEnd").value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates to filter!");
    return;
  }

  const filteredPurchases = purchases.filter((purchase) => {
    const purchaseDate = new Date(purchase.date);
    return purchaseDate >= new Date(startDate) && purchaseDate <= new Date(endDate);
  });

  const purchaseList = document.getElementById("purchaseListFiltered");
  const totalCost = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalCost, 0); // Calculate total cost

  purchaseList.innerHTML = filteredPurchases.length
    ? `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Farmer ID</th>
          <th>Date</th>
          <th>Quantity (kg)</th>
          <th>Price per Kg</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${filteredPurchases
      .map(
        (purchase) => `
          <tr>
            <td>${purchase.id}</td>
            <td>${purchase.farmerID}</td>
            <td>${purchase.date}</td>
            <td>${purchase.quantity}</td>
            <td>${purchase.pricePerKg}</td>
            <td>${purchase.totalCost.toFixed(2)}</td>
          </tr>`
      )
      .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5"><strong>Total Cost</strong></td>
          <td><strong>${totalCost.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
    `
    : "<p>No purchases found in the selected date range.</p>";
};


// Add Event Listeners for Filtering
document.getElementById("filterFarmerBtn").addEventListener("click", handleSearchPurchaseByFarmer);
document.getElementById("filterDateBtn").addEventListener("click", handleSearchPurchaseByDate);


// Display Filtered Purchases
// Display Filtered Purchases
const displayFilteredPurchases = (filteredPurchases) => {
  const totalQuantity = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0).toFixed(2);

  document.getElementById("purchaseList").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Farmer ID</th>
          <th>Date</th>
          <th>Quantity (kg)</th>
          <th>Price per Kg</th>
          <th>Total Cost</th>
        </tr>
      </thead>
      <tbody>
        ${filteredPurchases
      .map(
        (purchase) => `
          <tr>
            <td>${purchase.id}</td>
            <td>${purchase.farmerID}</td>
            <td>${purchase.date}</td>
            <td>${purchase.quantity}</td>
            <td>${purchase.pricePerKg}</td>
            <td>${purchase.totalCost.toFixed(2)}</td>
          </tr>
          `)
      .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>${totalQuantity}</strong></td>
          <td></td>
          <td><strong>${totalCost}</strong></td>
        </tr>
      </tfoot>
    </table>
  `;
};

// Prevent Deleting Farmer with Purchases
document.getElementById("deleteFarmerBtn").addEventListener("click", () => {
  const farmerID = prompt("Enter the Farmer ID to delete:");

  if (purchases.some((purchase) => purchase.farmerID === farmerID)) {
    alert("Cannot delete this farmer. There are purchases linked to this Farmer ID.");
    return;
  }

  const index = farmers.findIndex((farmer) => farmer.id === farmerID);

  if (index === -1) {
    alert("Farmer ID not found!");
    return;
  }

  farmers.splice(index, 1);
  saveToLocalStorage("farmers", farmers);
  updateFarmerList();
  alert("Farmer deleted successfully!");
});

// Add this new method to calculate expenses for a given period
const calculateExpenses = () => {
  const period = document.getElementById("expensePeriod").value;
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  let startDate = new Date(today);
  // Calculate start date based on period
  switch (period) {
      case 'daily':
          startDate.setHours(0, 0, 0, 0); // Start of today
          break;
      case 'weekly':
          startDate.setDate(today.getDate() - 7);
          break;
      case 'monthly':
          startDate.setDate(today.getDate() - 30);
          break;
      case 'yearly':
          startDate.setDate(today.getDate() - 365);
          break;
  }

  // Filter purchases within the date range
  const filteredPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.date);
      return purchaseDate >= startDate && purchaseDate <= today;
  });

  // Calculate totals
  const totals = filteredPurchases.reduce((acc, purchase) => {
      acc.totalCost += purchase.totalCost;
      acc.totalQuantity += purchase.quantity;
      return acc;
  }, { totalCost: 0, totalQuantity: 0 });

  // Calculate average price per kg
  const averagePrice = totals.totalQuantity > 0 ?
      totals.totalCost / totals.totalQuantity : 0;

  // Update the summary display
  document.getElementById("periodTotalCost").textContent = totals.totalCost.toFixed(2);
  document.getElementById("periodTotalQuantity").textContent = totals.totalQuantity.toFixed(2);
  document.getElementById("periodAveragePrice").textContent = averagePrice.toFixed(2);

  // Display transactions list
  const transactionList = document.getElementById("transactionList");
  transactionList.innerHTML = `
      <h4>${getPeriodTitle(period)} Transactions</h4>
      <table>
          <thead>
              <tr>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Quantity (kg)</th>
                  <th>Price/kg</th>
                  <th>Total</th>
              </tr>
          </thead>
          <tbody>
              ${filteredPurchases.map(purchase => {
                  const farmer = farmers.find(f => f.id === purchase.farmerID) || { name: 'Unknown' };
                  return `
                      <tr>
                          <td>${new Date(purchase.date).toLocaleDateString()}</td>
                          <td>${farmer.name}</td>
                          <td>${purchase.quantity}</td>
                          <td>$${purchase.pricePerKg.toFixed(2)}</td>
                          <td>$${purchase.totalCost.toFixed(2)}</td>
                      </tr>
                  `;
              }).join('')}
          </tbody>
          <tfoot>
              <tr>
                  <td colspan="2"><strong>Total</strong></td>
                  <td><strong>${totals.totalQuantity.toFixed(2)} kg</strong></td>
                  <td><strong>Avg: $${averagePrice.toFixed(2)}</strong></td>
                  <td><strong>$${totals.totalCost.toFixed(2)}</strong></td>
              </tr>
          </tfoot>
      </table>
  `;
};

const getPeriodTitle = (period) => {
  switch (period) {
      case 'daily': return "Today's";
      case 'weekly': return "Last 7 Days'";
      case 'monthly': return "Last 30 Days'";
      case 'yearly': return "Last 365 Days'";
      default: return '';
  }
};

// Add these new functions for cost reporting
const generateCostReport = () => {
  const reportType = document.getElementById('reportType').value;
  const startDate = new Date(document.getElementById('reportStartDate').value);
  const endDate = new Date(document.getElementById('reportEndDate').value);



  console.log(startDate)
  const filteredPurchases = purchases.filter(purchase => {
    const purchaseDate = new Date(purchase.date);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });

  const reportContainer = document.getElementById('costReportResults');
  let reportContent = '';

  switch (reportType) {
    case 'summary':
      reportContent = generateSummaryReport(filteredPurchases);
      break;
    case 'detailed':
      reportContent = generateDetailedReport(filteredPurchases);
      break;
    case 'comparison':
      reportContent = generateComparisonReport(filteredPurchases);
      break;
  }

  reportContainer.innerHTML = reportContent;
};

const generateSummaryReport = (purchases) => {
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  return `
        <div class="summary-card">
            <h3>Summary Report</h3>
            <p>Total Raw Material Cost: $${totalCost.toFixed(2)}</p>
            <p>Total Quantity: ${totalQuantity.toFixed(2)} kg</p>
            <p>Average Price per kg: $${avgPrice.toFixed(2)}</p>
        </div>
    `;
};

const generateDetailedReport = (purchases) => {
  const groupedByFarmer = purchases.reduce((acc, purchase) => {
    const farmer = farmers.find(f => f.id === purchase.farmerID) || { name: 'Unknown' };
    if (!acc[farmer.name]) {
      acc[farmer.name] = {
        totalCost: 0,
        totalQuantity: 0,
        purchases: []
      };
    }
    acc[farmer.name].totalCost += purchase.totalCost;
    acc[farmer.name].totalQuantity += purchase.quantity;
    acc[farmer.name].purchases.push(purchase);
    return acc;
  }, {});

  return `
        <h3>Detailed Cost Report</h3>
        <table>
            <thead>
                <tr>
                    <th>Farmer</th>
                    <th>Total Quantity (kg)</th>
                    <th>Total Cost ($)</th>
                    <th>Average Price/kg ($)</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(groupedByFarmer).map(([farmer, data]) => `
                    <tr>
                        <td>${farmer}</td>
                        <td>${data.totalQuantity.toFixed(2)}</td>
                        <td>${data.totalCost.toFixed(2)}</td>
                        <td>${(data.totalCost / data.totalQuantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};

const generateComparisonReport = (purchases) => {
  const monthlyData = purchases.reduce((acc, purchase) => {
    const month = new Date(purchase.date).toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = {
        totalCost: 0,
        totalQuantity: 0
      };
    }
    acc[month].totalCost += purchase.totalCost;
    acc[month].totalQuantity += purchase.quantity;
    return acc;
  }, {});

  return `
        <h3>Cost Comparison by Month</h3>
        <table>
            <thead>
                <tr>
                    <th>Month</th>
                    <th>Total Quantity (kg)</th>
                    <th>Total Cost ($)</th>
                    <th>Average Price/kg ($)</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(monthlyData).map(([month, data]) => `
                    <tr>
                        <td>${month}</td>
                        <td>${data.totalQuantity.toFixed(2)}</td>
                        <td>${data.totalCost.toFixed(2)}</td>
                        <td>${(data.totalCost / data.totalQuantity).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
};



// Initialize UI
updateFarmerList();
updatePurchaseList();

document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for expense calculation
    document.getElementById("calculateExpenseBtn").addEventListener("click", calculateExpenses);

    // Add event listener for cost reporting
    document.getElementById('generateCostReport').addEventListener("click", generateCostReport);

    // Set default dates for cost reporting and filtering
    const today = new Date().toISOString().split('T')[0];
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    
    // Set date values for report generation
    document.getElementById('reportStartDate').value = yearAgo.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = today;

    // Set date values for purchase filtering
    document.getElementById('filterDateStart').value = yearAgo.toISOString().split('T')[0];
    document.getElementById('filterDateEnd').value = today;
});

document.getElementById("farmerForm").addEventListener("submit", handleFarmerFormSubmit);
document.getElementById("searchFarmerBtn").addEventListener("click", handleSearchFarmer);
document.getElementById("purchaseForm").addEventListener("submit", handlePurchaseFormSubmit);
document.getElementById("filterFarmerBtn").addEventListener("click", handleSearchPurchaseByFarmer);
document.getElementById("filterDateBtn").addEventListener("click", handleSearchPurchaseByDate);
document.getElementById("quantity").addEventListener("input", calculateTotalCost);
document.getElementById("pricePerKg").addEventListener("input", calculateTotalCost);