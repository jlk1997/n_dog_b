const mongoose = require('mongoose');

// 系统日志模型
const systemLogSchema = new mongoose.Schema({
  // 操作类型
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 
      'LOGOUT', 
      'CREATE', 
      'UPDATE', 
      'DELETE', 
      'REVIEW', 
      'UPLOAD', 
      'DOWNLOAD', 
      'EXPORT', 
      'IMPORT',
      'UPDATE_SETTINGS',
      'SYSTEM_ERROR',
      'API_ERROR',
      'OTHER'
    ]
  },
  
  // 操作描述
  description: {
    type: String,
    required: true
  },
  
  // 关联对象ID
  targetId: {
    type: String
  },
  
  // 关联对象类型
  targetType: {
    type: String,
    enum: ['USER', 'POST', 'PET', 'MARKER', 'MERCHANT', 'SYSTEM', 'OTHER']
  },
  
  // 操作前数据
  dataBefore: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // 操作后数据
  dataAfter: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // 操作者(可能是管理员或普通用户)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel'
  },
  
  // 操作者模型类型
  userModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'Admin'
  },
  
  // 操作IP
  ip: {
    type: String
  },
  
  // 操作设备
  userAgent: {
    type: String
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建索引
systemLogSchema.index({ createdAt: -1 });
systemLogSchema.index({ action: 1, createdAt: -1 });
systemLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema); 