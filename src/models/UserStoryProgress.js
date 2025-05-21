const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserStoryProgressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plotId: {
    type: Schema.Types.ObjectId,
    ref: 'StoryPlot',
    required: true
  },
  currentChapterId: {
    type: Schema.Types.ObjectId,
    ref: 'StoryChapter',
    default: null
  },
  currentEventId: {
    type: Schema.Types.ObjectId,
    ref: 'StoryEvent',
    default: null
  },
  completedChapters: [{
    type: Schema.Types.ObjectId,
    ref: 'StoryChapter'
  }],
  completedEvents: [{
    type: Schema.Types.ObjectId,
    ref: 'StoryEvent'
  }],
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'NOT_STARTED'
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  userChoices: [{
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'StoryEvent'
    },
    choiceIndex: Number,
    timestamp: {
      type: Date,
      default: Date.now
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
}, {
  timestamps: true
});

// 创建复合索引，确保每个用户每个剧情只有一条进度记录
UserStoryProgressSchema.index({ userId: 1, plotId: 1 }, { unique: true });

module.exports = mongoose.model('UserStoryProgress', UserStoryProgressSchema); 