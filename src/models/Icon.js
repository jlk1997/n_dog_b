const mongoose = require('mongoose');

const IconSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请提供图标名称'],
    trim: true
  },
  type: {
    type: String,
    required: [true, '请提供图标类型'],
    enum: ['app', 'tab', 'marker', 'pet', 'user', 'common', 'ui', 'action', 'status', 'social'],
    default: 'common'
  },
  description: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: [true, '请提供图标URL']
  },
  filename: {
    type: String,
    required: [true, '请提供文件名']
  },
  size: {
    type: Number,
    default: 0
  },
  dimensions: {
    width: {
      type: Number,
      default: 0
    },
    height: {
      type: Number,
      default: 0
    }
  },
  format: {
    type: String,
    enum: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
    default: 'png'
  },
  used: {
    type: Boolean,
    default: false
  },
  usedLocation: {
    type: String,
    default: ''
  },
  version: {
    type: Number,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
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
IconSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 静态方法：获取特定类型的图标
IconSchema.statics.getByType = function(type) {
  return this.find({ type });
};

// 静态方法：获取正在使用的图标
IconSchema.statics.getUsedIcons = function() {
  return this.find({ used: true });
};

// 静态方法：根据版本获取图标
IconSchema.statics.getByVersion = function(minVersion) {
  return this.find({ version: { $gte: minVersion } });
};

module.exports = mongoose.model('Icon', IconSchema); 