const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请提供用户名'],
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: [true, '请提供密码'],
    minlength: 6,
    select: false
  },
  name: {
    type: String,
    required: [true, '请提供姓名'],
    trim: true
  },
  email: {
    type: String,
    required: [true, '请提供邮箱'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      '请提供有效的邮箱地址'
    ]
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer', 'superadmin'],
    default: 'editor'
  },
  permissions: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'locked'],
    default: 'active'
  },
  avatar: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
AdminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 加密密码中间件
AdminSchema.pre('save', async function(next) {
  // 只有在密码被修改时才重新哈希
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // 生成盐
    const salt = await bcrypt.genSalt(10);
    // 哈希密码
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 比较密码方法
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// 生成JWT令牌方法
AdminSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, username: this.username, role: this.role },
    process.env.JWT_SECRET_ADMIN || 'admin-secret-key',
    { expiresIn: process.env.JWT_EXPIRE_ADMIN || '24h' }
  );
};

// 管理员是否被锁定
AdminSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// 增加登录尝试失败次数
AdminSchema.methods.incrementLoginAttempts = async function() {
  // 如果之前被锁定但锁定期已过，重置尝试次数
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
    await this.save();
    return;
  }
  
  // 增加尝试次数
  this.loginAttempts += 1;
  
  // 检查是否需要锁定账户
  if (this.loginAttempts >= 5) {
    // 锁定1小时
    this.lockUntil = Date.now() + 60 * 60 * 1000;
  }
  
  await this.save();
};

// 重置登录尝试次数
AdminSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.lastLogin = Date.now();
  await this.save();
};

module.exports = mongoose.model('Admin', AdminSchema); 