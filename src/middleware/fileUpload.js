const multer = require('multer');
const fs = require('fs');
const path = require('path');

// 创建上传目录
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/images',
    'uploads/avatars',
    'uploads/logos',
    'uploads/markers',
    'uploads/pets',
    'uploads/icons',
    'uploads/merchants'
  ];
  
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '../../', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
};

// 创建目录
createUploadDirs();

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../../uploads/images');
    
    // 根据不同的文件类型和路由选择不同的存储目录
    if (file.fieldname === 'avatar') {
      uploadPath = path.join(__dirname, '../../uploads/avatars');
    } else if (file.fieldname === 'logo') {
      uploadPath = path.join(__dirname, '../../uploads/logos');
    } else if (req.path.includes('/markers')) {
      uploadPath = path.join(__dirname, '../../uploads/markers');
    } else if (req.path.includes('/pets')) {
      uploadPath = path.join(__dirname, '../../uploads/pets');
    } else if (req.path.includes('/icons')) {
      uploadPath = path.join(__dirname, '../../uploads/icons');
    } else if (req.path.includes('/merchants')) {
      uploadPath = path.join(__dirname, '../../uploads/merchants');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// 错误处理中间件
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制（最大5MB）'
      });
    }
    return res.status(400).json({
      success: false,
      message: `上传错误: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

module.exports = {
  upload,
  handleUploadError
}; 