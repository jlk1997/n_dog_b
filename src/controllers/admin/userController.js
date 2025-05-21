const User = require('../../models/User');
const Pet = require('../../models/Pet');
const Post = require('../../models/Post');
const { validationResult } = require('express-validator');

/**
 * 获取用户列表
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 添加状态筛选
    if (status) {
      query.status = status;
    }
    
    // 添加搜索条件
    if (search) {
      query.$or = [
        { nickname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 查询用户列表
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password');
    
    // 获取总数
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getUsers error:', error);
    res.status(500).json({ success: false, message: '获取用户列表失败', error: error.message });
  }
};

/**
 * 获取用户详情
 */
exports.getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询用户信息
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取用户的宠物
    const pets = await Pet.find({ owner: id }).select('name breed age avatar');
    
    // 获取用户的帖子数量
    const postCount = await Post.countDocuments({ author: id });
    
    // 获取用户最近的帖子
    const recentPosts = await Post.find({ author: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title content createdAt likes comments views');
    
    // 组合数据
    const userData = {
      ...user.toObject(),
      pets,
      postCount,
      recentPosts,
      // 可以添加更多统计数据
    };
    
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error('Admin getUserDetail error:', error);
    res.status(500).json({ success: false, message: '获取用户详情失败', error: error.message });
  }
};

/**
 * 更新用户信息
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, email, phone, status, bio, avatar } = req.body;
    
    // 查询用户是否存在
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新用户信息
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        nickname, 
        email, 
        phone, 
        status, 
        bio,
        avatar,
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');
    
    res.status(200).json({ success: true, data: updatedUser, message: '用户信息更新成功' });
  } catch (error) {
    console.error('Admin updateUser error:', error);
    res.status(500).json({ success: false, message: '更新用户信息失败', error: error.message });
  }
};

/**
 * 删除用户
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询用户是否存在
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 删除用户
    await User.findByIdAndDelete(id);
    
    // TODO: 可以考虑删除用户相关的数据，如帖子、评论等
    
    res.status(200).json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('Admin deleteUser error:', error);
    res.status(500).json({ success: false, message: '删除用户失败', error: error.message });
  }
};

/**
 * 禁用用户
 */
exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // 查询用户是否存在
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新用户状态为禁用
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        status: 'disabled',
        blockReason: reason || '管理员操作',
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');
    
    res.status(200).json({ success: true, data: updatedUser, message: '用户已禁用' });
  } catch (error) {
    console.error('Admin blockUser error:', error);
    res.status(500).json({ success: false, message: '禁用用户失败', error: error.message });
  }
};

/**
 * 解禁用户
 */
exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询用户是否存在
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 更新用户状态为正常
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        status: 'active',
        blockReason: null,
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');
    
    res.status(200).json({ success: true, data: updatedUser, message: '用户已启用' });
  } catch (error) {
    console.error('Admin unblockUser error:', error);
    res.status(500).json({ success: false, message: '启用用户失败', error: error.message });
  }
}; 