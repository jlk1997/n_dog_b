const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const petController = require('../controllers/petController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/pets');
if (!fs.existsSync(uploadDir)) {
  console.log('创建上传目录:', uploadDir);
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer以处理文件上传 - 更明确的错误处理
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    console.log('处理上传文件:', file);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 获取安全的文件扩展名，如果没有则使用.jpg
    let ext = path.extname(file.originalname || 'unknown').toLowerCase();
    if (!ext || ext === '.') {
      ext = '.jpg';
    }
    const filename = 'pet-' + uniqueSuffix + ext;
    console.log('生成的文件名:', filename);
    cb(null, filename);
  }
});

// 限制文件类型，更宽松的验证
const fileFilter = function(req, file, cb) {
  console.log('文件MIME类型检查:', file.mimetype);
  
  // 接受的文件类型 - 非常宽松的图片类型检测
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream') {
    console.log('允许上传的文件类型:', file.mimetype);
    cb(null, true); // 接受上传
  } else {
    console.warn('拒绝上传的文件类型:', file.mimetype);
    cb(new Error('只允许上传图片文件'));
  }
};

// 配置multer实例，增加文件大小限制和文件类型过滤
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB，更宽松的大小限制
  },
  fileFilter: fileFilter
});

// 简化的上传中间件，专门用于宠物照片
function uploadPetPhoto(fieldName) {
  return function(req, res, next) {
    console.log(`开始处理${fieldName}上传`);
    console.log('请求头:', req.headers);
    
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, function(err) {
      if (err) {
        console.error(`${fieldName}上传错误:`, err);
        return res.status(400).json({ message: `上传失败: ${err.message}` });
      }
      
      // 检查文件是否上传成功
      if (!req.file) {
        console.error(`${fieldName}未找到`);
        return res.status(400).json({ message: '未找到上传文件' });
      }
      
      console.log(`${fieldName}上传成功:`, req.file);
      next();
    });
  };
}

// @route   POST /api/pets
// @desc    Create a new pet
// @access  Private
router.post('/', auth, petController.createPet);

// @route   GET /api/pets
// @desc    Get all pets for current user
// @access  Private
router.get('/', auth, petController.getUserPets);

// @route   GET /api/pets/user/:userId
// @desc    Get pets by user ID
// @access  Public
router.get('/user/:userId', petController.getPetsByUserId);

// @route   GET /api/pets/:id
// @desc    Get pet by ID
// @access  Public
router.get('/:id', petController.getPetById);

// @route   PUT /api/pets/:id
// @desc    Update pet
// @access  Private
router.put('/:id', auth, petController.updatePet);

// @route   DELETE /api/pets/:id
// @desc    Delete pet
// @access  Private
router.delete('/:id', auth, petController.deletePet);

// @route   POST /api/pets/:id/avatar
// @desc    Upload pet avatar
// @access  Private
router.post('/:id/avatar', auth, uploadPetPhoto('avatar'), petController.uploadPetAvatar);

// @route   POST /api/pets/:id/avatar/base64
// @desc    Upload pet avatar as Base64 string
// @access  Private
router.post('/:id/avatar/base64', auth, petController.uploadPetAvatarBase64);

// @route   POST /api/pets/:id/daily-photo
// @desc    Upload pet daily photo
// @access  Private
router.post('/:id/daily-photo', auth, (req, res, next) => {
  // 检查内容类型，区分处理方式
  const contentType = req.headers['content-type'] || '';
  
  // 如果是JSON数据，直接传递给控制器
  if (contentType.includes('application/json')) {
    console.log('检测到JSON格式图片上传，跳过multer处理');
    next();
  } else {
    // 否则使用multer处理文件上传
    console.log('检测到multipart格式上传，使用multer处理');
    uploadPetPhoto('photo')(req, res, next);
  }
}, petController.uploadPetDailyPhoto);

module.exports = router; 