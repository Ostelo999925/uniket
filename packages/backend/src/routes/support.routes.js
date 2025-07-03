const express = require('express');
const router = express.Router();
const { handleChatMessage, getChatHistory, deleteMessage } = require('../controllers/support.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const getPrismaClient = require('../prismaClient');
const prisma = getPrismaClient();

// Chat routes
router.post('/chat', authenticate, handleChatMessage);
router.get('/chat', authenticate, getChatHistory);
router.get('/chat/:id', authenticate, getChatHistory);
router.post('/chat/:id/reply', authenticate, authorize(['admin']), handleChatMessage);
router.put('/chat/:id/resolve', authenticate, authorize(['admin']), handleChatMessage);
router.delete('/chat/message/:messageId', authenticate, deleteMessage);

// Stats route
router.get('/stats', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const totalChats = await prisma.supportchat.count();
    const activeChats = await prisma.supportchat.count({
      where: {
        type: 'USER',
        parentId: null
      }
    });
    const resolvedChats = await prisma.supportchat.count({
      where: {
        type: 'AI',
        parentId: {
          not: null
        }
      }
    });

    // Calculate average response time
    const resolvedMessages = await prisma.supportchat.findMany({
      where: {
        type: 'AI',
        parentId: {
          not: null
        }
      },
      include: {
        parent: true
      }
    });

    const responseTimes = resolvedMessages.map(msg => {
      const responseTime = msg.createdAt.getTime() - msg.parent.createdAt.getTime();
      return responseTime;
    });

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    res.json({
      totalChats,
      activeChats,
      resolvedChats,
      averageResponseTime
    });
  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({ error: 'Failed to fetch support statistics' });
  }
});

module.exports = router; 