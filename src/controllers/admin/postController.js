const Post = require('../../models/Post');
const Comment = require('../../models/Comment');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

/**
 * 获取帖子列表
 */
exports.getPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search, 
      author,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 添加状态筛选
    if (status) {
      query.status = status;
    }
    
    // 添加作者筛选
    if (author) {
      query.author = author;
    }
    
    // 添加搜索条件
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 查询帖子列表
    const posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'nickname avatar')
      .lean();
    
    // 获取总数
    const total = await Post.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getPosts error:', error);
    res.status(500).json({ success: false, message: '获取帖子列表失败', error: error.message });
  }
};

/**
 * 获取帖子详情
 */
exports.getPostDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询帖子详情
    const post = await Post.findById(id)
      .populate('author', 'nickname avatar')
      .lean();
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 获取帖子评论数
    const commentCount = await Comment.countDocuments({ post: id });
    
    // 获取前5条评论
    const comments = await Comment.find({ post: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'nickname avatar')
      .lean();
    
    const postData = {
      ...post,
      commentCount,
      comments
    };
    
    res.status(200).json({ success: true, data: postData });
  } catch (error) {
    console.error('Admin getPostDetail error:', error);
    res.status(500).json({ success: false, message: '获取帖子详情失败', error: error.message });
  }
};

/**
 * 更新帖子信息
 */
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status, categories, tags } = req.body;
    
    // 查询帖子是否存在
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 更新帖子信息
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        title, 
        content, 
        status,
        categories,
        tags,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('author', 'nickname avatar');
    
    res.status(200).json({ success: true, data: updatedPost, message: '帖子更新成功' });
  } catch (error) {
    console.error('Admin updatePost error:', error);
    res.status(500).json({ success: false, message: '更新帖子失败', error: error.message });
  }
};

/**
 * 删除帖子
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询帖子是否存在
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 删除帖子
    await Post.findByIdAndDelete(id);
    
    // 删除相关评论
    await Comment.deleteMany({ post: id });
    
    res.status(200).json({ success: true, message: '帖子删除成功' });
  } catch (error) {
    console.error('Admin deletePost error:', error);
    res.status(500).json({ success: false, message: '删除帖子失败', error: error.message });
  }
};

/**
 * 置顶帖子
 */
exports.pinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPinned } = req.body;
    
    // 查询帖子是否存在
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 更新帖子置顶状态
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        isPinned: !!isPinned,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('author', 'nickname avatar');
    
    const message = updatedPost.isPinned ? '帖子已置顶' : '帖子已取消置顶';
    
    res.status(200).json({ success: true, data: updatedPost, message });
  } catch (error) {
    console.error('Admin pinPost error:', error);
    res.status(500).json({ success: false, message: '设置置顶状态失败', error: error.message });
  }
};

/**
 * 设置精选帖子
 */
exports.setFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFeatured } = req.body;
    
    // 查询帖子是否存在
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 更新帖子精选状态
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        isFeatured: !!isFeatured,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('author', 'nickname avatar');
    
    const message = updatedPost.isFeatured ? '帖子已设为精选' : '帖子已取消精选';
    
    res.status(200).json({ success: true, data: updatedPost, message });
  } catch (error) {
    console.error('Admin setFeatured error:', error);
    res.status(500).json({ success: false, message: '设置精选状态失败', error: error.message });
  }
};

/**
 * 审核帖子
 */
exports.reviewPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // 状态验证
    if (!['published', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的审核状态' });
    }
    
    // 查询帖子是否存在
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 更新帖子状态
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { 
        status,
        rejectionReason: status === 'rejected' ? (reason || '内容不符合社区规范') : null,
        reviewedAt: Date.now(),
        reviewedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('author', 'nickname avatar');
    
    const message = status === 'published' ? '帖子已通过审核' : '帖子已被拒绝';
    
    res.status(200).json({ success: true, data: updatedPost, message });
  } catch (error) {
    console.error('Admin reviewPost error:', error);
    res.status(500).json({ success: false, message: '审核帖子失败', error: error.message });
  }
};

/**
 * 获取帖子评论
 */
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // 验证帖子是否存在
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 获取评论
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('author', 'nickname avatar')
      .populate('replies.author', 'nickname avatar')
      .lean();
    
    // 获取总数
    const total = await Comment.countDocuments({ post: postId });
    
    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getPostComments error:', error);
    res.status(500).json({ success: false, message: '获取评论失败', error: error.message });
  }
};

/**
 * 删除评论
 */
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    
    // 验证帖子是否存在
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 查找评论
    const comment = await Comment.findOne({ _id: commentId, post: postId });
    
    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }
    
    // 删除评论
    await Comment.findByIdAndDelete(commentId);
    
    // 更新帖子评论计数
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
    
    res.status(200).json({ success: true, message: '评论删除成功' });
  } catch (error) {
    console.error('Admin deleteComment error:', error);
    res.status(500).json({ success: false, message: '删除评论失败', error: error.message });
  }
};

/**
 * 回复评论
 */
exports.replyToComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    
    // 验证请求数据
    if (!content) {
      return res.status(400).json({ success: false, message: '回复内容不能为空' });
    }
    
    // 验证帖子是否存在
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 查找评论
    const comment = await Comment.findOne({ _id: commentId, post: postId });
    
    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }
    
    // 创建回复
    const reply = {
      content,
      author: req.user.id,
      createdAt: Date.now()
    };
    
    // 添加回复到评论
    comment.replies.push(reply);
    await comment.save();
    
    // 获取带有作者信息的完整回复
    const updatedComment = await Comment.findById(commentId)
      .populate('author', 'nickname avatar')
      .populate('replies.author', 'nickname avatar');
    
    res.status(200).json({ 
      success: true, 
      data: updatedComment,
      message: '回复发送成功' 
    });
  } catch (error) {
    console.error('Admin replyToComment error:', error);
    res.status(500).json({ success: false, message: '回复评论失败', error: error.message });
  }
}; 