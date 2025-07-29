import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatCard from '../components/ChatCard';
import NotificationsPanel from '../components/NotificationPanel';
import NewGroupModal from '../components/NewGroupModal';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  serverTimestamp, where, getDocs, doc, updateDoc, getDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from '../context/AuthContext';

function NotifyFriends() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [isGroupModalOpen, setGroupModalOpen] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [friends, setFriends] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newMessageNotifications, setNewMessageNotifications] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch user's friends for group creation
  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;

      try {
        const friendsQuery1 = query(
          collection(db, 'friends'),
          where('user1', '==', currentUser.uid)
        );
        
        const friendsQuery2 = query(
          collection(db, 'friends'),
          where('user2', '==', currentUser.uid)
        );

        const [snapshot1, snapshot2] = await Promise.all([
          getDocs(friendsQuery1),
          getDocs(friendsQuery2)
        ]);

        const friendsList = [];
        
        snapshot1.docs.forEach(doc => {
          const data = doc.data();
          friendsList.push({
            uid: data.user2,
            name: data.user2Name
          });
        });

        snapshot2.docs.forEach(doc => {
          const data = doc.data();
          friendsList.push({
            uid: data.user1,
            name: data.user1Name
          });
        });

        setFriends(friendsList);
      } catch (error) {
        console.error('Error fetching friends:', error);
      }
    };

    fetchFriends();
  }, [currentUser]);

  // Fetch notifications
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch messages for active group with real-time updates
  useEffect(() => {
    if (!activeGroupId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "groups", activeGroupId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      // Check for new messages
      if (msgs.length > messages.length && messages.length > 0) {
        const newMsg = msgs[msgs.length - 1];
        if (newMsg.senderId !== currentUser?.uid) {
          const group = groups.find(g => g.id === activeGroupId);
          setNewMessageNotifications(prev => [...prev, {
            id: Date.now(),
            groupName: group?.name || 'Unknown Group',
            senderName: newMsg.senderName,
            message: newMsg.text,
            timestamp: new Date()
          }]);
          
          // Auto-remove notification after 5 seconds
          setTimeout(() => {
            setNewMessageNotifications(prev => prev.filter(n => n.id !== Date.now()));
          }, 5000);
        }
      }
      
      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [activeGroupId, messages.length, currentUser, groups]);

  // Fetch user's groups with real-time updates
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setGroups(groupsData);
    }, (error) => {
      console.error("Error fetching groups:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!currentUser || !activeGroupId) return;

    try {
      await addDoc(collection(db, "groups", activeGroupId, "messages"), {
        text: newMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email.split('@')[0],
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleGroupSelect = (groupId) => {
    setActiveGroupId(groupId);
    setShowChatView(true);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const activeGroup = groups.find(group => group.id === activeGroupId) || { 
    name: 'Select a chat', 
    members: [], 
    avatar: '👥' 
  };

  // Get member names for display
  const getMemberNames = (group) => {
    if (!group.members) return [];
    return group.members.map(memberId => {
      if (memberId === currentUser?.uid) return 'You';
      const friend = friends.find(f => f.uid === memberId);
      return friend?.name || 'Unknown';
    });
  };

  // Create new group
  const handleCreateGroup = async ({ groupName, members, avatar }) => {
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        members,
        avatar: avatar || '👥',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      
      // Add notification to all group members
      members.forEach(async (memberId) => {
        if (memberId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            type: 'group_invite',
            groupId: docRef.id,
            groupName,
            userId: memberId,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      });

      setActiveGroupId(docRef.id);
      setGroupModalOpen(false);
      if (window.innerWidth < 768) {
        setShowChatView(true);
      }
    } catch (err) {
      console.error('Error creating group:', err);
    }
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

  return (
    <div className="flex flex-col w-full min-h-screen bg-white md:flex-row">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col w-full p-4 pb-20 md:pb-4">
        <Navbar />
        <h2 className="text-2xl md:text-3xl font-light text-[#072D44] mt-6 mb-4 ml-2 animate-fadeInUp">
          NOTIFY YOUR FRIENDS
        </h2>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Chat Section */}
          <div className="flex flex-1 rounded-2xl bg-gradient-to-br from-[#9CCDDB] to-[#5790AB] shadow-2xl overflow-hidden min-h-[500px] border-[#072D44] border-[1px] animate-slideInLeft">
            {/* Mobile View */}
            <div className="flex w-full md:hidden">
              {!showChatView ? (
                <div className="flex flex-col w-full bg-white">
                  {/* WhatsApp-like header */}
                  <div className="bg-[#064469] text-white px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Chats</h1>
                    <div className="flex items-center gap-3">
                      <button className="p-2 transition-colors rounded-full hover:bg-white/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => setGroupModalOpen(true)}
                        className="p-2 transition-colors rounded-full hover:bg-white/20"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Chat list */}
                  <div className="flex-1 bg-white">
                    {groups.length > 0 ? (
                      groups.map((group, index) => (
                        <div
                          key={group.id}
                          className="flex items-center px-4 py-3 transition-colors border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                          onClick={() => handleGroupSelect(group.id)}
                        >
                          <div className="w-12 h-12 bg-[#064469] rounded-full flex items-center justify-center text-white text-xl mr-3">
                            {group.avatar || '👥'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900">{group.name}</h3>
                              <span className="text-xs text-gray-500">
                                {group.createdAt?.toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {getMemberNames(group).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="mb-2 text-lg font-medium text-gray-900">No chats yet</h3>
                        <p className="mb-4 text-gray-500">Start a conversation with your friends</p>
                        <button 
                          onClick={() => setGroupModalOpen(true)}
                          className="px-6 py-2 bg-[#064469] text-white rounded-full hover:bg-[#072D44] transition-colors"
                        >
                          Start a chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative flex flex-col flex-1 bg-white">
                  {/* WhatsApp-like chat header */}
                  <div className="bg-[#064469] text-white px-4 py-3 flex items-center">
                    <button 
                      onClick={() => setShowChatView(false)}
                      className="p-2 mr-2 transition-colors rounded-full hover:bg-white/20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center justify-center w-10 h-10 mr-3 text-lg rounded-full bg-white/20">
                      {activeGroup.avatar || '👥'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{activeGroup.name}</h3>
                      <p className="text-sm opacity-80">{getMemberNames(activeGroup).join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 transition-colors rounded-full hover:bg-white/20">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                      </button>
                      <button 
                        onClick={handleLeaveGroup}
                        className="p-2 text-red-300 transition-colors rounded-full hover:bg-red-500/20 hover:text-red-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Messages area with WhatsApp-like styling */}
                  <div className="flex-1 p-4 overflow-y-auto bg-gray-50" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f0f0f0" fill-opacity="0.1"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                    {messages.length > 0 ? (
                      messages.map((msg, index) => (
                        <div
                          key={msg.id}
                          className={`mb-3 flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-lg shadow-sm ${
                              msg.senderId === currentUser?.uid
                                ? 'bg-[#064469] text-white rounded-br-none'
                                : 'bg-white text-gray-900 rounded-bl-none'
                            }`}
                          >
                            {msg.senderId !== currentUser?.uid && (
                              <p className="text-xs font-medium text-[#064469] mb-1">
                                {msg.senderName}
                              </p>
                            )}
                            <p className="text-sm">{msg.text}</p>
                            <p className={`text-xs mt-1 ${
                              msg.senderId === currentUser?.uid ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-center">No messages yet. Say hello!</p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* WhatsApp-like message input */}
                  <div className="px-4 py-3 bg-white border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                      <div className="flex items-center flex-1 px-4 py-2 bg-gray-100 rounded-full">
                        <input
                          type="text"
                          placeholder="Type a message"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 text-gray-900 placeholder-gray-500 bg-transparent outline-none"
                        />
                        <button type="button" className="p-1 text-gray-500 hover:text-gray-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                      </div>
                      <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className="w-12 h-12 bg-[#064469] rounded-full flex items-center justify-center text-white hover:bg-[#072D44] transition-colors disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden w-full md:flex">
              {/* Groups list */}
              <div className="w-1/3 bg-gradient-to-b from-[#064469] to-[#072D44] text-white flex flex-col py-4 rounded-l-2xl">
                <div className="flex items-center justify-between px-4 mb-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zM15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                    </svg>
                    Chats ({groups.length})
                  </h3>
                  <button 
                    onClick={() => setGroupModalOpen(true)}
                    className="px-3 py-1 text-sm transition-all transform rounded-xl bg-white/20 hover:bg-white/30 hover:scale-105"
                  >
                    + New
                  </button>
                </div>
                <div className="flex flex-col gap-2 px-2 overflow-y-auto">
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className={`px-2 py-1 rounded-xl cursor-pointer transition-all transform hover:scale-105 ${
                          activeGroupId === group.id ? 'bg-white/30 scale-105' : 'hover:bg-white/20'
                        }`}
                        onClick={() => setActiveGroupId(group.id)}
                      >
                        <ChatCard
                          name={group.name}
                          icon={group.avatar || '👥'}
                          lastUpdate={`${getMemberNames(group).join(', ')}`}
                          isActive={activeGroupId === group.id}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <svg className="w-16 h-16 mb-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="mb-2 text-white/70">No groups yet</p>
                      <button 
                        onClick={() => setGroupModalOpen(true)}
                        className="px-4 py-2 transition-all bg-white/20 rounded-xl hover:bg-white/30"
                      >
                        Create your first group
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat area */}
              <div className="relative flex flex-col flex-1 p-4 bg-white/10">
                {activeGroupId ? (
                  <>
                    <div className="w-full px-4 py-3 bg-gradient-to-r from-[#072D44] to-[#5790AB] text-white rounded-xl mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{activeGroup.avatar || '👥'}</span>
                        <div>
                          <h3 className="font-bold">{activeGroup.name}</h3>
                          <p className="text-sm opacity-80">{getMemberNames(activeGroup).join(', ')}</p>
                        </div>
                        <button 
                          onClick={handleLeaveGroup}
                          className="p-2 text-red-300 transition-colors rounded-full hover:bg-red-500/20 hover:text-red-200"
                          title="Leave Group"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-end flex-1 w-full p-4 space-y-3 overflow-y-auto">
                      {messages.length > 0 ? (
                        messages.map((msg, index) => (
                          <div
                            key={msg.id}
                            className={`self-start px-4 py-3 rounded-2xl max-w-[70%] text-sm shadow-lg animate-slideInUp ${
                              msg.senderId === currentUser?.uid
                                ? 'bg-white/30 self-end text-right backdrop-blur-sm'
                                : 'bg-white/20 text-left backdrop-blur-sm'
                            }`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <p className="mb-1 text-xs font-bold text-white/80">
                              {msg.senderId === currentUser?.uid ? 'You' : msg.senderName}
                            </p>
                            <p className='font-medium text-white'>{msg.text}</p>
                            <p className="mt-1 text-xs text-white/60">
                              {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-white/70">
                          <svg className="w-20 h-20 mb-4 text-white/30 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-center">No messages yet. Start the conversation!</p>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="flex items-center w-full max-w-lg px-4 py-3 mt-auto bg-white border rounded-full shadow-inner border-white/30">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 outline-none text-sm text-[#5E000C] placeholder-gray-500"
                      />
                      <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className="ml-3 w-10 h-10 bg-[#5790AB] rounded-full flex items-center justify-center hover:bg-[#064469] transition-all text-white disabled:opacity-50 transform hover:scale-110"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-white/70">
                    <svg className="w-24 h-24 mb-6 text-white/30 animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg text-center">Select a group to start chatting</p>
                    <p className="mt-2 text-sm text-center text-white/50">Choose from your groups or create a new one</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notifications Panel */}
          <div className="w-full lg:w-[28%] animate-slideInRight">
            <NotificationsPanel 
              notifications={notifications}
              onCreateGroup={() => setGroupModalOpen(true)}
              onMarkAsRead={markNotificationAsRead}
            />
          </div>
        </div>
      </div>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        friends={friends}
        onCreate={handleCreateGroup}
      />

      {/* New Message Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {newMessageNotifications.map((notification) => (
          <div
            key={notification.id}
            className="bg-[#064469] text-white p-4 rounded-lg shadow-lg max-w-sm animate-slideInRight"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#5790AB] rounded-full flex items-center justify-center text-sm font-bold">
                💬
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">New message in {notification.groupName}</p>
                <p className="text-xs opacity-80">{notification.senderName}: {notification.message.substring(0, 50)}...</p>
              </div>
              <button
                onClick={() => setNewMessageNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-white/60 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotifyFriends;