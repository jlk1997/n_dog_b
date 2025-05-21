const StoryPlot = require('../models/StoryPlot');
const StoryChapter = require('../models/StoryChapter');
const StoryEvent = require('../models/StoryEvent');
const UserStoryProgress = require('../models/UserStoryProgress');
const mongoose = require('mongoose');

// 错误处理函数
const handleError = (res, error) => {
  console.error('剧情系统错误:', error);
  return res.status(500).json({
    success: false,
    message: '服务器错误',
    error: error.message
  });
};

// 获取用户可用的剧情列表
exports.getUserPlots = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取所有激活的剧情，按主线和排序顺序排序
    const plots = await StoryPlot.find({ isActive: true })
      .sort({ isMainStory: -1, sortOrder: 1 });
    
    // 获取用户的剧情进度
    const userProgress = await UserStoryProgress.find({ userId });
    
    // 将进度信息合并到剧情数据中
    const plotsWithProgress = plots.map(plot => {
      const progress = userProgress.find(p => p.plotId.toString() === plot._id.toString());
      
      return {
        _id: plot._id,
        title: plot.title,
        description: plot.description,
        coverImage: plot.coverImage,
        isMainStory: plot.isMainStory,
        sortOrder: plot.sortOrder, // 添加排序顺序
        isActive: plot.isActive,
        createdAt: plot.createdAt,
        updatedAt: plot.updatedAt,
        status: progress ? progress.status : 'NOT_STARTED',
        progress: progress ? {
          currentChapterId: progress.currentChapterId,
          currentEventId: progress.currentEventId, // 添加当前事件ID
          completedChapters: progress.completedChapters.length,
          completedEvents: progress.completedEvents ? progress.completedEvents.length : 0, // 添加已完成事件数量
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          lastUpdatedAt: progress.updatedAt // 添加最后更新时间
        } : null
      };
    });
    
    return res.status(200).json({
      success: true,
      data: plotsWithProgress
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 获取剧情章节列表
exports.getPlotChapters = async (req, res) => {
  try {
    const userId = req.user.id;
    const plotId = req.params.plotId;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    // 获取剧情
    const plot = await StoryPlot.findOne({ _id: plotId, isActive: true });
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    // 获取用户进度
    let progress = await UserStoryProgress.findOne({ userId, plotId });
    
    // 如果没有进度记录，创建一个
    if (!progress) {
      progress = new UserStoryProgress({
        userId,
        plotId,
        status: 'NOT_STARTED'
      });
      
      await progress.save();
    }
    
    // 获取章节
    const chapters = await StoryChapter.find({ plotId, isActive: true })
      .sort({ sortOrder: 1 });
    
    // 添加章节状态
    const chaptersWithStatus = chapters.map(chapter => {
      const isCompleted = progress.completedChapters.includes(chapter._id);
      const isCurrent = progress.currentChapterId && 
                       progress.currentChapterId.toString() === chapter._id.toString();
      
      // 检查章节是否可用（基于前置要求）
      let isAvailable = true;
      
      if (chapter.requirement && chapter.requirement.previousChapter) {
        isAvailable = progress.completedChapters.includes(chapter.requirement.previousChapter);
      }
      
      return {
        _id: chapter._id,
        title: chapter.title,
        description: chapter.description,
        sortOrder: chapter.sortOrder,
        status: isCompleted ? 'COMPLETED' : (isCurrent ? 'IN_PROGRESS' : 'NOT_STARTED'),
        isAvailable: isAvailable
      };
    });
    
    return res.status(200).json({
      success: true,
      data: {
        plot: {
          _id: plot._id,
          title: plot.title,
          description: plot.description,
          coverImage: plot.coverImage
        },
        chapters: chaptersWithStatus,
        progress: {
          status: progress.status,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt
        }
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 开始或继续剧情
exports.startPlot = async (req, res) => {
  try {
    const userId = req.user.id;
    const plotId = req.params.plotId;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    // 获取剧情
    const plot = await StoryPlot.findOne({ _id: plotId, isActive: true });
    
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: '未找到剧情'
      });
    }
    
    // 获取第一个章节
    const firstChapter = await StoryChapter.findOne({ 
      plotId, 
      isActive: true 
    }).sort({ sortOrder: 1 });
    
    if (!firstChapter) {
      return res.status(404).json({
        success: false,
        message: '剧情没有可用章节'
      });
    }
    
    // 获取第一个事件
    const firstEvent = await StoryEvent.findOne({ 
      chapterId: firstChapter._id,
      isActive: true 
    }).sort({ sortOrder: 1 });
    
    if (!firstEvent) {
      return res.status(404).json({
        success: false,
        message: '章节没有可用事件'
      });
    }
    
    // 获取或创建用户进度
    let progress = await UserStoryProgress.findOne({ userId, plotId });
    
    if (!progress) {
      progress = new UserStoryProgress({
        userId,
        plotId,
        currentChapterId: firstChapter._id,
        currentEventId: firstEvent._id,
        status: 'IN_PROGRESS',
        startedAt: Date.now(),
        completedEvents: [],
        completedChapters: []
      });
    } else {
      // 如果已完成，询问是否重新开始
      if (progress.status === 'COMPLETED' && req.query.restart !== 'true') {
        return res.status(200).json({
          success: true,
          message: '剧情已完成',
          data: {
            plot,
            progress,
            isCompleted: true
          }
        });
      }
      
      // 如果请求重新开始，重置进度
      if (req.query.restart === 'true') {
        progress.currentChapterId = firstChapter._id;
        progress.currentEventId = firstEvent._id;
        progress.status = 'IN_PROGRESS';
        progress.startedAt = Date.now();
        progress.completedAt = null;
        progress.completedEvents = [];
        progress.completedChapters = [];
      } else {
        // 如果已有进度，保持当前进度
        if (!progress.currentChapterId) {
          progress.currentChapterId = firstChapter._id;
        }
        
        if (!progress.currentEventId) {
          // 找到当前章节的第一个事件
          const chapterFirstEvent = await StoryEvent.findOne({
            chapterId: progress.currentChapterId,
            isActive: true
          }).sort({ sortOrder: 1 });
          
          if (chapterFirstEvent) {
            progress.currentEventId = chapterFirstEvent._id;
          } else {
            progress.currentEventId = firstEvent._id;
          }
        }
        
        if (progress.status === 'NOT_STARTED') {
          progress.status = 'IN_PROGRESS';
          progress.startedAt = Date.now();
        }
      }
    }
    
    await progress.save();
    
    // 获取当前事件详情
    const currentEvent = await StoryEvent.findById(progress.currentEventId);
    
    if (!currentEvent) {
      return res.status(404).json({
        success: false,
        message: '未找到当前事件'
      });
    }
    
    // 格式化事件数据，确保前端可以正确处理
    const formattedEvent = {
      _id: currentEvent._id,
      title: currentEvent.title,
      // 兼容新旧格式
      type: currentEvent.eventType,
      eventType: currentEvent.eventType,
      content: currentEvent.content,
      // 如果是任务类型，添加特殊处理
      task: currentEvent.eventType === 'TASK' ? {
        description: currentEvent.content.taskObjective || ''
      } : undefined,
      // 如果是多选项类型，转换为新格式
      options: currentEvent.eventType === 'MULTI_CHOICE' && currentEvent.content.choices ? 
        currentEvent.content.choices.map(choice => ({
          text: choice.text,
          nextEventId: choice.nextEventId
        })) : undefined,
      triggerCondition: currentEvent.triggerCondition,
      // 添加图片支持
      imageUrl: currentEvent.imageUrl || null
    };
    
    return res.status(200).json({
      success: true,
      message: '剧情已开始',
      data: {
        plot: {
          _id: plot._id,
          title: plot.title,
          description: plot.description,
          coverImage: plot.coverImage
        },
        chapter: {
          _id: firstChapter._id,
          title: firstChapter.title
        },
        currentEvent: formattedEvent,
        progress: {
          status: progress.status,
          startedAt: progress.startedAt
        }
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 获取当前事件
exports.getCurrentEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const plotId = req.params.plotId;
    
    if (!mongoose.Types.ObjectId.isValid(plotId)) {
      return res.status(400).json({
        success: false,
        message: '无效的剧情ID'
      });
    }
    
    // 获取用户进度
    const progress = await UserStoryProgress.findOne({ userId, plotId });
    
    if (!progress || !progress.currentEventId) {
      return res.status(404).json({
        success: false,
        message: '未找到当前事件，请先开始剧情'
      });
    }
    
    // 获取当前事件
    const currentEvent = await StoryEvent.findById(progress.currentEventId);
    
    if (!currentEvent) {
      return res.status(404).json({
        success: false,
        message: '事件不存在'
      });
    }
    
    // 获取当前章节
    const currentChapter = await StoryChapter.findById(progress.currentChapterId);
    
    // 格式化事件数据，确保前端可以正确显示
    const formattedEvent = {
      _id: currentEvent._id,
      title: currentEvent.title,
      // 兼容新旧两种格式
      type: currentEvent.eventType,
      eventType: currentEvent.eventType,
      content: currentEvent.content,
      // 如果是任务类型，添加特殊处理
      task: currentEvent.eventType === 'TASK' ? {
        description: currentEvent.content.taskObjective || ''
      } : undefined,
      // 如果是多选项类型，转换为新格式
      options: currentEvent.eventType === 'MULTI_CHOICE' && currentEvent.content.choices ? 
        currentEvent.content.choices.map(choice => ({
          text: choice.text,
          nextEventId: choice.nextEventId
        })) : undefined,
      triggerCondition: currentEvent.triggerCondition
    };
    
    return res.status(200).json({
      success: true,
      data: {
        plotId,
        chapterId: progress.currentChapterId,
        chapterTitle: currentChapter ? currentChapter.title : '',
        currentEvent: formattedEvent
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 完成当前事件并进入下一个事件
exports.completeEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plotId, eventId, choiceIndex } = req.body;
    
    if (!plotId || !eventId) {
      return res.status(400).json({
        success: false,
        message: '剧情ID和事件ID为必填项'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(plotId) || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID'
      });
    }
    
    // 获取用户进度
    const progress = await UserStoryProgress.findOne({ userId, plotId });
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: '未找到进度记录'
      });
    }
    
    // 验证当前事件
    if (progress.currentEventId.toString() !== eventId.toString()) {
      return res.status(400).json({
        success: false,
        message: '提交的事件不是当前事件'
      });
    }
    
    // 获取当前事件
    const currentEvent = await StoryEvent.findById(eventId);
    
    if (!currentEvent) {
      return res.status(404).json({
        success: false,
        message: '事件不存在'
      });
    }
    
    // 处理多选事件
    let nextEventId = currentEvent.nextEventId;
    
    if (currentEvent.eventType === 'MULTI_CHOICE' && choiceIndex !== undefined) {
      // 确保选择索引有效
      if (choiceIndex >= 0 && currentEvent.content.choices && currentEvent.content.choices[choiceIndex]) {
        nextEventId = currentEvent.content.choices[choiceIndex].nextEventId;
        
        // 记录用户选择
        progress.userChoices.push({
          eventId: currentEvent._id,
          choiceIndex,
          timestamp: Date.now()
        });
      }
    }
    
    // 添加到已完成事件列表
    if (!progress.completedEvents.includes(currentEvent._id)) {
      progress.completedEvents.push(currentEvent._id);
    }
    
    // 如果有下一个事件
    if (nextEventId) {
      const nextEvent = await StoryEvent.findById(nextEventId);
      
      if (nextEvent) {
        progress.currentEventId = nextEvent._id;
        
        // 如果下一个事件属于不同章节，更新当前章节
        if (nextEvent.chapterId.toString() !== currentEvent.chapterId.toString()) {
          const nextChapter = await StoryChapter.findById(nextEvent.chapterId);
          
          if (nextChapter) {
            // 将当前章节添加到已完成章节
            if (!progress.completedChapters.includes(currentEvent.chapterId)) {
              progress.completedChapters.push(currentEvent.chapterId);
            }
            
            progress.currentChapterId = nextChapter._id;
          }
        }
        
        await progress.save();
        
        return res.status(200).json({
          success: true,
          message: '事件已完成，进入下一个事件',
          data: {
            nextEvent: {
              _id: nextEvent._id,
              title: nextEvent.title,
              eventType: nextEvent.eventType,
              content: nextEvent.content,
              triggerCondition: nextEvent.triggerCondition
            }
          }
        });
      }
    }
    
    // 如果没有下一个事件，检查章节是否完成
    const remainingEvents = await StoryEvent.find({
      chapterId: currentEvent.chapterId,
      _id: { $nin: progress.completedEvents }
    });
    
    if (remainingEvents.length === 0) {
      // 章节完成，添加到已完成章节
      if (!progress.completedChapters.includes(currentEvent.chapterId)) {
        progress.completedChapters.push(currentEvent.chapterId);
      }
      
      // 查找下一个章节
      const nextChapter = await StoryChapter.findOne({
        plotId,
        isActive: true,
        _id: { $nin: progress.completedChapters }
      }).sort({ sortOrder: 1 });
      
      if (nextChapter) {
        // 找到下一个章节的第一个事件
        const firstEvent = await StoryEvent.findOne({
          chapterId: nextChapter._id,
          isActive: true
        }).sort({ sortOrder: 1 });
        
        if (firstEvent) {
          progress.currentChapterId = nextChapter._id;
          progress.currentEventId = firstEvent._id;
          
          await progress.save();
          
          return res.status(200).json({
            success: true,
            message: '章节已完成，进入下一章节',
            data: {
              chapterId: nextChapter._id,
              chapterTitle: nextChapter.title,
              nextEvent: {
                _id: firstEvent._id,
                title: firstEvent.title,
                eventType: firstEvent.eventType,
                content: firstEvent.content,
                triggerCondition: firstEvent.triggerCondition
              }
            }
          });
        }
      }
      
      // 没有下一个章节，剧情完成
      progress.status = 'COMPLETED';
      progress.completedAt = Date.now();
      progress.currentEventId = null;
      
      await progress.save();
      
      return res.status(200).json({
        success: true,
        message: '恭喜！剧情已全部完成',
        data: {
          status: 'COMPLETED',
          completedAt: progress.completedAt
        }
      });
    }
    
    // 还有未完成的事件，但当前事件没有指定下一个事件
    progress.currentEventId = null;
    await progress.save();
    
    return res.status(200).json({
      success: true,
      message: '事件已完成，但没有指定下一个事件',
      data: {
        status: 'EVENT_COMPLETED',
        remainingEventsCount: remainingEvents.length
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}; 