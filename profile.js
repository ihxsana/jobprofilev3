document.addEventListener('DOMContentLoaded', () => {
    // Pastikan user sudah login
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Elemen Form
    const profileForm = document.getElementById('profileForm');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const messageDiv = document.getElementById('message');

    // Elemen Tampilan (Display)
    const displayPhoto = document.getElementById('display-photo');
    const displayFullname = document.getElementById('display-fullname');
    const displayPosition = document.getElementById('display-position');
    const displayUsername = document.getElementById('display-username');
    const displayEmail = document.getElementById('display-email');
    const displayPhone = document.getElementById('display-phone');
    const displayAge = document.getElementById('display-age');
    const displayGender = document.getElementById('display-gender');

    /**
     * Memuat data profil pengguna dari server dan mengisi halaman.
     */
    async function loadUserProfile() {
        try {
            const response = await fetch('api.php?action=get_user_profile');
            const result = await response.json();

            if (result.status === 'success') {
                const user = result.data;

                // Isi bagian tampilan (kolom kiri)
                // Tambahkan timestamp untuk mencegah caching gambar profil
                displayPhoto.src = user.photo_path ? `${user.photo_path}?t=${new Date().getTime()}` : 'https://placehold.co/128x128/e2e8f0/64748b?text=Foto';
                displayFullname.textContent = user.full_name || 'Belum diatur';
                displayPosition.textContent = user.position || 'Belum diatur';
                displayUsername.textContent = user.username;
                displayEmail.textContent = user.email || '-';
                displayPhone.textContent = user.phone || '-';
                displayAge.textContent = user.age ? `${user.age} tahun` : '-';
                displayGender.textContent = user.gender || '-';

                // Isi form edit (kolom kanan)
                document.getElementById('fullName').value = user.full_name || '';
                document.getElementById('position').value = user.position || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone || '';
                document.getElementById('age').value = user.age || '';
                document.getElementById('gender').value = user.gender || '';

            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showMessage(`Gagal memuat profil: ${error.message}`, 'error');
        }
    }

    // State
    let organizationalStructure = {};


    // Elemen Dropdown (BARU)
    const userDepartmentSelect = document.getElementById('userDepartment');
    const userPositionSelect = document.getElementById('userPosition');


    /**
     * (BARU) Fungsi untuk memuat struktur dan data profil
     */
    async function initializeProfilePage() {
        await fetchOrganizationalStructure();
        await loadUserProfile();
    }

    /**
     * (BARU) Mengambil data struktur organisasi dari API
     */
    async function fetchOrganizationalStructure() {
        try {
            const response = await fetch('api.php?action=get_structure');
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
     * Memuat data profil pengguna dari server dan mengisi halaman.
     */
    async function loadUserProfile() {
        try {
            const response = await fetch('api.php?action=get_user_profile');
            const result = await response.json();

            if (result.status === 'success') {
                const user = result.data;
                // Isi tampilan
                displayPhoto.src = user.photo_path ? `${user.photo_path}?t=${new Date().getTime()}` : 'https://placehold.co/128x128/e2e8f0/64748b?text=Foto';
                displayFullname.textContent = user.full_name || 'Belum diatur';
                displayPosition.textContent = user.position || 'Belum diatur';
                displayUsername.textContent = user.username;
                displayEmail.textContent = user.email || '-';
                displayPhone.textContent = user.phone || '-';
                displayAge.textContent = user.age ? `${user.age} tahun` : '-';
                displayGender.textContent = user.gender || '-';

                // Isi form
                document.getElementById('fullName').value = user.full_name || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone || '';
                document.getElementById('age').value = user.age || '';
                document.getElementById('gender').value = user.gender || '';

                // (BARU) Atur dropdown posisi
                setupPositionDropdowns(user.position);

            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showMessage(`Gagal memuat profil: ${error.message}`, 'error');
        }
    }

    /**
     * (BARU) Menyiapkan dan mengatur nilai dropdown departemen dan posisi
     */
    function setupPositionDropdowns(currentPosition) {
        // Fungsi untuk mengisi dropdown Jabatan
        const populatePositions = (selectedDept) => {
            userPositionSelect.innerHTML = '<option value="">Pilih Jabatan...</option>';
            if (selectedDept && organizationalStructure[selectedDept]) {
                organizationalStructure[selectedDept].forEach(title => {
                    const option = new Option(title, title);
                    userPositionSelect.add(option);
                });
            }
        };

        // Isi dropdown Departemen
        userDepartmentSelect.innerHTML = '<option value="">Pilih Departemen...</option>';
        Object.keys(organizationalStructure).forEach(dept => {
            const option = new Option(dept, dept);
            userDepartmentSelect.add(option);
        });

        // Coba atur nilai awal berdasarkan data user
        if (currentPosition && currentPosition.includes(' - ')) {
            const parts = currentPosition.split(' - ');
            const position = parts[0];
            const department = parts[1];
            
            if (organizationalStructure[department]) {
                userDepartmentSelect.value = department;
                populatePositions(department);
                userPositionSelect.value = position;
            }
        }

        // Tambah event listener untuk departemen
        userDepartmentSelect.addEventListener('change', () => {
            populatePositions(userDepartmentSelect.value);
        });
    }


    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();

        // (BARU) Gabungkan jabatan dan departemen menjadi satu string posisi
        const positionValue = userPositionSelect.value;
        const departmentValue = userDepartmentSelect.value;
        const finalPosition = (positionValue && departmentValue) ? `${positionValue} - ${departmentValue}` : '';

        formData.append('position', finalPosition);
        
        // Tambahkan sisa data
        formData.append('fullName', document.getElementById('fullName').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('age', document.getElementById('age').value);
        formData.append('gender', document.getElementById('gender').value);
        
        const photoInput = document.getElementById('profile_photo');
        if (photoInput.files[0]) {
            formData.append('profile_photo', photoInput.files[0]);
        }
        
        try {
            const response = await fetch('api.php?action=update_user_profile', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.status === 'success') {
                showMessage(result.message, 'success');
                // Muat ulang data untuk menampilkan perubahan
                initializeProfilePage(); 
                showToast('Profil berhasil diperbarui!', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showMessage(`Gagal memperbarui profil: ${error.message}`, 'error');
            showToast('Gagal memperbarui profil!', 'error');
        }
    });
    /**
     * Menangani submit form untuk info profil (termasuk upload foto).
     */
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Menggunakan FormData karena kita mengirim file
        const formData = new FormData();
        formData.append('fullName', document.getElementById('fullName').value);
        formData.append('position', document.getElementById('position').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('age', document.getElementById('age').value);
        formData.append('gender', document.getElementById('gender').value);
        
        const photoInput = document.getElementById('profile_photo');
        if (photoInput.files[0]) {
            formData.append('profile_photo', photoInput.files[0]);
        }
        
        try {
            const response = await fetch('api.php?action=update_user_profile', {
                method: 'POST',
                body: formData // Kirim sebagai FormData, bukan JSON
            });

            const result = await response.json();

            if (result.status === 'success') {
                showMessage(result.message, 'success');
                loadUserProfile(); // Muat ulang data profil untuk menampilkan perubahan
                profileForm.reset(); // Kosongkan input file
                showToast('Profil berhasil diperbarui!', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showMessage(`Gagal memperbarui profil: ${error.message}`, 'error');
            showToast('Gagal memperbarui profil!', 'error');
        }
    });


    /**
     * Menangani submit form untuk ubah password.
     */
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showMessage('Kata sandi baru dan konfirmasi tidak cocok.', 'error');
            return;
        }

        const data = { currentPassword, newPassword, confirmPassword };

        try {
            const response = await fetch('api.php?action=change_password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.status === 'success') {
                showMessage(result.message, 'success');
                changePasswordForm.reset();
                showToast('Kata sandi berhasil diubah!', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showMessage(error.message, 'error');
            showToast('Gagal mengubah kata sandi!', 'error');
        }
    });

    /**
     * Helper untuk menampilkan pesan.
     */
    const showMessage = (message, type = 'success') => {
        messageDiv.textContent = message;
        messageDiv.className = `p-4 mb-6 text-sm rounded-lg ${type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
        messageDiv.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    };
    initializeProfilePage();
    // Panggil fungsi untuk memuat data saat halaman dibuka
    loadUserProfile();

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
});