<?php
// === PENGATURAN ERROR REPORTING (PENTING!) ===
// Baris ini akan mencegah PHP menampilkan 'notice' atau 'warning'
// yang dapat merusak output JSON. Error akan dicatat di log server.
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
// ===============================================

session_start();
require 'config.php';

// Middleware & Global Variables
if (isset($_SESSION['user_id']) || ($_REQUEST['action'] ?? '') === 'get_structure') {
    // Izinkan akses jika sudah login ATAU jika aksinya adalah get_structure
} else {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Akses ditolak. Anda harus login terlebih dahulu.']);
    exit();
}

$action = $_REQUEST['action'] ?? '';
$role = $_SESSION['role'] ?? null;
$user_id = $_SESSION['user_id'] ?? null;
$username = $_SESSION['username'] ?? null;

// Router Aksi
switch ($action) {
    // --- Organizational Structure ---
    case 'get_structure': get_organizational_structure(); break;
    case 'get_employee_directory': get_employee_directory($conn); break; 

    // --- Job Profile & Dashboard Actions ---
    case 'get_all': get_all_profiles($conn); break;
    case 'create': if ($role === 'admin' || $role === 'superadmin') create_profile($conn, $user_id, $username); else forbidden_access(); break;
    case 'update': if ($role === 'admin' || $role === 'superadmin') update_profile($conn, $user_id, $username); else forbidden_access(); break;
    case 'delete': if ($role === 'superadmin') delete_profile($conn, $user_id, $username); else forbidden_access(); break;
    case 'get_dashboard_data': if ($role === 'admin' || $role === 'superadmin') get_dashboard_data($conn); else forbidden_access(); break;

    // --- User Profile Actions ---
    case 'get_user_profile': get_user_profile($conn, $user_id); break;
    case 'update_user_profile': update_user_profile($conn, $user_id); break;
    
    // --- User Management Actions ---
    case 'change_password': change_password($conn, $user_id); break;
    case 'get_all_users': if ($role === 'superadmin' || $role === 'admin') get_all_users($conn, $role); else forbidden_access(); break;
    case 'create_user': if ($role === 'superadmin' || $role === 'admin') create_user($conn, $role, $user_id, $username); else forbidden_access(); break;
    case 'update_user': if ($role === 'superadmin' || $role === 'admin') update_user($conn, $role, $user_id, $username); else forbidden_access(); break;
    case 'delete_user': if ($role === 'superadmin' || $role === 'admin') delete_user($conn, $role, $user_id, $username); else forbidden_access(); break;
        
    default:
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Aksi tidak valid atau tidak ditemukan.']);
        break;
}

// =======================================================
// == FUNGSI UNTUK DIREKTORI PEGAWAI ==
// =======================================================
function get_employee_directory($conn) {
    $directory = [];
    $sql = "SELECT full_name, photo_path, position FROM users WHERE position IS NOT NULL AND position != '' ORDER BY position ASC";
    $result = $conn->query($sql);

    while ($user = $result->fetch_assoc()) {
        $position_parts = explode(' - ', $user['position'], 2);
        
        if (count($position_parts) === 2) {
            $job_title = trim($position_parts[0]);
            $department = trim($position_parts[1]);

            if (!isset($directory[$department])) {
                $directory[$department] = [];
            }

            $directory[$department][] = [
                'full_name' => $user['full_name'],
                'photo_path' => $user['photo_path'],
                'job_title' => $job_title
            ];
        }
    }
    
    ksort($directory);

    echo json_encode(['status' => 'success', 'data' => $directory]);
    exit();
}

// =======================================================
// == FUNGSI BARU UNTUK STRUKTUR ORGANISASI ==
// =======================================================
function get_organizational_structure() {
    $structure = [
        "Board of Directors" => [ "CEO", "CTO", "CIO", "COO", "CRO"  ],
        "Departemen Sumber Daya Manusia (HR)" => [ "Manajer HR", "Spesialis Rekrutmen", "Staf Pelatihan dan Pengembangan", "Admin Personalia" ],
        "Departemen Keuangan dan Akuntansi" => [ "Manajer Keuangan", "Akuntan Senior", "Staf Pajak", "Staf Akuntansi" ],
        "Departemen Operasional / Produksi" => [ "Manajer Operasional", "Supervisor Produksi", "Analis Quality Control", "Staf Gudang dan Logistik" ],
        "Departemen Pemasaran (Marketing)" => [ "Manajer Pemasaran", "Spesialis Digital Marketing", "Content Creator", "Staf Humas (PR)" ],
        "Departemen Penjualan (Sales)" => [ "Manajer Penjualan", "Account Executive", "Sales Representative", "Admin Penjualan" ],
        "Departemen Teknologi Informasi (IT)" => [ "Manajer IT", "System Administrator", "Spesialis Keamanan Siber", "Programmer", "Helpdesk IT Support" ],
        "Departemen Riset dan Pengembangan (R&D)" => [ "Kepala R&D", "Insinyur Produk", "Peneliti", "Analis Data" ],
        "Departemen Hukum dan Kepatuhan (Legal)" => [ "Manajer Legal", "Staf Hukum Korporat", "Analis Kepatuhan" ],
        "Departemen Umum dan Administrasi" => [ "Manajer Umum", "Staf Administrasi", "Resepsionis", "Office Boy/Girl" ],
        "Departemen Layanan Pelanggan (Customer Service)" => [ "Manajer Layanan Pelanggan", "Supervisor Customer Service", "Staf Customer Service" ]
    ];
    echo json_encode(['status' => 'success', 'data' => $structure]);
    exit();
}
// =======================================================
// == FUNGSI UNTUK PROFIL PENGGUNA ==
// =======================================================
function get_user_profile($conn, $user_id) {
    if (!$user_id) { forbidden_access(); exit(); }
    $stmt = $conn->prepare("SELECT id, username, full_name, role, photo_path, age, gender, position, email, phone FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    if ($user) {
        echo json_encode(['status' => 'success', 'data' => $user]);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Pengguna tidak ditemukan.']);
    }
    exit();
}
function update_user_profile($conn, $user_id) {
    if (!$user_id) { forbidden_access(); exit(); }
    $fullName = $_POST['fullName'] ?? null;
    $position = $_POST['position'] ?? null;
    $age = !empty($_POST['age']) ? (int)$_POST['age'] : null;
    $gender = $_POST['gender'] ?? null;
    $email = $_POST['email'] ?? null;
    $phone = $_POST['phone'] ?? null;
    $photoPath = null;
    if (isset($_FILES['profile_photo']) && $_FILES['profile_photo']['error'] == 0) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) { mkdir($uploadDir, 0775, true); }
        $fileExtension = pathinfo($_FILES['profile_photo']['name'], PATHINFO_EXTENSION);
        $fileName = 'user' . $user_id . '-' . uniqid() . '.' . $fileExtension;
        $targetPath = $uploadDir . $fileName;
        if (move_uploaded_file($_FILES['profile_photo']['tmp_name'], $targetPath)) { $photoPath = $targetPath; } 
        else { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan file.']); exit(); }
    }
    $sql = "UPDATE users SET full_name = ?, position = ?, age = ?, gender = ?, email = ?, phone = ?";
    $types = "ssisss"; $params = [$fullName, $position, $age, $gender, $email, $phone];
    if ($photoPath) {
        $stmt_get_old_photo = $conn->prepare("SELECT photo_path FROM users WHERE id = ?");
        $stmt_get_old_photo->bind_param("i", $user_id);
        $stmt_get_old_photo->execute();
        $old_photo_path = $stmt_get_old_photo->get_result()->fetch_assoc()['photo_path'];
        if ($old_photo_path && $old_photo_path !== 'default-avatar.png' && file_exists($old_photo_path)) { unlink($old_photo_path); }
        $sql .= ", photo_path = ?";
        $types .= "s";
        $params[] = $photoPath;
    }
    $sql .= " WHERE id = ?";
    $types .= "i";
    $params[] = $user_id;
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    if ($stmt->execute()) { echo json_encode(['status' => 'success', 'message' => 'Profil berhasil diperbarui.']); } 
    else { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui database: ' . $stmt->error]); }
    exit();
}


// --- FUNGSI HELPER & LAINNYA ---
function forbidden_access() {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Akses ditolak. Anda tidak memiliki hak untuk melakukan aksi ini.']);
}

function get_request_data() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Data JSON tidak valid.']);
        exit();
    }
    return $data;
}

function log_activity($conn, $user_id, $username, $action, $details) {
    $stmt = $conn->prepare("INSERT INTO activity_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $user_id, $username, $action, $details);
    $stmt->execute();
}

function save_version($conn, $profile_id, $user_id, $username, $note = "Perubahan pada profil") {
    $stmt_get = $conn->prepare("SELECT * FROM job_profiles WHERE id = ?");
    $stmt_get->bind_param("i", $profile_id);
    $stmt_get->execute();
    $result = $stmt_get->get_result();
    $current_data = $result->fetch_assoc();
    if($current_data) {
        $version_data_json = json_encode($current_data);
        $stmt_save = $conn->prepare("INSERT INTO job_profile_versions (profile_id, version_data, changed_by_id, changed_by_username, change_note) VALUES (?, ?, ?, ?, ?)");
        $stmt_save->bind_param("isiss", $profile_id, $version_data_json, $user_id, $username, $note);
        $stmt_save->execute();
    }
}

// --- FUNGSI JOB PROFILE ---
function get_all_profiles($conn) {
    $result = $conn->query("SELECT * FROM job_profiles ORDER BY job_title ASC");
    $profiles = [];
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $row['responsibilities'] = json_decode($row['responsibilities']) ?? [];
        $row['kpis'] = json_decode($row['kpis']) ?? [];
        $row['hard_skills'] = json_decode($row['hard_skills']) ?? [];
        $row['soft_skills'] = json_decode($row['soft_skills']) ?? [];
        $profiles[] = $row;
    }
    echo json_encode(['status' => 'success', 'data' => $profiles]);
}

function create_profile($conn, $user_id, $username) {
    $data = get_request_data();
    $job_title = $data['jobTitle'] ?? '';
    $stmt = $conn->prepare("INSERT INTO job_profiles (job_title, department, reports_to, summary, education, experience, responsibilities, kpis, hard_skills, soft_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $department = $data['department'] ?? '';
    $reports_to = $data['reportsTo'] ?? '';
    $summary = $data['summary'] ?? '';
    $education = $data['qualifications']['education'] ?? '';
    $experience = $data['qualifications']['experience'] ?? '';
    $responsibilities = json_encode($data['responsibilities'] ?? []);
    $kpis = json_encode($data['kpis'] ?? []);
    $hard_skills = json_encode($data['hardSkills'] ?? []);
    $soft_skills = json_encode($data['softSkills'] ?? []);
    $stmt->bind_param( "ssssssssss", $job_title, $department, $reports_to, $summary, $education, $experience, $responsibilities, $kpis, $hard_skills, $soft_skills);
    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        log_activity($conn, $user_id, $username, "CREATE PROFILE", "Membuat job profile: '$job_title' (ID: $new_id)");
        save_version($conn, $new_id, $user_id, $username, "Versi awal dibuat");
        echo json_encode(['status' => 'success', 'message' => 'Profil berhasil dibuat.', 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Gagal membuat profil: ' . $stmt->error]);
    }
}

function update_profile($conn, $user_id, $username) {
    $data = get_request_data();
    $id = $data['id'] ?? 0;
    $job_title = $data['jobTitle'] ?? '';
    save_version($conn, $id, $user_id, $username, "Pembaruan profil");
    $stmt = $conn->prepare("UPDATE job_profiles SET job_title=?, department=?, reports_to=?, summary=?, education=?, experience=?, responsibilities=?, kpis=?, hard_skills=?, soft_skills=? WHERE id=?");
    $department = $data['department'] ?? '';
    $reports_to = $data['reportsTo'] ?? '';
    $summary = $data['summary'] ?? '';
    $education = $data['qualifications']['education'] ?? '';
    $experience = $data['qualifications']['experience'] ?? '';
    $responsibilities = json_encode($data['responsibilities'] ?? []);
    $kpis = json_encode($data['kpis'] ?? []);
    $hard_skills = json_encode($data['hardSkills'] ?? []);
    $soft_skills = json_encode($data['softSkills'] ?? []);
    $stmt->bind_param("ssssssssssi", $job_title, $department, $reports_to, $summary, $education, $experience, $responsibilities, $kpis, $hard_skills, $soft_skills, $id);
    if ($stmt->execute()) {
        log_activity($conn, $user_id, $username, "UPDATE PROFILE", "Memperbarui job profile: '$job_title' (ID: $id)");
        echo json_encode(['status' => 'success', 'message' => 'Profil berhasil diperbarui.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui profil: ' . $stmt->error]);
    }
}

function delete_profile($conn, $user_id, $username) {
    $data = get_request_data();
    $id = $data['id'] ?? 0;
    $stmt_get = $conn->prepare("SELECT job_title FROM job_profiles WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $profile = $stmt_get->get_result()->fetch_assoc();
    $job_title_deleted = $profile ? $profile['job_title'] : 'Unknown';
    $stmt = $conn->prepare("DELETE FROM job_profiles WHERE id=?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        log_activity($conn, $user_id, $username, "DELETE PROFILE", "Menghapus job profile: '$job_title_deleted' (ID: $id)");
        echo json_encode(['status' => 'success', 'message' => 'Profil berhasil dihapus.']);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus profil: ' . $stmt->error]);
    }
}

function get_dashboard_data($conn) {
    $output = [];
    $dept_query = "SELECT department, COUNT(id) as count FROM job_profiles GROUP BY department ORDER BY count DESC";
    $dept_result = $conn->query($dept_query);
    $output['profiles_per_department'] = $dept_result->fetch_all(MYSQLI_ASSOC);
    $skills_query = "SELECT hard_skills, soft_skills FROM job_profiles";
    $skills_result = $conn->query($skills_query);
    $hard_skills_count = [];
    $soft_skills_count = [];
    while ($row = $skills_result->fetch_assoc()) {
        $hard_skills = json_decode($row['hard_skills'] ?? '[]');
        $soft_skills = json_decode($row['soft_skills'] ?? '[]');
        if (is_array($hard_skills)) foreach ($hard_skills as $skill) if (!empty(trim($skill))) $hard_skills_count[trim($skill)] = ($hard_skills_count[trim($skill)] ?? 0) + 1;
        if (is_array($soft_skills)) foreach ($soft_skills as $skill) if (!empty(trim($skill))) $soft_skills_count[trim($skill)] = ($soft_skills_count[trim($skill)] ?? 0) + 1;
    }
    arsort($hard_skills_count);
    arsort($soft_skills_count);
    $output['top_hard_skills'] = array_slice($hard_skills_count, 0, 10, true);
    $output['top_soft_skills'] = array_slice($soft_skills_count, 0, 10, true);
    echo json_encode(['status' => 'success', 'data' => $output]);
}

function change_password($conn, $user_id) {
    $data = get_request_data();
    if (empty($data['currentPassword']) || empty($data['newPassword']) || empty($data['confirmPassword'])) {
        http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Semua field wajib diisi.']); return;
    }
    if ($data['newPassword'] !== $data['confirmPassword']) {
        http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Kata sandi baru dan konfirmasi tidak cocok.']); return;
    }
    $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    if (!$result || !password_verify($data['currentPassword'], $result['password'])) {
        http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Kata sandi saat ini salah.']); return;
    }
    $new_hashed_password = password_hash($data['newPassword'], PASSWORD_DEFAULT);
    $update_stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update_stmt->bind_param("si", $new_hashed_password, $user_id);
    if ($update_stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Kata sandi berhasil diperbarui.']);
    } else {
        http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui kata sandi.']);
    }
}

// --- FUNGSI MANAJEMEN PENGGUNA ---
function get_all_users($conn, $requester_role) {
    if ($requester_role === 'superadmin') {
        $stmt = $conn->prepare("SELECT id, username, full_name, role FROM users ORDER BY role, full_name");
    } else {
        $stmt = $conn->prepare("SELECT id, username, full_name, role FROM users WHERE role = 'pegawai' OR id = ? ORDER BY role, full_name");
        $stmt->bind_param("i", $_SESSION['user_id']);
    }
    $stmt->execute();
    $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    echo json_encode(['status' => 'success', 'data' => $users]);
}

function create_user($conn, $requester_role, $current_user_id, $current_user_username) {
    $data = get_request_data();
    if (empty($data['username']) || empty($data['password']) || empty($data['fullName'])) {
        http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Nama, Username, dan Password wajib diisi.']); return;
    }
    $role_to_create = $data['role'];

    if ($requester_role === 'admin') {
        $role_to_create = 'pegawai';
    }
    if ($requester_role !== 'superadmin' && ($role_to_create === 'admin' || $role_to_create === 'superadmin')) {
        forbidden_access(); return;
    }
    
    $username_new = $data['username'];
    $fullName_new = $data['fullName'];
    $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $username_new, $hashed_password, $fullName_new, $role_to_create);

    if ($stmt->execute()) {
        log_activity($conn, $current_user_id, $current_user_username, "CREATE USER", "Membuat user: {$username_new}");
        echo json_encode(['status' => 'success', 'message' => 'Pengguna berhasil dibuat.']);
    } else {
        if ($conn->errno == 1062) { http_response_code(409); echo json_encode(['status' => 'error', 'message' => 'Username sudah ada.']); } 
        else { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Gagal membuat pengguna.']); }
    }
}

function update_user($conn, $requester_role, $current_user_id, $current_user_username) {
    $data = get_request_data();
    $id_to_update = $data['id'] ?? 0;

    $stmt_get_role = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt_get_role->bind_param("i", $id_to_update);
    $stmt_get_role->execute();
    $target_user = $stmt_get_role->get_result()->fetch_assoc();
    if (!$target_user) { http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'Pengguna tidak ditemukan.']); return; }
    $target_role = $target_user['role'];

    if ($requester_role === 'admin' && ($target_role === 'admin' || $target_role === 'superadmin')) {
        forbidden_access(); return;
    }
    
    $username_upd = $data['username'];
    $fullName_upd = $data['fullName'];
    $role_upd = $data['role'];
    $password_upd = $data['password'];

    if ($requester_role !== 'superadmin') {
        $role_upd = $target_role;
    }

    if (!empty($password_upd)) {
        $hashed_password = password_hash($password_upd, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE users SET username=?, password=?, full_name=?, role=? WHERE id=?");
        $stmt->bind_param("ssssi", $username_upd, $hashed_password, $fullName_upd, $role_upd, $id_to_update);
    } else {
        $stmt = $conn->prepare("UPDATE users SET username=?, full_name=?, role=? WHERE id=?");
        $stmt->bind_param("sssi", $username_upd, $fullName_upd, $role_upd, $id_to_update);
    }

    if ($stmt->execute()) {
        log_activity($conn, $current_user_id, $current_user_username, "UPDATE USER", "Memperbarui user: {$username_upd}");
        echo json_encode(['status' => 'success', 'message' => 'Pengguna berhasil diperbarui.']);
    } else {
        if ($conn->errno == 1062) { http_response_code(409); echo json_encode(['status' => 'error', 'message' => 'Username sudah digunakan.']); } 
        else { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui pengguna.']); }
    }
}

function delete_user($conn, $requester_role, $current_user_id, $current_user_username) {
    $data = get_request_data();
    $id_to_delete = $data['id'] ?? 0;

    $stmt_get_role = $conn->prepare("SELECT role, username FROM users WHERE id = ?");
    $stmt_get_role->bind_param("i", $id_to_delete);
    $stmt_get_role->execute();
    $target_user = $stmt_get_role->get_result()->fetch_assoc();
    if (!$target_user) { http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'Pengguna tidak ditemukan.']); return; }
    $target_role = $target_user['role'];
    $target_username = $target_user['username'];

    if ($requester_role === 'admin' && ($target_role === 'admin' || $target_role === 'superadmin')) {
        forbidden_access(); return;
    }
    if ($id_to_delete == $_SESSION['user_id']) {
        http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Anda tidak dapat menghapus akun Anda sendiri.']); return;
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id_to_delete);
    if ($stmt->execute()) {
        log_activity($conn, $current_user_id, $current_user_username, "DELETE USER", "Menghapus user: {$target_username}");
        echo json_encode(['status' => 'success', 'message' => 'Pengguna berhasil dihapus.']);
    } else {
        http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus pengguna.']);
    }
}

$conn->close();
?>