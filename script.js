// Jalankan pengecekan login saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});

// --- State Aplikasi Global ---
const API_URL = 'api.php';
let allProfiles = [];
let selectedProfileId = null;
let organizationalStructure = {};
let currentUser = {
    loggedIn: false,
    role: null,
    fullName: null,
    photo_path: null
};

// --- Fungsi Utama ---

/**
 * Memeriksa status login pengguna dari server.
 */
async function checkLoginStatus() {
    // Jika tidak ada tanda login di session storage, langsung arahkan ke halaman login.
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('auth.php?action=status');
        const result = await response.json();
        if (result.loggedIn) {
            currentUser = result; // Simpan data user yang sedang login
            initializeApp(); // Mulai aplikasi
        } else {
            // Jika sesi di server tidak valid, hapus tanda login dan arahkan ke halaman login.
            sessionStorage.removeItem('isLoggedIn');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Tidak dapat terhubung ke server.', error);
        window.location.href = 'login.html'; // Fallback jika API gagal
    }
}

/**
 * Mengambil data struktur organisasi (departemen dan jabatan) dari API.
 */
async function fetchOrganizationalStructure() {
    try {
        const response = await fetch(`${API_URL}?action=get_structure`);
        const result = await response.json();
        if (result.status === 'success') {
            organizationalStructure = result.data;
        } else {
            console.error('Gagal memuat struktur organisasi:', result.message);
        }
    } catch (error) {
        console.error('Error fetching organizational structure:', error);
    }
}

/**
 * Inisialisasi semua komponen aplikasi, mengambil data, dan memasang event listener.
 */
async function initializeApp() {
    // Definisi elemen utama DOM
    const mainContent = document.getElementById('mainContent');
    const searchInput = document.getElementById('searchInput');
    const addProfileBtn = document.getElementById('addProfileBtn');

    // Render UI awal
    updateUserInfo();
    showWelcomeScreen();
    await fetchOrganizationalStructure();
    fetchAndRenderProfiles();

    // Pasang event listener
    searchInput.addEventListener('input', () => renderDepartmentView(allProfiles, searchInput.value));
    addProfileBtn.addEventListener('click', () => {
        selectedProfileId = null;
        renderDepartmentView(allProfiles, searchInput.value); // Hapus highlight
        showFormView();
    });

    /**
     * Mengambil semua data job profile dan merendernya.
     * Menampilkan skeleton loading saat proses berlangsung.
     */
    async function fetchAndRenderProfiles() {
        const departmentAccordion = document.getElementById('departmentAccordion');
        const skeletonTemplate = document.getElementById('skeletonTemplate');
        departmentAccordion.innerHTML = skeletonTemplate.innerHTML;

        await new Promise(resolve => setTimeout(resolve, 500)); // Tunda untuk efek visual

        try {
            const response = await fetch(`${API_URL}?action=get_all`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'success') {
                allProfiles = result.data;
                renderDepartmentView(allProfiles);
                showToast('Data profil berhasil dimuat!', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Error fetching profiles:", error);
            departmentAccordion.innerHTML = `<div class="p-4 text-red-500 flex flex-col items-center"><i class='fa-solid fa-circle-exclamation text-3xl mb-2'></i>Gagal memuat data. Silakan coba lagi.</div>`;
            showToast('Gagal memuat data profil!', 'error');
        }
    }

    /**
     * Merender tampilan akordeon departemen di sidebar.
     * @param {Array} profiles - Array data profil.
     * @param {string} filterText - Teks dari kotak pencarian.
     */
    function renderDepartmentView(profiles, filterText = '') {
        const departmentAccordion = document.getElementById('departmentAccordion');
        departmentAccordion.innerHTML = '';
        const lowerCaseFilter = filterText.toLowerCase();

        const profilesByDept = profiles.reduce((acc, profile) => {
            const dept = profile.department || 'Lain-lain';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(profile);
            return acc;
        }, {});

        const filteredData = Object.keys(profilesByDept)
            .map(dept => {
                const filteredJobs = profilesByDept[dept].filter(job =>
                    job.job_title.toLowerCase().includes(lowerCaseFilter)
                );
                if (dept.toLowerCase().includes(lowerCaseFilter) || filteredJobs.length > 0) {
                    return { department: dept, jobs: dept.toLowerCase().includes(lowerCaseFilter) ? profilesByDept[dept] : filteredJobs };
                }
                return null;
            })
            .filter(Boolean).sort((a, b) => a.department.localeCompare(b.department));

        if (filteredData.length === 0) {
            departmentAccordion.innerHTML = `<div class="p-4 text-center text-slate-500 flex flex-col items-center"><i class="fa-solid fa-box-open fa-2x text-slate-300 mb-2"></i><p>Tidak ada hasil ditemukan.</p></div>`;
            return;
        }

        filteredData.forEach(({ department, jobs }) => {
            const deptContainer = document.createElement('div');
            const deptHeader = document.createElement('div');
            deptHeader.className = 'department-header';
            deptHeader.innerHTML = `<span>${department} (${jobs.length})</span><i class="fa-solid fa-chevron-right arrow-icon"></i>`;
            const jobList = document.createElement('div');
            jobList.className = 'job-title-list collapsed';

            jobs.sort((a, b) => a.job_title.localeCompare(b.job_title)).forEach(job => {
                const jobItem = document.createElement('a');
                jobItem.href = '#';
                jobItem.className = 'job-title-item';
                jobItem.textContent = job.job_title;
                jobItem.dataset.id = job.id;
                if (job.id === selectedProfileId) {
                    jobItem.classList.add('selected');
                    jobList.classList.remove('collapsed');
                    deptHeader.classList.add('active');
                }
                jobItem.addEventListener('click', e => {
                    e.preventDefault();
                    selectedProfileId = job.id;
                    showDetailView(job);
                    renderDepartmentView(profiles, filterText);
                });
                jobList.appendChild(jobItem);
            });

            deptHeader.addEventListener('click', () => {
                deptHeader.classList.toggle('active');
                jobList.classList.toggle('collapsed');
            });

            deptContainer.append(deptHeader, jobList);
            departmentAccordion.appendChild(deptContainer);
        });
    }

    /**
     * Menampilkan layar selamat datang di area konten utama.
     */
    function showWelcomeScreen() {
        mainContent.innerHTML = `<div id="welcomeScreen" class="h-full flex flex-col items-center justify-center text-center p-4">
            <img src="https://menara165.com/wp-content/uploads/2021/01/logo-semen-indonesia-web.png" alt="Semen Indonesia Group Logo" class="w-48 mb-6 opacity-80">
            <h2 class="text-2xl font-bold text-slate-700">Job Profile Management System</h2>
            <p class="text-slate-500 mt-2 max-w-md">Pilih departemen di sebelah kiri, lalu pilih jabatan untuk melihat atau mengedit rinciannya.</p>
        </div>`;
    }

    /**
     * Menampilkan detail lengkap dari profil yang dipilih.
     * @param {object} profile - Objek data profil.
     */
    function showDetailView(profile) {
        const template = document.getElementById('detailViewTemplate');
        mainContent.innerHTML = template.innerHTML;

        mainContent.querySelector('#detailTitle').textContent = profile.job_title || 'N/A';
        mainContent.querySelector('#detailDept').textContent = profile.department || 'N/A';
        mainContent.querySelector('#detailSummary').textContent = profile.summary || 'N/A';
        mainContent.querySelector('#detailReportsTo').textContent = profile.reports_to || 'N/A';
        mainContent.querySelector('#detailEducation').textContent = profile.education || 'N/A';
        mainContent.querySelector('#detailExperience').textContent = profile.experience || 'N/A';

        const respList = mainContent.querySelector('#detailResponsibilities');
        respList.innerHTML = (profile.responsibilities && profile.responsibilities.length) ? profile.responsibilities.map(item => `<li>${item}</li>`).join('') : '<li class="list-none text-slate-400">Tidak ada data.</li>';
        const kpiList = mainContent.querySelector('#detailKPIs');
        kpiList.innerHTML = (profile.kpis && profile.kpis.length) ? profile.kpis.map(item => `<li>${item}</li>`).join('') : '<li class="list-none text-slate-400">Tidak ada data.</li>';
        const hardSkillsDiv = mainContent.querySelector('#detailHardSkills');
        hardSkillsDiv.innerHTML = (profile.hard_skills && profile.hard_skills.length) ? profile.hard_skills.map(item => `<span class="tag-item">${item}</span>`).join('') : '<span class="text-slate-400">Tidak ada data.</span>';
        const softSkillsDiv = mainContent.querySelector('#detailSoftSkills');
        softSkillsDiv.innerHTML = (profile.soft_skills && profile.soft_skills.length) ? profile.soft_skills.map(item => `<span class="tag-item">${item}</span>`).join('') : '<span class="text-slate-400">Tidak ada data.</span>';

        // Logika untuk tombol-tombol
        const printBtn = mainContent.querySelector('#printBtn');
        const closeBtn = mainContent.querySelector('#closeBtn');
        const editBtn = mainContent.querySelector('#editBtn');
        const deleteBtn = mainContent.querySelector('#deleteBtn');

        printBtn.addEventListener('click', () => generatePdf(profile));
        closeBtn.addEventListener('click', () => {
            selectedProfileId = null;
            showWelcomeScreen();
            renderDepartmentView(allProfiles);
        });

        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
            editBtn.style.display = 'inline-flex';
            editBtn.addEventListener('click', () => showFormView(profile));
        } else {
            editBtn.style.display = 'none';
        }
        if (currentUser.role === 'superadmin') {
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.addEventListener('click', () => showDeleteModal(profile));
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    /**
     * Menghasilkan dan mengunduh PDF dari detail profil.
     * @param {object} profile - Objek data profil.
     */
    function generatePdf(profile) {
        const element = document.getElementById('profileDetailContent');
        const opt = {
            margin: 1,
            filename: `JobProfile_${profile.job_title.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        const buttonsContainer = element.querySelector('.flex.space-x-2');
        buttonsContainer.style.display = 'none'; // Sembunyikan tombol
        html2pdf().set(opt).from(element).save().then(() => {
            buttonsContainer.style.display = 'flex'; // Tampilkan kembali
        });
    }

    /**
     * Menampilkan form untuk menambah atau mengedit profil.
     * @param {object|null} profile - Data profil untuk diedit, atau null untuk menambah.
     */
    function showFormView(profile = null) {
        const isEditing = profile !== null;
        const template = document.getElementById('formViewTemplate');
        mainContent.innerHTML = template.innerHTML;

        mainContent.querySelector('#formTitle').textContent = isEditing ? 'Edit Job Profile' : 'Tambah Job Profile Baru';

        const departmentSelect = mainContent.querySelector('#department');
        const jobTitleSelect = mainContent.querySelector('#jobTitle');

        const populateJobTitles = (selectedDept) => {
            jobTitleSelect.innerHTML = '<option value="">Pilih Jabatan...</option>';
            if (selectedDept && organizationalStructure[selectedDept]) {
                organizationalStructure[selectedDept].forEach(title => {
                    jobTitleSelect.add(new Option(title, title));
                });
            } else {
                jobTitleSelect.innerHTML = '<option value="">Pilih Departemen Dahulu</option>';
            }
        };

        departmentSelect.innerHTML = '<option value="">Pilih Departemen...</option>';
        Object.keys(organizationalStructure).sort().forEach(dept => {
            departmentSelect.add(new Option(dept, dept));
        });

        departmentSelect.addEventListener('change', () => populateJobTitles(departmentSelect.value));

        if (isEditing) {
            mainContent.querySelector('#profileId').value = profile.id;
            departmentSelect.value = profile.department || '';
            populateJobTitles(profile.department);
            jobTitleSelect.value = profile.job_title || '';
            mainContent.querySelector('#reportsTo').value = profile.reports_to || '';
            mainContent.querySelector('#summary').value = profile.summary || '';
            mainContent.querySelector('#education').value = profile.education || '';
            mainContent.querySelector('#experience').value = profile.experience || '';
        } else {
            populateJobTitles(departmentSelect.value);
        }

        setupDynamicList(mainContent, 'responsibilitiesContainer', 'addResponsibilityBtn', 'Tanggung Jawab', isEditing ? profile.responsibilities : []);
        setupDynamicList(mainContent, 'kpisContainer', 'addKpiBtn', 'KPI', isEditing ? profile.kpis : []);
        setupTagInput(mainContent, 'hardSkillsContainer', isEditing ? profile.hard_skills : []);
        setupTagInput(mainContent, 'softSkillsContainer', isEditing ? profile.soft_skills : []);

        mainContent.querySelector('#profileForm').addEventListener('submit', handleFormSubmit);
        mainContent.querySelector('#cancelBtn').addEventListener('click', () => {
            if (isEditing) {
                showDetailView(profile);
            } else {
                showWelcomeScreen();
                selectedProfileId = null;
                renderDepartmentView(allProfiles);
            }
        });
    }

    /**
     * Menangani pengiriman data form (membuat atau memperbarui profil).
     * @param {Event} e - Event submit.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        const id = mainContent.querySelector('#profileId').value;
        const profileData = {
            id: id ? parseInt(id) : null,
            jobTitle: mainContent.querySelector('#jobTitle').value,
            department: mainContent.querySelector('#department').value,
            reportsTo: mainContent.querySelector('#reportsTo').value,
            summary: mainContent.querySelector('#summary').value,
            qualifications: {
                education: mainContent.querySelector('#education').value,
                experience: mainContent.querySelector('#experience').value,
            },
            responsibilities: getDynamicListValues(mainContent, 'responsibilitiesContainer'),
            kpis: getDynamicListValues(mainContent, 'kpisContainer'),
            hardSkills: getTagInputValues(mainContent, 'hardSkillsContainer'),
            softSkills: getTagInputValues(mainContent, 'softSkillsContainer'),
        };

        const action = id ? 'update' : 'create';
        try {
            const response = await fetch(`${API_URL}?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || 'Terjadi kesalahan.');

            await fetchAndRenderProfiles();

            selectedProfileId = id ? parseInt(id) : result.id;
            const newProfile = allProfiles.find(p => p.id === selectedProfileId);
            if (newProfile) {
                showDetailView(newProfile);
                showToast('Profil berhasil disimpan!', 'success');
            } else {
                showWelcomeScreen(); // Fallback
                showToast('Profil berhasil disimpan!', 'success');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Gagal menyimpan profil: ' + error.message);
            showToast('Gagal menyimpan profil!', 'error');
        }
    }

    /**
     * Menampilkan modal konfirmasi sebelum menghapus profil.
     * @param {object} profile - Profil yang akan dihapus.
     */
    function showDeleteModal(profile) {
        const modal = document.getElementById('deleteModal');
        const profileName = document.getElementById('deleteProfileName');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        profileName.textContent = profile.job_title;
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const handleConfirm = async () => {
            try {
                const response = await fetch(`${API_URL}?action=delete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: profile.id })
                });
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                selectedProfileId = null;
                showWelcomeScreen();
                await fetchAndRenderProfiles();
                showToast('Profil berhasil dihapus!', 'success');
            } catch (error) {
                console.error('Error deleting profile:', error);
                alert('Gagal menghapus profil: ' + error.message);
                showToast('Gagal menghapus profil!', 'error');
            } finally {
                closeModal();
            }
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            confirmDeleteBtn.replaceWith(confirmDeleteBtn.cloneNode(true));
        };

        confirmDeleteBtn.addEventListener('click', handleConfirm, { once: true });
        cancelDeleteBtn.addEventListener('click', closeModal, { once: true });
    }

    /**
     * Memperbarui UI info pengguna di sidebar dengan nama, peran, dan foto.
     */
    function updateUserInfo() {
        const userInfoDiv = document.getElementById('userInfo');
        const photoSrc = currentUser.photo_path
            ? `${currentUser.photo_path}?t=${new Date().getTime()}`
            : 'https://placehold.co/40x40/e2e8f0/64748b?text=N/A';

        let html = `
            <div class="flex items-center space-x-3">
                <img src="${photoSrc}" alt="Foto Profil" class="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm">
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-indigo-900 leading-tight truncate">${currentUser.fullName}</p>
                    <p class="text-xs text-slate-600">Role: <span class="font-medium capitalize text-indigo-800">${currentUser.role}</span></p>
                </div>
            </div>
            <div class="flex flex-col space-y-1 border-t border-indigo-200 pt-2 mt-3">
                <a href="profile.html" class="text-green-600 hover:underline font-semibold text-sm"><i class="fa-solid fa-user-shield fa-fw mr-1"></i>Profil & Keamanan</a>
                <a href="direktori.html" class="text-cyan-600 hover:underline font-semibold text-sm"><i class="fa-solid fa-address-book fa-fw mr-1"></i>Direktori Pegawai</a>
        `;

        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
            html += `<a href="dashboard.html" class="text-indigo-600 hover:underline font-semibold text-sm"><i class="fa-solid fa-chart-line fa-fw mr-1"></i>Lihat Dashboard</a>`;
            html += `<a href="manage-users.html" class="text-purple-600 hover:underline font-semibold text-sm"><i class="fa-solid fa-users-cog fa-fw mr-1"></i>Manajemen Pengguna</a>`;
        }

        html += `</div>`;
        html += `<button id="logoutBtn" class="w-full text-left text-red-600 hover:underline font-semibold pt-2 border-t border-indigo-200 mt-2 text-sm"><i class="fa-solid fa-right-from-bracket fa-fw mr-1"></i>Logout</button>`;

        userInfoDiv.innerHTML = html;

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            sessionStorage.removeItem('isLoggedIn');
            await fetch('auth.php?action=logout');
            window.location.href = 'login.html';
        });

        if (currentUser.role === 'pegawai') {
            addProfileBtn.style.display = 'none';
        } else {
            addProfileBtn.style.display = 'flex';
        }
    }
}


// --- FUNGSI-FUNGSI HELPERS (untuk form dinamis) ---

function setupDynamicList(context, containerId, buttonId, placeholder, initialData) {
    const container = context.querySelector(`#${containerId}`);
    const addButton = context.querySelector(`#${buttonId}`);
    const addItem = (value = '') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 mb-2';
        div.innerHTML = `<input type="text" value="${value.replace(/"/g, '&quot;')}" placeholder="${placeholder}" class="w-full border-slate-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dynamic-list-item"><button type="button" class="text-red-500 hover:text-red-700 remove-item-btn"><i class="fa-solid fa-trash-can"></i></button>`;
        container.appendChild(div);
        div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
    };
    (initialData || []).forEach(item => addItem(item));
    addButton.addEventListener('click', () => addItem());
}

function setupTagInput(context, containerId, initialTags) {
    const container = context.querySelector(`#${containerId}`);
    const input = container.querySelector('input');
    const addTag = (text) => {
        const tagText = text.trim();
        if (tagText.length > 1 && !getTagInputValues(context, containerId).includes(tagText)) {
            const tag = document.createElement('span');
            tag.className = 'tag-item';
            tag.innerHTML = `${tagText} <button type="button" class="bg-transparent border-none cursor-pointer">&times;</button>`;
            container.insertBefore(tag, input);
            tag.querySelector('button').addEventListener('click', () => tag.remove());
        }
    };
    (initialTags || []).forEach(tag => addTag(tag));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(input.value);
            input.value = '';
        }
    });
}

function getDynamicListValues(context, containerId) {
    return Array.from(context.querySelectorAll(`#${containerId} .dynamic-list-item`)).map(input => input.value.trim()).filter(value => value);
}

function getTagInputValues(context, containerId) {
    return Array.from(context.querySelectorAll(`#${containerId} .tag-item`)).map(tag => tag.firstChild.textContent.trim());
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