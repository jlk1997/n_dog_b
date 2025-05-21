const mongoose = require('mongoose');

/**
 * 位置信息模型
 */
const locationSchema = new mongoose.Schema({
  // 关联的用户
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
  
  // 最后更新时间
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // 是否在遛狗中
  isWalking: {
    type: Boolean,
    default: false
  },
  
  // 遛狗时关联的宠物ID
  currentPet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    default: null
  }
}, {
  timestamps: true
});

// 创建地理空间索引，用于地理位置查询
locationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Location', locationSchema); 