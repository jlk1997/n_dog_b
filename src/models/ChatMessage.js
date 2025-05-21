const mongoose = require('mongoose');

/**
 * 聊天消息模型
 */
const chatMessageSchema = new mongoose.Schema({
  // 消息内容
  content: {
    type: String,
    required: true,
    trim: true
  },

  // 发送者
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 发送者昵称（冗余存储，避免频繁连接查询）
  senderName: {
    type: String,
    required: true
  },

  // 发送者头像（冗余存储）
  senderAvatar: {
    type: String,
    default: '/static/images/default-avatar.png'
  },

  // 消息类型：'nearby' 附近5公里消息 或 'city' 城市频道消息
  messageType: {
    type: String,
    enum: ['nearby', 'city'],
    required: true,
    index: true
  },

  // 发送位置（GeoJSON格式）
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [经度, 纬度]
      required: true,
      index: '2dsphere' // 添加索引到coordinates
    }
  },

  // 城市名称（用于城市消息筛选）
  cityName: {
    type: String,
    required: function() {
      return this.messageType === 'city';
    },
    index: true
  },

  // 是否已读
  isRead: {
    type: Boolean,
    default: false
  },

  // 消息状态
  status: {
    type: String,
    enum: ['sending', 'sent', 'failed'],
    default: 'sent'
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt
});

// 创建地理空间索引 - 确保正确创建
chatMessageSchema.index({ 'location': '2dsphere' });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage; 