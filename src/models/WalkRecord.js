const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const walkRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,  // Duration in seconds
    required: true
  },
  distance: {
    type: Number,  // Distance in kilometers
    required: true
  },
  route: {
    type: [pointSchema],
    default: []
  },
  averageSpeed: {
    type: Number  // Speed in km/h
  },
  calories: {
    type: Number
  },
  weather: {
    type: String
  },
  notes: {
    type: String
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for geospatial queries
walkRecordSchema.index({ 'route.coordinates': '2dsphere' });

const WalkRecord = mongoose.model('WalkRecord', walkRecordSchema);

module.exports = WalkRecord; 