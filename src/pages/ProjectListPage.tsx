import React, { useState } from 'react';
import { 
  Plus, Search, MoreHorizontal, LayoutGrid, CheckCircle2, X, Kanban, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { usePermissions } from '../hooks/usePermissions';

const ProjectListPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { projects, addProject, removeProject } = useProjectStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { members } = useWorkspaceStore();
  const { canCreateTasks, canDeleteSpaces } = usePermissions();

  const [spaceToDelete, setSpaceToDelete] = useState<string | null>(null);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    addProject({
      name: newProjectName,
      description: newProjectDesc || 'A new space for your team.',
      progress: 0,
      status: 'active',
      order: projects?.length || 0,
      members: selectedMembers
    } as any);
    setNewProjectName('');
    setNewProjectDesc('');
    setSelectedMembers([]);
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (spaceToDelete) {
      removeProject(spaceToDelete);
      setSpaceToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] text-gray-800 text-sm overflow-hidden w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gray-900 text-white rounded-lg flex items-center justify-center shadow-sm">
            <LayoutGrid size={18} />
          </div>
          <h1 className="font-bold text-gray-900 text-lg">Spaces Overview</h1>
        </div>
        <div className="flex items-center space-x-3">
        {canCreateTasks && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-1.5 px-4 py-2 bg-brand text-white font-semibold rounded-md hover:opacity-90 transition-opacity shadow-sm text-[13px]">
            <Plus size={16} className="mr-1" /> <span>New Space</span>
          </button>
        )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-[1400px] w-full mx-auto p-8">
        <div className="w-full flex flex-col">
          
          {/* Controls */}
          <div className="flex items-center justify-between mb-8">
            <div className="relative w-72 group">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-hover:text-brand transition-colors" />
              <input 
                type="text" 
                placeholder="Search spaces..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]" 
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 custom-scrollbar pr-2">
            {(projects || []).filter(p => (p?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())).map(project => {
              return (
              <div 
                key={project.id} 
                onClick={() => navigate(`/spaces/${project.id}`)} 
                className="bg-white rounded-xl p-6 flex flex-col transition-all duration-200 group border border-gray-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] relative min-h-[220px] cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-brand bg-brand/10 shadow-inner`}>
                    <Kanban size={24} />
                  </div>
                  
                  {/* Delete Button */}
                  {canDeleteSpaces && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSpaceToDelete(project.id);
                      }} 
                      className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 absolute right-0 top-0 bg-gray-50 rounded-md p-1.5 hover:bg-red-50"
                      title="Delete Space"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <h3 className="text-[16px] font-semibold text-gray-900 mb-1.5">{project.name}</h3>
                <p className="text-[13px] text-gray-500 line-clamp-2 mt-1 leading-relaxed mb-auto">
                  {project.description}
                </p>
              </div>
            )})}
            
            {/* Create New Card */}
            {canCreateTasks && (
              <div 
                onClick={() => setIsModalOpen(true)} 
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-brand hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer min-h-[220px] group"
              >
                <div className="w-14 h-14 rounded-full bg-gray-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <Plus size={28} />
                </div>
                <span className="font-semibold text-[15px] text-gray-600 group-hover:text-brand transition-colors">Create new space</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Create New Space</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Space Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Website Redesign"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all text-gray-900"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea 
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  placeholder="What is this space about?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all resize-none h-28 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Assign Members</label>
                <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {members.filter(m => m.user).map(member => (
                    <label key={member.user_id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
                        checked={selectedMembers.includes(member.user_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, member.user_id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== member.user_id));
                          }
                        }}
                      />
                      <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">
                        {member.user?.name?.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">{member.user?.name}</span>
                    </label>
                  ))}
                  {members.filter(m => m.user).length === 0 && (
                    <div className="p-2 text-sm text-gray-500 text-center">No members found in workspace.</div>
                  )}
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={!newProjectName.trim()} className="px-6 py-2.5 bg-brand text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm shadow-brand/20 text-sm">
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {spaceToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
              <Trash2 size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2.5 tracking-tight">Delete Space?</h3>
            <p className="text-[14px] text-gray-500 mb-8 leading-relaxed px-2">
              Are you sure you want to delete this space? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setSpaceToDelete(null)}
                className="flex-1 px-4 py-3 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors text-[14px]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20 text-[14px]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectListPage;
