const totalSalesList = [0, 1000, -1000];
const totalCostList = [5000, 2000, 500];

for(let totalSales of totalSalesList) {
  for(let totalCost of totalCostList) {
    const netProfit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    
    console.log(`Sales: ${totalSales}, Cost: ${totalCost}`);
    console.log(`Net Profit: ${netProfit}`);
    console.log(`profitMargin.toFixed(1): ${profitMargin.toFixed(1)}%`);
    console.log("----------------------");
  }
}
