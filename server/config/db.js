import mongoose from "mongoose";
import colors from 'colors'

const connectDb = async () => {
  try {
      console.log('MongoDB Connection String:', process.env.MONGO_URL); // Log the connection string
      
      // Add connection options to handle timeouts and connection issues
      const conn = await mongoose.connect(process.env.MONGO_URL, {
        serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
        socketTimeoutMS: 45000, // Socket timeout
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2, // Minimum number of connections to maintain
        maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
        retryWrites: true, // Retry write operations on failure
        retryReads: true, // Retry read operations on failure
      });
      
      console.log(`Connected to database ${conn.connection.host}`.bgMagenta.white);
      
      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected! Attempting to reconnect...'.yellow);
      });

      mongoose.connection.on('error', (err) => {
        console.log(`MongoDB connection error: ${err}`.bgRed.white);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected!'.bgGreen.white);
      });

  } catch (err) {
      console.log(`Error in mongoDb ${err}`.bgRed.white);
      console.log('⚠️  Please check:'.yellow);
      console.log('1. Your internet connection');
      console.log('2. MongoDB Atlas IP whitelist settings');
      console.log('3. MongoDB Atlas cluster is running');
      console.log('4. Firewall settings');
      
      // Exit process with failure
      process.exit(1);
  }
};

export default connectDb