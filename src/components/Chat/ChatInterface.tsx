import { useState, useEffect, useRef } from 'react';
import { ConfigParams } from '@/types';
import '@/styles/chat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConfigState {
  currentConfig: any;
  proposedConfig: any;
  requirementsSummary: string;
}

export default function ChatInterface({ params }: { params: ConfigParams }) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'requirements' | 'review'>('requirements');
  const [configState, setConfigState] = useState<ConfigState | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const avatarImages = {
    user: '/images/user.png',
    assistant: '/images/fieldmo.png',
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMounted(true);
    setMessages([{
      role: 'assistant',
      content: `Welcome! I'm your AI assistant for the ${params.moduleKey} module. Please tell me about your customization requirements.`
    }]);
  }, [params.moduleKey]);

  const handleFinalizeCustomization = async () => {
    setIsTyping(true);
    try {
      const response = await fetch('/api/chat/finalize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          conversationHistory: messages,
          params 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process customization');
      }

      const data = await response.json();
      setConfigState({
        currentConfig: data.currentConfig,
        proposedConfig: data.proposedConfig,
        requirementsSummary: data.summary
      });
      
      setPhase('review');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Based on our conversation, I've prepared the customization changes. Here's a summary of what will be modified:\n\n${data.summary}\n\nWould you like to proceed with these changes? Please respond with 'yes' to confirm or 'no' to make adjustments.`
      }]);
      setAwaitingConfirmation(true);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      if (phase === 'review' && awaitingConfirmation) {
        const response = userMessage.toLowerCase();
        if (response === 'yes') {
          const finalResponse = await fetch('/api/chat/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              confirmed: true,
              configState,
              params 
            })
          });

          if (!finalResponse.ok) throw new Error('Failed to apply changes');

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Great! The customization has been successfully applied.'
          }]);
          setAwaitingConfirmation(false);
        } else if (response === 'no') {
          setPhase('requirements');
          setConfigState(null);
          setAwaitingConfirmation(false);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "I understand. Let's revisit your requirements. Please tell me what needs to be adjusted."
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: "Please respond with 'yes' to confirm the changes or 'no' to make adjustments."
          }]);
        }
      } else {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, params })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process request');
        }

        const data = await response.json();
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response 
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!mounted) return null;

  // Function to check if the last message is from the assistant
  const isLastMessageFromAssistant = () => {
    return messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">fieldmobi.ai</div>
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
      </header>

      <div className="content-wrapper">
        <div className="params-sidebar">
          <h2>Configuration Parameters</h2>
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="param-item">
              <span className="param-label">{key}:</span>
              <span className="param-value">{value || 'Not specified'}</span>
            </div>
          ))}
        </div>

        <div className="main-container">
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message-wrapper ${message.role}-wrapper animate__animated animate__fadeIn`}
                >
                  <div className="avatar">
                    <img 
                      src={avatarImages[message.role]}
                      alt={`${message.role} Avatar`}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/50/50';
                      }}
                    />
                  </div>
                  <div className={`message ${message.role}`}>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-wrapper assistant-wrapper">
                  <div className="avatar">
                    <img 
                      src={avatarImages.assistant}
                      alt="Assistant Avatar"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/api/placeholder/50/50';
                      }}
                    />
                  </div>
                  <div className="message assistant">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              {isLastMessageFromAssistant() && phase === 'requirements' && !isTyping && messages.length > 1 && (
                <div className="finalize-button-container">
                  <button 
                    className="finalize-button-chat"
                    onClick={handleFinalizeCustomization}
                    disabled={isTyping || phase !== 'requirements'}
                  >
                    Deploy
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={phase === 'review' && awaitingConfirmation ? 
                  "Type 'yes' to confirm or 'no' to make adjustments" : 
                  "Type your message..."
                }
                disabled={isTyping}
              />
              <button type="submit" disabled={isTyping || !inputValue.trim()}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}