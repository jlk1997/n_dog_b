const mongoose = require('mongoose');

// 系统设置模型
const systemSettingSchema = new mongoose.Schema({
  // 网站名称
  siteName: {
    type: String,
    default: 'DogRun'
  },
  
  // 网站描述
  siteDescription: {
    type: String,
    default: '宠物社区与服务平台'
  },
  
  // 联系邮箱
  contactEmail: {
    type: String,
    default: 'admin@dogrun.com'
  },
  
  // 联系电话
  contactPhone: {
    type: String,
    default: ''
  },
  
  // 是否开启帖子审核
  postReviewEnabled: {
    type: Boolean,
    default: true
  },
  
  // 是否开启标记审核
  markerReviewEnabled: {
    type: Boolean,
    default: true
  },
  
  // 是否开启用户注册
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  
  // 是否开启维护模式
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  
  // 隐私政策
  privacyPolicy: {
    type: String,
    default: ''
  },
  
  // 服务条款
  termsOfService: {
    type: String,
    default: ''
  },
  
  // 小程序相关设置
  miniApp: {
    appId: String,
    appSecret: String
  },
  
  // 系统公告
  announcement: {
    enabled: {
      type: Boolean,
      default: false
    },
    content: String,
    startDate: Date,
    endDate: Date
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
  },
  
  // 最后更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema); 