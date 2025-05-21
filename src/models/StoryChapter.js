const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StoryChapterSchema = new Schema({
  plotId: {
    type: Schema.Types.ObjectId,
    ref: 'StoryPlot',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requirement: {
    userLevel: {
      type: Number,
      default: 0
    },
    previousChapter: {
      type: Schema.Types.ObjectId,
      ref: 'StoryChapter',
      default: null
    },
    customCondition: {
      type: Object,
      default: {}
    }
  },
  reward: {
    experience: {
      type: Number,
      default: 0
    },
    items: [{
      itemType: String,
      itemId: String,
      quantity: Number
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StoryChapter', StoryChapterSchema); 