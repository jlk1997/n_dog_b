const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const userController = require('../controllers/userController');
const petController = require('../controllers/petController');

// @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
router.post('/register', userController.register);

// @route   POST /api/users/login
// @desc    Login user and get token
// @access  Public
router.post('/login', userController.login);

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, userController.getCurrentUser);

// @route   PUT /api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', auth, userController.updateCurrentUser);

// @route   POST /api/users/updateProfile
// @desc    Update full user profile including special fields
// @access  Private
router.post('/updateProfile', auth, userController.updateFullProfile);

// @route   POST /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, userController.uploadAvatar);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', userController.getUserById);

// @route   POST /api/users/follow/:id
// @desc    Follow/Unfollow a user
// @access  Private
router.post('/follow/:id', auth, userController.followUser);

// @route   GET /api/users/:id/followers
// @desc    Get user followers
// @access  Public
router.get('/:id/followers', userController.getFollowers);

// @route   GET /api/users/:id/following
// @desc    Get users that this user is following
// @access  Public
router.get('/:id/following', userController.getFollowing);

// @route   GET /api/users/stats/me
// @desc    Get current user stats (followers, following, posts count)
// @access  Private
router.get('/stats/me', auth, userController.getUserStats);

// @route   GET /api/users/:id/pets
// @desc    Get pets owned by user
// @access  Public
router.get('/:id/pets', petController.getPetsByUser);

module.exports = router; 