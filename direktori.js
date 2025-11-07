/**
 * Jalankan kode setelah seluruh konten halaman dimuat.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Ambil elemen-elemen yang diperlukan dari DOM
    const loadingDiv = document.getElementById('loading');
    const directoryGrid = document.getElementById('directory-grid');
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');

    try {
        // Panggil API untuk mendapatkan data direktori pegawai
        const response = await fetch('api.php?action=get_employee_directory');
        const result = await response.json();

        // Periksa apakah panggilan API berhasil
        if (result.status === 'success') {
            const directoryData = result.data;
            loadingDiv.style.display = 'none'; // Sembunyikan loading
            directoryGrid.classList.remove('hidden'); // Tampilkan grid
            renderDirectory(directoryData); // Render data ke dalam grid
            showToast('Data direktori berhasil dimuat!', 'success');
        } else {
            // Jika API mengembalikan status error
            throw new Error(result.message || 'Gagal memuat data direktori.');
        }
    } catch (error) {
        // Tangani error jika fetch gagal atau terjadi masalah lain
        console.error('Gagal memuat direktori:', error);
        loadingDiv.style.display = 'none'; // Sembunyikan loading
        errorMessage.textContent = error.message; // Tampilkan pesan error
        errorDiv.classList.remove('hidden'); // Tampilkan kotak error
        showToast('Gagal memuat data direktori!', 'error');
    }
});

/**
 * Merender data direktori ke dalam halaman.
 * @param {Object} data - Objek data direktori yang dikelompokkan berdasarkan departemen.
 */
function renderDirectory(data) {
    const directoryGrid = document.getElementById('directory-grid');
    directoryGrid.innerHTML = ''; // Kosongkan grid sebelum mengisi

    // Periksa jika tidak ada data sama sekali
    if (Object.keys(data).length === 0) {
        directoryGrid.innerHTML = `<div class="text-center text-slate-500 mt-10">
            <i class="fa-solid fa-folder-open text-5xl text-slate-300"></i>
            <p class="mt-4">Belum ada data pegawai dengan posisi yang terdefinisi.</p>
        </div>`;
        return;
    }

    // Urutkan nama departemen berdasarkan abjad untuk tampilan yang konsisten
    const sortedDepartments = Object.keys(data).sort((a, b) => a.localeCompare(b));

    // Looping untuk setiap departemen
    for (const department of sortedDepartments) {
        const employees = data[department];
        let departmentHtml = `
            <div>
                <h3 class="text-xl font-bold text-indigo-800 border-b-2 border-indigo-200 pb-2 mb-6">${department}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        `;

        // Looping untuk setiap pegawai di dalam departemen
        employees.forEach(employee => {
            // Tentukan sumber gambar, gunakan placeholder jika tidak ada
            const photoSrc = employee.photo_path ? `${employee.photo_path}?t=${new Date().getTime()}` : 'https://placehold.co/128x128/e2e8f0/64748b?text=N/A';
            // Fallback jika gambar gagal dimuat
            const defaultPhotoOnError = "this.onerror=null;this.src='https://placehold.co/128x128/e2e8f0/64748b?text=N/A';";
            
            departmentHtml += `
                <div class="bg-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 animate-fade-in flex items-center space-x-4">
                    <img src="${photoSrc}" alt="Foto ${employee.full_name}" class="w-16 h-16 rounded-full object-cover border-2 border-white ring-2 ring-indigo-200" onerror="${defaultPhotoOnError}">
                    <div class="overflow-hidden">
                        <p class="font-bold text-slate-800 truncate" title="${employee.full_name}">${employee.full_name}</p>
                        <p class="text-sm text-slate-500 truncate" title="${employee.job_title}">${employee.job_title}</p>
                    </div>
                </div>
            `;
        });

        departmentHtml += `</div></div>`;
        directoryGrid.innerHTML += departmentHtml;
    }
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