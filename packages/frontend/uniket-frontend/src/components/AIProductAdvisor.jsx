import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { FaRobot, FaSearch, FaStar, FaChartLine, FaShoppingCart, FaSpinner, FaTag, FaUser } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './AIProductAdvisor.css';
import { getProductImageUrl } from '../utils/imageUtils';

const AIProductAdvisor = ({ onProductSelect }) => {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Get user ID from localStorage and ensure it's a number
  const getUserId = () => {
    const userId = localStorage.getItem('userId');
    return userId ? parseInt(userId, 10) : null;
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch recommendations when debounced query changes
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        setRecommendations([]);
        setShowExplanation(false);
        return;
      }

      setLoading(true);
      try {
        const userId = getUserId();
        const response = await axios.get(`/products/ai-recommendations`, {
          params: {
            query: debouncedQuery.trim(),
            userId: userId || undefined
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          setRecommendations(response.data);
          setShowExplanation(true);
        } else {
          console.error('Invalid response format:', response.data);
          setRecommendations([]);
        }
      } catch (error) {
        console.error('Error fetching AI recommendations:', error);
        setRecommendations([]);
        setShowExplanation(false);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [debouncedQuery]);

  const getExplanationText = (product) => {
    const explanations = [];
    
    if (product.isTopRated) {
      explanations.push('Top-rated product with excellent reviews');
    }
    
    if (product.relevanceScore > 70) {
      explanations.push('Highly relevant to your preferences');
    }
    
    if (product.popularityScore > 70) {
      explanations.push('Popular choice among customers');
    }
    
    if (product.performanceScore > 80) {
      explanations.push('Excellent overall performance');
    }

    return explanations.length > 0 ? explanations : ['Good match based on your search'];
  };

  return (
    <div className="ai-advisor-container">
      <div className="ai-advisor-header">
        <div className="ai-icon-wrapper">
          <FaRobot className="ai-icon" />
        </div>
        <h2>UniKet AI Assistant</h2>
        <p className="ai-subtitle">Get personalized product recommendations based on ratings, performance, and user satisfaction</p>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="search-input"
          />
          {loading && <FaSpinner className="spinner" />}
        </div>
      </div>

      {showExplanation && recommendations.length > 0 && (
        <div className="ai-explanation">
          <h3>Why these recommendations?</h3>
          <ul>
            {recommendations.slice(0, 3).map((product) => (
              <li key={product.id}>
                <FaTag className="explanation-icon" />
                <div>
                  <strong>{product.name}</strong>
                  <p>{getExplanationText(product).join(' • ')}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="recommendations-grid">
        {recommendations.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="recommendation-card"
            onClick={() => onProductSelect(product)}
          >
            <div className="product-image">
              <img 
                src={getProductImageUrl(product.image)} 
                alt={product.name} 
              />
              {product.isTopRated && (
                <div className="top-rated-badge">
                  <FaStar /> Top Rated
                </div>
              )}
            </div>
            <div className="product-info">
              <h3>{product.name}</h3>
              <div className="product-metrics">
                <div className="metric">
                  <FaStar className="metric-icon" />
                  <span>{product.rating.toFixed(1)}</span>
                </div>
                <div className="metric">
                  <FaChartLine className="metric-icon" />
                  <span>{product.performanceScore}%</span>
                </div>
                {product.relevanceScore > 0 && (
                  <div className="metric">
                    <FaUser className="metric-icon" />
                    <span>{product.relevanceScore}%</span>
                  </div>
                )}
              </div>
              <p className="product-description">{product.description}</p>
              <div className="product-price">
                <span className="price">GH₵{product.price.toFixed(2)}</span>
                {product.discount && (
                  <span className="discount">-{product.discount}%</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {query && !loading && recommendations.length === 0 && (
        <div className="no-results">
          <p>No products found matching your search. Try different keywords or browse our categories.</p>
        </div>
      )}
    </div>
  );
};

export default AIProductAdvisor; 