const StoryPlot = require('../../models/StoryPlot');
const StoryChapter = require('../../models/StoryChapter');
const StoryEvent = require('../../models/StoryEvent');
const UserStoryProgress = require('../../models/UserStoryProgress');
const mongoose = require('mongoose');

// 错误处理函数
const handleError = (res, error) => {
  console.error('剧情管理错误:', error);
  return res.status(500).json({
    success: false,
    message: '服务器错误',
    error: error.message
  });
};

// 获取所有剧情
exports.getAllPlots = async (req, res) => {
  try {
    const plots = await StoryPlot.find()
      .sort({ isMainStory: -1, sortOrder: 1, createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: plots
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 获取剧情详情
exports.getPlotDetail = async (req, res) => {
  try {
    const plotId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    const plot = await StoryPlot.findById(plotId);
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    const chapters = await StoryChapter.find({ plotId })
      .sort({ sortOrder: 1 });
      
    return res.status(200).json({
      success: true,
      data: {
        plot,
        chapters
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 创建剧情
exports.createPlot = async (req, res) => {
  try {
    const { title, description, coverImage, isMainStory, sortOrder, requirement, reward } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: '标题和描述为必填项'
      });
    }
    
    const plot = new StoryPlot({
      title,
      description,
      coverImage: coverImage || '',
      isMainStory: isMainStory || false,
      sortOrder: sortOrder || 0,
      requirement: requirement || {},
      reward: reward || {}
    });
    
    await plot.save();
    
    return res.status(201).json({
      success: true,
      message: '剧情创建成功',
      data: plot
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 更新剧情
exports.updatePlot = async (req, res) => {
  try {
    const plotId = req.params.id;
    const { title, description, coverImage, isActive, isMainStory, sortOrder, requirement, reward } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    const plot = await StoryPlot.findById(plotId);
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    // 更新字段
    if (title) plot.title = title;
    if (description) plot.description = description;
    if (coverImage !== undefined) plot.coverImage = coverImage;
    if (isActive !== undefined) plot.isActive = isActive;
    if (isMainStory !== undefined) plot.isMainStory = isMainStory;
    if (sortOrder !== undefined) plot.sortOrder = sortOrder;
    if (requirement) plot.requirement = requirement;
    if (reward) plot.reward = reward;
    
    plot.updatedAt = Date.now();
    
    await plot.save();
    
    return res.status(200).json({
      success: true,
      message: '剧情更新成功',
      data: plot
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 删除剧情
exports.deletePlot = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const plotId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    // 查找剧情
    const plot = await StoryPlot.findById(plotId).session(session);
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    // 查找关联的章节
    const chapters = await StoryChapter.find({ plotId }).session(session);
    const chapterIds = chapters.map(chapter => chapter._id);
    
    // 删除关联的事件
    await StoryEvent.deleteMany({ chapterId: { $in: chapterIds } }).session(session);
    
    // 删除章节
    await StoryChapter.deleteMany({ plotId }).session(session);
    
    // 删除用户进度
    await UserStoryProgress.deleteMany({ plotId }).session(session);
    
    // 删除剧情
    await StoryPlot.findByIdAndDelete(plotId).session(session);
    
    await session.commitTransaction();
    
    return res.status(200).json({
      success: true,
      message: '剧情及其关联数据已成功删除'
    });
  } catch (error) {
    await session.abortTransaction();
    return handleError(res, error);
  } finally {
    session.endSession();
  }
};

// 获取章节详情
exports.getChapterDetail = async (req, res) => {
  try {
    const chapterId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(400).json({
        success: false,
        message: '无效的章节ID'
      });
    }
    
    const chapter = await StoryChapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: '未找到章节'
      });
    }
    
    const events = await StoryEvent.find({ chapterId })
      .sort({ sortOrder: 1 });
      
    return res.status(200).json({
      success: true,
      data: {
        chapter,
        events
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 创建章节
exports.createChapter = async (req, res) => {
  try {
    const { plotId, title, description, sortOrder, isActive, requirement, reward } = req.body;
    
    if (!plotId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: '剧情ID、标题和描述为必填项'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    // 检查剧情是否存在
    const plot = await StoryPlot.findById(plotId);
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    const chapter = new StoryChapter({
      plotId,
      title,
      description,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      requirement: requirement || {},
      reward: reward || {}
    });
    
    await chapter.save();
    
    return res.status(201).json({
      success: true,
      message: '章节创建成功',
      data: chapter
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 更新章节
exports.updateChapter = async (req, res) => {
  try {
    const chapterId = req.params.id;
    const { title, description, sortOrder, isActive, requirement, reward } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(400).json({
        success: false,
        message: '无效的章节ID'
      });
    }
    
    const chapter = await StoryChapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: '未找到章节'
      });
    }
    
    // 更新字段
    if (title) chapter.title = title;
    if (description) chapter.description = description;
    if (sortOrder !== undefined) chapter.sortOrder = sortOrder;
    if (isActive !== undefined) chapter.isActive = isActive;
    if (requirement) chapter.requirement = requirement;
    if (reward) chapter.reward = reward;
    
    chapter.updatedAt = Date.now();
    
    await chapter.save();
    
    return res.status(200).json({
      success: true,
      message: '章节更新成功',
      data: chapter
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 删除章节
exports.deleteChapter = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const chapterId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(400).json({
        success: false,
        message: '无效的章节ID'
      });
    }
    
    // 查找章节
    const chapter = await StoryChapter.findById(chapterId).session(session);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: '未找到章节'
      });
    }
    
    // 删除关联的事件
    await StoryEvent.deleteMany({ chapterId }).session(session);
    
    // 更新用户进度中的章节引用
    await UserStoryProgress.updateMany(
      { currentChapterId: chapterId },
      { $set: { currentChapterId: null } }
    ).session(session);
    
    await UserStoryProgress.updateMany(
      { completedChapters: chapterId },
      { $pull: { completedChapters: chapterId } }
    ).session(session);
    
    // 删除章节
    await StoryChapter.findByIdAndDelete(chapterId).session(session);
    
    await session.commitTransaction();
    
    return res.status(200).json({
      success: true,
      message: '章节及其关联事件已成功删除'
    });
  } catch (error) {
    await session.abortTransaction();
    return handleError(res, error);
  } finally {
    session.endSession();
  }
};

// 创建事件
exports.createEvent = async (req, res) => {
  try {
    const {
      chapterId, title, eventType, content, triggerCondition,
      nextEventId, isActive, sortOrder
    } = req.body;
    
    if (!chapterId || !title) {
      return res.status(400).json({
        success: false,
        message: '章节ID和标题为必填项'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(400).json({
        success: false,
        message: '无效的章节ID'
      });
    }
    
    // 检查章节是否存在
    const chapter = await StoryChapter.findById(chapterId);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: '未找到章节'
      });
    }
    
    // 验证nextEventId是否有效
    if (nextEventId && !mongoose.Types.ObjectId.isValid(nextEventId)) {
      return res.status(400).json({
        success: false,
        message: '无效的下一个事件ID'
      });
    }
    
    const event = new StoryEvent({
      chapterId,
      title,
      eventType: eventType || 'DIALOG',
      content: content || {},
      triggerCondition: triggerCondition || { type: 'AUTO' },
      nextEventId: nextEventId || null,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    });
    
    await event.save();
    
    return res.status(201).json({
      success: true,
      message: '事件创建成功',
      data: event
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 更新事件
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const {
      title, eventType, content, triggerCondition,
      nextEventId, isActive, sortOrder
    } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: '无效的事件ID'
      });
    }
    
    const event = await StoryEvent.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '未找到事件'
      });
    }
    
    // 验证nextEventId是否有效
    if (nextEventId && !mongoose.Types.ObjectId.isValid(nextEventId)) {
      return res.status(400).json({
        success: false,
        message: '无效的下一个事件ID'
      });
    }
    
    // 更新字段
    if (title) event.title = title;
    if (eventType) event.eventType = eventType;
    if (content) event.content = content;
    if (triggerCondition) event.triggerCondition = triggerCondition;
    if (nextEventId !== undefined) event.nextEventId = nextEventId;
    if (isActive !== undefined) event.isActive = isActive;
    if (sortOrder !== undefined) event.sortOrder = sortOrder;
    
    event.updatedAt = Date.now();
    
    await event.save();
    
    return res.status(200).json({
      success: true,
      message: '事件更新成功',
      data: event
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 删除事件
exports.deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: '无效的事件ID'
      });
    }
    
    // 查找事件
    const event = await StoryEvent.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '未找到事件'
      });
    }
    
    // 更新引用此事件作为下一个事件的记录
    await StoryEvent.updateMany(
      { nextEventId: eventId },
      { $set: { nextEventId: null } }
    );
    
    // 更新用户进度
    await UserStoryProgress.updateMany(
      { currentEventId: eventId },
      { $set: { currentEventId: null } }
    );
    
    await UserStoryProgress.updateMany(
      { completedEvents: eventId },
      { $pull: { completedEvents: eventId } }
    );
    
    // 删除事件
    await StoryEvent.findByIdAndDelete(eventId);
    
    return res.status(200).json({
      success: true,
      message: '事件已成功删除'
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 获取用户剧情进度统计
exports.getUserProgressStats = async (req, res) => {
  try {
    // 获取所有剧情
    const plots = await StoryPlot.find();
    
    // 统计每个剧情的用户完成情况
    const progressStats = await Promise.all(
      plots.map(async (plot) => {
        const totalUsers = await UserStoryProgress.countDocuments({ plotId: plot._id });
        const completedUsers = await UserStoryProgress.countDocuments({ 
          plotId: plot._id,
          status: 'COMPLETED'
        });
        const inProgressUsers = await UserStoryProgress.countDocuments({ 
          plotId: plot._id,
          status: 'IN_PROGRESS'
        });
        
        return {
          plotId: plot._id,
          plotTitle: plot.title,
          totalUsers,
          completedUsers,
          inProgressUsers,
          notStartedUsers: totalUsers - completedUsers - inProgressUsers,
          completionRate: totalUsers > 0 ? (completedUsers / totalUsers * 100).toFixed(2) : 0
        };
      })
    );
    
    return res.status(200).json({
      success: true,
      data: progressStats
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 导出剧情配置
exports.exportStoryConfig = async (req, res) => {
  try {
    const plotId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    // 获取剧情
    const plot = await StoryPlot.findById(plotId);
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    // 获取章节
    const chapters = await StoryChapter.find({ plotId });
    
    // 获取所有事件
    const chapterIds = chapters.map(chapter => chapter._id);
    const events = await StoryEvent.find({ chapterId: { $in: chapterIds } });
    
    // 构建配置对象
    const storyConfig = {
      plot: plot.toObject(),
      chapters: chapters.map(chapter => chapter.toObject()),
      events: events.map(event => event.toObject())
    };
    
    return res.status(200).json({
      success: true,
      data: storyConfig
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 导入剧情配置
exports.importStoryConfig = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { storyConfig } = req.body;
    
    if (!storyConfig || !storyConfig.plot || !storyConfig.chapters || !storyConfig.events) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情配置数据'
      });
    }
    
    // 创建新剧情
    const newPlot = new StoryPlot({
      ...storyConfig.plot,
      _id: new mongoose.Types.ObjectId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    await newPlot.save({ session });
    
    // ID映射表
    const idMap = {
      plots: { [storyConfig.plot._id]: newPlot._id },
      chapters: {},
      events: {}
    };
    
    // 创建新章节
    const newChapters = await Promise.all(
      storyConfig.chapters.map(async (chapterData) => {
        const newChapter = new StoryChapter({
          ...chapterData,
          _id: new mongoose.Types.ObjectId(),
          plotId: newPlot._id,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        await newChapter.save({ session });
        idMap.chapters[chapterData._id] = newChapter._id;
        
        return newChapter;
      })
    );
    
    // 创建新事件
    const newEvents = await Promise.all(
      storyConfig.events.map(async (eventData) => {
        const newEvent = new StoryEvent({
          ...eventData,
          _id: new mongoose.Types.ObjectId(),
          chapterId: idMap.chapters[eventData.chapterId],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        
        await newEvent.save({ session });
        idMap.events[eventData._id] = newEvent._id;
        
        return newEvent;
      })
    );
    
    // 更新事件的nextEventId引用
    for (const event of newEvents) {
      const originalEvent = storyConfig.events.find(e => 
        idMap.events[e._id.toString()] === event._id.toString()
      );
      
      if (originalEvent && originalEvent.nextEventId) {
        event.nextEventId = idMap.events[originalEvent.nextEventId];
        await event.save({ session });
      }
    }
    
    await session.commitTransaction();
    
    return res.status(201).json({
      success: true,
      message: '剧情配置导入成功',
      data: {
        plotId: newPlot._id
      }
    });
  } catch (error) {
    await session.abortTransaction();
    return handleError(res, error);
  } finally {
    session.endSession();
  }
};

// 获取事件详情
exports.getEventDetail = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: '无效的事件ID'
      });
    }
    
    const event = await StoryEvent.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: '未找到事件'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    return handleError(res, error);
  }
}; 