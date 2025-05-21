const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

// 所有聊天相关的路由都需要认证
router.use(auth);

// 发送附近消息
router.post('/nearby', chatController.sendNearbyMessage);

// 发送城市消息
router.post('/city', chatController.sendCityMessage);

// 获取附近消息
router.get('/nearby', chatController.getNearbyMessages);

// 获取城市消息
router.get('/city', chatController.getCityMessages);

module.exports = router; 