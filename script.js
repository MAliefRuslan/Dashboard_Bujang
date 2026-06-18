let rawData = [];
let rawBomData = [];
let hourChartInstance = null;
let dayChartInstance = null;
let menuChartInstance = null;
let visitChartInstance = null;
let visitBillChartInstance = null;
let paymentChartInstance = null;
let monthCompareChartInstance = null;
let twoMonthCompareChartInstance = null;

// Chart.js default config
Chart.defaults.color = '#64748b';
Chart.defaults.font.family = "'Outfit', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.06)';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data.json');
        rawData = await response.json();
        
        const responseBom = await fetch('bom.json');
        rawBomData = await responseBom.json();
        
        // Populate filters
        populateFilters();
        
        // Add event listeners
        document.getElementById('yearFilter').addEventListener('change', updateDashboard);
        document.getElementById('monthFilter').addEventListener('change', updateDashboard);
        
        document.getElementById('compMonth1').addEventListener('change', updateTwoMonthCompareChart);
        document.getElementById('compMonth2').addEventListener('change', updateTwoMonthCompareChart);
        
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
    const compMonth1Select = document.getElementById('compMonth1');
    const compMonth2Select = document.getElementById('compMonth2');
    
    // Clear existing hardcoded options
    compMonth1Select.innerHTML = '';
    compMonth2Select.innerHTML = '';

    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
        
        const option1 = option.cloneNode(true);
        const option2 = option.cloneNode(true);
        compMonth1Select.appendChild(option1);
        compMonth2Select.appendChild(option2);
    });

    if (months.length > 0) compMonth1Select.value = months[0];
    if (months.length > 1) compMonth2Select.value = months[1];
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
    updateMonthCompareChart();
    updateTwoMonthCompareChart();
    updateBomForecasting(filteredData);
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

function updateMonthCompareChart() {
    const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

    // Always use ALL data (ignoring filters) so we can compare across years
    const years = [...new Set(rawData.map(d => d.year).filter(y => y))].sort();

    const yearColors = [
        { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgb(59, 130, 246)' },
        { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgb(16, 185, 129)' },
        { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgb(245, 158, 11)' },
        { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgb(236, 72, 153)' },
        { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgb(139, 92, 246)' }
    ];

    const datasets = years.map((year, idx) => {
        const yearData = rawData.filter(d => String(d.year) === String(year));
        const monthTotals = monthOrder.map(month => {
            return yearData
                .filter(d => String(d.Month) === month)
                .reduce((sum, d) => sum + (Number(d.Total) || 0), 0);
        });
        const color = yearColors[idx % yearColors.length];
        return {
            label: String(year),
            data: monthTotals,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointBackgroundColor: color.border,
            pointRadius: 5,
            pointHoverRadius: 8
        };
    });

    const ctx = document.getElementById('monthCompareChart').getContext('2d');

    if (monthCompareChartInstance) {
        monthCompareChartInstance.data.datasets = datasets;
        monthCompareChartInstance.update();
    } else {
        monthCompareChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                            font: { size: 13, weight: '600' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
                                if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateTwoMonthCompareChart() {
    const selectedYear = document.getElementById('yearFilter').value;
    const m1 = document.getElementById('compMonth1').value;
    const m2 = document.getElementById('compMonth2').value;

    let baseData = rawData;
    if (selectedYear !== 'all') {
        baseData = baseData.filter(d => String(d.year) === selectedYear);
    }

    const days = Array.from({length: 31}, (_, i) => String(i + 1));

    const m1Data = days.map(day => {
        return baseData
            .filter(d => String(d.Month) === m1 && String(d.Day) === day)
            .reduce((sum, d) => sum + (Number(d.Total) || 0), 0);
    });

    const m2Data = days.map(day => {
        return baseData
            .filter(d => String(d.Month) === m2 && String(d.Day) === day)
            .reduce((sum, d) => sum + (Number(d.Total) || 0), 0);
    });

    const ctx = document.getElementById('twoMonthCompareChart').getContext('2d');

    const datasets = [
        {
            label: m1 || 'Bulan 1',
            data: m1Data,
            borderColor: 'rgb(236, 72, 153)',
            backgroundColor: 'rgba(236, 72, 153, 0.15)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: 'rgb(236, 72, 153)',
            pointRadius: 4
        },
        {
            label: m2 || 'Bulan 2',
            data: m2Data,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointRadius: 4
        }
    ];

    if (twoMonthCompareChartInstance) {
        twoMonthCompareChartInstance.data.datasets = datasets;
        twoMonthCompareChartInstance.update();
    } else {
        twoMonthCompareChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 13, weight: '600' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Tanggal (Hari ke-)' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000000) return (value / 1000000000).toFixed(1) + 'B';
                                if (value >= 1000000) return (value / 1000000).toFixed(0) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }
}

function updateBomForecasting(filteredData) {
    // 1. Hitung total kuantitas per menu dari data penjualan
    const menuSales = {};
    filteredData.forEach(d => {
        if (!d.Menu) return;
        const menuName = d.Menu.trim();
        menuSales[menuName] = (menuSales[menuName] || 0) + 1;
    });

    // 2. Kalkulasi penggunaan bahan berdasarkan BOM
    const bahanUsage = {};

    rawBomData.forEach(bom => {
        if (!bom.Menu || !bom.Bahan) return;
        const menuName = bom.Menu.trim();
        const soldQty = menuSales[menuName] || 0;
        
        if (soldQty > 0) {
            const bahanName = bom.Bahan.trim();
            const takaran = Number(bom.Takaran) || 0;
            const satuan = bom.Satuan ? bom.Satuan.trim() : '';

            // Group by bahan name only (merge different units)
            const key = bahanName;

            if (!bahanUsage[key]) {
                bahanUsage[key] = {
                    nama: bahanName,
                    total: 0,
                    satuan: satuan
                };
            }
            // If a different unit appears, combine them
            if (satuan && !bahanUsage[key].satuan.includes(satuan)) {
                bahanUsage[key].satuan += ' / ' + satuan;
            }
            bahanUsage[key].total += (takaran * soldQty);
        }
    });

    // 3. Render ke tabel
    const tbody = document.getElementById('bomTableBody');
    tbody.innerHTML = '';

    const bahanArray = Object.values(bahanUsage).sort((a, b) => a.nama.localeCompare(b.nama));

    if (bahanArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Tidak ada data bahan baku untuk periode ini.</td></tr>';
        return;
    }

    bahanArray.forEach(b => {
        const tr = document.createElement('tr');
        
        const tdNama = document.createElement('td');
        tdNama.textContent = b.nama;
        
        const tdTotal = document.createElement('td');
        tdTotal.style.textAlign = 'right';
        // Format number nicely
        tdTotal.textContent = new Intl.NumberFormat('id-ID').format(b.total);
        
        const tdSatuan = document.createElement('td');
        tdSatuan.textContent = b.satuan;
        
        tr.appendChild(tdNama);
        tr.appendChild(tdTotal);
        tr.appendChild(tdSatuan);
        
        tbody.appendChild(tr);
    });
}

