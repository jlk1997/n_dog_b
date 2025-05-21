const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StoryEventSchema = new Schema({
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'StoryChapter',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  eventType: {
    type: String,
    enum: ['DIALOG', 'TASK', 'GUIDE', 'REWARD', 'MULTI_CHOICE'],
    default: 'DIALOG'
  },
  content: {
    // 对话内容
    dialogues: [{
      speaker: String,
      content: String,
      avatar: String
    }],
    // 任务目标
    taskObjective: {
      type: String,
      default: ''
    },
    // 引导信息
    guideInfo: {
      targetPage: String,
      targetElement: String,
      guideText: String
    },
    // 多选项
    choices: [{
      text: String,
      nextEventId: Schema.Types.ObjectId
    }]
  },
  triggerCondition: {
    type: {
      type: String,
      enum: ['ENTER_PAGE', 'CLICK_ELEMENT', 'COMPLETE_TASK', 'AUTO', 'MANUAL'],
      default: 'AUTO'
    },
    pageId: String,
    elementId: String,
    delay: Number // 延迟触发时间(毫秒)
  },
  nextEventId: {
    type: Schema.Types.ObjectId,
    ref: 'StoryEvent',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
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

module.exports = mongoose.model('StoryEvent', StoryEventSchema); 