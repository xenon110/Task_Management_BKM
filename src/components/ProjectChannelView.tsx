import React, { useState } from 'react';
import { 
  Hash, Send
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';

interface ProjectChannelViewProps {
  channelId?: string;
  projectName?: string;
}

const ProjectChannelView: React.FC<ProjectChannelViewProps> = ({ channelId = 'project-general', projectName = 'Project' }) => {
  const { messages, addMessage, channels, addChannel } = useChatStore();
  const { user } = useAuthStore();
  const channelMessages = messages.filter(m => m.channel_id === channelId);
  const [input, setInput] = useState('');

  // Auto-create channel in DB if it doesn't exist when we visit it
  React.useEffect(() => {
    if (channels && !channels.some(c => c.id === channelId)) {
      addChannel({ id: channelId, name: `${projectName} Chat`, type: 'public' } as any);
    }
  }, [channelId, channels, addChannel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    
    addMessage({
      channel_id: channelId,
      sender_id: user.id,
      sender_name: user.name || 'Unknown User',
      sender_avatar: user.name ? user.name.substring(0, 2).toUpperCase() : 'U',
      content: input
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="border-b border-gray-200 shrink-0 px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center space-x-2">
          <Hash size={20} className="text-[#a855f7]" />
          <h1 className="font-bold text-gray-900 text-lg">{projectName} Chat</h1>
          <span className="text-gray-400 text-sm ml-2 font-medium hidden md:inline">| Discussion and updates for this project</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="text-center my-6">
          <div className="inline-block bg-gray-100 text-gray-500 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Beginning of Project Chat
          </div>
        </div>
        
        {channelMessages.map(msg => (
          <div key={msg.id} className="flex items-start group">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mr-4 flex-shrink-0 shadow-sm ${msg.sender_id === user?.id ? 'bg-brand' : 'bg-blue-600'}`}>
              {msg.sender_avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline mb-1">
                <span className="font-bold text-gray-900 mr-2 text-[15px]">{msg.sender_name}</span>
                <span className="text-xs text-gray-400 font-medium">{new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
              placeholder={`Message #${projectName} Chat`}
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
              className={`p-2 rounded-full transition-colors mb-0.5 ${input.trim() ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              <Send size={16} className={input.trim() ? 'ml-0.5' : ''} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectChannelView;
