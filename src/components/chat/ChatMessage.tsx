import React from 'react';
import { User, MessageSquare } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

const badgeStyles = {
  Verified: 'bg-green-100 text-green-800',
  OSM: 'bg-blue-100 text-blue-800',
  GooglePlaces: 'bg-orange-100 text-orange-800'
};

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  // Extract badge information from message content if present
  const hasBadge = message.content.includes('[Verified]') || 
                   message.content.includes('[OSM]') || 
                   message.content.includes('[GooglePlaces]');
  
  // Format the message content to properly display badges
  const formattedContent = message.content.split('\n').map((line, index) => {
    const badgeMatch = line.match(/\[(Verified|OSM|GooglePlaces)\]/);
    if (badgeMatch) {
      const [fullMatch, badge] = badgeMatch;
      const textContent = line.replace(fullMatch, '').trim();
      return (
        <div key={index} className="flex items-center gap-2">
          <span>{textContent}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${badgeStyles[badge as keyof typeof badgeStyles]}`}>
            {badge}
          </span>
        </div>
      );
    }
    return <div key={index}>{line}</div>;
  });
  
  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}
      style={{ animationDelay: '0.1s' }}
    >
      <div 
        className={`
          flex gap-3 max-w-[80%] p-4 rounded-lg 
          ${isUser 
            ? 'bg-blue-600 text-white rounded-tr-none' 
            : 'bg-white text-gray-800 rounded-tl-none shadow'
          }
        `}
      >
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <User className="h-5 w-5 text-blue-100" />
          ) : (
            <MessageSquare className="h-5 w-5 text-blue-600" />
          )}
        </div>
        
        <div>
          <div className={isUser ? 'text-blue-50' : 'text-gray-800'}>
            {formattedContent}
          </div>
          <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}