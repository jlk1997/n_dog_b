const mongoose = require('mongoose');

/**
 * 地图标记模型
 */
const markerSchema = new mongoose.Schema({
  // 创建标记的用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 标记标题
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // 标记描述
  description: {
    type: String,
    default: '',
    trim: true
  },
  
  // 标记类型
  type: {
    type: String,
    enum: ['general', 'pet_friendly', 'danger', 'scenic', 'pet_service', 'custom'],
    default: 'general'
  },
  
  // 标记图标
  icon: {
    type: String,
    default: 'marker'
  },
  
  // 标记颜色
  color: {
    type: String,
    default: '#FF5733'
  },
  
  // 覆盖半径（单位：公里）
  radius: {
    type: Number,
    default: 0.5
  },
  
  // 地理位置，使用MongoDB的GeoJSON格式
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [经度, 纬度]
      required: true
    }
  },
  
  // 标记的可见性
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // 相关的宠物ID (可选)
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  },
  
  // 标记图片
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      default: ''
    }
  }],
  
  // 是否已验证
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // 点赞数
  likes: {
    type: Number,
    default: 0
  },
  
  // 点赞用户
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 额外属性
  properties: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// 创建地理空间索引，用于地理位置查询
markerSchema.index({ location: '2dsphere' });
// 创建标题的文本索引，用于搜索
markerSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Marker', markerSchema); 