const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

// 导入各个模块的路由
const locationRoutes = require('./locationRoutes');
const chatRoutes = require('./chatRoutes');
const markerRoutes = require('./markerRoutes');
// const userRoutes = require('./userRoutes');
// const petRoutes = require('./petRoutes');

// 注册路由
router.use('/locations', locationRoutes);
router.use('/chat', chatRoutes);
router.use('/markers', markerRoutes);
// router.use('/users', userRoutes);
// router.use('/pets', petRoutes);

/**
 * 宠物识别API - 支持百度AI和离线模式
 */
router.post('/pet-recognition', async (req, res) => {
  try {
    const imageData = req.body.imageData; // 从前端接收的图像数据
    
    if (!imageData) {
      return res.status(400).json({ error: '缺少图像数据' });
    }
    
    console.log('接收到宠物识别请求，准备处理...');
    
    // 确保图像数据格式正确
    let formattedImageData = imageData;
    let base64Data = '';
    
    if (formattedImageData.startsWith('data:image')) {
      console.log('图像数据格式: 完整Data URL');
      // 提取base64部分（去掉data:image/jpeg;base64,前缀）
      base64Data = formattedImageData.split(',')[1];
    } else {
      console.log('图像数据格式: 纯Base64');
      base64Data = formattedImageData;
    }
    
    console.log(`图像数据长度: ${base64Data.length} 字符，约 ${Math.round(base64Data.length/1024)} KB`);
    
    // 强制使用在线模式，不允许离线模拟
    try {
      const result = await baiduAnimalRecognition(base64Data);
      console.log('在线识别成功，返回结果');
      return res.json(result);
    } catch (onlineError) {
      console.error('百度AI识别失败:', onlineError.message);
      // 返回错误信息，不使用离线模式
      return res.status(500).json({ 
        error: '百度AI识别失败，无法分析宠物图片',
        message: onlineError.message
      });
    }
    
  } catch (error) {
    console.error('宠物识别API处理失败:', error);
    res.status(500).json({
      error: '宠物识别请求处理失败',
      message: error.message
    });
  }
});

/**
 * 使用百度AI进行动物识别
 * @param {string} imageBase64 - 图像的Base64数据(不含前缀)
 * @returns {Promise<Array>} Hugging Face兼容格式的识别结果
 */
async function baiduAnimalRecognition(imageBase64) {
  // 百度AI配置 - 需要替换为您自己的密钥
  const API_KEY = 'ztYbj5eiBtOiU2gRVbeywEQI';
  const SECRET_KEY = 'CkZXx402rzGrPUeF98QPwjoMK95Koiy0';
  
  // 获取百度AI访问令牌
  const accessToken = await getBaiduAccessToken(API_KEY, SECRET_KEY);
  console.log('成功获取百度AI访问令牌');
  
  // 调用百度AI动物识别API
  const animalApiUrl = `https://aip.baidubce.com/rest/2.0/image-classify/v1/animal?access_token=${accessToken}`;
  
  const params = new URLSearchParams();
  params.append('image', imageBase64);
  params.append('baike_num', '5'); // 返回5个百科信息
  
  console.log('发送请求到百度AI动物识别API...');
  const response = await axios.post(animalApiUrl, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    timeout: 10000
  });
  
  console.log('百度AI返回结果:', JSON.stringify(response.data).substring(0, 200) + '...');
  
  // 转换百度AI结果为Hugging Face格式
  if (response.data && response.data.result && Array.isArray(response.data.result)) {
    return convertBaiduResultToHuggingFaceFormat(response.data.result);
  } else {
    throw new Error('百度AI返回了无效的结果格式');
  }
}

/**
 * 获取百度AI访问令牌
 * @param {string} apiKey - 百度AI API Key
 * @param {string} secretKey - 百度AI Secret Key
 * @returns {Promise<string>} 访问令牌
 */
async function getBaiduAccessToken(apiKey, secretKey) {
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  
  try {
    const response = await axios.post(tokenUrl);
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error('获取访问令牌失败: 无效的响应');
    }
  } catch (error) {
    console.error('获取百度AI访问令牌失败:', error.message);
    throw new Error(`获取百度访问令牌失败: ${error.message}`);
  }
}

/**
 * 将百度AI结果转换为Hugging Face格式
 * @param {Array} baiduResults - 百度AI识别结果
 * @returns {Array} Hugging Face格式的结果
 */
function convertBaiduResultToHuggingFaceFormat(baiduResults) {
  // 百度AI结果格式示例:
  // [
  //   {"score":0.92,"name":"金毛寻回犬","baike_info":{"baike_url":"...","description":"..."}},
  //   {"score":0.71,"name":"拉布拉多犬","baike_info":{"baike_url":"...","description":"..."}}
  // ]
  
  // 转换为HuggingFace格式
  const huggingFaceResults = baiduResults.map(item => ({
    label: item.name,
    score: item.score,
    additional_info: item.baike_info ? {
      baike_url: item.baike_info.baike_url,
      description: item.baike_info.description
    } : undefined
  }));
  
  // 添加通用标签'dog'或'cat'
  if (huggingFaceResults.length > 0) {
    const firstLabel = huggingFaceResults[0].label.toLowerCase();
    // 判断是猫还是狗
    if (firstLabel.includes('猫') || firstLabel.includes('cat')) {
      huggingFaceResults.push({ label: 'cat', score: 0.99 });
    } else {
      huggingFaceResults.push({ label: 'dog', score: 0.99 });
    }
  }
  
  return huggingFaceResults;
}

/**
 * 生成离线模式下的模拟识别结果
 * @returns {Array} 模拟的识别结果
 */
function generateOfflineRecognitionResult() {
  // 模拟可能的犬类品种结果
  const dogBreeds = [
    { label: 'Golden Retriever', score: 0.92 },
    { label: 'Labrador Retriever', score: 0.89 },
    { label: 'German Shepherd', score: 0.86 },
    { label: 'Siberian Husky', score: 0.83 },
    { label: 'Beagle', score: 0.81 },
    { label: 'Poodle', score: 0.79 },
    { label: 'Border Collie', score: 0.78 },
    { label: 'Bulldog', score: 0.77 },
    { label: 'Shiba Inu', score: 0.75 }
  ];
  
  // 随机选择一个品种及相关结果
  const primaryIndex = Math.floor(Math.random() * dogBreeds.length);
  const secondaryIndex = (primaryIndex + 1) % dogBreeds.length;
  const tertiaryIndex = (primaryIndex + 2) % dogBreeds.length;
  
  // 构建结果数组
  return [
    dogBreeds[primaryIndex],
    {
      label: dogBreeds[secondaryIndex].label,
      score: dogBreeds[secondaryIndex].score * 0.8 // 次要品种置信度较低
    },
    {
      label: dogBreeds[tertiaryIndex].label,
      score: dogBreeds[tertiaryIndex].score * 0.6 // 第三可能品种置信度更低
    },
    {
      label: 'dog',
      score: 0.98 // 高度确信是狗
    },
    {
      label: 'canine',
      score: 0.95
    },
    {
      label: 'pet',
      score: 0.99
    }
  ];
}

// API 根路径响应
router.get('/', (req, res) => {
  res.json({
    message: '宠物遛狗 API',
    version: '1.0.0',
    status: 'online'
  });
});

module.exports = router; 