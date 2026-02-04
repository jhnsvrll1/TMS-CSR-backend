
TRUNCATE TABLE assessment_options RESTART IDENTITY CASCADE;
TRUNCATE TABLE assessment_questions RESTART IDENTITY CASCADE;
TRUNCATE TABLE assessment_sections RESTART IDENTITY CASCADE;


INSERT INTO assessment_sections (id, title, description) VALUES 
(1, 'Stratejik', 'Analisis terkait strategi, visi, dan manajemen pengelola.');


INSERT INTO assessment_questions (id, section_id, sub_section, question_text) VALUES 
(1, 1, 'Kapasitas Founder dan Top Management', 'Sudah berapa lama pengelola menjalankan usaha ini atau usaha sejenis?'),
(2, 1, 'Kapasitas Founder dan Top Management', 'Apakah pengelola pernah ikut pelatihan usaha (UMKM, keuangan, pemasaran, dll)?'),
(3, 1, 'Kapasitas Founder dan Top Management', 'Siapa yang biasanya mengambil keputusan penting usaha (harga, produk, investasi)?'),
(4, 1, 'Kapasitas Founder dan Top Management', 'Apakah tugas harian (produksi, jualan, keuangan) sudah dibagi jelas?'),
(5, 1, 'Kapasitas Founder dan Top Management', 'Apakah pengelola aktif mencari relasi (pelanggan, supplier, komunitas)?');


INSERT INTO assessment_questions (id, section_id, sub_section, question_text) VALUES 
(6, 1, 'Visi, Misi, dan Value Perusahaan', 'Apakah pengelola punya gambaran jelas usaha ini mau dibawa ke mana?');


INSERT INTO assessment_options (question_id, option_text, score_value) VALUES 
(1, '> 5 tahun', 4),
(1, '3-5 tahun', 3),
(1, '1-3 tahun', 2),
(1, '< 1 tahun', 1);


INSERT INTO assessment_options (question_id, option_text, score_value) VALUES 
(2, 'Sering & relevan', 4),
(2, 'Pernah beberapa kali', 3),
(2, 'Pernah 1 kali', 2),
(2, 'Belum pernah', 1);


INSERT INTO assessment_options (question_id, option_text, score_value) VALUES 
(3, 'Pengelola utama, terencana', 4),
(3, 'Pengelola utama, spontan', 3),
(3, 'Campur aduk', 2),
(3, 'Tidak jelas', 1);


INSERT INTO assessment_options (question_id, option_text, score_value) VALUES 
(4, 'Jelas & berjalan', 4),
(4, 'Cukup jelas', 3),
(4, 'Sering tumpang tindih', 2),
(4, 'Semua dikerjakan sendiri', 1);


INSERT INTO assessment_options (question_id, option_text, score_value) VALUES 
(5, 'Sangat aktif', 4),
(5, 'Cukup aktif', 3),
(5, 'Jarang', 2),
(5, 'Tidak pernah', 1);


INSERT INTO assessment_options (question_id, option_text, score_value) VALUES 
(6, 'Sangat jelas (ada dokumen tertulis)', 4),
(6, 'Cukup jelas (diingat kepala)', 3),
(6, 'Masih samar', 2),
(6, 'Tidak ada/Bingung', 1);

SELECT setval('assessment_sections_id_seq', (SELECT MAX(id) FROM assessment_sections));
SELECT setval('assessment_questions_id_seq', (SELECT MAX(id) FROM assessment_questions));
SELECT setval('assessment_options_id_seq', (SELECT MAX(id) FROM assessment_options));