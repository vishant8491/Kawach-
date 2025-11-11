import express from 'express'
import colors from 'colors'
import dotenv from 'dotenv'
dotenv.config()
import morgan from 'morgan'
import cors from 'cors'
import connectDb from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import fileRoutes from './routes/fileRoutes.js'
import printRoutes from './routes/printRoutes.js'
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log environment variables (without sensitive data)
console.log('Environment Variables Loaded:', {
    PORT: process.env.PORT,
    DEV_MODE: process.env.DEV_MODE,
    MONGO_URL_EXISTS: !!process.env.MONGO_URL
});

// Rest object
const app = express();

//middlewares - IMPORTANT: Order matters!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
      origin: (origin, callback) => {
          callback(null, true); // Allow all origins
      },
      credentials: true,
  })
);

app.use(morgan('dev'));

// configure env
//() es config mei es brackets mei path dena hota   hai hamare case mei root par hai thats why we are not giving path

//database config 
connectDb();

//API routes - MUST come BEFORE static files
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/file", fileRoutes); // routes for file operations (upload, fetch, and QR generation)
app.use('/api/v1/print', printRoutes);

//rest api
app.get("/api", (req, res) => {
  res.send({
    message: "Welcome to Kawach API"
  })
});

// Static files - comes AFTER API routes
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle client-side routing - LAST
app.get('*', (req, res) => {
  // Send the index.html for all non-API routes
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`.bgCyan.white);
});