const express = require('express');
const router = express.Router();
const storyController = require('../controllers/admin/storyController');
const { adminAuth } = require('../middleware/adminAuth');

// 剧情管理
router.get('/plots', adminAuth, storyController.getAllPlots);
router.get('/plots/:id', adminAuth, storyController.getPlotDetail);
router.post('/plots', adminAuth, storyController.createPlot);
router.put('/plots/:id', adminAuth, storyController.updatePlot);
router.delete('/plots/:id', adminAuth, storyController.deletePlot);

// 章节管理
router.get('/chapters/:id', adminAuth, storyController.getChapterDetail);
router.post('/chapters', adminAuth, storyController.createChapter);
router.put('/chapters/:id', adminAuth, storyController.updateChapter);
router.delete('/chapters/:id', adminAuth, storyController.deleteChapter);

// 事件管理
router.get('/events/:id', adminAuth, storyController.getEventDetail);
router.post('/events', adminAuth, storyController.createEvent);
router.put('/events/:id', adminAuth, storyController.updateEvent);
router.delete('/events/:id', adminAuth, storyController.deleteEvent);

// 统计与导入导出
router.get('/progress-stats', adminAuth, storyController.getUserProgressStats);
router.get('/export/:id', adminAuth, storyController.exportStoryConfig);
router.post('/import', adminAuth, storyController.importStoryConfig);

module.exports = router; 