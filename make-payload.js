require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
});

const generatePayLoad = async () => {
    const client = await pool.connect();

    try {
        const questions = await client.query('SELECT id FROM assessment_questions ORDER BY id ASC');

        const answerPayLoad = [];
        let expectedFinalScore = 0;

        console.log(`Check Answer For ${questions.rows.length} Question..`);
        for (const q of questions.rows) {
            
            const options = await client.query('SELECT id, score_value FROM assessment_options WHERE question_id = $1', [q.id]);

            if (options.rows.length > 0) {
                const randomIndex = Math.floor(Math.random() * options.rows.length);
                const selectedOption = options.rows[randomIndex];

                answerPayLoad.push({
                    question_id: q.id,
                    selected_option_id: selectedOption.id 
                });

                expectedFinalScore += selectedOption.score_value;
            }
        }

        const finalPayLoad = {
            business_profile_id: 4,
            answers: answerPayLoad
        };

        console.log('\n=========================');
        console.log('COPY EN!');
        console.log('=========================');
        console.log(JSON.stringify(finalPayLoad));

        console.log('\n=========================');
        console.log(`EXPECTED SCORE : ${expectedFinalScore}`);
        console.log('COCOKIN OM!');
        console.log('=========================');

    } catch (err) {
        console.error('❌ ERRRORRRRRR', err);
    } finally {
        client.release();
        pool.end();
    }
};

generatePayLoad();