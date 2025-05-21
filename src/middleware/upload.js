const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 只允许上传图片文件的过滤器
const imageFilter = (req, file, cb) => {
  console.log('处理上传文件:', file.originalname);
  // 接受的图片类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('文件类型不允许:', file.mimetype);
    cb(new Error('只允许上传JPG、PNG、GIF和WEBP格式的图片!'), false);
  }
};

// 用户头像上传存储配置
const userStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/users');
    createUploadDir(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    // 使用时间戳和原始文件名创建唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'user-' + uniqueSuffix + fileExt);
  }
});

// 宠物头像上传存储配置
const petStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/pets');
    createUploadDir(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'pet-' + uniqueSuffix + fileExt);
  }
});

// 地图标记图片上传存储配置
const markerStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/markers');
    createUploadDir(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'marker-' + uniqueSuffix + fileExt);
  }
});

// 使用内存存储作为备用方案
const markerMemoryStorage = multer.memoryStorage();

// 用户头像上传配置 - 简化版本
const userUpload = multer({
  storage: userStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB最大限制
  }
});

// 宠物头像上传配置 - 简化版本
const petUpload = multer({
  storage: petStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB最大限制
  }
});

// 地图标记图片上传配置
const markerUpload = multer({
  storage: markerStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB最大限制
  }
});

// 地图标记图片上传配置 - 使用内存存储
const markerUploadMemory = multer({
  storage: markerMemoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制，减小文件大小
    files: 1, // 限制为一个文件
    parts: 10 // 增加允许的multipart表单字段数量
  }
});

// 单个文件上传中间件
const uploadAvatar = userUpload.single('avatar');
const uploadPetAvatar = petUpload.single('avatar');
const uploadMarkerImage = markerUpload.single('image');
const uploadMarkerImages = markerUpload.array('images', 9); // 最多9张图片

// 标记图片上传 - 简化版，添加错误处理
const uploadMarkerImageSimple = (req, res, next) => {
  // 检查Content-Type是否正确设置
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    console.log('Content-Type不正确:', req.headers['content-type']);
    console.log('添加默认Content-Type');
    // 修复请求头
    req.headers['content-type'] = 'multipart/form-data; boundary=----WebKitFormBoundaryDefault';
  }
  
  // 确保存在boundary
  if (!req.headers['content-type'].includes('boundary=')) {
    console.log('缺少boundary, 添加默认boundary');
    req.headers['content-type'] = 'multipart/form-data; boundary=----WebKitFormBoundaryDefault';
  }
  
  // 调用multer中间件
  markerUploadMemory.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer错误详情:', err);
      return next(err);
    }
    next();
  });
};

module.exports = {
  userUpload,
  petUpload,
  markerUpload,
  uploadAvatar,
  uploadPetAvatar,
  uploadMarkerImage,
  uploadMarkerImages,
  uploadMarkerImageSimple
}; 