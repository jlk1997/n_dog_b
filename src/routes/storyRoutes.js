const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { auth } = require('../middleware/auth');

// 用户端路由 - 所有路由都需要用户认证
router.get('/plots', auth, storyController.getUserPlots);
router.get('/plots/:plotId/chapters', auth, storyController.getPlotChapters);
router.get('/plots/:plotId/start', auth, storyController.startPlot);
router.get('/plots/:plotId/current-event', auth, storyController.getCurrentEvent);
router.post('/complete-event', auth, storyController.completeEvent);

module.exports = router; 