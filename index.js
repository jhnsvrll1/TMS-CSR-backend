require('dotenv').config();
const express = require('express');
const path = require('path');
const uploadRoutes = require('./src/routes/upload-routes');
const businessRoutes = require('./src/routes/business-routes');
const assesmentRoutes = require('./src/routes/assessment-routes');
const authRoutes = require('./src/routes/auth-routes');
const cmsRoutes = require('./src/routes/cms-routes');
const masterDataRoutes = require('./src/routes/masterDataRoutes');
const cors = require('cors');
const pool = require ('./src/config/db');


const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/api/admin', authRoutes)
app.use('/api/cms', cmsRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/assessment', assesmentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/master', masterDataRoutes);
app.get('/', (req, res)=>{
    res.send('server backend jalan')
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// 
