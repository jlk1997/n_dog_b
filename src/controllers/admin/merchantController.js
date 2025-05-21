const Merchant = require('../../models/Merchant');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

/**
 * 获取商家列表
 */
exports.getMerchants = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type,
      search,
      verified,
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
    
    // 添加认证筛选
    if (verified !== undefined) {
      query.verified = verified === 'true';
    }
    
    // 添加搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'contact.name': { $regex: search, $options: 'i' } },
        { 'contact.phone': { $regex: search, $options: 'i' } },
        { 'contact.email': { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 查询商家列表
    const merchants = await Merchant.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // 获取总数
    const total = await Merchant.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: merchants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getMerchants error:', error);
    res.status(500).json({ success: false, message: '获取商家列表失败', error: error.message });
  }
};

/**
 * 获取商家详情
 */
exports.getMerchantDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询商家详情
    const merchant = await Merchant.findById(id).lean();
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    res.status(200).json({ success: true, data: merchant });
  } catch (error) {
    console.error('Admin getMerchantDetail error:', error);
    res.status(500).json({ success: false, message: '获取商家详情失败', error: error.message });
  }
};

/**
 * 创建商家
 */
exports.createMerchant = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      latitude, 
      longitude, 
      address, 
      description, 
      businessHours,
      services,
      status = 'pending',
      verified = false,
      contact
    } = req.body;
    
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // 处理上传的Logo
    let logo = null;
    if (req.file) {
      logo = req.file.path;
    }
    
    // 创建商家
    const merchant = new Merchant({
      name,
      type,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      address,
      description,
      businessHours,
      services: services ? JSON.parse(services) : [],
      images: [],
      logo,
      status,
      verified,
      contact: contact ? JSON.parse(contact) : {},
      createdBy: req.user.id
    });
    
    await merchant.save();
    
    res.status(201).json({ success: true, data: merchant, message: '商家创建成功' });
  } catch (error) {
    console.error('Admin createMerchant error:', error);
    res.status(500).json({ success: false, message: '创建商家失败', error: error.message });
  }
};

/**
 * 更新商家
 */
exports.updateMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      type, 
      latitude, 
      longitude, 
      address, 
      description, 
      businessHours,
      services,
      status,
      contact
    } = req.body;
    
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 准备更新数据
    const updateData = {
      name,
      type,
      address,
      description,
      businessHours,
      status,
      updatedAt: Date.now()
    };
    
    // 如果提供了服务列表，更新服务
    if (services) {
      updateData.services = JSON.parse(services);
    }
    
    // 如果提供了联系信息，更新联系信息
    if (contact) {
      updateData.contact = JSON.parse(contact);
    }
    
    // 如果提供了坐标，更新位置
    if (latitude && longitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }
    
    // 更新商家
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    res.status(200).json({ success: true, data: updatedMerchant, message: '商家更新成功' });
  } catch (error) {
    console.error('Admin updateMerchant error:', error);
    res.status(500).json({ success: false, message: '更新商家失败', error: error.message });
  }
};

/**
 * 删除商家
 */
exports.deleteMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 删除商家相关的文件
    if (merchant.logo) {
      try {
        fs.unlinkSync(merchant.logo);
      } catch (err) {
        console.error('Error deleting logo file:', err);
      }
    }
    
    if (merchant.images && merchant.images.length > 0) {
      merchant.images.forEach(image => {
        try {
          fs.unlinkSync(image);
        } catch (err) {
          console.error('Error deleting image file:', err);
        }
      });
    }
    
    // 删除商家
    await Merchant.findByIdAndDelete(id);
    
    res.status(200).json({ success: true, message: '商家删除成功' });
  } catch (error) {
    console.error('Admin deleteMerchant error:', error);
    res.status(500).json({ success: false, message: '删除商家失败', error: error.message });
  }
};

/**
 * 认证商家
 */
exports.verifyMerchant = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 更新商家认证状态
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      id,
      { 
        verified: !!verified,
        verifiedAt: verified ? Date.now() : null,
        verifiedBy: verified ? req.user.id : null,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    const message = updatedMerchant.verified ? '商家已认证' : '商家认证已取消';
    
    res.status(200).json({ success: true, data: updatedMerchant, message });
  } catch (error) {
    console.error('Admin verifyMerchant error:', error);
    res.status(500).json({ success: false, message: '更新认证状态失败', error: error.message });
  }
};

/**
 * 切换商家状态
 */
exports.toggleMerchantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    // 状态验证
    if (!['active', 'pending', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, message: '无效的状态' });
    }
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 更新商家状态
    const updateData = { 
      status,
      updatedAt: Date.now()
    };
    
    if (status === 'disabled') {
      updateData.disabledReason = reason || '管理员操作';
      updateData.disabledAt = Date.now();
      updateData.disabledBy = req.user.id;
    }
    
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    let message;
    switch (status) {
      case 'active':
        message = '商家已激活';
        break;
      case 'pending':
        message = '商家已设为待审核';
        break;
      case 'disabled':
        message = '商家已禁用';
        break;
      default:
        message = '商家状态已更新';
    }
    
    res.status(200).json({ success: true, data: updatedMerchant, message });
  } catch (error) {
    console.error('Admin toggleMerchantStatus error:', error);
    res.status(500).json({ success: false, message: '更新商家状态失败', error: error.message });
  }
};

/**
 * 上传Logo
 */
exports.uploadLogo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证文件上传
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 删除旧Logo
    if (merchant.logo) {
      try {
        fs.unlinkSync(merchant.logo);
      } catch (err) {
        console.error('Error deleting old logo file:', err);
      }
    }
    
    // 更新Logo
    const updatedMerchant = await Merchant.findByIdAndUpdate(
      id,
      { 
        logo: req.file.path,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: { 
        logo: updatedMerchant.logo,
        merchant: updatedMerchant
      },
      message: 'Logo上传成功'
    });
  } catch (error) {
    // 删除已上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Admin uploadLogo error:', error);
    res.status(500).json({ success: false, message: 'Logo上传失败', error: error.message });
  }
};

/**
 * 上传商家图片
 */
exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证文件上传
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 添加新图片
    merchant.images.push(req.file.path);
    merchant.updatedAt = Date.now();
    await merchant.save();
    
    res.status(200).json({ 
      success: true, 
      data: { 
        image: req.file.path,
        imageId: merchant.images.length - 1,
        merchant: merchant
      },
      message: '图片上传成功'
    });
  } catch (error) {
    // 删除已上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Admin uploadImage error:', error);
    res.status(500).json({ success: false, message: '图片上传失败', error: error.message });
  }
};

/**
 * 删除商家图片
 */
exports.deleteImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    // 查询商家是否存在
    const merchant = await Merchant.findById(id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: '商家不存在' });
    }
    
    // 验证图片索引
    const imageIndex = parseInt(imageId);
    if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= merchant.images.length) {
      return res.status(400).json({ success: false, message: '无效的图片索引' });
    }
    
    // 获取图片路径
    const imagePath = merchant.images[imageIndex];
    
    // 从数组中删除图片
    merchant.images.splice(imageIndex, 1);
    merchant.updatedAt = Date.now();
    await merchant.save();
    
    // 删除图片文件
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.error('Error deleting image file:', err);
    }
    
    res.status(200).json({ success: true, message: '图片删除成功' });
  } catch (error) {
    console.error('Admin deleteImage error:', error);
    res.status(500).json({ success: false, message: '删除图片失败', error: error.message });
  }
};

/**
 * 获取商家类型
 */
exports.getMerchantTypes = async (req, res) => {
  try {
    // 商家类型列表
    const types = [
      { value: 'pet_hospital', label: '宠物医院' },
      { value: 'pet_shop', label: '宠物商店' },
      { value: 'pet_service', label: '宠物服务' },
      { value: 'pet_beauty', label: '宠物美容' },
      { value: 'pet_training', label: '宠物训练' },
      { value: 'pet_hotel', label: '宠物酒店' },
      { value: 'pet_park', label: '宠物公园' },
      { value: 'cafe', label: '宠物友好咖啡厅' },
      { value: 'restaurant', label: '宠物友好餐厅' },
      { value: 'others', label: '其他' }
    ];
    
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    console.error('Admin getMerchantTypes error:', error);
    res.status(500).json({ success: false, message: '获取商家类型失败', error: error.message });
  }
};

/**
 * 获取商家服务
 */
exports.getMerchantServices = async (req, res) => {
  try {
    // 商家服务列表
    const services = [
      { value: '宠物医疗', label: '宠物医疗' },
      { value: '宠物美容', label: '宠物美容' },
      { value: '宠物训练', label: '宠物训练' },
      { value: '宠物寄养', label: '宠物寄养' },
      { value: '宠物用品', label: '宠物用品' },
      { value: '宠物食品', label: '宠物食品' },
      { value: '宠物摄影', label: '宠物摄影' },
      { value: '宠物配种', label: '宠物配种' },
      { value: '宠物活动', label: '宠物活动' },
      { value: '其他服务', label: '其他服务' }
    ];
    
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Admin getMerchantServices error:', error);
    res.status(500).json({ success: false, message: '获取商家服务失败', error: error.message });
  }
};

/**
 * 获取商家统计数据
 */
exports.getMerchantStats = async (req, res) => {
  try {
    // 获取各种状态的商家数量
    const total = await Merchant.countDocuments();
    const active = await Merchant.countDocuments({ status: 'active' });
    const pending = await Merchant.countDocuments({ status: 'pending' });
    const disabled = await Merchant.countDocuments({ status: 'disabled' });
    const verified = await Merchant.countDocuments({ verified: true });
    
    // 按类型统计
    const typeStats = await Merchant.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        pending,
        disabled,
        verified,
        byType: typeStats.map(item => ({
          type: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Admin getMerchantStats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败', error: error.message });
  }
}; 