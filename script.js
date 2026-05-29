let rawData = [];
let hourChartInstance = null;
let dayChartInstance = null;
let menuChartInstance = null;
let visitChartInstance = null;
let visitBillChartInstance = null;
let paymentChartInstance = null;

// Chart.js default config
Chart.defaults.color = '#64748b';
Chart.defaults.font.family = "'Outfit', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.06)';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data.json');
        rawData = await response.json();
        
        // Populate filters
        populateFilters();
        
        // Add event listeners
        document.getElementById('yearFilter').addEventListener('change', updateDashboard);
        document.getElementById('monthFilter').addEventListener('change', updateDashboard);
        
        // Initial render
        updateDashboard();
    } catch (error) {
        console.error("Error loading data:", error);
    }
});

function populateFilters() {
    const years = [...new Set(rawData.map(d => d.year).filter(y => y))].sort();
    const months = [...new Set(rawData.map(d => d.Month).filter(m => m))];
    
    // Sort months (Assuming they are string names or numbers, let's just sort naturally if strings or numerically if numbers)
    // Actually since we just get whatever is in data, we can just display them as they are
    
    const yearSelect = document.getElementById('yearFilter');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    const monthSelect = document.getElementById('monthFilter');
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
}

function updateDashboard() {
    const selectedYear = document.getElementById('yearFilter').value;
    const selectedMonth = document.getElementById('monthFilter').value;
    
    // Filter data
    let filteredData = rawData;
    if (selectedYear !== 'all') {
        filteredData = filteredData.filter(d => String(d.year) === selectedYear);
    }
    if (selectedMonth !== 'all') {
        filteredData = filteredData.filter(d => String(d.Month) === selectedMonth);
    }
    
    // Update Stats
    const totalSales = filteredData.reduce((sum, item) => sum + (Number(item.Total) || 0), 0);
    document.getElementById('totalSales').textContent = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(totalSales);
    
    document.getElementById('totalTransactions').textContent = new Intl.NumberFormat('id-ID').format(filteredData.length);
    
    const uniqueBills = new Set(filteredData.map(d => d.SalesNumber).filter(b => b));
    const billCount = uniqueBills.size;
    document.getElementById('totalBills').textContent = new Intl.NumberFormat('id-ID').format(billCount);
    
    const avgPerBill = billCount > 0 ? (totalSales / billCount) : 0;
    document.getElementById('avgPerBill').textContent = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(avgPerBill);
    
    // Update Charts
    updateHourChart(filteredData);
    updateDayChart(filteredData);
    updateMenuChart(filteredData);
    updateVisitChart(filteredData);
    updateVisitBillChart(filteredData);
    updatePaymentChart(filteredData);
}

function updateHourChart(data) {
    // Group by Hour
    const hourData = {};
    for (let i = 0; i < 24; i++) hourData[i] = 0; // Initialize 24 hours
    
    data.forEach(item => {
        if (item.Hour !== undefined && item.Hour !== null) {
            // Some systems might have hour as string or float
            const hour = Math.floor(Number(item.Hour));
            if (hour >= 0 && hour < 24) {
                hourData[hour] += (Number(item.Total) || 0);
            }
        }
    });

    const labels = Object.keys(hourData).map(h => `${h.padStart(2, '0')}:00`);
    const values = Object.values(hourData);

    const ctx = document.getElementById('hourChart').getContext('2d');
    
    if (hourChartInstance) {
        hourChartInstance.data.datasets[0].data = values;
        hourChartInstance.update();
    } else {
        hourChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Penjualan (Rp)',
                    data: values,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(59, 130, 246, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000) + 'M';
                                if (value >= 1000) return (value / 1000) + 'K';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateDayChart(data) {
    // Group by Day
    const dayData = {};
    
    data.forEach(item => {
        if (item.Day) {
            const day = item.Day;
            if (!dayData[day]) dayData[day] = 0;
            dayData[day] += (Number(item.Total) || 0);
        }
    });

    // Sort days
    const days = Object.keys(dayData).sort((a, b) => {
        // Try numerical sort if possible, otherwise string sort
        return (Number(a) || a) < (Number(b) || b) ? -1 : 1;
    });
    
    const values = days.map(d => dayData[d]);

    const ctx = document.getElementById('dayChart').getContext('2d');
    
    if (dayChartInstance) {
        dayChartInstance.data.labels = days;
        dayChartInstance.data.datasets[0].data = values;
        dayChartInstance.update();
    } else {
        dayChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Total Penjualan (Rp)',
                    data: values,
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: 'rgb(139, 92, 246)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: 'rgb(139, 92, 246)',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000) + 'M';
                                if (value >= 1000) return (value / 1000) + 'K';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateMenuChart(data) {
    const menuData = {};
    data.forEach(item => {
        if (item.Menu) {
            if (!menuData[item.Menu]) menuData[item.Menu] = 0;
            menuData[item.Menu] += (Number(item.Total) || 0);
        }
    });

    const sortedMenus = Object.entries(menuData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sortedMenus.map(m => m[0]);
    const values = sortedMenus.map(m => m[1]);

    const ctx = document.getElementById('menuChart').getContext('2d');
    
    if (menuChartInstance) {
        menuChartInstance.data.labels = labels;
        menuChartInstance.data.datasets[0].data = values;
        menuChartInstance.update();
    } else {
        menuChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Penjualan (Rp)',
                    data: values,
                    backgroundColor: 'rgba(236, 72, 153, 0.7)',
                    borderColor: 'rgb(236, 72, 153)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateVisitChart(data) {
    const visitData = {};
    data.forEach(item => {
        if (item.VisitPurpose) {
            if (!visitData[item.VisitPurpose]) visitData[item.VisitPurpose] = 0;
            visitData[item.VisitPurpose] += (Number(item.Total) || 0);
        }
    });

    const labels = Object.keys(visitData);
    const values = Object.values(visitData);
    const bgColors = ['rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)'];
    const borderColors = ['rgb(16, 185, 129)', 'rgb(245, 158, 11)', 'rgb(59, 130, 246)', 'rgb(139, 92, 246)'];

    const ctx = document.getElementById('visitChart').getContext('2d');
    
    if (visitChartInstance) {
        visitChartInstance.data.labels = labels;
        visitChartInstance.data.datasets[0].data = values;
        visitChartInstance.update();
    } else {
        visitChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
}

function updatePaymentChart(data) {
    const paymentData = {};
    data.forEach(item => {
        if (item.PaymentMethod) {
            if (!paymentData[item.PaymentMethod]) paymentData[item.PaymentMethod] = 0;
            paymentData[item.PaymentMethod] += (Number(item.Total) || 0);
        }
    });

    // Sort descending and optionally limit to top 10 to keep UI clean
    const sortedPayments = Object.entries(paymentData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sortedPayments.map(p => p[0]);
    const values = sortedPayments.map(p => p[1]);

    const ctx = document.getElementById('paymentChart').getContext('2d');
    
    if (paymentChartInstance) {
        paymentChartInstance.data.labels = labels;
        paymentChartInstance.data.datasets[0].data = values;
        paymentChartInstance.update();
    } else {
        paymentChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Penjualan (Rp)',
                    data: values,
                    backgroundColor: 'rgba(14, 165, 233, 0.7)',
                    borderColor: 'rgb(14, 165, 233)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.raw);
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateVisitBillChart(data) {
    const visitData = {};
    const processedBills = new Set();
    let totalBills = 0;

    data.forEach(item => {
        if (item.VisitPurpose && item.SalesNumber) {
            if (!processedBills.has(item.SalesNumber)) {
                processedBills.add(item.SalesNumber);
                if (!visitData[item.VisitPurpose]) visitData[item.VisitPurpose] = 0;
                visitData[item.VisitPurpose] += 1;
                totalBills += 1;
            }
        }
    });

    const sortedVisits = Object.entries(visitData).sort((a, b) => b[1] - a[1]);
    const borderColors = ['#e11d48', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#d946ef'];

    const container = document.getElementById('visitBillCards');
    container.innerHTML = ''; // clear previous

    if (sortedVisits.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; width: 100%;">Tidak ada data</p>';
        return;
    }

    sortedVisits.forEach((visit, index) => {
        const name = visit[0];
        const count = visit[1];
        const percentage = totalBills > 0 ? ((count / totalBills) * 100).toFixed(1) : 0;
        const color = borderColors[index % borderColors.length];

        const card = document.createElement('div');
        card.className = 'visit-card';
        card.style.borderBottomColor = color;
        
        card.innerHTML = `
            <div class="visit-card-title">${name}</div>
            <div class="visit-card-value">${new Intl.NumberFormat('id-ID').format(count)}</div>
            <div class="visit-card-percentage" style="color: ${color};">${percentage}%</div>
        `;
        
        container.appendChild(card);
    });
}
