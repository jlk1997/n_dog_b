const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const communityController = require('../controllers/communityController');

// @route   POST /api/community/posts
// @desc    Create a new post
// @access  Private
router.post('/posts', auth, communityController.createPost);

// @route   GET /api/community/posts
// @desc    Get posts feed (from followed users and nearby)
// @access  Private (with token) or Public (limited)
router.get('/posts', optionalAuth, communityController.getFeed);

// @route   GET /api/community/posts/following
// @desc    Get posts from followed users
// @access  Private
router.get('/posts/following', auth, communityController.getFollowingPosts);

// @route   GET /api/community/posts/user/me
// @desc    Get current user's posts
// @access  Private
router.get('/posts/user/me', auth, communityController.getMyPosts);

// @route   GET /api/community/posts/nearby
// @desc    Get nearby posts
// @access  Public
router.get('/posts/nearby', optionalAuth, communityController.getNearbyPosts);

// @route   GET /api/community/posts/user/:userId
// @desc    Get posts by user ID
// @access  Public
router.get('/posts/user/:userId', optionalAuth, communityController.getUserPosts);

// @route   GET /api/community/posts/:id
// @desc    Get post by ID
// @access  Public
router.get('/posts/:id', optionalAuth, communityController.getPostById);

// @route   PUT /api/community/posts/:id
// @desc    Update post
// @access  Private
router.put('/posts/:id', auth, communityController.updatePost);

// @route   DELETE /api/community/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/posts/:id', auth, communityController.deletePost);

// @route   POST /api/community/posts/:id/like
// @desc    Like/unlike a post
// @access  Private
router.post('/posts/:id/like', auth, communityController.likePost);

// @route   POST /api/community/posts/:id/comment
// @desc    Comment on a post
// @access  Private
router.post('/posts/:id/comment', auth, communityController.commentOnPost);

// @route   GET /api/community/posts/:id/comments
// @desc    Get comments for a post
// @access  Public
router.get('/posts/:id/comments', optionalAuth, communityController.getPostComments);

// @route   POST /api/community/posts/:id/image
// @desc    Upload image to a post
// @access  Private
router.post('/posts/:id/image', auth, communityController.uploadPostImage);

// @route   DELETE /api/community/posts/:id/comment/:commentId
// @desc    Delete comment
// @access  Private
router.delete('/posts/:id/comment/:commentId', auth, communityController.deleteComment);

module.exports = router; 