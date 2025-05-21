const mongoose = require('mongoose');

// 商家模型
const merchantSchema = new mongoose.Schema({
  // 商家名称
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // 商家类型
  type: {
    type: String,
    required: true,
    enum: [
      'pet_hospital', 
      'pet_shop', 
      'pet_service', 
      'pet_beauty', 
      'pet_training', 
      'pet_hotel', 
      'pet_park', 
      'cafe', 
      'restaurant', 
      'others'
    ]
  },
  
  // 商家描述
  description: {
    type: String,
    trim: true
  },
  
  // 商家地址
  address: {
    type: String,
    required: true
  },
  
  // 商家位置(GeoJSON)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  
  // 商家Logo
  logo: String,
  
  // 商家图片
  images: [String],
  
  // 营业时间
  businessHours: String,
  
  // 联系信息
  contact: {
    name: String,
    phone: String,
    email: String,
    website: String,
    wechat: String
  },
  
  // 提供的服务
  services: [String],
  
  // 评分
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
  // 评价数量
  ratingCount: {
    type: Number,
    default: 0
  },
  
  // 商家状态
  status: {
    type: String,
    enum: ['active', 'pending', 'disabled'],
    default: 'pending'
  },
  
  // 是否认证
  verified: {
    type: Boolean,
    default: false
  },
  
  // 认证时间
  verifiedAt: Date,
  
  // 认证人
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // 禁用原因
  disabledReason: String,
  
  // 禁用时间
  disabledAt: Date,
  
  // 禁用操作人
  disabledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 创建索引
merchantSchema.index({ location: '2dsphere' });
merchantSchema.index({ name: 'text', description: 'text' });
merchantSchema.index({ type: 1 });
merchantSchema.index({ status: 1 });
merchantSchema.index({ verified: 1 });

module.exports = mongoose.model('Merchant', merchantSchema); 