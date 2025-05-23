const Pet = require('../models/Pet');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Create a new pet
 * @route   POST /api/pets
 * @access  Private
 */
exports.createPet = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      breed, 
      age, 
      gender, 
      description, 
      weight, 
      color, 
      traits,
      socialIntention,
      matingStatus,
      dailyPhotos
    } = req.body;
    
    const pet = new Pet({
      name,
      owner: req.user.id,
      type: type || 'dog',
      breed,
      age,
      gender,
      description,
      weight,
      color,
      traits: traits ? traits.split(',').map(tag => tag.trim()) : [],
      socialIntention,
      matingStatus,
      dailyPhotos: dailyPhotos || []
    });
    
    const savedPet = await pet.save();
    
    res.status(201).json(savedPet);
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get all pets for current user
 * @route   GET /api/pets
 * @access  Private
 */
exports.getUserPets = async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    res.json(pets);
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get pet by ID
 * @route   GET /api/pets/:id
 * @access  Public
 */
exports.getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).populate('owner', 'username nickname avatar');
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    res.json(pet);
  } catch (error) {
    console.error('Get pet by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update pet
 * @route   PUT /api/pets/:id
 * @access  Private
 */
exports.updatePet = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      breed, 
      age, 
      gender, 
      description, 
      weight, 
      color, 
      traits, 
      isActive,
      socialIntention,
      matingStatus,
      dailyPhotos
    } = req.body;
    
    const pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this pet' });
    }
    
    // Update fields
    pet.name = name || pet.name;
    pet.type = type || pet.type;
    pet.breed = breed || pet.breed;
    pet.age = age !== undefined ? age : pet.age;
    pet.gender = gender || pet.gender;
    pet.description = description || pet.description;
    pet.weight = weight !== undefined ? weight : pet.weight;
    pet.color = color || pet.color;
    pet.isActive = isActive !== undefined ? isActive : pet.isActive;
    
    // Update new fields
    if (socialIntention) {
      pet.socialIntention = socialIntention;
    }
    
    if (matingStatus) {
      pet.matingStatus = matingStatus;
    }
    
    // Add new dailyPhotos or update existing ones
    if (dailyPhotos && Array.isArray(dailyPhotos)) {
      if (dailyPhotos.length > 0) {
        // If providing full array, replace existing photos
        pet.dailyPhotos = dailyPhotos;
      }
    }
    
    if (traits) {
      pet.traits = traits.split(',').map(tag => tag.trim());
    }
    
    const updatedPet = await pet.save();
    
    res.json(updatedPet);
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete pet
 * @route   DELETE /api/pets/:id
 * @access  Private
 */
exports.deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this pet' });
    }
    
    await Pet.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Pet removed', success: true });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Upload pet avatar
 * @route   POST /api/pets/:id/avatar
 * @access  Private
 */
exports.uploadPetAvatar = async (req, res) => {
  try {
    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({ message: 'No avatar uploaded' });
    }
    
    const petId = req.params.id;
    const pet = await Pet.findById(petId);
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    // Check if user owns this pet
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this pet' });
    }
    
    // Create avatar path
    const avatarUrl = `/uploads/pets/${req.file.filename}`;
    
    // Update pet avatar
    pet.avatar = avatarUrl;
    await pet.save();
    
    res.status(200).json({ 
      success: true, 
      data: {
        pet
      }
    });
  } catch (error) {
    console.error('Upload pet avatar error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Upload pet avatar as Base64 string
 * @route   POST /api/pets/:id/avatar/base64
 * @access  Private
 */
exports.uploadPetAvatarBase64 = async (req, res) => {
  try {
    const { image } = req.body;
    const petId = req.params.id;

    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Basic Base64 validation
    const base64Regex = /^data:image\/([a-zA-Z]+);base64,([\s\S]+)/;
    const matches = image.match(base64Regex);

    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid Base64 image format' });
    }

    const imageType = matches[1]; // e.g., png, jpeg
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this pet' });
    }

    const uploadDir = path.join(__dirname, '../../uploads/pets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `pet-${Date.now()}-${Math.round(Math.random() * 1E9)}.${imageType}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/uploads/pets/${filename}`;
    pet.avatar = avatarUrl;
    await pet.save();

    res.status(200).json({
      success: true,
      data: {
        pet
      }
    });

  } catch (error) {
    console.error('Upload pet avatar (Base64) error:', error);
    res.status(500).json({ message: 'Server error while uploading Base64 avatar', error: error.message });
  }
};

/**
 * @desc    Get pets by user ID
 * @route   GET /api/pets/user/:userId
 * @access  Public
 */
exports.getPetsByUserId = async (req, res) => {
  try {
    const pets = await Pet.find({ 
      owner: req.params.userId,
      isActive: true 
    });
    
    res.json(pets);
  } catch (error) {
    console.error('Get pets by user ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 

/**
 * @desc    Get pets by user ID
 * @route   GET /api/users/:id/pets
 * @access  Public
 */
exports.getPetsByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const pets = await Pet.find({ owner: userId });

    res.json(pets);
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 

/**
 * @desc    Upload pet daily photo
 * @route   POST /api/pets/:id/daily-photo
 * @access  Private
 */
exports.uploadPetDailyPhoto = async (req, res) => {
  try {
    console.log('开始处理宠物日常照片上传请求');
    console.log('请求内容类型:', req.headers['content-type']);
    
    const petId = req.params.id;
    console.log('宠物ID:', petId);
    
    // 处理直接发送的JSON数据中的base64图片
    if (req.headers['content-type']?.includes('application/json')) {
      console.log('检测到JSON格式请求，尝试从base64数据创建图片');
      
      // 从请求体中提取base64数据
      if (!req.body.imageData) {
        return res.status(400).json({ message: '无效的图片数据' });
      }
      
      try {
        // 确保上传目录存在
        const uploadDir = path.join(__dirname, '../../uploads/pets');
        if (!fs.existsSync(uploadDir)) {
          console.log('创建上传目录:', uploadDir);
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 从base64数据创建图片文件
        const base64Data = req.body.imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 创建唯一的文件名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `pet-${uniqueSuffix}.jpg`;
        const filePath = path.join(uploadDir, filename);
        
        // 写入文件
        fs.writeFileSync(filePath, buffer);
        console.log('成功保存base64图片到文件:', filePath);
        
        // 获取宠物信息
        const pet = await Pet.findById(petId);
        
        if (!pet) {
          console.error('未找到宠物:', petId);
          return res.status(404).json({ message: 'Pet not found' });
        }
        
        // 检查用户是否拥有这只宠物
        if (pet.owner.toString() !== req.user.id) {
          console.error('用户无权上传该宠物的照片');
          return res.status(403).json({ message: 'Not authorized to upload photos for this pet' });
        }
        
        // 图片的相对URL路径
        const photoUrl = `/uploads/pets/${filename}`;
        
        // 初始化dailyPhotos数组（如果不存在）
        if (!pet.dailyPhotos) {
          console.log('初始化dailyPhotos数组');
          pet.dailyPhotos = [];
        }
        
        // 添加新照片到数组开头
        pet.dailyPhotos.unshift({
          url: photoUrl,
          uploadDate: new Date(),
          description: req.body.description || ''
        });
        
        // 只保留最新的3张照片
        if (pet.dailyPhotos.length > 3) {
          console.log('限制照片数量为3张');
          // 获取将要移除的照片
          const removedPhotos = pet.dailyPhotos.slice(3);
          
          // 从文件系统中删除多余的照片文件
          for (const photo of removedPhotos) {
            if (photo && photo.url) {
              try {
                const photoPath = path.join(__dirname, '../..', photo.url);
                if (fs.existsSync(photoPath)) {
                  console.log('删除旧照片文件:', photoPath);
                  fs.unlinkSync(photoPath);
                }
              } catch (deleteError) {
                console.error('删除旧照片文件失败:', deleteError);
                // 继续处理，不影响主流程
              }
            }
          }
          
          pet.dailyPhotos = pet.dailyPhotos.slice(0, 3);
        }
        
        console.log('保存宠物信息');
        await pet.save();
        
        console.log('宠物日常照片上传成功');
        return res.status(200).json({
          success: true,
          data: {
            pet,
            photo: pet.dailyPhotos[0]
          }
        });
      } catch (error) {
        console.error('处理base64图片数据失败:', error);
        return res.status(500).json({ message: '处理图片数据失败', error: error.message });
      }
    }
    
    // 处理常规的multipart文件上传
    // 检查文件是否存在
    if (!req.file) {
      console.error('没有找到上传的文件');
      return res.status(400).json({ message: 'No photo uploaded' });
    }
    
    console.log('上传的文件信息:', req.file);
    
    try {
      // 确保上传目录存在
      const uploadDir = path.join(__dirname, '../../uploads/pets');
      if (!fs.existsSync(uploadDir)) {
        console.log('创建上传目录:', uploadDir);
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 获取宠物信息
      const pet = await Pet.findById(petId);
      
      if (!pet) {
        console.error('未找到宠物:', petId);
        return res.status(404).json({ message: 'Pet not found' });
      }
      
      console.log('找到宠物:', pet.name);
      
      // 检查用户是否拥有这只宠物
      if (pet.owner.toString() !== req.user.id) {
        console.error('用户无权上传该宠物的照片');
        return res.status(403).json({ message: 'Not authorized to upload photos for this pet' });
      }
      
      // 创建照片路径 - 将被保存到数据库
      const photoUrl = `/uploads/pets/${req.file.filename}`;
      console.log('照片URL:', photoUrl);
      
      // 初始化dailyPhotos数组（如果不存在）
      if (!pet.dailyPhotos) {
        console.log('初始化dailyPhotos数组');
        pet.dailyPhotos = [];
      }
      
      // 添加新照片到数组开头
      pet.dailyPhotos.unshift({
        url: photoUrl,
        uploadDate: new Date(),
        description: req.body.description || ''
      });
      
      console.log('添加新照片后的数组长度:', pet.dailyPhotos.length);
      
      // 只保留最新的3张照片
      if (pet.dailyPhotos.length > 3) {
        console.log('限制照片数量为3张');
        // 获取将要移除的照片
        const removedPhotos = pet.dailyPhotos.slice(3);
        
        // 从文件系统中删除多余的照片文件
        for (const photo of removedPhotos) {
          if (photo && photo.url) {
            try {
              const photoPath = path.join(__dirname, '../..', photo.url);
              if (fs.existsSync(photoPath)) {
                console.log('删除旧照片文件:', photoPath);
                fs.unlinkSync(photoPath);
              }
            } catch (deleteError) {
              console.error('删除旧照片文件失败:', deleteError);
              // 继续处理，不影响主流程
            }
          }
        }
        
        // 更新数组
        pet.dailyPhotos = pet.dailyPhotos.slice(0, 3);
      }
      
      console.log('保存宠物信息');
      await pet.save();
      
      console.log('宠物日常照片上传成功');
      res.status(200).json({
        success: true,
        data: {
          pet,
          photo: pet.dailyPhotos[0]
        }
      });
    } catch (innerError) {
      console.error('处理宠物照片上传过程中发生错误:', innerError);
      res.status(500).json({ 
        message: '处理照片时出错', 
        error: innerError.message,
        stack: process.env.NODE_ENV === 'development' ? innerError.stack : undefined
      });
    }
  } catch (error) {
    console.error('上传宠物日常照片错误:', error);
    // 返回更详细的错误信息
    res.status(500).json({ 
      message: '服务器错误', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}; 