/**
 * 创建初始管理员账户的脚本
 * 使用方法: node tools/createAdmin.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

// 加载环境变量
dotenv.config();

// 导入管理员模型 (确保路径正确)
const Admin = require('../src/models/Admin');

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 连接到MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dogrun', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('已连接到MongoDB');
    createAdmin();
  })
  .catch((err) => {
    console.error('连接MongoDB失败:', err);
    process.exit(1);
  });

// 创建管理员函数
async function createAdmin() {
  try {
    // 检查是否已存在超级管理员
    const existingAdmin = await Admin.findOne({ role: 'superadmin' });
    
    if (existingAdmin) {
      console.log('超级管理员已存在:');
      console.log(`用户名: ${existingAdmin.username}`);
      console.log(`姓名: ${existingAdmin.name}`);
      console.log(`邮箱: ${existingAdmin.email}`);
      
      rl.question('是否要创建新的管理员账户? (y/n) ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await promptAdminDetails();
        } else {
          console.log('操作已取消');
          mongoose.disconnect();
          rl.close();
        }
      });
    } else {
      console.log('未找到超级管理员账户，请创建:');
      await promptAdminDetails(true);
    }
  } catch (error) {
    console.error('检查管理员失败:', error);
    mongoose.disconnect();
    rl.close();
  }
}

// 提示输入管理员信息
async function promptAdminDetails(isSuperAdmin = false) {
  const adminData = {};
  
  try {
    adminData.username = await promptInput('用户名 (至少3个字符): ');
    adminData.password = await promptInput('密码 (至少6个字符): ');
    adminData.name = await promptInput('姓名: ');
    adminData.email = await promptInput('邮箱: ');
    adminData.phone = await promptInput('手机号 (可选): ');
    
    if (!isSuperAdmin) {
      // 如果不是超级管理员，则提示选择角色
      const role = await promptInput('角色 (admin/editor/viewer): ');
      adminData.role = ['admin', 'editor', 'viewer'].includes(role) ? role : 'editor';
    } else {
      adminData.role = 'superadmin';
    }
    
    // 验证输入
    if (adminData.username.length < 3) {
      console.error('用户名长度不能少于3个字符');
      return promptAdminDetails(isSuperAdmin);
    }
    
    if (adminData.password.length < 6) {
      console.error('密码长度不能少于6个字符');
      return promptAdminDetails(isSuperAdmin);
    }
    
    if (!validateEmail(adminData.email)) {
      console.error('请输入有效的邮箱地址');
      return promptAdminDetails(isSuperAdmin);
    }
    
    // 创建管理员
    await saveAdmin(adminData);
  } catch (error) {
    console.error('输入处理错误:', error);
    mongoose.disconnect();
    rl.close();
  }
}

// 保存管理员到数据库
async function saveAdmin(adminData) {
  try {
    // 检查用户名是否已存在
    const existingUsername = await Admin.findOne({ username: adminData.username });
    if (existingUsername) {
      console.error('用户名已存在，请选择其他用户名');
      return promptAdminDetails(adminData.role === 'superadmin');
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await Admin.findOne({ email: adminData.email });
    if (existingEmail) {
      console.error('邮箱已存在，请使用其他邮箱');
      return promptAdminDetails(adminData.role === 'superadmin');
    }
    
    // 设置权限
    let permissions = [];
    
    if (adminData.role === 'superadmin' || adminData.role === 'admin') {
      permissions = [
        'user:view', 'user:edit', 'user:delete',
        'post:view', 'post:edit', 'post:delete',
        'marker:view', 'marker:edit', 'marker:delete',
        'merchant:view', 'merchant:edit', 'merchant:delete',
        'icon:view', 'icon:edit', 'icon:delete',
        'system:view', 'system:edit'
      ];
    } else if (adminData.role === 'editor') {
      permissions = [
        'user:view',
        'post:view', 'post:edit',
        'marker:view', 'marker:edit',
        'merchant:view', 'merchant:edit',
        'icon:view', 'icon:edit',
        'system:view'
      ];
    } else {
      permissions = [
        'user:view',
        'post:view',
        'marker:view',
        'merchant:view',
        'icon:view',
        'system:view'
      ];
    }
    
    // 创建新管理员
    const admin = new Admin({
      username: adminData.username,
      password: adminData.password,
      name: adminData.name,
      email: adminData.email,
      phone: adminData.phone || '',
      role: adminData.role,
      permissions: permissions,
      status: 'active'
    });
    
    // 保存到数据库
    await admin.save();
    
    console.log('\n管理员账户创建成功!');
    console.log('---------------------------');
    console.log(`用户名: ${admin.username}`);
    console.log(`姓名: ${admin.name}`);
    console.log(`邮箱: ${admin.email}`);
    console.log(`角色: ${admin.role}`);
    console.log('---------------------------');
    console.log('请记住这些信息，并妥善保管!');
    
    // 断开连接
    mongoose.disconnect();
    rl.close();
  } catch (error) {
    console.error('创建管理员失败:', error);
    mongoose.disconnect();
    rl.close();
  }
}

// 辅助函数：提示输入
function promptInput(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 验证邮箱格式
function validateEmail(email) {
  const re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
}

// 处理退出程序
process.on('SIGINT', () => {
  console.log('\n操作已取消');
  mongoose.disconnect();
  rl.close();
  process.exit(0);
}); 