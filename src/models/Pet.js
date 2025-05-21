const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['dog', 'cat', 'other'],
    default: 'dog'
  },
  breed: {
    type: String,
    trim: true
  },
  age: {
    type: Number
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unknown'],
    default: 'unknown'
  },
  avatar: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  weight: {
    type: Number
  },
  color: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  traits: [{
    type: String
  }],
  socialIntention: {
    type: String,
    enum: ['strong', 'medium', 'mild'],
    default: 'medium'
  },
  matingStatus: {
    type: String,
    enum: ['single', 'paired', 'notLooking'],
    default: 'notLooking'
  },
  dailyPhotos: [{
    url: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      default: ''
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
petSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Pet = mongoose.model('Pet', petSchema);

module.exports = Pet; 