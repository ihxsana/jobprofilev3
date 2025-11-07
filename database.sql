-- =======================================================
-- KODE ASLI ANDA (TIDAK PERLU DIUBAH)
-- =======================================================
-- Membuat tabel untuk menyimpan profil jabatan
-- Database: perusahaan_db
-- Tabel: job_profiles

CREATE TABLE `job_profiles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `job_title` VARCHAR(255) NOT NULL,
  `department` VARCHAR(255) NOT NULL,
  `reports_to` VARCHAR(255) DEFAULT NULL,
  `summary` TEXT DEFAULT NULL,
  `education` VARCHAR(255) DEFAULT NULL,
  `experience` VARCHAR(255) DEFAULT NULL,
  `responsibilities` JSON DEFAULT NULL,
  `kpis` JSON DEFAULT NULL,
  `hard_skills` JSON DEFAULT NULL,
  `soft_skills` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1. TABEL PENGGUNA (USERS)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL, -- Akan menyimpan password yang sudah di-hash
  `full_name` VARCHAR(100),
  `role` ENUM('superadmin', 'admin', 'pegawai') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` (`username`, `password`, `full_name`, `role`) VALUES
('superadmin', '$2y$10$Q.l8.B0g0p4C1hpr8hV9/.pW0VCRD/hGy1s/8d2UDEsT/x4cQR2a2', 'Super Admin Utama', 'superadmin'),
('adminhr', '$2y$10$Q.l8.B0g0p4C1hpr8hV9/.pW0VCRD/hGy1s/8d2UDEsT/x4cQR2a2', 'Admin HRD', 'admin'),
('pegawai', '$2y$10$Q.l8.B0g0p4C1hpr8hV9/.pW0VCRD/hGy1s/8d2UDEsT/x4cQR2a2', 'Budi Santoso', 'pegawai');

-- 2. TABEL UNTUK LOG AKTIVITAS (Untuk Super Admin)
CREATE TABLE `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT,
  `username` VARCHAR(50),
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL UNTUK VERSIONING/HISTORY (Untuk Super Admin)
CREATE TABLE `job_profile_versions` (
  `version_id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT NOT NULL,
  `version_data` JSON,
  `changed_by_id` INT,
  `changed_by_username` VARCHAR(50),
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `change_note` VARCHAR(255),
  FOREIGN KEY (profile_id) REFERENCES job_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
