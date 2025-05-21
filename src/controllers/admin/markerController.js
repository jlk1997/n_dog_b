const Marker = require('../../models/Marker');
const { validationResult } = require('express-validator');

/**
 * 获取标记列表
 */
exports.getMarkers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type,
      search,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 添加状态筛选
    if (status) {
      query.status = status;
    }
    
    // 添加类型筛选
    if (type) {
      query.type = type;
    }
    
    // 添加搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 查询标记列表
    const markers = await Marker.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'nickname avatar')
      .lean();
    
    // 获取总数
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
    console.error('Admin getMarkers error:', error);
    res.status(500).json({ success: false, message: '获取标记列表失败', error: error.message });
  }
};

/**
 * 获取标记详情
 */
exports.getMarkerDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询标记详情
    const marker = await Marker.findById(id)
      .populate('createdBy', 'nickname avatar')
      .lean();
    
    if (!marker) {
      return res.status(404).json({ success: false, message: '标记不存在' });
    }
    
    res.status(200).json({ success: true, data: marker });
  } catch (error) {
    console.error('Admin getMarkerDetail error:', error);
    res.status(500).json({ success: false, message: '获取标记详情失败', error: error.message });
  }
};

/**
 * 创建标记
 */
exports.createMarker = async (req, res) => {
  try {
    const { name, type, latitude, longitude, address, description, status = 'pending' } = req.body;
    
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // 处理上传的图片
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push(file.path);
      });
    }
    
    // 创建标记
    const marker = new Marker({
      name,
      type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      address,
      description,
      images,
      status,
      createdBy: req.user.id
    });
    
    await marker.save();
    
    // 获取包含创建者信息的完整标记
    const newMarker = await Marker.findById(marker._id)
      .populate('createdBy', 'nickname avatar');
    
    res.status(201).json({ success: true, data: newMarker, message: '标记创建成功' });
  } catch (error) {
    console.error('Admin createMarker error:', error);
    res.status(500).json({ success: false, message: '创建标记失败', error: error.message });
  }
};

/**
 * 更新标记
 */
exports.updateMarker = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, latitude, longitude, address, description, status } = req.body;
    
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // 查询标记是否存在
    const marker = await Marker.findById(id);
    
    if (!marker) {
      return res.status(404).json({ success: false, message: '标记不存在' });
    }
    
    // 准备更新数据
    const updateData = {
      name,
      type,
      address,
      description,
      status,
      updatedAt: Date.now()
    };
    
    // 如果提供了坐标，更新位置
    if (latitude && longitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }
    
    // 更新标记
    const updatedMarker = await Marker.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('createdBy', 'nickname avatar');
    
    res.status(200).json({ success: true, data: updatedMarker, message: '标记更新成功' });
  } catch (error) {
    console.error('Admin updateMarker error:', error);
    res.status(500).json({ success: false, message: '更新标记失败', error: error.message });
  }
};

/**
 * 删除标记
 */
exports.deleteMarker = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询标记是否存在
    const marker = await Marker.findById(id);
    
    if (!marker) {
      return res.status(404).json({ success: false, message: '标记不存在' });
    }
    
    // 删除标记
    await Marker.findByIdAndDelete(id);
    
    res.status(200).json({ success: true, message: '标记删除成功' });
  } catch (error) {
    console.error('Admin deleteMarker error:', error);
    res.status(500).json({ success: false, message: '删除标记失败', error: error.message });
  }
};

/**
 * 审核标记
 */
exports.reviewMarker = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // 状态验证
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的审核状态' });
    }
    
    // 查询标记是否存在
    const marker = await Marker.findById(id);
    
    if (!marker) {
      return res.status(404).json({ success: false, message: '标记不存在' });
    }
    
    // 更新标记状态
    const updatedMarker = await Marker.findByIdAndUpdate(
      id,
      { 
        status,
        rejectionReason: status === 'rejected' ? (reason || '内容不符合规范') : null,
        reviewedAt: Date.now(),
        reviewedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('createdBy', 'nickname avatar');
    
    const message = status === 'approved' ? '标记已通过审核' : '标记已被拒绝';
    
    res.status(200).json({ success: true, data: updatedMarker, message });
  } catch (error) {
    console.error('Admin reviewMarker error:', error);
    res.status(500).json({ success: false, message: '审核标记失败', error: error.message });
  }
}; 