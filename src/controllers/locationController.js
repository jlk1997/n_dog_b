/**
 * 位置相关控制器
 */

const mongoose = require('mongoose');
const Location = require('../models/Location');
const WalkRecord = require('../models/WalkRecord');
const User = require('../models/User');

/**
 * 更新用户位置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateUserLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: '缺少位置信息' });
    }
    
    // 更新用户位置
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          lastLocationUpdate: new Date()
        }
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        latitude,
        longitude,
        timestamp: user.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('更新位置失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取附近的用户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getNearbyUsers = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5000 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: '缺少位置信息' });
    }
    
    // 查找附近用户
    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      },
      _id: { $ne: req.user.id } // 排除自己
    })
    .select('_id username nickname avatar location lastLocationUpdate')
    .limit(20);
    
    // 转换为前端需要的格式
    const users = nearbyUsers.map(user => ({
      id: user._id,
      username: user.username,
      nickname: user.nickname || user.username,
      userAvatar: user.avatar,
      latitude: user.location.coordinates[1],
      longitude: user.location.coordinates[0],
      lastUpdated: user.lastLocationUpdate
    }));
    
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('获取附近用户失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 创建遛狗记录
 */
exports.createWalkRecord = async (req, res) => {
  // 实现创建遛狗记录的逻辑
  res.status(501).json({ message: '功能尚未实现' });
};

/**
 * 获取用户遛狗记录
 */
exports.getUserWalks = async (req, res) => {
  // 实现获取用户遛狗记录的逻辑
  res.status(501).json({ message: '功能尚未实现' });
};

/**
 * 获取单个遛狗记录
 */
exports.getWalkById = async (req, res) => {
  // 实现获取单个遛狗记录的逻辑
  res.status(501).json({ message: '功能尚未实现' });
};

/**
 * 开始遛狗
 */
exports.startWalking = async (req, res) => {
  // 实现开始遛狗的逻辑
  res.status(501).json({ message: '功能尚未实现' });
};

/**
 * 结束遛狗
 */
exports.stopWalking = async (req, res) => {
  // 实现结束遛狗的逻辑
  res.status(501).json({ message: '功能尚未实现' });
};

/**
 * 获取常去的遛狗地点
 */
exports.getFrequentLocations = async (req, res) => {
  // 实现获取常去的遛狗地点的逻辑
  res.status(501).json({ message: '功能尚未实现' });
};

/**
 * 删除遛狗记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.deleteWalkRecord = async (req, res) => {
  try {
    const walkId = req.params.id;
    
    if (!walkId) {
      return res.status(400).json({ success: false, message: '缺少记录ID' });
    }
    
    // 确保记录存在且属于当前用户
    const walkRecord = await WalkRecord.findOne({
      _id: walkId,
      user: req.user.id
    });
    
    if (!walkRecord) {
      return res.status(404).json({ success: false, message: '未找到记录或无权删除' });
    }
    
    // 删除记录
    await WalkRecord.findByIdAndDelete(walkId);
    
    res.status(200).json({
      success: true,
      message: '记录已成功删除'
    });
  } catch (error) {
    console.error('删除遛狗记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
}; 