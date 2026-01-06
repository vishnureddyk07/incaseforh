import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

// Only load .env locally
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch (e) {
    console.log('dotenv not available');
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vishnureddyau07_db_user:59uPRJVWJ978fRUp@cluster0.tahxcai.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'vishnureddy__7';
    const adminPassword = 'Idontknow#7';

    // Check if admin already exists
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log('⚠️  Admin already exists:', adminEmail);
      process.exit(0);
    }

    // Create admin
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await User.create({
      email: adminEmail,
      passwordHash,
      role: 'admin',
    });

    console.log('✅ Admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   ID:', admin._id);
    console.log('\n🔐 Login credentials:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', adminPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
