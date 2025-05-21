const multer = require('multer');
const fs = require('fs');
const path = require('path');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 使用最简单的配置
const simpleUpload = multer({ 
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = {
  simpleUpload
}; 