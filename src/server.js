const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');

// Import routes
const userRoutes = require('./routes/userRoutes');
const petRoutes = require('./routes/petRoutes');
const locationRoutes = require('./routes/locationRoutes');
const communityRoutes = require('./routes/communityRoutes');
const markerRoutes = require('./routes/markerRoutes');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/adminRoutes'); // 添加管理员路由
const storyRoutes = require('./routes/storyRoutes'); // 添加剧情系统路由
const adminStoryRoutes = require('./routes/adminStoryRoutes'); // 添加管理端剧情路由

// 创建简化的中间件来处理walks路由
const walksRouter = express.Router();
const { auth } = require('./middleware/auth');
const WalkRecord = require('./models/WalkRecord');

// 删除遛狗记录
walksRouter.delete('/:id', auth, async (req, res) => {
  try {
    const walkId = req.params.id;
    
    if (!walkId) {
      return res.status(400).json({ success: false, message: '缺少记录ID' });
    }
    
    // 检查ID是否为本地存储ID格式 (以walk_开头)
    if (walkId.startsWith('walk_')) {
      console.log('删除本地存储的遛狗记录:', walkId);
      
      // 返回成功响应，前端将通过本地存储处理实际删除
      return res.status(200).json({
        success: true,
        message: '记录已成功删除',
        code: 0
      });
    }
    
    // 尝试从MongoDB删除记录
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
      message: '记录已成功删除',
      code: 0
    });
  } catch (error) {
    console.error('删除遛狗记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PORT = process.env.ADMIN_PORT || 5001; // 添加管理后台端口

// 创建管理后台应用
const adminApp = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// 管理后台中间件
adminApp.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
adminApp.use(express.json({ limit: '50mb' }));
adminApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
adminApp.use(morgan('dev'));

// 添加文件上传中间件
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制为10MB
  createParentPath: true, // 自动创建上传目录
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../tmp/'),
  debug: true, // 启用调试模式
  safeFileNames: true, // 清理文件名
  preserveExtension: true, // 保留扩展名
  uploadTimeout: 60000 // 上传超时时间，60秒
}));

// 同样为管理后台添加文件上传中间件
adminApp.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 提高限制为50MB
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../tmp/'),
  debug: true,
  abortOnLimit: false, // 不要在超过限制时自动中止
  responseOnLimit: '文件大小超过限制',
  safeFileNames: false, // 不清理文件名，保持原始文件名
  preserveExtension: true, 
  uploadTimeout: 120000, // 延长上传超时时间到120秒
  parseNested: true, // 支持嵌套的字段名
  // 允许任何路径请求上传文件
  uriDecodeFileNames: true,
  // 使用严格模式关闭
  useTempFiles: true,
  // 添加调试回调
  uploadStartHandler: (event) => {
    console.log(`[adminApp] 文件上传开始: ${JSON.stringify(event || {})}`);
  },
  uploadStopHandler: (event) => {
    console.log(`[adminApp] 文件上传结束: ${JSON.stringify(event || {})}`);
  }
}));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../uploads');
const communityUploadsDir = path.join(uploadsDir, 'community');
const adminUploadsDir = path.join(uploadsDir, 'admin'); // 添加管理员上传目录
const iconsDir = path.join(adminUploadsDir, 'icons'); // 添加图标目录
const merchantsDir = path.join(adminUploadsDir, 'merchants'); // 添加商家目录
const staticDir = path.join(__dirname, '../static'); // 添加静态文件目录
const staticImagesDir = path.join(staticDir, 'images'); // 添加静态图片目录

// 创建必要的目录
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(communityUploadsDir)) {
  fs.mkdirSync(communityUploadsDir, { recursive: true });
}
if (!fs.existsSync(adminUploadsDir)) {
  fs.mkdirSync(adminUploadsDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(merchantsDir)) {
  fs.mkdirSync(merchantsDir, { recursive: true });
}
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}
if (!fs.existsSync(staticImagesDir)) {
  fs.mkdirSync(staticImagesDir, { recursive: true });
}

// 确保静态目录存在并且权限正确
console.log('检查静态目录权限...');
const staticDirs = [
  staticDir,
  staticImagesDir,
  path.join(staticDir, 'css')
];

// 检查并确保目录权限正确
staticDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      console.log(`创建目录: ${dir}`);
    } catch (err) {
      console.error(`创建目录失败: ${dir}`, err);
    }
  } else {
    try {
      // 在Windows上这可能不起作用，但尝试一下
      fs.chmodSync(dir, 0o777);
      console.log(`设置目录权限: ${dir}`);
    } catch (err) {
      console.error(`设置目录权限失败: ${dir}`, err);
    }
  }
});

// 检查图标文件是否存在
const iconFiles = [
  'logo.png',
  'images/chat-icon.png',
  'images/chat-icon-active.png'
];

// 确保基本图标文件存在
iconFiles.forEach(iconFile => {
  const filePath = path.join(staticDir, iconFile);
  if (!fs.existsSync(filePath)) {
    try {
      // 如果文件不存在，创建一个空文件
      fs.mkdirSync(path.dirname(filePath), { recursive: true }); // 确保目录存在
      fs.writeFileSync(filePath, 'placeholder', 'utf8');
      console.log(`创建占位图标文件: ${filePath}`);
    } catch (err) {
      console.error(`创建图标文件失败: ${filePath}`, err);
    }
  }
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));
adminApp.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// Serve static files from the static directory
app.use('/static', express.static(path.join(__dirname, '../static'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));
adminApp.use('/static', express.static(path.join(__dirname, '../static'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// 添加详细的请求日志中间件
adminApp.use((req, res, next) => {
  if (req.url.includes('/api/admin/icons')) {
    console.log(`管理请求: ${req.method} ${req.url}`);
    console.log(`- 请求头: ${JSON.stringify(req.headers)}`);
    console.log(`- 请求体: ${JSON.stringify(req.body || {})}`);
    console.log(`- 文件: ${req.files ? JSON.stringify(Object.keys(req.files)) : '无文件'}`);
  }
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/markers', markerRoutes);
app.use('/api/walks', walksRouter);
app.use('/api/story', storyRoutes); // 添加剧情系统路由
app.use('/api', apiRoutes);

// 管理后台路由配置
// 同时注册管理员API路由和普通API路由，确保管理前端可以访问所有API
adminApp.use('/api/admin', adminRoutes); // 管理员专用API路由
adminApp.use('/api/admin/story', adminStoryRoutes); // 添加管理端剧情路由
adminApp.use('/api/users', userRoutes);
adminApp.use('/api/pets', petRoutes);
adminApp.use('/api/locations', locationRoutes);
adminApp.use('/api/community', communityRoutes);
adminApp.use('/api/markers', markerRoutes);
adminApp.use('/api/walks', walksRouter);
adminApp.use('/api/story', storyRoutes); // 添加剧情系统路由
adminApp.use('/api', apiRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DogRun API' });
});

adminApp.get('/', (req, res) => {
  res.json({ message: 'Welcome to DogRun Admin API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

adminApp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong on the admin server',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dogrun', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
    
    // 启动主应用服务器
    app.listen(PORT, () => {
      console.log(`Main Server running on port ${PORT}`);
    });
    
    // 启动管理后台服务器
    adminApp.listen(ADMIN_PORT, () => {
      console.log(`Admin Server running on port ${ADMIN_PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }); 