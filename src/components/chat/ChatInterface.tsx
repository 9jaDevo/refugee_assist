import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Mic, MicOff, Send, X } from 'lucide-react';
import { searchServices, detectLocation, processMessage } from '../../lib/services';
import CountrySelector from './CountrySelector';
import LanguageSelector from './LanguageSelector';
import { supabase } from '../../lib/supabase';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'system', content: string }>>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLocationDetecting, setIsLocationDetecting] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isInitialized) return;

    const initialize = async () => {
      try {
        // Verify Supabase client is initialized
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }

        const { data, error } = await supabase
          .from('chat_sessions')
          .insert([{}])
          .select()
          .single();
        
        if (error) throw error;
        if (data) {
          setSessionId(data.id);
          setConnectionError(null);
        }

        setIsLocationDetecting(true);
        const { country, error: locationError } = await detectLocation();
        setIsLocationDetecting(false);

        if (locationError) {
          console.warn('Location detection failed:', locationError);
          setShowCountrySelector(true);
          setMessages([{
            type: 'system',
            content: locationError
          }]);
          setIsInitialized(true);
          return;
        }

        if (country) {
          setUserCountry(country);
          setMessages([{
            type: 'system',
            content: `I detected that you're in ${country}. Is this correct? Please respond with "yes" to confirm or select your country manually.`
          }]);
        } else {
          setShowCountrySelector(true);
          setMessages([{
            type: 'system',
            content: 'Please select your current country to help me find relevant services for you.'
          }]);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize chat';
        setConnectionError(errorMessage);
        setShowCountrySelector(true);
        setMessages([{
          type: 'system',
          content: 'Please select your current country to help me find relevant services for you.'
        }]);
        setIsInitialized(true);
      }
    };

    initialize();
  }, [isInitialized]);

  useEffect(() => {
    const checkMicPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setMicPermission(true);
      } catch (error) {
        console.warn('Microphone permission denied:', error);
        setMicPermission(false);
      }
    };

    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

    if (isSecure) {
      checkMicPermissions();
    } else {
      setMicPermission(false);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startRecording = async () => {
    try {
      audioChunks.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks.current, { 
            type: mediaRecorder.current?.mimeType || 'audio/webm'
          });
          await processAudio(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          setMessages(prev => [...prev, {
            type: 'system',
            content: 'Sorry, I had trouble processing your voice input. Please try again or use text input instead.'
          }]);
        } finally {
          audioChunks.current = [];
        }
      };
      
      mediaRecorder.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMicPermission(false);
      alert('Unable to access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsListening(false);
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', selectedLanguage);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formData,
        }
      );
      
      if (!response.ok) {
        throw new Error(`Speech to text failed: ${response.statusText}`);
      }
      
      const { text, error } = await response.json();
      
      if (error) throw new Error(error);
      
      if (text) {
        setInputText(text);
        await handleSubmit(null, text);
      } else {
        throw new Error('No text returned from speech-to-text service');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountrySelect = (country: string) => {
    setUserCountry(country);
    setShowCountrySelector(false);
    setMessages([{
      type: 'system',
      content: `Welcome! I can help you find services in ${country}. What type of assistance do you need? (medical, shelter, legal, food, education)`
    }]);
  };

  const handleSubmit = async (e: React.FormEvent | null, voiceInput?: string) => {
    if (e) e.preventDefault();
    
    const userMessage = voiceInput || inputText;
    if (!userMessage.trim() || !sessionId || !userCountry || isLoading) return;

    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: sessionId,
          role: 'user',
          content: userMessage,
          language: selectedLanguage
        }]);

      if (msgError) throw msgError;

      const response = await processMessage(userMessage, selectedLanguage, sessionId, userCountry);

      if (response.error) {
        throw new Error(response.error);
      }

      setMessages(prev => [...prev, { type: 'system', content: response.message }]);
      
      setInputText('');
      inputRef.current?.focus();

    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, {
        type: 'system',
        content: 'I apologize, but I encountered an issue while searching for services. This might be a temporary problem. Please try again or rephrase your request.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-70px)]">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Service Assistant</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
            {userCountry && (
              <button
                onClick={() => setShowCountrySelector(true)}
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Change Country
              </button>
            )}
          </div>
        </div>
      </div>

      {connectionError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Connection Error: {connectionError}
              </p>
            </div>
          </div>
        </div>
      )}

      {isLocationDetecting && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Detecting your location...
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {showCountrySelector ? (
            <div className="bg-white rounded-lg shadow-md p-6 animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Select Your Country</h2>
                {userCountry && (
                  <button
                    onClick={() => setShowCountrySelector(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <CountrySelector onSelect={handleCountrySelect} />
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-md'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {!showCountrySelector && !connectionError && (
        <form onSubmit={handleSubmit} className="bg-white border-t p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            {micPermission !== false && (
              <button
                type="button"
                onClick={isListening ? stopRecording : startRecording}
                disabled={isLoading || micPermission === null}
                className={`p-2 rounded-full ${
                  isListening 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } transition-colors ${micPermission === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
            
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? 'Listening...' : 'Type your message...'}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || isListening}
            />
            
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading || isListening}
              className={`p-2 rounded-full ${
                !inputText.trim() || isLoading || isListening
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } transition-colors`}
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}