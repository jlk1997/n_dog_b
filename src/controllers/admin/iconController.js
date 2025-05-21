const Icon = require('../../models/Icon');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);
const crypto = require('crypto');

/**
 * @desc    获取图标列表
 * @route   GET /api/admin/icons
 * @access  Private
 */
exports.getIcons = async (req, res) => {
  try {
    const { type, search, used, page = 1, limit = 10 } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (used !== undefined) {
      query.used = used === 'true';
    }
    
    // 计算分页参数
    const skip = (page - 1) * limit;
    
    // 执行查询
    const [icons, total] = await Promise.all([
      Icon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('uploadedBy', 'username name'),
      Icon.countDocuments(query)
    ]);
    
    // 构建图标信息
    const iconData = icons.map(icon => ({
      id: icon._id,
      name: icon.name,
      type: icon.type,
      description: icon.description,
      url: icon.url,
      size: formatFileSize(icon.size),
      dimensions: icon.dimensions,
      format: icon.format,
      used: icon.used,
      usedLocation: icon.usedLocation,
      uploadedBy: icon.uploadedBy ? {
        id: icon.uploadedBy._id,
        username: icon.uploadedBy.username,
        name: icon.uploadedBy.name
      } : null,
      createTime: icon.createdAt
    }));
    
    res.status(200).json({
      success: true,
      message: '获取图标列表成功',
      data: {
        items: iconData,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit)
      },
      code: 0
    });
  } catch (error) {
    console.error('获取图标列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    获取图标详情
 * @route   GET /api/admin/icons/:id
 * @access  Private
 */
exports.getIconDetail = async (req, res) => {
  try {
    const iconId = req.params.id;
    
    const icon = await Icon.findById(iconId)
      .populate('uploadedBy', 'username name');
    
    if (!icon) {
      return res.status(404).json({
        success: false,
        message: '未找到图标',
        code: 404
      });
    }
    
    const iconData = {
      id: icon._id,
      name: icon.name,
      type: icon.type,
      description: icon.description,
      url: icon.url,
      size: formatFileSize(icon.size),
      dimensions: icon.dimensions,
      format: icon.format,
      used: icon.used,
      usedLocation: icon.usedLocation,
      uploadedBy: icon.uploadedBy ? {
        id: icon.uploadedBy._id,
        username: icon.uploadedBy.username,
        name: icon.uploadedBy.name
      } : null,
      createTime: icon.createdAt,
      updateTime: icon.updatedAt
    };
    
    res.status(200).json({
      success: true,
      message: '获取图标详情成功',
      data: iconData,
      code: 0
    });
  } catch (error) {
    console.error('获取图标详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    上传新图标
 * @route   POST /api/admin/icons/upload
 * @access  Private
 */
exports.uploadIcon = async (req, res) => {
  try {
    console.log('接收到uploadIcon请求:');
    console.log('- 请求体:', req.body);
    console.log('- 文件:', req.files ? '有文件' : '无文件');
    
    // 检查是否有文件上传 - 适配express-fileupload
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图标文件',
        code: 400
      });
    }
    
    const uploadedFile = req.files.file;
    console.log('上传图标信息:', {
      name: uploadedFile.name,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      tempFilePath: uploadedFile.tempFilePath || '无临时路径'
    });
    
    const { name, type, description } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: '请提供图标名称和类型',
        code: 400
      });
    }
    
    // 获取文件信息
    const fileSize = uploadedFile.size;
    const fileExtension = path.extname(uploadedFile.name).replace('.', '').toLowerCase();
    
    // 检查文件格式
    const allowedFormats = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    if (!allowedFormats.includes(fileExtension) && !uploadedFile.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件格式，仅支持: ' + allowedFormats.join(', '),
        code: 400
      });
    }
    
    // 确保上传目录存在
    const iconsDir = path.join(__dirname, '../../../uploads/admin/icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    // 创建目标文件名
    const destFileName = `icon-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(uploadedFile.name)}`;
    const destPath = path.join(iconsDir, destFileName);
    
    // 移动上传的文件到目标位置
    try {
      await uploadedFile.mv(destPath);
      console.log(`文件已成功移动到: ${destPath}`);
    } catch (moveError) {
      console.error('移动文件失败:', moveError);
      return res.status(500).json({
        success: false,
        message: `上传文件失败: ${moveError.message}`,
        code: 500
      });
    }
    
    // 构建图标URL
    const iconUrl = `/uploads/admin/icons/${destFileName}`;
    
    // 创建新图标
    const newIcon = new Icon({
      name,
      type,
      description: description || '',
      url: iconUrl,
      filename: destFileName,
      size: fileSize,
      format: fileExtension,
      uploadedBy: req.admin.id
    });
    
    await newIcon.save();
    
    res.status(201).json({
      success: true,
      message: '图标上传成功',
      data: {
        id: newIcon._id,
        name: newIcon.name,
        type: newIcon.type,
        url: newIcon.url,
        size: formatFileSize(newIcon.size),
        format: newIcon.format,
        createTime: newIcon.createdAt
      },
      code: 0
    });
  } catch (error) {
    console.error('上传图标错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message,
      code: 500
    });
  }
};

/**
 * @desc    替换图标文件
 * @route   POST /api/admin/icons/:id/replace
 * @access  Private
 */
exports.replaceIcon = async (req, res) => {
  try {
    console.log('接收到replaceIcon请求:');
    console.log('- 请求体:', req.body);
    console.log('- 文件:', req.files ? '有文件' : '无文件');
    
    const iconId = req.params.id;
    
    // 检查是否有文件上传 - 适配express-fileupload
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图标文件',
        code: 400
      });
    }
    
    const uploadedFile = req.files.file;
    console.log('替换图标信息:', {
      iconId,
      name: uploadedFile.name,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      tempFilePath: uploadedFile.tempFilePath || '无临时路径'
    });
    
    // 查找图标
    const icon = await Icon.findById(iconId);
    
    if (!icon) {
      return res.status(404).json({
        success: false,
        message: '未找到图标',
        code: 404
      });
    }
    
    // 获取文件信息
    const fileSize = uploadedFile.size;
    const fileExtension = path.extname(uploadedFile.name).replace('.', '').toLowerCase();
    
    // 检查文件格式
    const allowedFormats = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    if (!allowedFormats.includes(fileExtension) && !uploadedFile.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件格式，仅支持: ' + allowedFormats.join(', '),
        code: 400
      });
    }
    
    // 确保上传目录存在
    const iconsDir = path.join(__dirname, '../../../uploads/admin/icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    // 删除旧文件
    const oldFilePath = path.join(iconsDir, icon.filename);
    try {
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log('已删除旧图标文件:', oldFilePath);
      }
    } catch (error) {
      console.error('删除旧图标文件失败:', error);
      // 继续执行，不要因为无法删除旧文件而阻止替换
    }
    
    // 创建目标文件名
    const destFileName = `icon-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(uploadedFile.name)}`;
    const destPath = path.join(iconsDir, destFileName);
    
    // 移动上传的文件到目标位置
    try {
      await uploadedFile.mv(destPath);
      console.log(`文件已成功移动到: ${destPath}`);
    } catch (moveError) {
      console.error('移动文件失败:', moveError);
      return res.status(500).json({
        success: false,
        message: `替换文件失败: ${moveError.message}`,
        code: 500
      });
    }
    
    // 构建新图标URL
    const iconUrl = `/uploads/admin/icons/${destFileName}`;
    
    // 更新图标信息
    icon.url = iconUrl;
    icon.filename = destFileName;
    icon.size = fileSize;
    icon.format = fileExtension;
    icon.updatedAt = Date.now();
    
    await icon.save();
    
    res.status(200).json({
      success: true,
      message: '图标替换成功',
      data: {
        id: icon._id,
        name: icon.name,
        type: icon.type,
        url: icon.url,
        size: formatFileSize(icon.size),
        format: icon.format,
        updateTime: icon.updatedAt
      },
      code: 0
    });
  } catch (error) {
    console.error('替换图标错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message,
      code: 500
    });
  }
};

/**
 * @desc    更新图标信息
 * @route   PUT /api/admin/icons/:id
 * @access  Private
 */
exports.updateIcon = async (req, res) => {
  try {
    const iconId = req.params.id;
    const { name, type, description, used, usedLocation } = req.body;
    
    // 查找图标
    const icon = await Icon.findById(iconId);
    
    if (!icon) {
      return res.status(404).json({
        success: false,
        message: '未找到图标',
        code: 404
      });
    }
    
    // 更新信息
    if (name) icon.name = name;
    if (type) icon.type = type;
    if (description !== undefined) icon.description = description;
    if (used !== undefined) icon.used = used;
    if (usedLocation !== undefined) icon.usedLocation = usedLocation;
    
    await icon.save();
    
    res.status(200).json({
      success: true,
      message: '图标信息更新成功',
      data: {
        id: icon._id,
        name: icon.name,
        type: icon.type,
        description: icon.description,
        used: icon.used,
        usedLocation: icon.usedLocation,
        updateTime: icon.updatedAt
      },
      code: 0
    });
  } catch (error) {
    console.error('更新图标信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    删除图标
 * @route   DELETE /api/admin/icons/:id
 * @access  Private
 */
exports.deleteIcon = async (req, res) => {
  try {
    const iconId = req.params.id;
    
    // 查找图标
    const icon = await Icon.findById(iconId);
    
    if (!icon) {
      return res.status(404).json({
        success: false,
        message: '未找到图标',
        code: 404
      });
    }
    
    // 如果图标正在使用，不允许删除
    if (icon.used) {
      return res.status(400).json({
        success: false,
        message: '该图标正在使用中，无法删除',
        code: 400
      });
    }
    
    // 删除文件
    const filePath = path.join(__dirname, '../../../uploads/admin/icons/', icon.filename);
    try {
      await unlinkAsync(filePath);
    } catch (error) {
      console.error('删除图标文件失败:', error);
      // 继续执行，不要因为无法删除文件而阻止删除数据库记录
    }
    
    // 从数据库中删除记录
    await Icon.findByIdAndDelete(iconId);
    
    res.status(200).json({
      success: true,
      message: '图标删除成功',
      code: 0
    });
  } catch (error) {
    console.error('删除图标错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    获取图标类型列表
 * @route   GET /api/admin/icon-types
 * @access  Private
 */
exports.getIconTypes = async (req, res) => {
  try {
    const iconTypes = [
      { value: 'app', label: '应用图标' },
      { value: 'tab', label: '标签栏图标' },
      { value: 'marker', label: '地图标记' },
      { value: 'pet', label: '宠物图标' },
      { value: 'user', label: '用户相关' },
      { value: 'common', label: '通用图标' },
      { value: 'ui', label: '界面元素' },
      { value: 'action', label: '操作按钮' },
      { value: 'status', label: '状态图标' },
      { value: 'social', label: '社交图标' }
    ];
    
    res.status(200).json({
      success: true,
      message: '获取图标类型列表成功',
      data: iconTypes,
      code: 0
    });
  } catch (error) {
    console.error('获取图标类型列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
};

/**
 * @desc    替换应用图标位置的图标
 * @route   POST /api/admin/icons/replace-app-icon
 * @access  Private
 */
exports.replaceAppIcon = async (req, res) => {
  try {
    // 基本信息日志
    console.log('接收到replaceAppIcon请求:');
    console.log('- 请求体:', req.body);
    console.log('- 文件:', req.files ? '有文件' : '无文件');
    console.log('- Content-Type:', req.headers['content-type']);
    
    // 1. 检查是否有文件上传 - 适配express-fileupload
    if (!req.files || !req.files.file) {
      console.error('文件上传错误: 没有找到上传的文件');
      return res.status(400).json({
        success: false,
        message: '请上传图标文件',
        code: 400
      });
    }

    const uploadedFile = req.files.file;
    console.log('文件信息:', {
      name: uploadedFile.name,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      tempFilePath: uploadedFile.tempFilePath || '无临时路径'
    });
    
    // 2. 验证路径参数
    const { path: iconPath } = req.body;
    if (!iconPath) {
      console.error('路径错误: 未提供图标路径');
      return res.status(400).json({
        success: false,
        message: '请提供应用图标路径',
        code: 400
      });
    }

    // 3. 确定目标路径 - 开发环境 - 使用绝对解析确保路径正确
    const basePath = path.resolve(__dirname, '../../../../');
    console.log('基础路径(绝对路径):', basePath);
    
    // 移除路径开头的斜杠，确保相对路径正确，并规范化斜杠
    const relativePath = iconPath.startsWith('/') 
      ? iconPath.substring(1).replace(/\//g, path.sep) 
      : iconPath.replace(/\//g, path.sep);
      
    console.log('相对路径(已规范化):', relativePath);
    
    const targetPath = path.join(basePath, relativePath);
    console.log('目标文件最终路径:', targetPath);

    // 4. 生产环境路径 - 处理打包后的不同路径
    // 查找打包后的路径 - /unpackage/dist/build/h5/static/
    const h5DistPath = path.join(basePath, 'unpackage', 'dist', 'build', 'h5', relativePath);
    // 微信小程序路径
    const wxDistPath = path.join(basePath, 'unpackage', 'dist', 'build', 'mp-weixin', relativePath);
    // App打包路径
    const appDistPath = path.join(basePath, 'unpackage', 'dist', 'build', 'app-plus', relativePath);

    // 输出更多详细信息，方便调试
    console.log('目标文件的路径信息:', {
      开发环境路径: targetPath,
      H5生产路径: h5DistPath,
      微信小程序路径: wxDistPath,
      App路径: appDistPath,
      开发环境目录存在: fs.existsSync(path.dirname(targetPath)) ? '目录存在' : '目录不存在',
      开发环境文件存在: fs.existsSync(targetPath) ? '文件存在' : '文件不存在'
    });

    // 5. 创建所有必要的目录
    const targetDirs = [
      { path: path.dirname(targetPath), name: '开发环境' },
      { path: path.dirname(h5DistPath), name: 'H5生产环境' },
      { path: path.dirname(wxDistPath), name: '微信小程序环境' },
      { path: path.dirname(appDistPath), name: 'App环境' }
    ];

    // 创建所有目录并测试写入权限
    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir.path)) {
          fs.mkdirSync(dir.path, { recursive: true });
          console.log(`创建${dir.name}目录: ${dir.path}`);
        }
        
        // 测试目录是否拥有写入权限
        try {
          const testFile = path.join(dir.path, '.write-test');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          console.log(`${dir.name}目录拥有写入权限: ${dir.path}`);
        } catch (writeErr) {
          console.error(`${dir.name}目录可能没有写入权限:`, writeErr);
          // 继续执行，但记录警告
        }
      } catch (err) {
        console.error(`创建${dir.name}目录失败:`, err);
        // 继续执行，不要因为某个目录创建失败就中断
      }
    }

    // 6. 复制文件到所有目标位置
    const targetPaths = [
      { path: targetPath, name: '开发环境' },
      { path: h5DistPath, name: 'H5生产环境' },
      { path: wxDistPath, name: '微信小程序环境' },
      { path: appDistPath, name: 'App环境' }
    ];

    let successCount = 0;
    const errors = [];

    // 获取临时文件路径内容 - 提前读取避免重复操作
    let fileContent;
    try {
      if (uploadedFile.tempFilePath && fs.existsSync(uploadedFile.tempFilePath)) {
        fileContent = fs.readFileSync(uploadedFile.tempFilePath);
        console.log(`成功从临时路径读取文件内容: ${uploadedFile.tempFilePath}, 大小: ${fileContent.length} 字节`);
      } else if (uploadedFile.path && fs.existsSync(uploadedFile.path)) {
        fileContent = fs.readFileSync(uploadedFile.path);
        console.log(`成功从path读取文件内容: ${uploadedFile.path}, 大小: ${fileContent.length} 字节`);
      } else {
        // 直接从data属性读取
        fileContent = uploadedFile.data;
        console.log(`从data属性读取文件内容, 大小: ${fileContent.length} 字节`);
      }
      
      if (!fileContent || fileContent.length === 0) {
        throw new Error('读取的文件内容为空');
      }
    } catch (readErr) {
      console.error('读取上传文件内容失败:', readErr);
      return res.status(500).json({
        success: false,
        message: `读取上传文件内容失败: ${readErr.message}`,
        code: 500
      });
    }

    // 为每个路径执行文件复制
    for (const target of targetPaths) {
      try {
        // 备份原文件(如果存在)
        if (fs.existsSync(target.path)) {
          const backupPath = `${target.path}.bak`;
          try {
            fs.copyFileSync(target.path, backupPath);
            console.log(`${target.name}原始文件已备份至 ${backupPath}`);
          } catch (backupErr) {
            console.error(`备份原始文件失败: ${backupErr.message}`);
            // 继续执行，备份失败不应阻止新文件写入
          }
        }

        // 确保目录存在 (二次确认)
        if (!fs.existsSync(path.dirname(target.path))) {
          fs.mkdirSync(path.dirname(target.path), { recursive: true });
          console.log(`再次确认创建${target.name}目录: ${path.dirname(target.path)}`);
        }
        
        // 写入文件
        try {
          fs.writeFileSync(target.path, fileContent);
          
          // 写入后立即验证文件是否存在和大小是否正确
          if (fs.existsSync(target.path)) {
            const stats = fs.statSync(target.path);
            if (stats.size === fileContent.length) {
              // 额外验证：尝试读取文件的前几个字节，确保能读取
              try {
                const fd = fs.openSync(target.path, 'r');
                const buffer = Buffer.alloc(8);  // 读取头8字节用于验证
                fs.readSync(fd, buffer, 0, 8, 0);
                fs.closeSync(fd);
                console.log(`文件已成功写入并验证${target.name}: ${target.path}, 大小: ${stats.size} 字节, 头部: ${buffer.toString('hex')}`);
                
                // 同步到后台静态目录
                try {
                  // 构建后台静态目录路径
                  const backendStaticPath = path.join(__dirname, '../../../static', relativePath);
                  
                  // 确保后台静态目录存在
                  fs.mkdirSync(path.dirname(backendStaticPath), { recursive: true });
                  
                  // 复制文件到后台静态目录
                  fs.copyFileSync(target.path, backendStaticPath);
                  console.log(`已同步文件到后台静态目录: ${backendStaticPath}`);
                } catch (syncErr) {
                  console.error(`同步到后台静态目录失败: ${syncErr.message}`);
                  // 继续执行，同步失败不应阻止处理
                }
                
                successCount++;
              } catch (readErr) {
                console.error(`${target.name}文件写入成功但无法读取: ${readErr.message}`);
                errors.push({ path: target.path, error: '文件写入后无法读取' });
              }
            } else {
              console.error(`${target.name}文件大小不匹配: 期望 ${fileContent.length} 字节, 实际 ${stats.size} 字节`);
              errors.push({ path: target.path, error: '文件大小不匹配' });
            }
          } else {
            console.error(`写入后文件不存在: ${target.path}`);
            errors.push({ path: target.path, error: '写入后文件不存在' });
          }
        } catch (writeErr) {
          console.error(`写入文件到${target.name}失败:`, writeErr);
          errors.push({ path: target.path, error: writeErr.message });
        }
      } catch (copyError) {
        console.error(`处理${target.name}文件失败:`, copyError);
        errors.push({ path: target.path, error: copyError.message });
        // 继续执行下一个路径，不中断
      }
    }

    // 7. 创建图标版本信息
    const timestamp = Date.now();
    const iconVersion = {
      path: iconPath,
      version: timestamp,
      updatedAt: new Date().toISOString()
    };

    // 保存版本信息到数据库或文件
    const iconVersionsPath = path.join(basePath, 'static/icon-versions.json');
    let iconVersions = {};

    // 读取现有版本信息(如果存在)
    try {
      if (fs.existsSync(iconVersionsPath)) {
        iconVersions = JSON.parse(fs.readFileSync(iconVersionsPath, 'utf8'));
      }
      
      // 更新版本信息
      iconVersions[iconPath] = iconVersion;
      
      // 写回文件
      fs.writeFileSync(iconVersionsPath, JSON.stringify(iconVersions, null, 2));
      console.log(`图标版本信息已更新: ${iconVersionsPath}`);
      
      // 同步版本信息到各环境
      const versionPaths = [
        path.join(basePath, 'unpackage/dist/build/h5/static/icon-versions.json'),
        path.join(basePath, 'unpackage/dist/build/mp-weixin/static/icon-versions.json'),
        path.join(basePath, 'unpackage/dist/build/app-plus/static/icon-versions.json')
      ];
      
      for (const versionPath of versionPaths) {
        try {
          fs.mkdirSync(path.dirname(versionPath), { recursive: true });
          fs.writeFileSync(versionPath, JSON.stringify(iconVersions, null, 2));
          console.log(`版本信息已同步到: ${versionPath}`);
        } catch (versionSyncErr) {
          console.error(`同步版本信息失败: ${versionPath}`, versionSyncErr);
        }
      }
    } catch (versionError) {
      console.error('保存图标版本信息失败:', versionError);
      // 继续执行，不因版本信息保存失败而中断
    }

    // 8. 更新数据库
    const fileSize = uploadedFile.size;
    const fileName = path.basename(targetPath);
    const fileExt = path.extname(uploadedFile.name).replace('.', '').toLowerCase() || 
                   path.extname(fileName).replace('.', '').toLowerCase();
    
    try {
      // 查找或创建图标记录
      let icon = await Icon.findOne({ usedLocation: iconPath });
      
      if (icon) {
        // 更新现有记录
        icon.filename = fileName;
        icon.size = fileSize;
        icon.format = fileExt;
        icon.used = true;
        icon.version = timestamp;
        icon.updatedAt = Date.now();
      } else {
        // 创建新记录
        icon = new Icon({
          name: path.basename(iconPath, path.extname(iconPath)),
          type: determineIconType(iconPath),
          description: `应用图标: ${iconPath}`,
          url: iconPath,
          filename: fileName,
          size: fileSize,
          format: fileExt,
          used: true,
          usedLocation: iconPath,
          version: timestamp,
          uploadedBy: req.admin.id
        });
      }
      
      await icon.save();
      
      // 9. 返回成功响应
      res.status(200).json({
        success: true,
        message: successCount > 0 ? 
          `应用图标替换成功，已更新${successCount}个环境` : 
          '应用图标替换部分成功，请检查日志',
        data: {
          id: icon._id,
          name: icon.name,
          type: icon.type,
          url: `${iconPath}?t=${timestamp}`, // 添加时间戳防止缓存
          path: iconPath,
          size: formatFileSize(fileSize),
          format: fileExt,
          version: timestamp,
          updateTime: icon.updatedAt,
          targetPaths: targetPaths.map(t => t.path),
          environments: {
            development: fs.existsSync(targetPath),
            h5: fs.existsSync(h5DistPath),
            weixin: fs.existsSync(wxDistPath),
            app: fs.existsSync(appDistPath)
          }
        },
        code: 0,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return res.status(500).json({
        success: false,
        message: `数据库操作失败: ${dbError.message}`,
        code: 500
      });
    }
  } catch (error) {
    console.error('替换应用图标错误:', error);
    
    res.status(500).json({
      success: false,
      message: `服务器错误: ${error.message}`,
      code: 500
    });
  }
};

// 辅助函数：根据路径确定图标类型
function determineIconType(iconPath) {
  const path = iconPath.toLowerCase();
  
  if (path.includes('map-icon')) {
    return 'tab';
  } else if (path.includes('community-icon')) {
    return 'tab';
  } else if (path.includes('profile-icon')) {
    return 'tab';
  } else if (path.includes('chat')) {
    return 'tab';
  } else if (path.includes('marker')) {
    return 'marker';
  } else if (path.includes('logo')) {
    return 'app';
  } else if (path.includes('avatar') || path.includes('user')) {
    return 'user';
  } else if (path.includes('pet')) {
    return 'pet';
  } else {
    return 'common';
  }
}

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

// 工具函数：计算文件的MD5哈希值
async function calculateFileMD5(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    
    return hashSum.digest('hex');
  } catch (error) {
    console.error(`计算MD5失败 (${filePath}):`, error);
    return null;
  }
}

/**
 * @desc    获取所有图标的状态
 * @route   GET /api/admin/icons/status
 * @access  Private/Admin
 */
exports.getIconsStatus = async (req, res) => {
  try {
    console.log('===== 调用getIconsStatus函数 =====');
    console.log('请求路径:', req.path);
    console.log('请求参数:', req.params);
    console.log('请求查询:', req.query);
    console.log('请求头:', req.headers);
    
    console.log('开始获取图标状态');
    
    // 获取基础路径
    const basePath = path.join(__dirname, '../../../../');
    console.log('基础路径:', basePath);
    
    // 用于存储结果的数组
    const results = [];
    
    try {
      // 获取所有图标
      const icons = await Icon.find().sort({ type: 1, name: 1 });
      console.log(`从数据库获取到 ${icons.length} 个图标`);
      
      // 处理每个图标
      for (const icon of icons) {
        try {
          // 标准化路径
          const normalizedPath = icon.usedLocation || icon.url;
          const relativePath = normalizedPath.startsWith('/') ? normalizedPath.substring(1) : normalizedPath;
          
          // 各环境的路径
          const devPath = path.join(basePath, relativePath);
          const h5Path = path.join(basePath, 'unpackage/dist/build/h5', relativePath);
          const wxPath = path.join(basePath, 'unpackage/dist/build/mp-weixin', relativePath);
          const appPath = path.join(basePath, 'unpackage/dist/build/app-plus', relativePath);
          
          // 检查文件是否存在
          let devExists = false;
          let h5Exists = false;
          let wxExists = false;
          let appExists = false;
          
          try {
            devExists = fs.existsSync(devPath);
            h5Exists = fs.existsSync(h5Path);
            wxExists = fs.existsSync(wxPath);
            appExists = fs.existsSync(appPath);
          } catch (fsError) {
            console.error(`检查文件存在性失败 (${normalizedPath}):`, fsError);
            // 继续执行，不中断处理
          }
          
          // 获取文件大小
          let devSize = 0;
          let h5Size = 0;
          let wxSize = 0;
          let appSize = 0;
          
          try {
            if (devExists) devSize = fs.statSync(devPath).size;
            if (h5Exists) h5Size = fs.statSync(h5Path).size;
            if (wxExists) wxSize = fs.statSync(wxPath).size;
            if (appExists) appSize = fs.statSync(appPath).size;
          } catch (statError) {
            console.error(`获取文件大小失败 (${normalizedPath}):`, statError);
            // 继续执行，不中断处理
          }
          
          // 计算文件MD5
          let devMd5 = null;
          let h5Md5 = null;
          let wxMd5 = null;
          let appMd5 = null;
          
          try {
            devMd5 = await calculateFileMD5(devPath);
            h5Md5 = await calculateFileMD5(h5Path);
            wxMd5 = await calculateFileMD5(wxPath);
            appMd5 = await calculateFileMD5(appPath);
          } catch (md5Error) {
            console.error(`计算MD5失败 (${normalizedPath}):`, md5Error);
            // 继续执行，不中断处理
          }
          
          // 添加到结果数组
          results.push({
            id: icon._id,
            name: icon.name,
            type: icon.type,
            path: normalizedPath,
            devPath: devExists ? devPath : null,
            h5Path: h5Exists ? h5Path : null,
            wxPath: wxExists ? wxPath : null,
            appPath: appExists ? appPath : null,
            devExists,
            h5Exists,
            wxExists,
            appExists,
            devSize,
            h5Size,
            wxSize,
            appSize,
            devMd5,
            h5Md5,
            wxMd5,
            appMd5,
            description: icon.description || '',
            lastUpdated: icon.updatedAt || icon.createdAt
          });
        } catch (iconError) {
          console.error(`处理图标失败 (${icon._id}):`, iconError);
          // 继续处理下一个图标
        }
      }
    } catch (dbError) {
      console.error('获取数据库图标失败:', dbError);
      // 继续执行，尝试处理静态目录中的图标
    }
    
    // 查找静态目录中的图标
    try {
      const staticImagesDirs = [
        { dir: path.join(basePath, 'static'), prefix: '/static' },
        { dir: path.join(basePath, 'static/images'), prefix: '/static/images' }
      ];
      
      // 获取静态目录中所有的图片文件
      for (const dirInfo of staticImagesDirs) {
        try {
          if (!fs.existsSync(dirInfo.dir)) {
            console.log(`静态目录不存在，跳过: ${dirInfo.dir}`);
            continue;
          }
          
          const files = fs.readdirSync(dirInfo.dir);
          console.log(`在目录 ${dirInfo.dir} 中找到 ${files.length} 个文件`);
          
          for (const file of files) {
            try {
              const filePath = path.join(dirInfo.dir, file);
              
              let fileInfo;
              try {
                fileInfo = fs.statSync(filePath);
              } catch (statError) {
                console.error(`获取文件信息失败 (${filePath}):`, statError);
                continue; // 跳过此文件
              }
              
              // 排除目录和非图片文件
              if (fileInfo.isDirectory() || 
                  !(file.endsWith('.png') || file.endsWith('.jpg') || 
                    file.endsWith('.jpeg') || file.endsWith('.svg') || 
                    file.endsWith('.webp'))) {
                continue;
              }
              
              // 检查是否已经在数据库中
              const normalizedPath = `${dirInfo.prefix}/${file}`;
              const iconPath = normalizedPath.replace(/\/\//g, '/'); // 确保路径格式正确
              
              // 如果已经在结果中，跳过
              if (results.some(r => r.path === iconPath)) {
                continue;
              }
              
              // 各环境的路径
              const devPath = filePath;
              const h5Path = path.join(basePath, 'unpackage/dist/build/h5', iconPath.startsWith('/') ? iconPath.substring(1) : iconPath);
              const wxPath = path.join(basePath, 'unpackage/dist/build/mp-weixin', iconPath.startsWith('/') ? iconPath.substring(1) : iconPath);
              const appPath = path.join(basePath, 'unpackage/dist/build/app-plus', iconPath.startsWith('/') ? iconPath.substring(1) : iconPath);
              
              // 检查文件是否存在
              let devExists = false;
              let h5Exists = false;
              let wxExists = false;
              let appExists = false;
              
              try {
                devExists = fs.existsSync(devPath);
                h5Exists = fs.existsSync(h5Path);
                wxExists = fs.existsSync(wxPath);
                appExists = fs.existsSync(appPath);
              } catch (fsError) {
                console.error(`检查文件存在性失败 (${iconPath}):`, fsError);
                // 继续执行，不中断处理
              }
              
              // 获取文件大小
              let devSize = 0;
              let h5Size = 0;
              let wxSize = 0;
              let appSize = 0;
              
              try {
                if (devExists) devSize = fs.statSync(devPath).size;
                if (h5Exists) h5Size = fs.statSync(h5Path).size;
                if (wxExists) wxSize = fs.statSync(wxPath).size;
                if (appExists) appSize = fs.statSync(appPath).size;
              } catch (statError) {
                console.error(`获取文件大小失败 (${iconPath}):`, statError);
                // 继续执行，不中断处理
              }
              
              // 计算文件MD5
              let devMd5 = null;
              let h5Md5 = null;
              let wxMd5 = null;
              let appMd5 = null;
              
              try {
                devMd5 = await calculateFileMD5(devPath);
                h5Md5 = await calculateFileMD5(h5Path);
                wxMd5 = await calculateFileMD5(wxPath);
                appMd5 = await calculateFileMD5(appPath);
              } catch (md5Error) {
                console.error(`计算MD5失败 (${iconPath}):`, md5Error);
                // 继续执行，不中断处理
              }
              
              // 添加到结果数组
              results.push({
                id: null, // 没有对应的数据库记录
                name: file,
                type: determineIconType(iconPath),
                path: iconPath,
                devPath: devExists ? devPath : null,
                h5Path: h5Exists ? h5Path : null,
                wxPath: wxExists ? wxPath : null,
                appPath: appExists ? appPath : null,
                devExists,
                h5Exists,
                wxExists,
                appExists,
                devSize,
                h5Size,
                wxSize,
                appSize,
                devMd5,
                h5Md5,
                wxMd5,
                appMd5,
                description: '系统自动检测到的图标',
                lastUpdated: fileInfo.mtime
              });
            } catch (fileError) {
              console.error(`处理文件失败 (${file}):`, fileError);
              // 继续处理下一个文件
            }
          }
        } catch (dirError) {
          console.error(`处理目录失败 (${dirInfo.dir}):`, dirError);
          // 继续处理下一个目录
        }
      }
    } catch (staticDirError) {
      console.error('处理静态目录失败:', staticDirError);
      // 继续执行，返回已收集的结果
    }
    
    console.log(`处理完成，返回 ${results.length} 个图标状态`);
    
    res.status(200).json({
      success: true,
      message: '获取图标状态成功',
      data: results,
      code: 0
    });
  } catch (error) {
    console.error('获取图标状态错误:', error);
    
    // 提供更详细的错误信息
    let errorDetails = {};
    
    // 针对常见的错误类型提供更具体的信息
    if (error.name === 'CastError') {
      errorDetails = {
        type: 'CastError',
        message: `类型转换错误: ${error.message}`,
        path: error.path,
        value: error.value,
        valueType: error.valueType
      };
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorDetails = {
        type: 'MongoError',
        message: error.message,
        code: error.code
      };
    } else {
      // 通用错误处理
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
    
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: errorDetails,
      code: 500
    });
  }
};

/**
 * @desc    同步图标到所有环境
 * @route   POST /api/admin/icons/sync
 * @access  Private/Admin
 */
exports.syncIcon = async (req, res) => {
  try {
    const { path: iconPath } = req.body;
    
    if (!iconPath) {
      return res.status(400).json({
        success: false,
        message: '请提供图标路径',
        code: 400
      });
    }
    
    // 获取基础路径
    const basePath = path.resolve(__dirname, '../../../../');
    console.log('同步操作 - 基础路径:', basePath);
    
    // 标准化路径
    const relativePath = iconPath.startsWith('/') ? 
      iconPath.substring(1).replace(/\//g, path.sep) : 
      iconPath.replace(/\//g, path.sep);
      
    console.log('同步操作 - 规范化的相对路径:', relativePath);
    
    // 各环境的路径
    const devPath = path.join(basePath, relativePath);
    const h5Path = path.join(basePath, 'unpackage', 'dist', 'build', 'h5', relativePath);
    const wxPath = path.join(basePath, 'unpackage', 'dist', 'build', 'mp-weixin', relativePath);
    const appPath = path.join(basePath, 'unpackage', 'dist', 'build', 'app-plus', relativePath);
    
    console.log('同步操作 - 目标路径:', {
      开发环境: devPath,
      H5环境: h5Path,
      微信环境: wxPath,
      App环境: appPath
    });
    
    // 检查源文件是否存在
    if (!fs.existsSync(devPath)) {
      console.error(`源文件不存在: ${devPath}`);
      return res.status(404).json({
        success: false,
        message: `源文件不存在: ${iconPath}`,
        code: 404
      });
    }
    
    // 创建目标目录
    const targetDirs = [
      { path: path.dirname(h5Path), name: 'H5' },
      { path: path.dirname(wxPath), name: '微信小程序' },
      { path: path.dirname(appPath), name: 'App' }
    ];
    
    // 确保目标目录存在
    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir.path)) {
          fs.mkdirSync(dir.path, { recursive: true });
          console.log(`创建${dir.name}目录: ${dir.path}`);
        }
      } catch (err) {
        console.error(`创建${dir.name}目录失败:`, err);
      }
    }
    
    // 读取源文件
    let fileContent;
    try {
      fileContent = fs.readFileSync(devPath);
      console.log(`已读取源文件: ${devPath}, 大小: ${fileContent.length} 字节`);
    } catch (readErr) {
      console.error('读取源文件失败:', readErr);
      return res.status(500).json({
        success: false,
        message: `读取源文件失败: ${readErr.message}`,
        code: 500
      });
    }
    
    // 同步到各环境
    const syncResults = [];
    
    // 确保源文件有效
    if (!fileContent || fileContent.length === 0) {
      console.error(`源文件内容为空: ${devPath}`);
      return res.status(500).json({
        success: false,
        message: '源文件内容为空',
        code: 500
      });
    }
    
    // 同步到H5环境
    try {
      fs.writeFileSync(h5Path, fileContent);
      const h5Size = fs.statSync(h5Path).size;
      console.log(`同步到H5环境成功: ${h5Path}, 大小: ${h5Size} 字节`);
      syncResults.push({ env: 'H5', success: true, path: h5Path });
      
      // 同步到后台静态目录
      try {
        // 构建后台静态目录路径
        const backendStaticPath = path.join(__dirname, '../../../static', relativePath);
        
        // 确保后台静态目录存在
        fs.mkdirSync(path.dirname(backendStaticPath), { recursive: true });
        
        // 复制文件到后台静态目录
        fs.copyFileSync(h5Path, backendStaticPath);
        console.log(`已同步文件到后台静态目录: ${backendStaticPath}`);
        syncResults.push({ env: '后台静态', success: true, path: backendStaticPath });
      } catch (syncErr) {
        console.error(`同步到后台静态目录失败: ${syncErr.message}`);
        syncResults.push({ env: '后台静态', success: false, error: syncErr.message });
      }
    } catch (h5Err) {
      console.error('同步到H5环境失败:', h5Err);
      syncResults.push({ env: 'H5', success: false, error: h5Err.message });
    }
    
    // 同步到微信小程序环境
    try {
      fs.writeFileSync(wxPath, fileContent);
      const wxSize = fs.statSync(wxPath).size;
      console.log(`同步到微信小程序环境成功: ${wxPath}, 大小: ${wxSize} 字节`);
      syncResults.push({ env: '微信小程序', success: true, path: wxPath });
    } catch (wxErr) {
      console.error('同步到微信小程序环境失败:', wxErr);
      syncResults.push({ env: '微信小程序', success: false, error: wxErr.message });
    }
    
    // 同步到App环境
    try {
      fs.writeFileSync(appPath, fileContent);
      const appSize = fs.statSync(appPath).size;
      console.log(`同步到App环境成功: ${appPath}, 大小: ${appSize} 字节`);
      syncResults.push({ env: 'App', success: true, path: appPath });
    } catch (appErr) {
      console.error('同步到App环境失败:', appErr);
      syncResults.push({ env: 'App', success: false, error: appErr.message });
    }
    
    // 计算成功同步的环境数量
    const successCount = syncResults.filter(r => r.success).length;
    
    // 更新图标版本信息
    const iconVersion = {
      path: iconPath,
      version: Date.now(),
      updatedAt: new Date().toISOString()
    };
    
    // 保存版本信息到静态文件
    try {
      const iconVersionsPath = path.join(basePath, 'static/icon-versions.json');
      let iconVersions = {};
      
      if (fs.existsSync(iconVersionsPath)) {
        iconVersions = JSON.parse(fs.readFileSync(iconVersionsPath, 'utf8'));
      }
      
      iconVersions[iconPath] = iconVersion;
      fs.writeFileSync(iconVersionsPath, JSON.stringify(iconVersions, null, 2));
      console.log(`图标版本信息已更新: ${iconVersionsPath}`);
    } catch (versionErr) {
      console.error('更新版本信息失败:', versionErr);
    }
    
    res.status(200).json({
      success: successCount > 0,
      message: successCount > 0 ? 
        `图标已同步到 ${successCount} 个环境` : 
        '图标同步失败，所有环境都未能成功同步',
      data: {
        path: iconPath,
        version: iconVersion.version,
        syncResults,
        environments: {
          dev: true,
          h5: syncResults.some(r => r.env === 'H5' && r.success),
          weixin: syncResults.some(r => r.env === '微信小程序' && r.success),
          app: syncResults.some(r => r.env === 'App' && r.success)
        }
      },
      code: successCount > 0 ? 0 : 500
    });
  } catch (error) {
    console.error('同步图标错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message,
      code: 500
    });
  }
};

/**
 * @desc    查看图标文件
 * @route   GET /api/admin/icons/view/*
 * @access  Public
 */
exports.viewIcon = async (req, res) => {
  try {
    // 获取请求路径中的图标路径部分
    const requestUrl = req.url;
    const prefix = '/view/';
    const prefixIndex = requestUrl.indexOf(prefix);
    
    if (prefixIndex === -1) {
      return res.status(400).json({
        success: false,
        message: '无效的图标路径',
        code: 400
      });
    }
    
    // 从URL中解析出图标路径
    const iconPath = requestUrl.substring(prefixIndex + prefix.length);
    
    if (!iconPath) {
      return res.status(400).json({
        success: false,
        message: '未提供图标路径',
        code: 400
      });
    }
    
    console.log(`请求查看图标: ${iconPath}`);
    
    // 规范化路径并移除前缀斜杠
    const normalizedPath = iconPath.startsWith('/') ? 
      iconPath.substring(1).replace(/\//g, path.sep) : 
      iconPath.replace(/\//g, path.sep);
    
    // 确定目标路径
    const basePath = path.resolve(__dirname, '../../../../');
    const iconFullPath = path.join(basePath, normalizedPath);
    
    console.log(`图标完整路径: ${iconFullPath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(iconFullPath)) {
      console.log(`图标不存在: ${iconFullPath}`);
      return res.status(404).json({
        success: false,
        message: '图标不存在',
        code: 404
      });
    }
    
    // 确定内容类型
    const ext = path.extname(iconFullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.ico') contentType = 'image/x-icon';
    else if (ext === '.webp') contentType = 'image/webp';
    
    // 设置缓存控制头部
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Content-Type', contentType);
    
    // 发送文件
    res.sendFile(iconFullPath, (err) => {
      if (err) {
        console.error(`发送图标文件错误: ${err.message}`);
        return res.status(500).json({
          success: false,
          message: '发送图标文件失败',
          code: 500
        });
      }
      console.log(`成功发送图标: ${iconPath}`);
    });
  } catch (error) {
    console.error('查看图标错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      code: 500
    });
  }
}; 