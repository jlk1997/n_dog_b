const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key_for_users', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, nickname } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      nickname: nickname || username
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/users/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for user - 修改查询确保包含密码字段
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      phone: user.phone,
      gender: user.gender,
      location: user.location,
      isWalking: user.isWalking
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/me
 * @access  Private
 */
exports.updateCurrentUser = async (req, res) => {
  try {
    const { nickname, bio, email, phone, gender } = req.body;
    const user = req.user;

    // Update user fields
    user.nickname = nickname || user.nickname;
    user.bio = bio || user.bio;
    
    // 更新手机号
    if (phone !== undefined) {
      user.phone = phone;
    }
    
    // 更新性别
    if (gender && ['male', 'female', 'other', 'unknown'].includes(gender)) {
      user.gender = gender;
    }
    
    if (email && email !== user.email) {
      // Check if email already exists
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      phone: updatedUser.phone,
      gender: updatedUser.gender
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 上传用户头像
 */
exports.uploadAvatar = async (req, res) => {
  try {
    console.log('开始处理头像上传请求');
    console.log('请求头:', req.headers);
    console.log('请求体:', req.body);
    console.log('请求文件:', req.files);
    
    // 检查是否有文件被上传 - 适配express-fileupload
    if (!req.files) {
      console.error('没有找到上传的文件对象(req.files)');
      return res.status(400).json({ 
        message: '没有找到上传的文件', 
        success: false 
      });
    }
    
    // 检查avatar字段是否存在
    if (!req.files.avatar) {
      console.error('没有找到avatar字段');
      console.error('可用的文件字段:', Object.keys(req.files));
      return res.status(400).json({ 
        message: '没有找到头像文件', 
        success: false 
      });
    }

    const avatarFile = req.files.avatar;
    console.log('上传的文件信息:', avatarFile);
    
    // 检查文件类型
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(avatarFile.mimetype)) {
      console.error('不支持的文件类型:', avatarFile.mimetype);
      return res.status(400).json({
        message: '只支持JPG、PNG、GIF和WEBP格式的图片',
        success: false
      });
    }
    
    // 获取用户ID
    const userId = req.user.id;
    
    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../../uploads/users');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 创建唯一的文件名
    const fileExt = path.extname(avatarFile.name || 'image.jpg').toLowerCase();
    const filename = `user-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    const filePath = path.join(uploadDir, filename);
    
    console.log('准备保存文件到:', filePath);
    
    try {
      // 移动上传的文件到目标位置
      await avatarFile.mv(filePath);
      console.log('文件已保存到:', filePath);
      
      // 构建头像的URL路径
      const relativePath = `/uploads/users/${filename}`;
      const fullUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
      
      console.log('头像相对路径:', relativePath);
      console.log('头像完整URL:', fullUrl);
      
      try {
        // 更新用户的头像字段
        const updatedUser = await User.findByIdAndUpdate(
          userId, 
          { avatar: relativePath },
          { new: true }
        );
        
        if (!updatedUser) {
          console.error('找不到要更新的用户:', userId);
          return res.status(404).json({ 
            message: '用户不存在', 
            success: false 
          });
        }
        
        // 返回成功信息和新的头像URL
        console.log('头像上传成功，用户信息已更新:', updatedUser);
        return res.status(200).json({
          message: '头像上传成功',
          avatar: fullUrl,
          success: true
        });
      } catch (dbError) {
        console.error('数据库更新用户头像失败:', dbError);
        return res.status(500).json({
          message: '更新用户头像失败: ' + dbError.message,
          success: false
        });
      }
    } catch (mvError) {
      console.error('移动上传文件失败:', mvError);
      return res.status(500).json({
        message: '保存头像文件失败: ' + mvError.message,
        success: false
      });
    }
  } catch (error) {
    console.error('头像上传失败:', error);
    return res.status(500).json({
      message: '头像上传失败: ' + error.message,
      success: false
    });
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Follow/Unfollow a user
 * @route   POST /api/users/follow/:id
 * @access  Private
 */
exports.followUser = async (req, res) => {
  try {
    // 检查是否尝试关注自己
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself', success: false });
    }

    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const currentUser = await User.findById(req.user.id);
    
    // Check if already following
    const isFollowing = currentUser.following.includes(req.params.id) || 
      currentUser.following.some(id => id.toString() === req.params.id);
    
    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
      userToFollow.followers = userToFollow.followers.filter(id => id.toString() !== req.user.id.toString());
      
      await currentUser.save();
      await userToFollow.save();
      
      return res.json({ isFollowing: false, success: true });
    } else {
      // Follow
      currentUser.following.push(req.params.id);
      userToFollow.followers.push(req.user.id);
      
      await currentUser.save();
      await userToFollow.save();
      
      return res.json({ isFollowing: true, success: true });
    }
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
};

/**
 * @desc    Get user followers
 * @route   GET /api/users/:id/followers
 * @access  Public
 */
exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', '_id username nickname avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.followers);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get users that this user is following
 * @route   GET /api/users/:id/following
 * @access  Public
 */
exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', '_id username nickname avatar');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.following);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get current user stats (followers, following, posts count)
 * @route   GET /api/users/stats/me
 * @access  Private
 */
exports.getUserStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Count posts
    const Post = require('../models/Post');
    const postsCount = await Post.countDocuments({ user: req.user.id });
    
    // 获取遛狗记录统计
    const WalkRecord = require('../models/WalkRecord');
    
    // 统计遛狗次数
    const walkCount = await WalkRecord.countDocuments({ user: req.user.id });
    
    // 统计总距离
    const walkRecords = await WalkRecord.find({ user: req.user.id });
    const totalDistance = walkRecords.reduce((total, record) => {
      return total + (record.distance || 0);
    }, 0) / 1000; // 转换为千米
    
    res.json({
      followers: user.followers.length,
      following: user.following.length,
      posts: postsCount,
      walkCount,
      totalDistance: parseFloat(totalDistance.toFixed(2)) // 保留两位小数
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update full user profile - 专门用于处理完整字段
 * @route   POST /api/users/updateProfile
 * @access  Private
 */
exports.updateFullProfile = async (req, res) => {
  try {
    const { nickname, bio, email, phone, gender } = req.body;
    const user = req.user;
    
    // 记录请求体用于调试
    console.log('Update full profile request body:', req.body);

    // 需要更新的字段
    const updateFields = {};
    
    // 选择性地更新字段，确保即使是空值也会被保存
    if (nickname !== undefined) updateFields.nickname = nickname;
    if (bio !== undefined) updateFields.bio = bio;
    if (phone !== undefined) updateFields.phone = phone;
    if (gender !== undefined && ['male', 'female', 'other', 'unknown'].includes(gender)) {
      updateFields.gender = gender;
    }
    
    // 验证邮箱
    if (email !== undefined && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateFields.email = email;
    }
    
    console.log('Fields to update:', updateFields);
    
    // 使用findByIdAndUpdate方法一次性更新所有字段
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // 返回完整的用户信息
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      nickname: updatedUser.nickname,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      phone: updatedUser.phone,
      gender: updatedUser.gender
    });
  } catch (error) {
    console.error('Update full profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    // 从请求体中获取更新字段
    const { nickname, bio, email, phone, gender } = req.body;

    // 检查email是否已被其他用户使用
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: '该邮箱已被使用' });
      }
    }

    // 更新user对象
    const updateFields = {};
    if (nickname) updateFields.nickname = nickname;
    if (bio !== undefined) updateFields.bio = bio;
    if (email) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (gender) updateFields.gender = gender;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
}; 