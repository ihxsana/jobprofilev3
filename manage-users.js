document.addEventListener('DOMContentLoaded', () => {
    // State aplikasi
    let users = [];
    let currentUser = {}; // Akan diisi dengan data user yang login (termasuk role)
    let editingUserId = null; // null: mode tambah, (number): mode edit

    // Elemen DOM
    const userListBody = document.getElementById('user-list');
    const userForm = document.getElementById('userForm');
    const globalMessage = document.getElementById('global-message');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const passwordInput = document.getElementById('password');
    const roleSelect = document.getElementById('role');
    const roleContainer = roleSelect.parentElement;

    /**
     * Helper untuk menampilkan pesan global.
     * Fungsi ini dibuat lebih dulu agar bisa diakses oleh semua fungsi lain.
     * @param {string} message - Pesan yang akan ditampilkan.
     * @param {'success'|'error'} type - Jenis pesan (untuk warna).
     */
    const showMessage = (message, type = 'success') => {
        if (!globalMessage) return; // Pengaman jika elemen tidak ditemukan

        globalMessage.textContent = message;
        // Atur kelas warna berdasarkan tipe pesan
        globalMessage.className = `p-4 mb-4 text-sm rounded-lg ${
            type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`;
        globalMessage.classList.remove('hidden');

        // Sembunyikan pesan setelah 5 detik
        setTimeout(() => {
            globalMessage.classList.add('hidden');
        }, 5000);
    };

    /**
     * Memeriksa akses. Admin dan Superadmin boleh masuk.
     */
    const checkAccess = async () => {
        if (sessionStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html';
            return;
        }
        try {
            const response = await fetch('auth.php?action=status');
            const result = await response.json();
            if (result.loggedIn && (result.role === 'superadmin' || result.role === 'admin')) {
                currentUser = result; // Simpan data user yang login
                setupUIForRole();
                fetchUsers();
            } else {
                alert('Akses ditolak. Halaman ini hanya untuk Administrator.');
                window.location.href = 'index.html';
            }
        } catch (error) {
            window.location.href = 'login.html';
        }
    };
    
    /**
     * Menyesuaikan form berdasarkan role (admin hanya bisa menambah pegawai).
     */
    const setupUIForRole = () => {
        if (currentUser.role === 'admin') {
            roleContainer.style.display = 'none';
            roleSelect.value = 'pegawai';
        }
    };

    /**
     * Mengambil daftar pengguna dari API.
     */
    const fetchUsers = async () => {
        try {
            const response = await fetch('api.php?action=get_all_users');
            const result = await response.json();
            if(result.status === 'success'){
                users = result.data;
                renderUserList();
                showToast('Data pengguna berhasil dimuat!', 'success');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            userListBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500 flex flex-col items-center"><i class='fa-solid fa-circle-exclamation text-3xl mb-2'></i>Gagal memuat data: ${error.message}</td></tr>`;
            showToast('Gagal memuat data pengguna!', 'error');
        }
    };

    /**
     * Menampilkan daftar pengguna ke dalam tabel.
     */
    const renderUserList = () => {
        userListBody.innerHTML = '';
        if(users.length === 0){
            userListBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500 flex flex-col items-center"><i class='fa-solid fa-user-slash text-3xl text-slate-300 mb-2'></i>Belum ada pengguna.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            let actionButtons = '';

            if (currentUser.role === 'superadmin') {
                actionButtons = `
                    <button data-id="${user.id}" class="text-indigo-600 hover:text-indigo-900 mr-3 edit-btn">Edit</button>
                    <button data-id="${user.id}" class="text-red-600 hover:text-red-900 delete-btn">Hapus</button>
                `;
            } else if (currentUser.role === 'admin' && user.role === 'pegawai') {
                actionButtons = `
                    <button data-id="${user.id}" class="text-indigo-600 hover:text-indigo-900 mr-3 edit-btn">Edit</button>
                    <button data-id="${user.id}" class="text-red-600 hover:text-red-900 delete-btn">Hapus</button>
                `;
            }

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-slate-900">${user.full_name}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-slate-500">${user.username}</div></td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'superadmin' ? 'bg-red-100 text-red-800' : user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">${user.role}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${actionButtons}</td>
            `;
            
            if (tr.querySelector('.edit-btn')) {
                tr.querySelector('.edit-btn').addEventListener('click', () => startEditMode(user));
            }
            if (tr.querySelector('.delete-btn')) {
                const deleteBtn = tr.querySelector('.delete-btn');
                if (user.id === currentUser.id) {
                    deleteBtn.disabled = true;
                    deleteBtn.classList.add('text-slate-400', 'cursor-not-allowed');
                } else {
                    deleteBtn.addEventListener('click', () => showDeleteModal(user));
                }
            }
            userListBody.appendChild(tr);
        });
    };

    /**
     * Mengaktifkan mode edit dan mengisi form.
     */
    const startEditMode = (user) => {
        editingUserId = user.id;
        formTitle.textContent = 'Edit Pengguna';
        submitBtn.innerHTML = `<i class="fa-solid fa-save mr-2"></i> Simpan Perubahan`;
        
        document.getElementById('userId').value = user.id;
        document.getElementById('fullName').value = user.full_name;
        document.getElementById('username').value = user.username;
        
        if (currentUser.role === 'superadmin') {
            roleSelect.value = user.role;
        }
        
        passwordInput.value = '';
        passwordInput.required = false;
        
        cancelEditBtn.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    /**
     * Mereset form kembali ke mode tambah.
     */
    const resetForm = () => {
        editingUserId = null;
        userForm.reset();
        formTitle.textContent = 'Tambah Pengguna Baru';
        submitBtn.innerHTML = `<i class="fa fa-plus mr-2"></i> Tambah Pengguna`;
        passwordInput.required = true;
        cancelEditBtn.classList.add('hidden');
        setupUIForRole();
    };

    cancelEditBtn.addEventListener('click', resetForm);

    /**
     * Menangani submit form untuk menambah atau mengedit pengguna.
     */
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const action = editingUserId ? 'update_user' : 'create_user';
        const userData = {
            id: document.getElementById('userId').value,
            fullName: document.getElementById('fullName').value,
            username: document.getElementById('username').value,
            password: passwordInput.value,
            role: roleSelect.value
        };

        try {
            const response = await fetch(`api.php?action=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const result = await response.json();

            if (result.status === 'success') {
                showMessage(result.message, 'success');
                showToast(editingUserId ? 'Pengguna berhasil diperbarui!' : 'Pengguna berhasil ditambahkan!', 'success');
                resetForm();
                fetchUsers();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showMessage(`Gagal: ${error.message}`, 'error');
            showToast('Gagal menyimpan pengguna!', 'error');
        }
    });

    /**
     * Menampilkan modal konfirmasi sebelum menghapus.
     */
    const showDeleteModal = (user) => {
        const modal = document.getElementById('deleteUserModal');
        const usernameSpan = document.getElementById('deleteUsername');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');

        usernameSpan.textContent = user.username;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const handleConfirmDelete = async () => {
             try {
                const response = await fetch('api.php?action=delete_user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: user.id })
                });
                const result = await response.json();
                if(result.status !== 'success') throw new Error(result.message);

                showMessage('Pengguna berhasil dihapus.', 'success');
                showToast('Pengguna berhasil dihapus!', 'success');
                fetchUsers();
            } catch (error) {
                showMessage(`Gagal menghapus: ${error.message}`, 'error');
                showToast('Gagal menghapus pengguna!', 'error');
            } finally {
                closeModal();
            }
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            confirmBtn.removeEventListener('click', handleConfirmDelete);
        };
        
        confirmBtn.addEventListener('click', handleConfirmDelete, { once: true });
        cancelBtn.addEventListener('click', closeModal, { once: true });
    };

    // Jalankan pengecekan akses saat halaman pertama kali dimuat
    checkAccess();

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
