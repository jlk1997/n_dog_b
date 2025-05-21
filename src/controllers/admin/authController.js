const Admin = require('../../models/Admin');
const jwt = require('jsonwebtoken');

/**
 * @desc    管理员登录
 * @route   POST /api/admin/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证请求
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名和密码',
        code: 400
      });
    }
    
    // 查找管理员
    const admin = await Admin.findOne({ username }).select('+password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        code: 401
      });
    }
    
    // 检查账户是否被锁定
    if (admin.isLocked()) {
      return res.status(403).json({
        success: false,
        message: '账户已被锁定，请稍后再试',
        lockUntil: admin.lockUntil,
        code: 403
      });
    }
    
    // 检查密码是否匹配
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      // 增加失败尝试计数
      await admin.incrementLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        attempts: admin.loginAttempts,
        code: 401
      });
    }
    
    // 检查账户状态
    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用，请联系系统管理员',
        code: 403
      });
    }
    
    // 重置登录尝试次数
    await admin.resetLoginAttempts();
    
    // 创建token
    const token = admin.getSignedJwtToken();
    
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        avatar: admin.avatar
      },
      token,
      code: 0
    });
  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    管理员退出登录
 * @route   POST /api/admin/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // 这里可以实现黑名单token的逻辑，但通常前端清除token就够了
    
    res.status(200).json({
      success: true,
      message: '退出登录成功',
      code: 0
    });
  } catch (error) {
    console.error('管理员退出登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    刷新认证令牌
 * @route   POST /api/admin/refresh-token
 * @access  Public
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '请提供刷新令牌',
        code: 400
      });
    }
    
    // 验证刷新令牌
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET_ADMIN || 'admin-refresh-secret-key'
    );
    
    // 查找管理员
    const admin = await Admin.findById(decoded.id);
    
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌',
        code: 401
      });
    }
    
    // 生成新的访问令牌
    const token = admin.getSignedJwtToken();
    
    res.status(200).json({
      success: true,
      message: '令牌刷新成功',
      token,
      code: 0
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    修改管理员密码
 * @route   POST /api/admin/change-password
 * @access  Private
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供当前密码和新密码',
        code: 400
      });
    }
    
    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6个字符',
        code: 400
      });
    }
    
    // 查找管理员
    const admin = await Admin.findById(req.admin.id).select('+password');
    
    // 验证当前密码
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误',
        code: 401
      });
    }
    
    // 设置新密码
    admin.password = newPassword;
    await admin.save();
    
    res.status(200).json({
      success: true,
      message: '密码修改成功',
      code: 0
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
}; 