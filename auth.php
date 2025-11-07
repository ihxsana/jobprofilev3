<?php
// Memulai sesi di paling atas
session_start();

// --- PENANGANAN ERROR YANG LEBIH BAIK ---
// Periksa apakah file konfigurasi ada sebelum memanggilnya
if (!file_exists('config.php')) {
    http_response_code(500);
    // Kirim pesan error dalam format JSON, BUKAN HTML
    header("Content-Type: application/json"); // Pastikan header JSON dikirim
    echo json_encode(['status' => 'error', 'message' => 'Kesalahan Server Kritis: File config.php tidak ditemukan.']);
    exit();
}

// Memasukkan file konfigurasi dan koneksi database
require 'config.php';

// Mengambil aksi dari request
$action = $_REQUEST['action'] ?? '';

// Memilih fungsi berdasarkan aksi
switch ($action) {
    case 'login':
        login($conn);
        break;
    case 'logout':
        logout();
        break;
    case 'status':
        check_status($conn); // << Perubahan: Mengirim koneksi ke fungsi status
        break;
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Aksi autentikasi tidak valid.']);
        break;
}

/**
 * Menangani proses login pengguna.
 */
function login($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Username dan password tidak boleh kosong.']);
        return;
    }

    // Mengambil data user dari database
    $stmt = $conn->prepare("SELECT id, password, role, full_name FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        // Verifikasi password yang di-hash
        if (password_verify($password, $user['password'])) {
            // Jika berhasil, simpan data ke session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $username;
            $_SESSION['role'] = $user['role'];
            $_SESSION['full_name'] = $user['full_name'];
            
            echo json_encode([
                'status' => 'success', 
                'message' => 'Login berhasil!', 
                'role' => $user['role'],
                'fullName' => $user['full_name']
            ]);
        } else {
            // Jika password salah
            http_response_code(401);
            echo json_encode(['status' => 'error', 'message' => 'Username atau password salah.']);
        }
    } else {
        // Jika username tidak ditemukan
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Username atau password salah.']);
    }
    $stmt->close();
}

/**
 * Menghancurkan sesi untuk logout.
 */
function logout() {
    session_unset();
    session_destroy();
    echo json_encode(['status' => 'success', 'message' => 'Logout berhasil.']);
}

/**
 * Memeriksa status login dari sesi.
 * PERUBAHAN: Fungsi ini sekarang mengambil data foto dari DB.
 */
function check_status($conn) {
    if (isset($_SESSION['user_id']) && isset($_SESSION['role'])) {
        // Ambil photo_path dari database
        $stmt = $conn->prepare("SELECT photo_path FROM users WHERE id = ?");
        $stmt->bind_param("i", $_SESSION['user_id']);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $photo_path = $result['photo_path'] ?? null;
        $stmt->close();
        
        echo json_encode([
            'loggedIn' => true,
            'role' => $_SESSION['role'],
            'fullName' => $_SESSION['full_name'] ?? 'N/A',
            'username' => $_SESSION['username'] ?? 'N/A',
            'photo_path' => $photo_path // << Perubahan: Menambahkan photo_path ke response
        ]);
    } else {
        echo json_encode(['loggedIn' => false]);
    }
}

// Menutup koneksi
$conn->close();
?>