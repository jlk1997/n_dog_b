const express = require('express');
const router = express.Router();

// 导入控制器
const adminAuthController = require('../controllers/admin/authController');
const adminUserController = require('../controllers/admin/userController');
const adminPostController = require('../controllers/admin/postController');
const adminMarkerController = require('../controllers/admin/markerController');
const adminMerchantController = require('../controllers/admin/merchantController');
const adminPetController = require('../controllers/admin/petController');
const adminIconController = require('../controllers/admin/iconController');
const adminSystemController = require('../controllers/admin/systemController');

// 导入中间件
const { adminAuth } = require('../middleware/adminAuth');
const { upload } = require('../middleware/fileUpload');

// 认证相关路由
router.post('/login', adminAuthController.login);
router.post('/logout', adminAuth, adminAuthController.logout);
router.post('/refresh-token', adminAuthController.refreshToken);
router.post('/change-password', adminAuth, adminAuthController.changePassword);

// 用户管理路由
router.get('/users', adminAuth, adminUserController.getUsers);
router.get('/users/:id', adminAuth, adminUserController.getUserDetail);
router.put('/users/:id', adminAuth, adminUserController.updateUser);
router.delete('/users/:id', adminAuth, adminUserController.deleteUser);
router.post('/users/:id/block', adminAuth, adminUserController.blockUser);
router.post('/users/:id/unblock', adminAuth, adminUserController.unblockUser);

// 宠物管理路由
router.get('/pets', adminAuth, adminPetController.getPets);
router.get('/pets/:id', adminAuth, adminPetController.getPetDetail);
router.put('/pets/:id', adminAuth, adminPetController.updatePet);
router.delete('/pets/:id', adminAuth, adminPetController.deletePet);

// 帖子管理路由
router.get('/posts', adminAuth, adminPostController.getPosts);
router.get('/posts/:id', adminAuth, adminPostController.getPostDetail);
router.put('/posts/:id', adminAuth, adminPostController.updatePost);
router.delete('/posts/:id', adminAuth, adminPostController.deletePost);
router.put('/posts/:id/pin', adminAuth, adminPostController.pinPost);
router.put('/posts/:id/featured', adminAuth, adminPostController.setFeatured);
router.post('/posts/:id/review', adminAuth, adminPostController.reviewPost);
router.get('/posts/:postId/comments', adminAuth, adminPostController.getPostComments);
router.delete('/posts/:postId/comments/:commentId', adminAuth, adminPostController.deleteComment);
router.post('/posts/:postId/comments/:commentId/reply', adminAuth, adminPostController.replyToComment);

// 地图标记管理路由
router.get('/markers', adminAuth, adminMarkerController.getMarkers);
router.get('/markers/:id', adminAuth, adminMarkerController.getMarkerDetail);
router.post('/markers', adminAuth, upload.array('images', 5), adminMarkerController.createMarker);
router.put('/markers/:id', adminAuth, adminMarkerController.updateMarker);
router.delete('/markers/:id', adminAuth, adminMarkerController.deleteMarker);
router.post('/markers/:id/review', adminAuth, adminMarkerController.reviewMarker);

// 商家管理路由
router.get('/merchants', adminAuth, adminMerchantController.getMerchants);
router.get('/merchants/:id', adminAuth, adminMerchantController.getMerchantDetail);
router.post('/merchants', adminAuth, upload.single('logo'), adminMerchantController.createMerchant);
router.put('/merchants/:id', adminAuth, adminMerchantController.updateMerchant);
router.delete('/merchants/:id', adminAuth, adminMerchantController.deleteMerchant);
router.post('/merchants/:id/verify', adminAuth, adminMerchantController.verifyMerchant);
router.put('/merchants/:id/status', adminAuth, adminMerchantController.toggleMerchantStatus);
router.post('/merchants/:id/logo', adminAuth, upload.single('file'), adminMerchantController.uploadLogo);
router.post('/merchants/:id/images', adminAuth, upload.single('file'), adminMerchantController.uploadImage);
router.delete('/merchants/:id/images/:imageId', adminAuth, adminMerchantController.deleteImage);
router.get('/merchant-types', adminAuth, adminMerchantController.getMerchantTypes);
router.get('/merchant-services', adminAuth, adminMerchantController.getMerchantServices);
router.get('/merchants/stats', adminAuth, adminMerchantController.getMerchantStats);

// 图标管理路由
router.get('/icons', adminAuth, adminIconController.getIcons);
router.get('/icons/status', adminAuth, adminIconController.getIconsStatus);
router.post('/icons/sync', adminAuth, adminIconController.syncIcon);
router.post('/icons/upload', adminAuth, adminIconController.uploadIcon);
router.post('/icons/replace-app-icon', adminAuth, adminIconController.replaceAppIcon);
router.get('/icon-types', adminAuth, adminIconController.getIconTypes);
router.get('/icons/view/*', adminIconController.viewIcon);
router.get('/icons/:id', adminAuth, adminIconController.getIconDetail);
router.post('/icons/:id/replace', adminAuth, adminIconController.replaceIcon);
router.put('/icons/:id', adminAuth, adminIconController.updateIcon);
router.delete('/icons/:id', adminAuth, adminIconController.deleteIcon);

// 缓存管理路由
router.post('/cache/purge', adminAuth, adminSystemController.purgeCache);

// 系统设置路由
router.get('/settings', adminAuth, adminSystemController.getSettings);
router.put('/settings', adminAuth, adminSystemController.updateSettings);
router.get('/dashboard/stats', adminAuth, adminSystemController.getDashboardStats);
router.get('/system/logs', adminAuth, adminSystemController.getSystemLogs);

module.exports = router; 