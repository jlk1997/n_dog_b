const Marker = require('../models/Marker');
const mongoose = require('mongoose');

/**
 * @desc    创建新标记
 * @route   POST /api/markers
 * @access  Private
 */
exports.createMarker = async (req, res) => {
  try {
    const { title, description, type, icon, color, longitude, latitude, radius, isPublic, pet, images } = req.body;
    
    console.log('创建标记 - 请求体:', JSON.stringify(req.body, null, 2));
    console.log('图片数据:', images);
    
    // 验证必填字段
    if (!title || !longitude || !latitude) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供标记标题和位置信息' 
      });
    }
    
    // 创建标记数据
    const markerData = {
      user: req.user.id,
      title,
      description: description || '',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      isPublic: isPublic !== undefined ? isPublic : true
    };
    
    // 添加可选字段
    if (type) markerData.type = type;
    if (icon) markerData.icon = icon;
    if (color) markerData.color = color;
    if (radius !== undefined) markerData.radius = parseFloat(parseFloat(radius).toFixed(2));
    if (pet) markerData.pet = pet;
    
    // 处理图片数据
    if (images && Array.isArray(images) && images.length > 0) {
      markerData.images = images.map(img => ({
        url: img.url,
        caption: img.caption || ''
      }));
      console.log('处理后的图片数据:', markerData.images);
    }
    
    // 创建并保存标记
    const marker = await Marker.create(markerData);
    console.log('创建的标记:', marker);
    
    // 如果有宠物ID，则填充宠物信息
    if (pet) {
      await marker.populate('pet', 'name avatar breed');
    }
    
    res.status(201).json({
      success: true,
      data: marker,
      message: '标记已成功创建'
    });
  } catch (error) {
    console.error('创建标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '创建标记失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    获取单个标记
 * @route   GET /api/markers/:id
 * @access  Public/Private
 */
exports.getMarker = async (req, res) => {
  try {
    const marker = await Marker.findById(req.params.id)
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed');
    
    if (!marker) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该标记' 
      });
    }
    
    // 检查私有标记的访问权限
    if (!marker.isPublic && (!req.user || req.user.id !== marker.user._id.toString())) {
      return res.status(403).json({ 
        success: false, 
        message: '您无权查看此标记' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: marker
    });
  } catch (error) {
    console.error('获取标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取标记失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    更新标记
 * @route   PUT /api/markers/:id
 * @access  Private
 */
exports.updateMarker = async (req, res) => {
  try {
    const { title, description, type, icon, color, longitude, latitude, radius, isPublic, pet, images } = req.body;
    
    // 查找标记
    let marker = await Marker.findById(req.params.id);
    
    if (!marker) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该标记' 
      });
    }
    
    // 验证权限 - 只允许创建者或管理员更新
    if (marker.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '您无权更新此标记' 
      });
    }
    
    // 准备更新数据
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type;
    if (icon) updateData.icon = icon;
    if (color) updateData.color = color;
    if (radius !== undefined) updateData.radius = parseFloat(parseFloat(radius).toFixed(2));
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (pet) updateData.pet = pet;
    
    // 处理图片数据
    if (images && Array.isArray(images)) {
      updateData.images = images.map(img => ({
        url: img.url,
        caption: img.caption || ''
      }));
    }
    
    // 更新位置信息
    if (longitude && latitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }
    
    // 更新标记
    marker = await Marker.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed');
    
    res.status(200).json({
      success: true,
      data: marker,
      message: '标记已成功更新'
    });
  } catch (error) {
    console.error('更新标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新标记失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    删除标记
 * @route   DELETE /api/markers/:id
 * @access  Private
 */
exports.deleteMarker = async (req, res) => {
  try {
    const marker = await Marker.findById(req.params.id);
    
    if (!marker) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该标记' 
      });
    }
    
    // 验证权限 - 只允许创建者或管理员删除
    if (marker.user && marker.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '您无权删除此标记' 
      });
    }
    
    // 使用findByIdAndDelete替代remove方法
    await Marker.findByIdAndDelete(req.params.id);
    
    // 返回成功响应
    return res.status(200).json({
      success: true,
      message: '标记已成功删除',
      data: { _id: req.params.id }
    });
  } catch (error) {
    console.error('删除标记失败:', error);
    return res.status(500).json({ 
      success: false, 
      message: '服务器错误，请稍后再试', 
      error: error.message 
    });
  }
};

/**
 * @desc    获取所有公共标记和当前用户的标记
 * @route   GET /api/markers
 * @access  Public/Private
 */
exports.getMarkers = async (req, res) => {
  try {
    // 解析查询参数
    const { 
      longitude, 
      latitude, 
      radius = 5000, 
      type, 
      limit = 50, 
      page = 1,
      queryMode,
      minLat, maxLat, minLng, maxLng, // 新增：支持矩形区域查询
      useRectQuery // 新增：是否使用矩形查询
    } = req.query;
    
    // 创建查询条件
    let query = {};
    
    // 如果用户已登录，显示所有公开标记和用户自己的标记
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { user: req.user.id }
        ]
      };
    } else {
      // 未登录用户只能看到公开标记
      query = { isPublic: true };
    }
    
    // 根据类型筛选
    if (type) {
      query.type = type;
    }
    
    // 根据地理位置筛选
    if (longitude && latitude) {
      const parsedLongitude = parseFloat(longitude);
      const parsedLatitude = parseFloat(latitude);
      const parsedRadius = parseInt(radius);
      
      // 检查请求的查询模式
      if (queryMode === 'geoWithin' || useRectQuery) {
        // 使用$geoWithin查询，避免MongoDB排序限制
        console.log('使用$geoWithin查询模式');
        
        // 创建一个圆形区域查询
        query.location = {
          $geoWithin: {
            $centerSphere: [
              [parsedLongitude, parsedLatitude],
              parsedRadius / 6378100 // 将米转换为弧度（地球半径约6378.1公里）
            ]
          }
        };
      } else if (useRectQuery && minLat && maxLat && minLng && maxLng) {
        // 使用矩形范围查询
        console.log('使用矩形区域查询');
        query.location = {
          $geoWithin: {
            $box: [
              [parseFloat(minLng), parseFloat(minLat)], // 左下角
              [parseFloat(maxLng), parseFloat(maxLat)]  // 右上角
            ]
          }
        };
      } else {
        // 默认使用$near查询（需要地理空间索引且MongoDB版本支持）
        try {
          console.log('尝试使用$near查询模式');
          query.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [parsedLongitude, parsedLatitude]
              },
              $maxDistance: parsedRadius
            }
          };
        } catch (geoError) {
          // 如果$near查询出错，退回到$geoWithin查询
          console.error('$near查询失败，切换到$geoWithin查询:', geoError);
          query.location = {
            $geoWithin: {
              $centerSphere: [
                [parsedLongitude, parsedLatitude],
                parsedRadius / 6378100
              ]
            }
          };
        }
      }
    }
    
    // 执行查询
    try {
      const markers = await Marker.find(query)
        .populate('user', 'username nickname avatar')
        .populate('pet', 'name avatar breed')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      // 计算总数
      const total = await Marker.countDocuments(query);
      
      res.status(200).json({
        success: true,
        data: markers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (queryError) {
      // 如果查询失败，可能是地理空间查询错误，尝试使用备用查询方法
      if (queryError.message && (
          queryError.message.includes('$geoNear') || 
          queryError.message.includes('$near') ||
          queryError.message.includes('sort')
        )) {
        console.log('检测到地理空间查询错误，使用备用查询');
        
        // 移除可能导致错误的地理空间查询条件
        delete query.location;
        
        // 获取不带地理位置条件的标记
        const markers = await Marker.find(query)
          .populate('user', 'username nickname avatar')
          .populate('pet', 'name avatar breed')
          .skip((parseInt(page) - 1) * parseInt(limit))
          .limit(parseInt(limit))
          .sort({ createdAt: -1 });
          
        // 计算总数
        const total = await Marker.countDocuments(query);
        
        res.status(200).json({
          success: true,
          data: markers,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          },
          note: '由于地理空间查询限制，返回的结果未按距离排序'
        });
      } else {
        // 其他查询错误，向上抛出
        throw queryError;
      }
    }
  } catch (error) {
    console.error('获取标记列表失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取标记列表失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    获取用户的标记
 * @route   GET /api/markers/user/:userId
 * @access  Public/Private
 */
exports.getUserMarkers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // 创建查询条件
    let query = { user: userId };
    
    // 非用户本人只能看到公开标记
    if (!req.user || req.user.id !== userId) {
      query.isPublic = true;
    }
    
    // 执行查询
    const markers = await Marker.find(query)
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // 计算总数
    const total = await Marker.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: markers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取用户标记失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    点赞标记
 * @route   POST /api/markers/:id/like
 * @access  Private
 */
exports.likeMarker = async (req, res) => {
  try {
    const marker = await Marker.findById(req.params.id);
    
    if (!marker) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该标记' 
      });
    }
    
    // 检查用户是否已点赞
    if (marker.likedBy.includes(req.user.id)) {
      return res.status(400).json({ 
        success: false, 
        message: '您已经点赞过此标记' 
      });
    }
    
    // 添加点赞
    marker.likes += 1;
    marker.likedBy.push(req.user.id);
    await marker.save();
    
    res.status(200).json({
      success: true,
      message: '点赞成功',
      likes: marker.likes
    });
  } catch (error) {
    console.error('点赞标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '点赞失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    取消点赞标记
 * @route   POST /api/markers/:id/unlike
 * @access  Private
 */
exports.unlikeMarker = async (req, res) => {
  try {
    const marker = await Marker.findById(req.params.id);
    
    if (!marker) {
      return res.status(404).json({ 
        success: false, 
        message: '未找到该标记' 
      });
    }
    
    // 检查用户是否已点赞
    if (!marker.likedBy.includes(req.user.id)) {
      return res.status(400).json({ 
        success: false, 
        message: '您尚未点赞此标记' 
      });
    }
    
    // 取消点赞
    marker.likes = Math.max(0, marker.likes - 1);
    marker.likedBy = marker.likedBy.filter(
      userId => userId.toString() !== req.user.id
    );
    await marker.save();
    
    res.status(200).json({
      success: true,
      message: '取消点赞成功',
      likes: marker.likes
    });
  } catch (error) {
    console.error('取消点赞标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '取消点赞失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    通过POST请求查询标记
 * @route   POST /api/markers/search
 * @access  Public/Private
 */
exports.searchMarkersByPost = async (req, res) => {
  try {
    // 从请求体获取查询参数
    const { 
      longitude, 
      latitude, 
      radius = 5000, 
      type,
      limit = 50, 
      page = 1,
      queryMode,
      useRectQuery,
      minLat, maxLat, minLng, maxLng
    } = req.body;
    
    // 创建查询条件
    let query = {};
    
    // 如果用户已登录，显示所有公开标记和用户自己的标记
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { user: req.user.id }
        ]
      };
    } else {
      // 未登录用户只能看到公开标记
      query = { isPublic: true };
    }
    
    // 根据类型筛选
    if (type) {
      query.type = type;
    }
    
    // 处理地理位置查询
    if (longitude && latitude) {
      const parsedLongitude = parseFloat(longitude);
      const parsedLatitude = parseFloat(latitude);
      const parsedRadius = parseInt(radius);
      
      // 根据查询模式选择查询方式
      if (queryMode === 'geoWithin' || useRectQuery) {
        console.log('POST请求：使用$geoWithin查询模式');
        
        query.location = {
          $geoWithin: {
            $centerSphere: [
              [parsedLongitude, parsedLatitude],
              parsedRadius / 6378100
            ]
          }
        };
      } else if (useRectQuery && minLat && maxLat && minLng && maxLng) {
        console.log('POST请求：使用矩形区域查询');
        
        query.location = {
          $geoWithin: {
            $box: [
              [parseFloat(minLng), parseFloat(minLat)],
              [parseFloat(maxLng), parseFloat(maxLat)]
            ]
          }
        };
      } else {
        try {
          // 尝试使用$near查询
          console.log('POST请求：尝试$near查询');
          
          query.location = {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [parsedLongitude, parsedLatitude]
              },
              $maxDistance: parsedRadius
            }
          };
        } catch (geoError) {
          // 出错时切换到$geoWithin
          console.log('$near查询出错，切换到$geoWithin查询');
          
          query.location = {
            $geoWithin: {
              $centerSphere: [
                [parsedLongitude, parsedLatitude],
                parsedRadius / 6378100
              ]
            }
          };
        }
      }
    }
    
    try {
      // 执行查询
      const markers = await Marker.find(query)
        .populate('user', 'username nickname avatar')
        .populate('pet', 'name avatar breed')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
      
      // 计算总数
      const total = await Marker.countDocuments(query);
      
      res.status(200).json({
        success: true,
        data: markers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (queryError) {
      // 处理查询错误
      if (queryError.message && (
          queryError.message.includes('$geoNear') || 
          queryError.message.includes('$near') ||
          queryError.message.includes('sort')
        )) {
        console.log('POST查询：检测到地理空间查询错误，使用备用查询');
        
        // 移除地理空间查询条件
        delete query.location;
        
        // 不带地理位置条件查询
        const markers = await Marker.find(query)
          .populate('user', 'username nickname avatar')
          .populate('pet', 'name avatar breed')
          .skip((parseInt(page) - 1) * parseInt(limit))
          .limit(parseInt(limit))
          .sort({ createdAt: -1 });
        
        // 计算总数
        const total = await Marker.countDocuments(query);
        
        res.status(200).json({
          success: true,
          data: markers,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
          },
          note: '由于地理空间查询限制，返回的结果未按距离排序'
        });
      } else {
        throw queryError;
      }
    }
  } catch (error) {
    console.error('POST方法获取标记列表失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取标记列表失败', 
      error: error.message 
    });
  }
};

/**
 * @desc    获取所有标记（不使用地理查询）
 * @route   GET /api/markers/all
 * @access  Public/Private
 */
exports.getAllMarkers = async (req, res) => {
  try {
    const { limit = 100, page = 1, type } = req.query;
    
    // 创建查询条件
    let query = {};
    
    // 如果用户已登录，显示所有公开标记和用户自己的标记
    if (req.user) {
      query = {
        $or: [
          { isPublic: true },
          { user: req.user.id }
        ]
      };
    } else {
      // 未登录用户只能看到公开标记
      query = { isPublic: true };
    }
    
    // 根据类型筛选
    if (type) {
      query.type = type;
    }
    
    // 执行查询
    const markers = await Marker.find(query)
      .populate('user', 'username nickname avatar')
      .populate('pet', 'name avatar breed')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    // 计算总数
    const total = await Marker.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: markers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      note: '获取所有标记，前端需要进行距离过滤'
    });
  } catch (error) {
    console.error('获取所有标记失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取所有标记失败', 
      error: error.message 
    });
  }
}; 