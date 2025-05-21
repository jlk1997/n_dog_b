/**
 * 社区相关控制器
 */

const mongoose = require('mongoose');
const Post = require('../models/Post');
const User = require('../models/User');
const path = require('path');

// 创建帖子
exports.createPost = async (req, res) => {
  try {
    const { content, images, location, walkRecord, pet, tags } = req.body;
    const userId = req.user.id;

    // 创建帖子数据对象
    const postData = {
      user: userId,
      content,
      images: images || [],
      location: location || null,
      pet: pet || null,
      tags: tags || [],
    };

    // 处理walkRecord，可能是ID或对象
    if (walkRecord) {
      if (typeof walkRecord === 'string') {
        postData.walkRecord = walkRecord;
      } else if (walkRecord._id) {
        postData.walkRecord = walkRecord._id;
      } else {
        console.log('无效的walkRecord格式:', walkRecord);
      }
    }

    console.log('创建帖子数据:', postData);

    // 创建新帖子
    const post = await Post.create(postData);

    await post.populate('user', 'username nickname avatar');
    if (postData.pet) {
      await post.populate('pet', 'name avatar breed');
    }
    if (postData.walkRecord) {
      await post.populate('walkRecord');
    }

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('创建帖子错误:', error);
    res.status(500).json({ success: false, message: '创建帖子失败', error: error.message });
  }
};

// 获取帖子流
exports.getFeed = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const userId = req.user ? req.user.id : null;

    let query = { isPublic: true };
    // 如果用户已登录，附加他关注的人的帖子
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.following && user.following.length > 0) {
        query = {
          $or: [
            { isPublic: true },
            { user: { $in: user.following } }
          ]
        };
      }
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .populate('walkRecord');

    const total = await Post.countDocuments(query);

    // 如果用户已登录，标记帖子是否已点赞
    if (userId) {
      posts.forEach(post => {
        post._doc.isLiked = post.likes.includes(userId);
      });
    }

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取帖子流错误:', error);
    res.status(500).json({ success: false, message: '获取帖子流失败', error: error.message });
  }
};

// 获取附近帖子
exports.getNearbyPosts = async (req, res) => {
  try {
    const { longitude, latitude, distance = 5000, limit = 10, page = 1 } = req.query;
    const userId = req.user ? req.user.id : null;

    // 验证经纬度参数
    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: '缺少位置参数' });
    }

    // 查找附近帖子
    const posts = await Post.find({
      isPublic: true,
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(distance)
        }
      }
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .populate('walkRecord');

    // 如果用户已登录，标记帖子是否已点赞
    if (userId) {
      posts.forEach(post => {
        post._doc.isLiked = post.likes.includes(userId);
      });
    }

    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    console.error('获取附近帖子错误:', error);
    res.status(500).json({ success: false, message: '获取附近帖子失败', error: error.message });
  }
};

// 获取用户帖子
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    let query = { user: userId };
    // 如果不是当前用户的帖子，只显示公开的
    if (!currentUserId || currentUserId !== userId) {
      query.isPublic = true;
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .populate('walkRecord');

    const total = await Post.countDocuments(query);

    // 如果用户已登录，标记帖子是否已点赞
    if (currentUserId) {
      posts.forEach(post => {
        post._doc.isLiked = post.likes.includes(currentUserId);
      });
    }

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户帖子错误:', error);
    res.status(500).json({ success: false, message: '获取用户帖子失败', error: error.message });
  }
};

// 获取帖子详情
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;

    const post = await Post.findById(id)
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .populate('walkRecord')
      .populate({
        path: 'comments.user',
        select: 'username nickname avatar'
      });

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查帖子是否公开或者是当前用户的
    if (!post.isPublic && (!userId || post.user._id.toString() !== userId)) {
      return res.status(403).json({ success: false, message: '无权访问此帖子' });
    }

    // 如果用户已登录，标记帖子是否已点赞
    if (userId) {
      post._doc.isLiked = post.likes.includes(userId);
    }

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    console.error('获取帖子详情错误:', error);
    res.status(500).json({ success: false, message: '获取帖子详情失败', error: error.message });
  }
};

// 更新帖子
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, images, isPublic, tags } = req.body;
    const userId = req.user.id;

    // 查找帖子
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查权限
    if (post.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权更新此帖子' });
    }

    // 更新帖子
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        content: content || post.content,
        images: images || post.images,
        isPublic: isPublic !== undefined ? isPublic : post.isPublic,
        tags: tags || post.tags
      },
      { new: true }
    )
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed');

    res.status(200).json({ success: true, data: updatedPost });
  } catch (error) {
    console.error('更新帖子错误:', error);
    res.status(500).json({ success: false, message: '更新帖子失败', error: error.message });
  }
};

// 删除帖子
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找帖子
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查权限
    if (post.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此帖子' });
    }

    // 删除帖子
    await Post.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: '帖子已删除' });
  } catch (error) {
    console.error('删除帖子错误:', error);
    res.status(500).json({ success: false, message: '删除帖子失败', error: error.message });
  }
};

// 点赞/取消点赞帖子
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找帖子
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 检查是否已点赞
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // 取消点赞
      post.likes = post.likes.filter(like => like.toString() !== userId);
    } else {
      // 添加点赞
      post.likes.push(userId);
    }

    await post.save();

    res.status(200).json({ 
      success: true, 
      data: { 
        likes: post.likes.length,
        isLiked: !isLiked
      }
    });
  } catch (error) {
    console.error('点赞帖子错误:', error);
    res.status(500).json({ success: false, message: '点赞操作失败', error: error.message });
  }
};

// 评论帖子
exports.commentOnPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ success: false, message: '评论内容不能为空' });
    }

    // 添加评论
    const post = await Post.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            user: userId,
            content,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 获取最新添加的评论
    const newComment = post.comments[post.comments.length - 1];

    // 填充评论用户信息
    await User.populate(newComment, {
      path: 'user',
      select: 'username nickname avatar'
    });

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    console.error('评论帖子错误:', error);
    res.status(500).json({ success: false, message: '评论失败', error: error.message });
  }
};

// 删除评论
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    // 查找帖子
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 查找评论
    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: '评论不存在' });
    }

    // 检查权限（帖子作者或评论作者可以删除评论）
    if (comment.user.toString() !== userId && post.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: '无权删除此评论' });
    }

    // 删除评论
    comment.remove();
    await post.save();

    res.status(200).json({ success: true, message: '评论已删除' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ success: false, message: '删除评论失败', error: error.message });
  }
};

// 获取帖子评论
exports.getPostComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const userId = req.user ? req.user.id : null;

    // 查找帖子
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    
    // 获取评论并按时间排序（从新到旧）
    let comments = post.comments || [];
    comments.sort((a, b) => b.createdAt - a.createdAt);
    
    // 分页处理
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedComments = comments.slice(startIndex, endIndex);
    
    // 填充评论用户信息
    await User.populate(paginatedComments, {
      path: 'user',
      select: 'username nickname avatar'
    });
    
    res.status(200).json({
      success: true,
      data: paginatedComments,
      pagination: {
        total: comments.length,
        page: parseInt(page),
        pages: Math.ceil(comments.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取帖子评论错误:', error);
    res.status(500).json({ success: false, message: '获取评论失败', error: error.message });
  }
};

// 获取当前用户的帖子
exports.getMyPosts = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const userId = req.user.id;

    // 验证用户ID
    if (!userId) {
      return res.status(401).json({ success: false, message: '未授权，请先登录' });
    }

    // 查询当前用户的所有帖子
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .populate('walkRecord');

    const total = await Post.countDocuments({ user: userId });

    // 标记帖子是否已点赞
    posts.forEach(post => {
      post._doc.isLiked = post.likes.includes(userId);
    });

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取我的帖子错误:', error);
    res.status(500).json({ success: false, message: '获取我的帖子失败', error: error.message });
  }
};

// 获取关注用户的帖子
exports.getFollowingPosts = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const userId = req.user.id;

    // 获取当前用户信息，包括关注的用户列表
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 如果用户没有关注任何人，返回空列表
    if (!user.following || user.following.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          pages: 0
        }
      });
    }

    // 查询关注用户的帖子
    const posts = await Post.find({
      user: { $in: user.following },
      isPublic: true
    })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .populate('walkRecord');

    const total = await Post.countDocuments({
      user: { $in: user.following },
      isPublic: true
    });

    // 标记帖子是否已点赞
    posts.forEach(post => {
      post._doc.isLiked = post.likes.includes(userId);
    });

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取关注用户帖子错误:', error);
    res.status(500).json({ success: false, message: '获取关注用户帖子失败', error: error.message });
  }
};

// 上传帖子图片
exports.uploadPostImage = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // 检查帖子是否存在并且属于当前用户
    const post = await Post.findOne({ _id: postId, user: userId });
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到帖子或您无权修改此帖子' 
      });
    }

    // 检查是否有文件上传
    if (!req.files || Object.keys(req.files).length === 0) {
      // 如果没有文件但有图片URL，可能是客户端直接提供了图片URL
      if (req.body && req.body.imageUrl) {
        // 添加图片URL到帖子
        if (!post.images) {
          post.images = [];
        }
        post.images.push(req.body.imageUrl);
        await post.save();

        return res.status(200).json({
          success: true,
          url: req.body.imageUrl,
          message: '图片URL已添加到帖子'
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        message: '没有提供图片文件' 
      });
    }

    // 处理上传的图片文件
    const imageFile = req.files.image;
    const uploadPath = path.join(__dirname, '../../uploads/community/', `${Date.now()}_${imageFile.name}`);
    const imageUrl = `/uploads/community/${path.basename(uploadPath)}`;

    // 移动文件到指定目录
    imageFile.mv(uploadPath, async (err) => {
      if (err) {
        console.error('移动上传文件失败:', err);
        return res.status(500).json({ 
          success: false, 
          message: '上传图片失败，服务器错误' 
        });
      }

      // 添加图片URL到帖子
      if (!post.images) {
        post.images = [];
      }
      post.images.push(imageUrl);
      await post.save();

      res.status(200).json({
        success: true,
        url: imageUrl,
        message: '图片已上传并添加到帖子'
      });
    });
  } catch (error) {
    console.error('上传帖子图片错误:', error);
    res.status(500).json({ 
      success: false, 
      message: '上传图片失败，服务器错误', 
      error: error.message 
    });
  }
}; 