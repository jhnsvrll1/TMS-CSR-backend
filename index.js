require('dotenv').config();
const express = require('express');
const businessRoutes = require('./src/routes/business-routes');
const assesmentRoutes = require('./src/routes/assessment-routes');
const cors = require('cors');
const pool = require ('./src/config/db');


const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/business', businessRoutes);
app.use('/api/assessment', assesmentRoutes);
app.get('/', (req, res)=>{
    res.send('server backend jalan')
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// 
