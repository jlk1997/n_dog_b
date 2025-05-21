const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const locationController = require('../controllers/locationController');

// @route   PUT /api/locations/update
// @desc    更新用户位置
// @access  Private
router.put('/update', auth, locationController.updateUserLocation);

// @route   GET /api/locations/nearby
// @desc    获取附近用户
// @access  Private
router.get('/nearby', auth, locationController.getNearbyUsers);

// @route   POST /api/locations/walks
// @desc    创建遛狗记录
// @access  Private
router.post('/walks', auth, locationController.createWalkRecord);

// @route   GET /api/locations/walks
// @desc    获取用户遛狗记录
// @access  Private
router.get('/walks', auth, locationController.getUserWalks);

// @route   GET /api/locations/walks/:id
// @desc    获取单个遛狗记录
// @access  Private
router.get('/walks/:id', auth, locationController.getWalkById);

// @route   DELETE /api/locations/walks/:id
// @desc    删除遛狗记录
// @access  Private
router.delete('/walks/:id', auth, locationController.deleteWalkRecord);

// @route   PUT /api/locations/start-walking
// @desc    开始遛狗
// @access  Private
router.put('/start-walking', auth, locationController.startWalking);

// @route   PUT /api/locations/stop-walking
// @desc    结束遛狗
// @access  Private
router.put('/stop-walking', auth, locationController.stopWalking);

// @route   GET /api/locations/frequent
// @desc    获取常去的遛狗地点
// @access  Private
router.get('/frequent', auth, locationController.getFrequentLocations);

module.exports = router; 