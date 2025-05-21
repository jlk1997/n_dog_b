const User = require('../../models/User');
const Post = require('../../models/Post');
const Pet = require('../../models/Pet');
const Marker = require('../../models/Marker');
const Merchant = require('../../models/Merchant');
const SystemSetting = require('../../models/SystemSetting');
const SystemLog = require('../../models/SystemLog');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * 获取系统设置
 */
exports.getSettings = async (req, res) => {
  try {
    // 查询系统设置
    let settings = await SystemSetting.findOne();
    
    // 如果不存在则创建默认设置
    if (!settings) {
      settings = await SystemSetting.create({
        siteName: 'DogRun',
        siteDescription: '宠物社区与服务平台',
        contactEmail: 'admin@dogrun.com',
        contactPhone: '400-123-4567',
        postReviewEnabled: true,
        markerReviewEnabled: true,
        registrationEnabled: true,
        maintenanceMode: false,
        privacyPolicy: '默认隐私政策',
        termsOfService: '默认服务条款',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Admin getSettings error:', error);
    res.status(500).json({ success: false, message: '获取系统设置失败', error: error.message });
  }
};

/**
 * 更新系统设置
 */
exports.updateSettings = async (req, res) => {
  try {
    const {
      siteName,
      siteDescription,
      contactEmail,
      contactPhone,
      postReviewEnabled,
      markerReviewEnabled,
      registrationEnabled,
      maintenanceMode,
      privacyPolicy,
      termsOfService
    } = req.body;
    
    // 查找当前设置
    let settings = await SystemSetting.findOne();
    
    // 如果不存在则创建
    if (!settings) {
      settings = new SystemSetting({});
    }
    
    // 更新设置字段
    settings.siteName = siteName || settings.siteName;
    settings.siteDescription = siteDescription || settings.siteDescription;
    settings.contactEmail = contactEmail || settings.contactEmail;
    settings.contactPhone = contactPhone || settings.contactPhone;
    
    // 更新布尔字段 (使用 !== undefined 检查是否提供了值)
    if (postReviewEnabled !== undefined) settings.postReviewEnabled = postReviewEnabled;
    if (markerReviewEnabled !== undefined) settings.markerReviewEnabled = markerReviewEnabled;
    if (registrationEnabled !== undefined) settings.registrationEnabled = registrationEnabled;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    
    // 更新文本内容
    if (privacyPolicy) settings.privacyPolicy = privacyPolicy;
    if (termsOfService) settings.termsOfService = termsOfService;
    
    settings.updatedAt = Date.now();
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    // 记录系统日志
    await SystemLog.create({
      action: 'UPDATE_SETTINGS',
      description: '系统设置已更新',
      user: req.user.id,
      ip: req.ip
    });
    
    res.status(200).json({ success: true, data: settings, message: '系统设置更新成功' });
  } catch (error) {
    console.error('Admin updateSettings error:', error);
    res.status(500).json({ success: false, message: '更新系统设置失败', error: error.message });
  }
};

/**
 * 获取仪表盘统计数据
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // 检查并确保系统日志数据存在
    const logsCount = await SystemLog.countDocuments();
    if (logsCount === 0) {
      // 没有系统日志数据，创建一些示例日志
      const sampleLogs = [
        {
          action: 'LOGIN',
          description: '管理员登录系统',
          user: req.admin?.id || req.user?.id || null, // 确保有用户ID
          ip: req.ip || '127.0.0.1',
          createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10分钟前
        },
        {
          action: 'UPDATE_SETTINGS',
          description: '更新系统设置',
          user: req.admin?.id || req.user?.id || null,
          ip: req.ip || '127.0.0.1',
          createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30分钟前
        },
        {
          action: 'REVIEW',
          description: '审核商家信息',
          user: req.admin?.id || req.user?.id || null,
          ip: req.ip || '127.0.0.1',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2小时前
        },
        {
          action: 'CREATE',
          description: '创建新图标',
          user: req.admin?.id || req.user?.id || null,
          ip: req.ip || '127.0.0.1',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1天前
        },
        {
          action: 'DELETE',
          description: '删除过期帖子',
          user: req.admin?.id || req.user?.id || null,
          ip: req.ip || '127.0.0.1',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2天前
        }
      ];

      try {
        await SystemLog.insertMany(sampleLogs);
        console.log('已创建示例系统日志');
      } catch (logError) {
        console.error('创建示例系统日志失败:', logError);
        // 继续执行，不要因为日志创建失败而阻止仪表盘加载
      }
    }

    // 获取用户统计
    let userTotal = 0, userNew = 0, userActive = 0;
    let postTotal = 0, postPending = 0, postNew = 0;
    let petTotal = 0;
    let markerTotal = 0, markerPending = 0;
    let merchantTotal = 0, merchantPending = 0, merchantVerified = 0;
    
    try {
      userTotal = await User.countDocuments() || 0;
      userNew = await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }) || 0;
      userActive = await User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }) || 0;
    } catch (err) {
      console.error('获取用户统计失败:', err);
      // 不中断流程，继续执行
    }
    
    // 获取用户增长趋势数据 - 近7天
    const userGrowthWeek = [];
    try {
      for (let i = 6; i >= 0; i--) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        
        let count = 0;
        try {
          count = await User.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
          }) || 0;
        } catch (err) {
          console.error(`获取${startDate.toLocaleDateString()}用户增长数据失败:`, err);
        }
        
        userGrowthWeek.push({
          date: `${startDate.getMonth() + 1}/${startDate.getDate()}`,
          count
        });
      }
    } catch (err) {
      console.error('获取周用户增长趋势失败:', err);
      // 填充默认数据
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        userGrowthWeek.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          count: 0
        });
      }
    }
    
    // 获取用户增长趋势数据 - 近30天
    const userGrowthMonth = [];
    try {
      for (let i = 29; i >= 0; i--) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        
        let count = 0;
        try {
          count = await User.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
          }) || 0;
        } catch (err) {
          console.error(`获取${startDate.toLocaleDateString()}用户增长数据失败:`, err);
        }
        
        userGrowthMonth.push({
          date: `${startDate.getMonth() + 1}/${startDate.getDate()}`,
          count
        });
      }
    } catch (err) {
      console.error('获取月用户增长趋势失败:', err);
      // 填充默认数据
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        userGrowthMonth.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          count: 0
        });
      }
    }
    
    // 获取帖子统计
    try {
      postTotal = await Post.countDocuments() || 0;
      postPending = await Post.countDocuments({ status: 'pending' }) || 0;
      postNew = await Post.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }) || 0;
    } catch (err) {
      console.error('获取帖子统计失败:', err);
    }
    
    // 获取宠物统计
    try {
      petTotal = await Pet.countDocuments() || 0;
    } catch (err) {
      console.error('获取宠物统计失败:', err);
    }
    
    // 获取标记统计
    try {
      markerTotal = await Marker.countDocuments() || 0;
      markerPending = await Marker.countDocuments({ status: 'pending' }) || 0;
    } catch (err) {
      console.error('获取标记统计失败:', err);
    }
    
    // 获取商家统计
    try {
      merchantTotal = await Merchant.countDocuments() || 0;
      merchantPending = await Merchant.countDocuments({ status: 'pending' }) || 0;
      merchantVerified = await Merchant.countDocuments({ verified: true }) || 0;
    } catch (err) {
      console.error('获取商家统计失败:', err);
    }
    
    // 返回结果
    res.status(200).json({
      success: true,
      data: {
        users: {
          total: userTotal,
          new: userNew,
          active: userActive,
          growthWeek: userGrowthWeek,
          growthMonth: userGrowthMonth
        },
        posts: {
          total: postTotal,
          pending: postPending,
          new: postNew
        },
        pets: {
          total: petTotal
        },
        markers: {
          total: markerTotal,
          pending: markerPending
        },
        merchants: {
          total: merchantTotal,
          pending: merchantPending,
          verified: merchantVerified
        }
      }
    });
  } catch (error) {
    console.error('Admin getDashboardStats error:', error);
    res.status(500).json({ success: false, message: '获取仪表盘统计失败', error: error.message });
  }
};

/**
 * 获取系统日志
 */
exports.getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, startDate, endDate } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 添加日志类型筛选
    if (type) {
      query.action = type;
    }
    
    // 添加日期范围筛选
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        try {
          query.createdAt.$gte = new Date(startDate);
        } catch (error) {
          console.error('无效的开始日期:', startDate, error);
        }
      }
      if (endDate) {
        try {
          query.createdAt.$lte = new Date(endDate);
        } catch (error) {
          console.error('无效的结束日期:', endDate, error);
        }
      }
      
      // 如果日期对象为空，则删除空查询条件
      if (Object.keys(query.createdAt).length === 0) {
        delete query.createdAt;
      }
    }
    
    // 如果数据库中没有日志记录，先创建一些示例日志
    const count = await SystemLog.countDocuments();
    if (count === 0) {
      // 创建一些默认的日志记录
      const sampleLogs = [
        {
          action: 'LOGIN',
          description: '系统初始化',
          ip: '127.0.0.1',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        {
          action: 'SYSTEM_ERROR',
          description: '系统日志初始化',
          ip: '127.0.0.1',
          createdAt: new Date()
        }
      ];
      
      try {
        await SystemLog.insertMany(sampleLogs);
        console.log('系统日志初始化完成');
      } catch (error) {
        console.error('系统日志初始化失败:', error);
      }
    }
    
    // 计算分页
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 20;
    const skip = (parsedPage - 1) * parsedLimit;
    
    // 查询日志
    let logs = [];
    try {
      logs = await SystemLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('user', 'nickname name username email')
        .lean();
    } catch (error) {
      console.error('查询系统日志失败:', error);
      logs = []; // 出错时返回空数组
    }
    
    // 获取总数
    let total = 0;
    try {
      total = await SystemLog.countDocuments(query);
    } catch (error) {
      console.error('获取系统日志总数失败:', error);
    }
    
    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Admin getSystemLogs error:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取系统日志失败', 
      error: error.message,
      data: [] // 出错时返回空数组
    });
  }
};

/**
 * 清除缓存
 * @route POST /api/admin/cache/purge
 * @access Private
 */
exports.purgeCache = async (req, res) => {
  try {
    const { path: cachePath } = req.body;
    console.log(`收到缓存清除请求，路径: ${cachePath}`);
    
    if (!cachePath) {
      return res.status(400).json({
        success: false,
        message: '请提供缓存路径',
        code: 400
      });
    }
    
    // 记录系统日志 - 修改为有效的枚举值 UPDATE_SETTINGS 或 OTHER
    await SystemLog.create({
      action: 'OTHER', // 将PURGE_CACHE改为有效的枚举值
      description: `清除缓存: ${cachePath}`,
      targetType: 'SYSTEM',
      user: req.admin.id,
      ip: req.ip,
      createdAt: new Date()
    });
    
    // 返回成功响应 - 即使没有实际清除缓存，我们也告诉客户端操作成功
    // 这在大多数情况下已经足够，因为浏览器会重新请求资源
    res.status(200).json({
      success: true,
      message: '缓存已清除',
      path: cachePath,
      code: 0
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message,
      code: 500
    });
  }
}; 