// Rakhi@123
// mongodb+srv://rakhitripathi2005_db_user:Rakhi@123@cluster0.rjuq0he.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
// Rakhi123
// mongodb+srv://rakhitripathi2005_db_user:Rakhi123@cluster0.ivdyscn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0


import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb+srv://rakhitripathi2005_db_user:Rakhi@123@cluster0.rjuq0he.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  try {
    await mongoose.connect(mongoUri, {
      dbName: 'seunits',
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;


