require('dotenv').config();
const { Pool } = require('pg');

console.log ('target db : ', process.env.DB_NAME)


const pool = new Pool ({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});


const DATA_STRUCTURE = [
    {
        section: "Strategic Assessment",
        subs: [
            "Kapasitas Founder dan Top Management",
            "Visi, Misi, dan Value Perusahaan",
            "Kekuatan Ide dan Daya Saing Produk",
            "Potensi Pasar",
            "Implementasi Business Plan"
        ]
    },
    {
        section: "Financial Health",
        subs: [
            "Revenue Generation",
            "Profitabilitas",
            "Likuiditas",
            "Leverage",
            "Modal Kerja"
        ]
    },
    {
        section: "Accounting & Tax",
        subs: [
            "Kapabilitas Tim Akuntansi",
            "Struktur dan Pedoman Akuntansi",
            "Desain SOP Akuntansi",
            "Implementasi SOP Akuntansi",
            "Integrasi Laporan dan IT",
            "Pelaporan dan Perencanaan Pajak"
        ]
    },
    {
        section: "Finance Business Project",
        subs: [
            "Kapabilitas dan Struktur Tim Finance",
            "Pengelolaan Arus Kas dan Modal Kerja",
            "Penganggaran dan Forecasting",
            "Analisis Keuangan dan Profitabilitas",
            "Pengambilan Keputusan Keuangan dan Investasi",
            "Integrasi Fungsi Keuangan dengan Fungsi Lain"
        ]
    },
    {
        section: "Marketing Business Process",
        subs: [
            "Kapabilitas dan Struktur Tim Marketing",
            "Marketing Strategy dan Marketing Plan",
            "SOP Marketing",
            "Implementasi Marketing Strategy dan Marketing Plan",
            "Implementasi SOP Marketing",
            "Integrasi Marketing dengan Digital & Teknologi"
        ]
    },
    {
        section: "Sales Business Process",
        subs: [
            "Kapabilitas dan Struktur Tim Sales",
            "Strategi dan Target Penjualan",
            "SOP dan Sistem Penjualan",
            "Implementasi SOP Penjualan",
            "Monitoring dan Evaluasi Penjualan",
            "Integrasi dengan Digital dan CRM"
        ]
    },
    {
        section: "Operation Business Process",
        subs: [
            "Kapabilitas dan Struktur Tim Operasional",
            "Desain Proses & SOP Operasional",
            "Implementasi SOP Operasional",
            "Efisiensi dan Produktivitas",
            "Kontrol Kualitas dan Perbaikan Berkelanjutan",
            "Integrasi Operasional dengan Teknologi & Sistem Informasi"
        ]
    },
    {
        section: "Human Resources",
        subs: [
            "Kapabilitas dan Struktur Tim SDM",
            "Sistem Rekrutmen dan Penempatan",
            "SOP dan Tata Kelola SDM",
            "Pengembangan SDM dan Retensi",
            "Evaluasi Kinerja dan Budaya Kerja",
            "Sistem Penggajian, Benefit, dan Administrasi",
            "Integrasi SDM dengan Digital & Teknologi"
        ]
    }
];

const seedData = async () => {
 const client = await pool.connect();
 try{
    console.log('Seeding Questions!');
    await client.query('BEGIN');

    console.log('truncate old db');
    await client.query('TRUNCATE TABLE assessment_options, assessment_questions, assessment_sections RESTART IDENTITY CASCADE');

    let totalQuestionCreated = 0;
    let globalSubIndex = 0;

    const totalSubs = DATA_STRUCTURE.reduce((acc, curr) => acc + curr.subs.length, 0);

    const remainder = 244 % totalSubs;
    const baseCount = Math.floor(244/totalSubs);


    for (const group of DATA_STRUCTURE) {

        const resSec = await client.query(
            `INSERT INTO assessment_sections (title, description)
            VALUES ($1, $2) RETURNING id`,
            [group.section, `Aspek Penilaian untuk ${group.section}`]
        );

        const sectionID = resSec.rows[0].id;
        console.log(`Processing Section : ${group.section}`);

        for (const subName of group.subs) {

            const questionCount = (globalSubIndex < remainder) ? (baseCount + 1) : baseCount;

            for (let i = 1; i<= questionCount; i++){
                const questionText = `[${subName} Bagaimana evaluasi indikator kinerja poin ke-${i} pada aspek ini?]`;

                const resQ = await client.query(
                    `INSERT INTO assessment_questions (section_id, sub_section, question_text)
                    VALUES ($1, $2, $3) RETURNING id`,
                    [sectionID, subName, questionText]
                );

                const qID = resQ.rows[0].id;

                const options = [
                    { text: "Sangat Baik / Terlaksana Sepenuhnya", score: 4 },
                    { text: "Baik / Sebagian Besar Terlaksana", score: 3 },
                    { text: "Cukup / Masih Ada Kekurangan", score: 2 },
                    { text: "Kurang / Belum Dilakukan", score: 1 }
                ];


                for (const opt of options) {
                    await client.query(
                        `INSERT INTO assessment_options (question_id, option_text, score_value)
                        VALUES ($1, $2, $3)`,
                        [qID, opt.text, opt.score]
                    );
                }
                totalQuestionCreated++;
            }

            globalSubIndex++;
        }
    }

    await client.query('COMMIT');
    console.log (`Succeed in making ${totalQuestionCreated} pertanyaan.`);
 }catch (err){
    await client.query('ROLLBACK');
    console.error('error', err);
 }finally {
    client.release();
    pool.end();
 }

};

seedData();