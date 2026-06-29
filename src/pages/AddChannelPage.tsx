import React, { useState } from 'react';
import { Hash, Lock, Globe, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/useChatStore';

const AddChannelPage = () => {
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const navigate = useNavigate();

  const { addChannel } = useChatStore();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    
    addChannel({
      name: channelName.toLowerCase().replace(/\s+/g, '-'),
      type: isPrivate ? 'private' : 'public',
      members: ['user-1']
    });
    
    setChannelName('');
    setDescription('');
    navigate('/chat'); 
  };

  return (
    <div className="flex-1 bg-[#f8f9fa] flex items-center justify-center p-6 h-full overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-brand to-[#aa3bff] opacity-10 absolute top-0 left-0 right-0 pointer-events-none"></div>
        
        <div className="px-10 pt-10 pb-8 relative">
          <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-6">
            <Hash size={32} className="text-brand" strokeWidth={2.5} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a channel</h1>
          <p className="text-gray-500 mb-8 max-w-lg leading-relaxed">
            Channels are where your team communicates. They're best when organized around a topic — #marketing, for example.
          </p>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Channel Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Name</label>
              <div className="relative group">
                <Hash size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" />
                <input 
                  type="text" 
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. plan-budget" 
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 hover:border-gray-300 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 rounded-xl text-sm transition-all outline-none font-medium"
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 flex items-center">
                <Info size={12} className="mr-1" />
                Names must be lowercase, without spaces or periods.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 hover:border-gray-300 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">What's this channel about?</p>
            </div>

            {/* Privacy */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">Privacy</label>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Public Option */}
                <div 
                  onClick={() => setIsPrivate(false)}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    !isPrivate 
                      ? 'border-brand bg-brand/5 shadow-sm' 
                      : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${!isPrivate ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Globe size={18} />
                    </div>
                    <span className={`font-semibold ${!isPrivate ? 'text-brand' : 'text-gray-700'}`}>Public</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Anyone in the workspace can view and join this channel.
                  </p>
                </div>

                {/* Private Option */}
                <div 
                  onClick={() => setIsPrivate(true)}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                    isPrivate 
                      ? 'border-brand bg-brand/5 shadow-sm' 
                      : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${isPrivate ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Lock size={18} />
                    </div>
                    <span className={`font-semibold ${isPrivate ? 'text-brand' : 'text-gray-700'}`}>Private</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    Only specific people can view and join this channel.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <button 
                type="button"
                className="text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              
              <button 
                type="submit"
                disabled={!channelName.trim()}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                  channelName.trim() 
                    ? 'bg-gray-900 text-white hover:bg-black hover:shadow-md' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>Create Channel</span>
                <ArrowRight size={16} />
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default AddChannelPage;
