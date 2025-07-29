import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function NewGroupModal({ isOpen, onClose, onCreate, friends = [] }) {
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('👥');
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  const avatarOptions = [
    '👥', '🎉', '🚀', '💼', '🎓', '🏠', '🎮', '🍕', '📚', '💪', 
    '🎵', '🌟', '🔥', '⚡', '🎯', '🏆', '💎', '🌈', '🦄', '🎨',
    '🎭', '🎪', '🎬', '📱', '💻', '🎸', '🎤', '🎧', '🎲', '🎳',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸', '🥊', '🏊‍♂️'
  ];

  const handleAddMember = (e) => {
    const uid = e.target.value;
    if (uid && !selectedUserIds.includes(uid)) {
      setSelectedUserIds(prev => [...prev, uid]);
      e.target.value = ''; // Reset the dropdown
    }
  };

  const handleRemoveMember = (uid) => {
    setSelectedUserIds(prev => prev.filter(id => id !== uid));
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    if (selectedUserIds.length === 0) {
      setError('Please add at least one member');
      return;
    }

    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    onCreate({
      groupName,
      members: [currentUser.uid, ...selectedUserIds],
      avatar: selectedAvatar
    });
    setGroupName('');
    setSelectedUserIds([]);
    setSelectedAvatar('👥');
    setError('');
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !activeGroupId) return;
    
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        const groupRef = doc(db, 'groups', activeGroupId);
        const groupDoc = await getDoc(groupRef);
        
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const updatedMembers = groupData.members.filter(member => member !== currentUser.uid);
          
          if (updatedMembers.length === 0) {
            // Delete group if no members left
            await deleteDoc(groupRef);
          } else {
            // Update group members
            await updateDoc(groupRef, {
              members: updatedMembers
            });
          }
          
          setActiveGroupId(null);
          setShowChatView(false);
        }
      } catch (error) {
        console.error('Error leaving group:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl w-[90%] max-w-md shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeInScale">
        <h2 className="text-2xl font-bold mb-6 text-[#072D44] text-center">Create New Group</h2>

        {error && (
          <div className="p-3 mb-4 text-[#072D44]-700 bg-red-100 border border-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-3 border border-[#5790AB] rounded-xl focus:ring-2 focus:ring-[#064469] focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Choose Group Avatar</label>
            <div className="grid grid-cols-8 gap-2 p-2 overflow-y-auto border border-gray-200 max-h-32 rounded-xl">
              {avatarOptions.map((avatar, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-8 h-8 rounded-full text-lg hover:bg-gradient-to-r hover:from-[#072D44]/20 hover:to-[#064469]/20 transition-all duration-200 transform hover:scale-110 ${
                    selectedAvatar === avatar ? 'bg-gradient-to-r from-[#9CCDDB] to-[#5790AB] text-white scale-110' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Add Friends</label>
            {friends.length === 0 ? (
              <div className="p-4 text-center bg-gray-50 rounded-xl">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm text-gray-500">You need to add friends first to create a group.</p>
                <p className="mt-1 text-xs text-gray-400">Use the search bar to find and add friends!</p>
              </div>
            ) : (
              <>
                <select
                  onChange={handleAddMember}
                  className="w-full p-3 mb-3 border border-[#072D44] rounded-xl focus:ring-2 focus:ring-[#064469] focus:border-transparent transition-all duration-200"
                  defaultValue=""
                >
                  <option value="" disabled>Select a friend to add</option>
                  {friends
                    .filter(friend => !selectedUserIds.includes(friend.uid))
                    .map(friend => (
                      <option key={friend.uid} value={friend.uid}>
                        {friend.name}
                      </option>
                    ))}
                </select>

                {selectedUserIds.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Selected friends ({selectedUserIds.length}):</p>
                    <div className="space-y-1 overflow-y-auto max-h-32">
                      {selectedUserIds.map(uid => {
                        const friend = friends.find(f => f.uid === uid);
                        return (
                          <div key={uid} className="flex items-center justify-between p-2 bg-gradient-to-r from-[#072D44]/10 to-[#064469]/10 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-[#072D44] to-[#064469] rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {friend?.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">{friend?.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(uid)}
                              className="text-[#064469] hover:text-[#072D44] transition-colors p-1 hover:bg-red-100 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 font-medium text-gray-700 transition-colors bg-gray-200 rounded-xl hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={friends.length === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#072D44] to-[#064469] text-white rounded-xl hover:from-[#064469] hover:to-[#072D44] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewGroupModal;