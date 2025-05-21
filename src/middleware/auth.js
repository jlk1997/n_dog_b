const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 使用固定的JWT密钥，确保一致性
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_for_users';

/**
 * 验证用户是否已登录
 */
exports.auth = async (req, res, next) => {
  let token;
  
  // 从请求头或cookie中获取token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // 从请求头中获取
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // 从cookie中获取
    token = req.cookies.token;
  }
  
  // 如果没有token，测试环境下可以使用模拟用户
  if (!token) {
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_USER) {
      // 开发环境模拟用户
      try {
        const user = await User.findOne();
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        console.error('模拟用户失败:', err);
      }
    }
    
    return res.status(401).json({
      success: false,
      message: '未授权访问'
    });
  }
  
  try {
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 获取用户信息
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 将用户信息添加到请求对象中
    req.user = user;
    next();
  } catch (error) {
    console.error('认证失败:', error);
    return res.status(401).json({
      success: false,
      message: '认证失败，请重新登录'
    });
  }
};

/**
 * Optional authentication middleware
 * Will set req.user if token is valid, but won't reject the request if token is invalid
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.id).select('-password');
    
    // Set user in request if found
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (err) {
    // Just continue if token is invalid
    next();
  }
}; 