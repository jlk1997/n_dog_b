const Pet = require('../../models/Pet');
const User = require('../../models/User');
const { validationResult } = require('express-validator');

/**
 * 获取宠物列表
 */
exports.getPets = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      breed, 
      owner,
      search,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // 构建查询条件
    const query = {};
    
    // 添加品种筛选
    if (breed) {
      query.breed = breed;
    }
    
    // 添加主人筛选
    if (owner) {
      query.owner = owner;
    }
    
    // 添加搜索条件
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建排序
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // 查询宠物列表
    const pets = await Pet.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'nickname avatar')
      .lean();
    
    // 获取总数
    const total = await Pet.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: pets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getPets error:', error);
    res.status(500).json({ success: false, message: '获取宠物列表失败', error: error.message });
  }
};

/**
 * 获取宠物详情
 */
exports.getPetDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询宠物详情
    const pet = await Pet.findById(id)
      .populate('owner', 'nickname avatar email phone')
      .lean();
    
    if (!pet) {
      return res.status(404).json({ success: false, message: '宠物不存在' });
    }
    
    res.status(200).json({ success: true, data: pet });
  } catch (error) {
    console.error('Admin getPetDetail error:', error);
    res.status(500).json({ success: false, message: '获取宠物详情失败', error: error.message });
  }
};

/**
 * 更新宠物信息
 */
exports.updatePet = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, breed, age, gender, weight, description, avatar } = req.body;
    
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    // 查询宠物是否存在
    const pet = await Pet.findById(id);
    
    if (!pet) {
      return res.status(404).json({ success: false, message: '宠物不存在' });
    }
    
    // 更新宠物信息
    const updatedPet = await Pet.findByIdAndUpdate(
      id,
      { 
        name, 
        breed, 
        age, 
        gender, 
        weight, 
        description, 
        avatar,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('owner', 'nickname avatar');
    
    res.status(200).json({ success: true, data: updatedPet, message: '宠物信息更新成功' });
  } catch (error) {
    console.error('Admin updatePet error:', error);
    res.status(500).json({ success: false, message: '更新宠物信息失败', error: error.message });
  }
};

/**
 * 删除宠物
 */
exports.deletePet = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查询宠物是否存在
    const pet = await Pet.findById(id);
    
    if (!pet) {
      return res.status(404).json({ success: false, message: '宠物不存在' });
    }
    
    // 删除宠物
    await Pet.findByIdAndDelete(id);
    
    // 如果用户有宠物列表，从中移除该宠物
    if (pet.owner) {
      await User.updateOne(
        { _id: pet.owner },
        { $pull: { pets: id } }
      );
    }
    
    res.status(200).json({ success: true, message: '宠物删除成功' });
  } catch (error) {
    console.error('Admin deletePet error:', error);
    res.status(500).json({ success: false, message: '删除宠物失败', error: error.message });
  }
}; 