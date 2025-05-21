const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 导入Admin模型
const Admin = require('../models/Admin');

// 默认管理员账户信息
const adminUser = {
  username: 'admin',
  password: '123456',
  name: '系统管理员',
  email: 'admin@example.com',
  role: 'superadmin',
  permissions: ['all'],
  status: 'active'
};

// 连接MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dogrun', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('MongoDB connected');

    try {
      // 检查管理员是否已存在
      const existingAdmin = await Admin.findOne({ username: adminUser.username });
      
      if (existingAdmin) {
        console.log('管理员账户已存在，无需创建');
        mongoose.connection.close();
        process.exit(0);
      }

      // 创建新管理员账户
      const admin = new Admin(adminUser);
      await admin.save();

      console.log('管理员账户创建成功：');
      console.log(`账号: ${adminUser.username}`);
      console.log(`密码: ${adminUser.password}`);
      
      mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error('创建管理员账户失败:', error);
      mongoose.connection.close();
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB连接失败', err);
    process.exit(1);
  }); 