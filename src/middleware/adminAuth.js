const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * 管理员认证中间件
 * 验证请求头中的token是否有效，并将管理员信息添加到req对象中
 */
exports.adminAuth = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        code: 401
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌',
        code: 401
      });
    }
    
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN || 'admin-secret-key');
    
    // 查找管理员并检查是否存在
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '管理员不存在或令牌无效',
        code: 401
      });
    }
    
    // 检查管理员状态是否正常
    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '管理员账户已被禁用',
        code: 403
      });
    }
    
    // 将管理员信息添加到请求对象中
    req.admin = {
      id: admin._id,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions
    };
    
    // 更新管理员的最后活动时间
    admin.lastActive = Date.now();
    await admin.save();
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的令牌',
        code: 401
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '令牌已过期',
        code: 401
      });
    }
    
    console.error('管理员认证错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * 检查管理员权限中间件
 * 验证管理员是否拥有指定的权限
 * @param {Array|String} requiredPermissions - 所需的权限数组或单个权限
 */
exports.checkPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      // 确保管理员已通过认证
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: '请先登录',
          code: 401
        });
      }
      
      // 超级管理员拥有所有权限
      if (req.admin.role === 'superadmin') {
        return next();
      }
      
      // 将单个权限转换为数组
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      
      // 检查管理员是否拥有所有所需权限
      const hasPermission = permissions.every(permission => 
        req.admin.permissions && req.admin.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: '没有足够的权限执行此操作',
          code: 403
        });
      }
      
      next();
    } catch (error) {
      console.error('检查权限错误:', error);
      return res.status(500).json({
        success: false,
        message: '服务器错误',
        code: 500
      });
    }
  };
}; 