const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请输入用户名'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, '请输入邮箱'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      '请输入有效的邮箱'
    ]
  },
  password: {
    type: String,
    required: [true, '请输入密码'],
    minlength: 6,
    select: false
  },
  nickname: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'unknown'],
    default: 'unknown'
  },
  avatar: {
    type: String,
    default: '/static/images/default-avatar.png'
  },
  bio: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  // 关注与粉丝
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // 地理位置信息
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0], // 经度, 纬度
      index: '2dsphere' // 支持地理空间查询
    }
  },
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  },
  // 用户当前是否在遛狗
  isWalking: {
    type: Boolean,
    default: false
  },
  // 当前遛的宠物ID
  currentPet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  },
  // 隐私设置
  privacySettings: {
    shareLocation: {
      type: Boolean,
      default: true
    },
    showOnMap: {
      type: Boolean,
      default: true
    }
  },
  // 角色
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建索引
UserSchema.index({ location: '2dsphere' });

// 加密密码
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 生成JWT
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// 验证密码
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 添加comparePassword方法，与控制器中的调用匹配
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 