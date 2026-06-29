import React, { useState } from 'react';
import { 
  Hash, Send
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';

const ChatPage = () => {
  const { messages, addMessage } = useChatStore();
  const channelMessages = messages.filter(m => m.channel_id === 'c-1');
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    addMessage({
      channel_id: 'c-1',
      sender_id: 'user-1',
      sender_name: 'Mayank Raj',
      sender_avatar: 'MR',
      content: input,
      reactions: {}
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="border-b border-gray-200 shrink-0 px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center space-x-2">
          <Hash size={20} className="text-gray-400" />
          <h1 className="font-bold text-gray-900 text-lg">general</h1>
          <span className="text-gray-400 text-sm ml-2 font-medium">| Company-wide announcements and discussion</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="text-center my-6">
          <div className="inline-block bg-gray-100 text-gray-500 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Today
          </div>
        </div>
        
        {channelMessages.map(msg => (
          <div key={msg.id} className="flex items-start group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 shadow-sm ${msg.sender_name === 'Mayank Raj' ? 'bg-gray-900' : msg.sender_name === 'Sarah Chen' ? 'bg-blue-600' : 'bg-green-600'}`}>
              {msg.sender_avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline mb-1">
                <span className="font-bold text-gray-900 mr-2 text-[15px]">{msg.sender_name}</span>
                <span className="text-xs text-gray-400 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-gray-700 text-[15px] leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white pt-2 border-t border-gray-100">
        <form onSubmit={handleSend} className="border border-gray-300 rounded-xl shadow-sm focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all flex flex-col bg-white overflow-hidden">
          <div className="flex items-end p-2">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message #general"
              className="flex-1 max-h-48 min-h-[40px] px-3 py-2 resize-none outline-none text-[14px] text-gray-800 placeholder-gray-400 bg-transparent custom-scrollbar"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className={`p-2 rounded-md transition-colors ml-2 mb-1 ${
                input.trim() ? 'bg-brand text-white shadow-sm' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Send size={16} className={input.trim() ? 'translate-x-0.5' : ''} />
            </button>
          </div>
        </form>
        <div className="text-center text-[11px] text-gray-400 mt-2">
          <strong>Return</strong> to send <span className="mx-2">|</span> <strong>Shift + Return</strong> to add a new line
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
