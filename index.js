const express = require('express');
const businessRoutes = require('./src/routes/business-routes');
const cors = require('cors');
const pool = require ('./src/config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

app.use('/api/business', businessRoutes);

app.get('/', (req, res)=>{
    res.send('server backend jalan')
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

