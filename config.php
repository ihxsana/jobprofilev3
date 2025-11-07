<?php
// --- PENGATURAN KONEKSI DATABASE ---
$db_host = 'localhost';
$db_user = 'root'; 
$db_pass = '';     
$db_name = 'perusahaan_db';

// --- BUAT KONEKSI ---
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// --- CEK KONEKSI ---
if ($conn->connect_error) {
    // Hentikan eksekusi dan kirim response error jika koneksi gagal
    http_response_code(500);
    // Tampilkan pesan error dalam format JSON yang benar
    echo json_encode(['status' => 'error', 'message' => 'Koneksi database gagal: ' . $conn->connect_error]);
    exit(); // Penting untuk menghentikan script
}

// Mengatur header umum di satu tempat
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // Sesuaikan jika perlu untuk keamanan produksi
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true"); // Penting untuk session

// Menangani preflight request dari CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit();
}
?>