const mongoose = require('mongoose');

// 回复模型（作为子文档嵌入到评论中）
const replySchema = new mongoose.Schema({
  // 回复内容
  content: {
    type: String,
    required: true
  },
  
  // 回复作者
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 回复时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 回复状态
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active'
  },
  
  // IP地址
  ip: String,
  
  // 点赞数
  likes: {
    type: Number,
    default: 0
  }
});

// 评论模型
const commentSchema = new mongoose.Schema({
  // 评论内容
  content: {
    type: String,
    required: true
  },
  
  // 评论作者
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 关联帖子
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  
  // 回复列表
  replies: [replySchema],
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // 评论状态
  status: {
    type: String,
    enum: ['active', 'deleted', 'hidden'],
    default: 'active'
  },
  
  // IP地址
  ip: String,
  
  // 点赞数
  likes: {
    type: Number,
    default: 0
  },
  
  // 举报数
  reports: {
    type: Number,
    default: 0
  }
});

// 创建索引
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema); 