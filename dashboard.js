document.addEventListener('DOMContentLoaded', async () => {
    const loadingDiv = document.getElementById('loading');
    const chartsGrid = document.getElementById('charts-grid');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');

    try {
        const response = await fetch('api.php?action=get_dashboard_data');
        const result = await response.json();

        if (result.status === 'success') {
            const data = result.data;
            // Tampilkan grid chart dan sembunyikan loading
            loadingDiv.style.display = 'none';
            chartsGrid.classList.remove('hidden');

            // === Ringkasan Statistik ===
            const totalProfiles = data.profiles_per_department.reduce((sum, d) => sum + parseInt(d.count), 0);
            const totalDepartments = data.profiles_per_department.length;
            const totalSkills = Object.keys(data.top_hard_skills).length + Object.keys(data.top_soft_skills).length;
            document.getElementById('totalProfiles').textContent = totalProfiles;
            document.getElementById('totalDepartments').textContent = totalDepartments;
            document.getElementById('totalSkills').textContent = totalSkills;

            // Render semua chart
            renderDepartmentChart(data.profiles_per_department);
            renderSkillsChart('hardSkillsChart', 'Top 10 Hard Skills', data.top_hard_skills, 'rgba(79, 70, 229, 0.8)');
            renderSkillsChart('softSkillsChart', 'Top 10 Soft Skills', data.top_soft_skills, 'rgba(14, 165, 233, 0.8)');

            // Toast sukses
            showToast('Data dashboard berhasil dimuat!', 'success');

            // Smooth scroll ke chart (khusus mobile)
            setTimeout(() => {
                if (window.innerWidth < 768) {
                    document.getElementById('charts-grid').scrollIntoView({ behavior: 'smooth' });
                }
            }, 300);
        } else {
            throw new Error(result.message || 'Gagal memuat data.');
        }
    } catch (error) {
        console.error('Gagal memuat data dashboard:', error);
        loadingDiv.style.display = 'none';
        errorMessage.textContent = error.message;
        errorDiv.classList.remove('hidden');
        showToast('Gagal memuat data dashboard!', 'error');
    }
});

/**
 * Merender chart untuk data departemen.
 * @param {Array} data - Data dari API, contoh: [{department: 'IT', count: 5}]
 */
function renderDepartmentChart(data) {
    const chartContainer = document.getElementById('departmentChart').parentElement;
    if (!data || data.length === 0) {
        chartContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-72 text-slate-400"><i class='fa-solid fa-folder-open text-5xl mb-2'></i><p>Tidak ada data departemen.</p></div>`;
        return;
    }
    chartContainer.innerHTML = '<canvas id="departmentChart"></canvas>';
    const ctx = document.getElementById('departmentChart').getContext('2d');
    if (window.departmentChartInstance) window.departmentChartInstance.destroy();
    window.departmentChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.department),
            datasets: [{
                label: 'Jumlah Profil',
                data: data.map(d => d.count),
                backgroundColor: [
                    '#4f46e5', '#7c3aed', '#db2777', '#f97316',
                    '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
                    '#3b82f6', '#6366f1', '#f43f5e', '#0ea5e9'
                ],
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                animateScale: true,
                animateRotate: true
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#1e293b',
                    bodyColor: '#334155',
                    borderColor: '#e0e7ef',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed} profil`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Merender chart untuk data skills (hard/soft).
 * @param {string} canvasId - ID dari elemen canvas.
 * @param {string} label - Label untuk dataset chart.
 * @param {Object} data - Data dari API, contoh: {'JavaScript': 10, 'PHP': 8}
 * @param {string} color - Warna bar chart.
 */
function renderSkillsChart(canvasId, label, data, color) {
    const chartContainer = document.getElementById(canvasId).parentElement;
    if (!data || Object.keys(data).length === 0) {
        chartContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-72 text-slate-400"><i class='fa-solid fa-folder-open text-5xl mb-2'></i><p>Tidak ada data skill.</p></div>`;
        return;
    }
    chartContainer.innerHTML = `<canvas id="${canvasId}"></canvas>`;
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (window[canvasId + 'Instance']) window[canvasId + 'Instance'].destroy();
    window[canvasId + 'Instance'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: label,
                data: Object.values(data),
                backgroundColor: color,
                borderColor: color.replace('0.8', '1'),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeOutBounce'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#1e293b',
                    bodyColor: '#334155',
                    borderColor: '#e0e7ef',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed.x || context.parsed} profil`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// === Toast Notification ===
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    if (type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check text-2xl text-green-500';
        toast.classList.remove('border-red-200');
        toast.classList.add('border-green-200');
    } else {
        toastIcon.className = 'fa-solid fa-circle-xmark text-2xl text-red-500';
        toast.classList.remove('border-green-200');
        toast.classList.add('border-red-200');
    }
    toast.classList.remove('hidden');
    toast.classList.add('animate-fade-in');
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('animate-fade-in');
    }, 3500);
}