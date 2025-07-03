import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner } from 'react-icons/fa';
import axios from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import { FiSend, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import './VendorSupportChat.css';

const VendorSupportChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { socket, isConnected, sendSupportMessage, sendTypingStatus } = useSocket();
  const userData = JSON.parse(localStorage.getItem('user'));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket && isConnected) {
      // Register user with socket
      socket.emit('register', userData.id);

      socket.on('support_message', (message) => {
        setMessages(prev => [...prev, message]);
        setIsTyping(false);
      });

      socket.on('support_typing', () => {
        setIsTyping(true);
      });

      socket.on('support_stop_typing', () => {
        setIsTyping(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('support_message');
        socket.off('support_typing');
        socket.off('support_stop_typing');
      }
    };
  }, [socket, isConnected, userData.id]);

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get('/support/chat/history', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success && Array.isArray(response.data.data)) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to load chat history');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !isConnected) return;

    setIsLoading(true);
    try {
      const response = await axios.post(
        '/support/chat',
        { message: inputMessage },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success && response.data.data) {
        const { userMessage, aiMessages } = response.data.data;
        setMessages(prev => [
          ...prev,
          {
            id: userMessage.id,
            content: inputMessage,
            type: 'USER',
            timestamp: new Date().toISOString()
          },
          ...aiMessages.map(msg => ({
            id: msg.id,
            content: msg.message,
            type: 'AI',
            timestamp: new Date().toISOString()
          }))
        ]);
      }

      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`/support/chat/message/${messageId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all chat history?')) return;

    try {
      await axios.delete('/support/chat/history', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages([]);
      toast.success('Chat history cleared successfully');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      toast.error('Failed to clear chat history');
    }
  };

  return (
    <div className="support-chat-container">
      <div className="support-chat-header">
        <h2>Support Chat</h2>
        <div className="support-chat-actions">
          <button onClick={fetchChatHistory} className="refresh-btn" title="Refresh chat">
            <FiRefreshCw />
          </button>
          <button onClick={handleClearHistory} className="clear-btn" title="Clear chat history">
            <FiTrash2 />
          </button>
        </div>
      </div>

      <div className="support-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type.toLowerCase()}`}>
            <div className="message-content">
              {message.content}
              <button
                className="delete-message-btn"
                onClick={() => handleDeleteMessage(message.id)}
                title="Delete message"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
            <div className="message-timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message ai">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="support-chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || !isConnected}
        />
        <button type="submit" disabled={isLoading || !isConnected}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default VendorSupportChat; 