const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

/**
 * 发送附近消息
 */
exports.sendNearbyMessage = async (req, res) => {
  try {
    const { content, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ success: false, message: '消息内容不能为空' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: '位置信息不能为空' });
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 创建新消息
    const newMessage = new ChatMessage({
      content,
      sender: userId,
      senderName: user.nickname || user.username,
      senderAvatar: user.avatar || '/static/images/default-avatar.png',
      messageType: 'nearby',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    });

    // 保存消息
    await newMessage.save();

    // 清理旧消息，只保留最新的100条
    try {
      // 计算nearby消息总数
      const nearbyCount = await ChatMessage.countDocuments({ messageType: 'nearby' });
      
      // 如果超过100条消息，删除最旧的消息
      if (nearbyCount > 100) {
        // 找出最旧的消息并删除
        const messagesToDelete = await ChatMessage.find({ messageType: 'nearby' })
          .sort({ createdAt: 1 }) // 按时间升序排序，最早的在前面
          .limit(nearbyCount - 100) // 取出需要删除的数量
          .select('_id'); // 只选择ID字段

        if (messagesToDelete.length > 0) {
          const messageIds = messagesToDelete.map(msg => msg._id);
          await ChatMessage.deleteMany({ _id: { $in: messageIds } });
          console.log(`已清理 ${messageIds.length} 条旧附近消息`);
        }
      }
    } catch (cleanupError) {
      console.error('清理旧消息失败:', cleanupError);
      // 清理失败不影响主流程，继续执行
    }

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: newMessage
    });
  } catch (error) {
    console.error('发送附近消息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 发送城市消息
 */
exports.sendCityMessage = async (req, res) => {
  try {
    const { content, cityName, latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ success: false, message: '消息内容不能为空' });
    }

    if (!cityName) {
      return res.status(400).json({ success: false, message: '城市名称不能为空' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: '位置信息不能为空' });
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 创建新消息
    const newMessage = new ChatMessage({
      content,
      sender: userId,
      senderName: user.nickname || user.username,
      senderAvatar: user.avatar || '/static/images/default-avatar.png',
      messageType: 'city',
      cityName,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    });

    // 保存消息
    await newMessage.save();

    // 清理旧消息，只保留每个城市最新的100条消息
    try {
      // 计算当前城市消息总数
      const cityCount = await ChatMessage.countDocuments({ 
        messageType: 'city', 
        cityName: cityName 
      });
      
      // 如果超过100条消息，删除最旧的消息
      if (cityCount > 100) {
        // 找出最旧的消息并删除
        const messagesToDelete = await ChatMessage.find({ 
          messageType: 'city',
          cityName: cityName
        })
          .sort({ createdAt: 1 }) // 按时间升序排序，最早的在前面
          .limit(cityCount - 100) // 取出需要删除的数量
          .select('_id'); // 只选择ID字段

        if (messagesToDelete.length > 0) {
          const messageIds = messagesToDelete.map(msg => msg._id);
          await ChatMessage.deleteMany({ _id: { $in: messageIds } });
          console.log(`已清理 ${messageIds.length} 条旧城市消息 (${cityName})`);
        }
      }
    } catch (cleanupError) {
      console.error('清理旧城市消息失败:', cleanupError);
      // 清理失败不影响主流程，继续执行
    }

    res.status(201).json({
      success: true,
      message: '消息发送成功',
      data: newMessage
    });
  } catch (error) {
    console.error('发送城市消息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取附近消息
 */
exports.getNearbyMessages = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: '位置信息不能为空' });
    }

    // 将查询参数转换为数字类型
    const radiusInMeters = parseInt(radius);
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // 计算分页
    const skip = (pageNum - 1) * limitNum;

    console.log('查询附近消息参数:', {
      messageType: 'nearby',
      coordinates: [lng, lat],
      maxDistance: radiusInMeters,
      skip,
      limit: limitNum
    });

    // 使用正确的地理空间查询格式
    const messages = await ChatMessage.find({
      messageType: 'nearby',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInMeters // 单位：米
        }
      }
    })
      .sort({ createdAt: -1 }) // 最新消息优先
      .skip(skip)
      .limit(limitNum)
      .exec();

    console.log(`找到 ${messages.length} 条消息`);

    // 计算总消息数量 - 避免使用相同复杂查询来计数
    // 如果性能有问题，可以考虑返回估计值或移除分页数据
    const total = await ChatMessage.countDocuments({
      messageType: 'nearby'
    });

    // 处理结果，计算距离
    const messageResults = messages.map(message => {
      // 计算距离（米）
      const distance = calculateDistance(
        lat,
        lng,
        message.location.coordinates[1],
        message.location.coordinates[0]
      );

      return {
        id: message._id,
        content: message.content,
        userId: message.sender,
        userName: message.senderName,
        userAvatar: message.senderAvatar,
        createTime: message.createdAt,
        distance: Math.round(distance), // 四舍五入到整数
        status: message.status,
        isOwnMessage: message.sender.toString() === userId
      };
    });

    res.status(200).json({
      success: true,
      data: messageResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total
      }
    });
  } catch (error) {
    console.error('获取附近消息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 获取城市消息
 */
exports.getCityMessages = async (req, res) => {
  try {
    const { cityName, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!cityName) {
      return res.status(400).json({ success: false, message: '城市名称不能为空' });
    }

    // 将查询参数转换为数字类型
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 计算分页
    const skip = (pageNum - 1) * limitNum;

    console.log('查询城市消息参数:', {
      messageType: 'city',
      cityName,
      skip,
      limit: limitNum
    });

    // 查询城市消息
    const messages = await ChatMessage.find({
      messageType: 'city',
      cityName: cityName
    })
      .sort({ createdAt: -1 }) // 最新消息优先
      .skip(skip)
      .limit(limitNum)
      .exec();

    console.log(`找到 ${messages.length} 条城市消息`);

    // 计算总消息数量
    const total = await ChatMessage.countDocuments({
      messageType: 'city',
      cityName: cityName
    });

    // 处理结果
    const messageResults = messages.map(message => {
      return {
        id: message._id,
        content: message.content,
        userId: message.sender,
        userName: message.senderName,
        userAvatar: message.senderAvatar,
        createTime: message.createdAt,
        status: message.status,
        isOwnMessage: message.sender.toString() === userId
      };
    });

    res.status(200).json({
      success: true,
      data: messageResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total
      }
    });
  } catch (error) {
    console.error('获取城市消息失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 计算两点之间的距离（米）
 * 使用 Haversine 公式
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 将角度转换为弧度
 */
function toRad(value) {
  return value * Math.PI / 180;
} 