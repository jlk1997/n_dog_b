const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createMarker,
  getMarker,
  updateMarker,
  deleteMarker,
  getMarkers,
  getUserMarkers,
  likeMarker,
  unlikeMarker,
  searchMarkersByPost,
  getAllMarkers
} = require('../controllers/markerController');
const { uploadMarkerImages, uploadMarkerImage, uploadMarkerImageSimple } = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

// 获取所有标记 - 不使用地理空间查询，由前端过滤
router.get('/all', getAllMarkers);

// 通过POST请求搜索标记（更灵活地处理查询参数）
router.post('/search', searchMarkersByPost);

// 获取标记列表 - 公开API，但会根据用户身份返回不同内容
router.get('/', getMarkers);

// 创建新标记 - 需要登录
router.post('/', auth, createMarker);

// 获取特定用户的标记
router.get('/user/:userId', getUserMarkers);

// 获取、更新、删除特定标记
router.get('/:id', getMarker);
router.put('/:id', auth, updateMarker);
router.delete('/:id', auth, deleteMarker);

// 点赞/取消点赞标记
router.post('/:id/like', auth, likeMarker);
router.post('/:id/unlike', auth, unlikeMarker);

/**
 * 图片上传处理 - 简化版使用内存存储
 */
router.post('/upload', uploadMarkerImageSimple, (req, res) => {
  console.log('收到图片上传请求');
  console.log('请求头:', req.headers);
  
  try {
    console.log('文件已上传到内存');
    
    if (!req.file) {
      console.error('没有接收到文件, req.file为空');
      console.log('req.body:', req.body);
      if (req.files) console.log('req.files:', Object.keys(req.files));
      
      return res.status(400).json({ 
        success: false,
        message: '没有上传文件' 
      });
    }
    
    console.log('接收到的文件信息:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // 确保目录存在
    const uploadDir = path.join(__dirname, '../../uploads/markers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(req.file.originalname) || '.jpg';
    const filename = 'marker-' + uniqueSuffix + fileExt;
    const filepath = path.join(uploadDir, filename);
    
    // 将文件从内存写入磁盘
    fs.writeFileSync(filepath, req.file.buffer);
    console.log('文件已保存到:', filepath);
    
    // 返回上传成功的文件信息
    const publicPath = `/uploads/markers/${filename}`;
    res.json({
      success: true,
      url: publicPath,
      fileName: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('处理上传文件时出错:', error);
    res.status(500).json({ 
      success: false,
      message: '处理上传文件时出错', 
      error: error.message 
    });
  }
});

/**
 * 图片上传处理 - 多张图片
 */
router.post('/uploads', uploadMarkerImages, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: '没有上传文件' 
      });
    }

    // 处理上传的多个文件
    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/markers/${file.filename}`,
      fileName: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('多图上传错误:', error);
    res.status(500).json({ 
      success: false,
      message: '多图上传失败', 
      error: error.message 
    });
  }
});

/**
 * 创建新标记
 */
router.post('/', async (req, res) => {
  try {
    // 获取请求体中的标记数据
    const markerData = req.body;
    
    console.log('接收到的标记数据:', markerData);
    
    // TODO: 在这里处理标记的创建逻辑，保存到数据库
    // const marker = new Marker(markerData);
    // await marker.save();
    
    // 模拟创建成功的响应
    res.status(201).json({
      success: true,
      message: '标记创建成功',
      data: {
        ...markerData,
        _id: 'marker_' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('创建标记错误:', error);
    res.status(500).json({
      success: false,
      message: '创建标记失败',
      error: error.message
    });
  }
});

/**
 * 获取指定区域的所有标记
 */
router.get('/', async (req, res) => {
  try {
    const { areaId } = req.query;
    
    if (!areaId) {
      return res.status(400).json({
        success: false,
        message: '缺少区域ID参数'
      });
    }
    
    // TODO: 根据areaId查询标记
    // const markers = await Marker.find({ areaId });
    
    // 模拟数据
    const markers = [
      {
        _id: 'marker1',
        areaId: areaId,
        userId: 'user1',
        userName: '张三',
        userAvatar: '/static/default-avatar.png',
        markerType: 'stray_dog',
        title: '发现一只流浪狗',
        description: '在小区门口发现一只金毛，看起来很友好，有人愿意收养吗？',
        images: [
          { url: '/static/demo/dog1.jpg', caption: '金毛照片' },
          { url: '/static/demo/dog2.jpg', caption: '近照' }
        ],
        contactInfo: {
          name: '张三',
          phone: '13800138000',
          wechat: 'zhangsan123'
        },
        locationDetail: {
          latitude: 31.2304,
          longitude: 121.4737,
          address: '上海市静安区南京西路'
        },
        createdAt: new Date('2023-05-10'),
        tags: ['金毛', '友好', '流浪狗']
      },
      {
        _id: 'marker2',
        areaId: areaId,
        userId: 'user2',
        userName: '李四',
        userAvatar: '/static/default-avatar.png',
        markerType: 'lost_dog',
        title: '寻找丢失的柯基',
        description: '昨天在公园附近丢失了一只橘色的柯基，对它很担心，看到的朋友请联系我！',
        images: [
          { url: '/static/demo/dog3.jpg', caption: '柯基照片' }
        ],
        contactInfo: {
          name: '李四',
          phone: '13900139000',
          wechat: 'lisi456'
        },
        locationDetail: {
          latitude: 31.2354,
          longitude: 121.4777,
          address: '上海市静安区公园'
        },
        createdAt: new Date('2023-05-12'),
        tags: ['柯基', '橘色', '寻狗启示']
      }
    ];
    
    res.json({
      success: true,
      data: markers
    });
  } catch (error) {
    console.error('获取标记错误:', error);
    res.status(500).json({
      success: false,
      message: '获取标记失败',
      error: error.message
    });
  }
});

/**
 * 获取标记详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: 根据ID查询标记
    // const marker = await Marker.findById(id);
    
    // 模拟数据
    const marker = {
      _id: id,
      areaId: 'area123',
      userId: 'user1',
      userName: '张三',
      userAvatar: '/static/default-avatar.png',
      markerType: 'stray_dog',
      title: '发现一只流浪狗',
      description: '在小区门口发现一只金毛，看起来很友好，有人愿意收养吗？',
      images: [
        { url: '/static/demo/dog1.jpg', caption: '金毛照片' },
        { url: '/static/demo/dog2.jpg', caption: '近照' }
      ],
      contactInfo: {
        name: '张三',
        phone: '13800138000',
        wechat: 'zhangsan123'
      },
      locationDetail: {
        latitude: 31.2304,
        longitude: 121.4737,
        address: '上海市静安区南京西路'
      },
      createdAt: new Date('2023-05-10'),
      tags: ['金毛', '友好', '流浪狗'],
      viewCount: 42,
      likeCount: 15,
      commentCount: 3
    };
    
    res.json({
      success: true,
      data: marker
    });
  } catch (error) {
    console.error('获取标记详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取标记详情失败',
      error: error.message
    });
  }
});

/**
 * 更新标记
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // TODO: 更新标记
    // const updatedMarker = await Marker.findByIdAndUpdate(id, updateData, { new: true });
    
    res.json({
      success: true,
      message: '标记更新成功',
      data: {
        ...updateData,
        _id: id,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('更新标记错误:', error);
    res.status(500).json({
      success: false,
      message: '更新标记失败',
      error: error.message
    });
  }
});

/**
 * 删除标记
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: 删除标记
    // await Marker.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: '标记删除成功'
    });
  } catch (error) {
    console.error('删除标记错误:', error);
    res.status(500).json({
      success: false,
      message: '删除标记失败',
      error: error.message
    });
  }
});

/**
 * 标记举报
 */
router.post('/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, userId } = req.body;
    
    // TODO: 处理举报逻辑
    // const report = new Report({ markerId: id, reason, userId });
    // await report.save();
    
    res.json({
      success: true,
      message: '举报成功',
      data: {
        markerId: id,
        reason,
        userId,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('标记举报错误:', error);
    res.status(500).json({
      success: false,
      message: '标记举报失败',
      error: error.message
    });
  }
});

/**
 * 点赞/取消点赞标记
 */
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // TODO: 处理点赞逻辑
    // const like = await Like.findOne({ markerId: id, userId });
    // if (like) {
    //   await like.remove();
    //   isLiked = false;
    // } else {
    //   await new Like({ markerId: id, userId }).save();
    //   isLiked = true;
    // }
    // const likeCount = await Like.countDocuments({ markerId: id });
    
    // 模拟点赞/取消点赞
    const isLiked = Math.random() > 0.5;
    const likeCount = Math.floor(Math.random() * 50);
    
    res.json({
      success: true,
      message: isLiked ? '点赞成功' : '取消点赞成功',
      data: {
        isLiked,
        likeCount
      }
    });
  } catch (error) {
    console.error('点赞操作错误:', error);
    res.status(500).json({
      success: false,
      message: '点赞操作失败',
      error: error.message
    });
  }
});

/**
 * 图片上传备用处理 - 使用express-fileupload作为fallback选项
 */
router.post('/upload-fallback', (req, res) => {
  console.log('收到备用图片上传请求');
  console.log('请求头:', req.headers);
  
  try {
    if (!req.files || !req.files.image) {
      console.error('没有接收到文件');
      return res.status(400).json({ 
        success: false,
        message: '没有上传文件' 
      });
    }
    
    const uploadedFile = req.files.image;
    console.log('接收到的文件信息:', {
      name: uploadedFile.name,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size
    });
    
    // 确保目录存在
    const uploadDir = path.join(__dirname, '../../uploads/markers');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 生成文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(uploadedFile.name) || '.jpg';
    const filename = 'marker-' + uniqueSuffix + fileExt;
    const filepath = path.join(uploadDir, filename);
    
    // 将文件移动到指定位置
    uploadedFile.mv(filepath, function(err) {
      if (err) {
        console.error('移动文件失败:', err);
        return res.status(500).json({
          success: false,
          message: '保存文件失败',
          error: err.message
        });
      }
      
      console.log('文件已保存到:', filepath);
      
      // 返回上传成功的文件信息
      const publicPath = `/uploads/markers/${filename}`;
      res.json({
        success: true,
        url: publicPath,
        fileName: filename,
        originalName: uploadedFile.name,
        size: uploadedFile.size,
        mimetype: uploadedFile.mimetype
      });
    });
  } catch (error) {
    console.error('处理上传文件时出错:', error);
    res.status(500).json({ 
      success: false,
      message: '处理上传文件时出错', 
      error: error.message 
    });
  }
});

module.exports = router; 