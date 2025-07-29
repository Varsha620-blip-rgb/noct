import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useState } from 'react';

function BatBot() {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const { currentUser } = useAuth();

  // Load chat history from localStorage on component mount
  useEffect(() => {
    if (currentUser) {
      const savedHistory = localStorage.getItem(`batbot_history_${currentUser.uid}`);
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    }
  }, [currentUser]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (currentUser && chatHistory.length > 0) {
      localStorage.setItem(`batbot_history_${currentUser.uid}`, JSON.stringify(chatHistory));
    }
  }, [chatHistory, currentUser]);

  const handleAskBatBot = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    const updatedChat = [...chat, { sender: 'user', text: userMsg }];
    setChat(updatedChat);
    setInput('');
    setIsLoading(true);

    try {
      // Enhanced BatBot responses
      let reply;
      const prompt = userMsg.toLowerCase();

      if (prompt.includes("bored") || prompt.includes("mess things up")) {
        reply = "🦇 Bored, are we? Time to unleash some chaos! Here's what we can do:\n\n1. Prank call the Joker 📞\n2. Redesign the Batcave with disco lights 🕺\n3. Teach Alfred to breakdance 💃\n4. Replace all my gadgets with rubber ducks 🦆\n\nWhich mischief shall we begin with, partner in crime? 😈";
      } else if (prompt.includes("chef mode") || prompt.includes("ask my lord")) {
        reply = "🦇 *adjusts chef hat over cowl* \n\nWelcome to the Bat-Kitchen! Tonight's menu:\n\n🍝 Spaghetti Justice (with extra vengeance sauce)\n🍕 Gotham Deep Dish (topped with fear)\n🥩 Steak so rare, even the Penguin would approve\n🍰 Alfred's Secret Recipe Cake (classified)\n\nWhat culinary adventure shall we embark upon? Remember, in this kitchen, we don't just cook... we CREATE LEGENDS! 👨‍🍳⚡";
      } else if (prompt.includes("pizza")) {
        reply = "🦇 Justice tastes like pepperoni. Here's how to make it: dough, sauce, cheese, oven. Boom.";
      } else if (prompt.includes("love")) {
        reply = "🦇 Love? I don't do soft. But I protect. Always.";
      } else if (prompt.includes("exam") || prompt.includes("study")) {
        reply = "🦇 Study like Gotham depends on it. Because it does.";
      } else if (prompt.includes("hello") || prompt.includes("hi")) {
        reply = "🦇 Greetings, citizen. Batman here. What brings you to the shadows tonight?";
      } else if (prompt.includes("help")) {
        reply = "🦇 Help is what I do best. Whether it's stopping crime or helping with your daily tasks, I'm here. What do you need assistance with?";
      } else if (prompt.includes("joke") || prompt.includes("funny")) {
        reply = "🦇 Why doesn't Batman ever get speeding tickets? Because he's always in the Batmobile... and Commissioner Gordon owes me a favor. 😏";
      } else {
        reply = `🦇 I'm Batman. Here's my take on "${userMsg}": Sounds like something that requires the full power of the Batcave's supercomputer to analyze. Let me consult with Alfred... 🤔`;
      }

      // 🎯 Append BatBot's reply
      const finalChat = [...updatedChat, {
        sender: 'batbot',
        text: reply
      }];
      setChat(finalChat);

      // ⌛ Chat history tracking
      if (!currentChatId) {
        const newChatId = Date.now();
        const newChatData = {
          id: newChatId,
          title: userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : ''),
          lastMessage: reply.substring(0, 50) + (reply.length > 50 ? '...' : ''),
          messages: finalChat,
          timestamp: new Date()
        };
        setCurrentChatId(newChatId);
        setChatHistory(prev => [
          newChatData,
          ...prev
        ]);
      } else {
        setChatHistory(prev =>
          prev.map(item =>
            item.id === currentChatId
              ? {
                  ...item,
                  lastMessage: reply.substring(0, 50) + (reply.length > 50 ? '...' : ''),
                  messages: finalChat,
                  timestamp: new Date()
                }
              : item
          )
        );
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Full error:', error);
      setChat(prev => [...prev, {
        sender: 'batbot',
        text: "🦇 Alfred reports: " + error.message
      }]);
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setChat([]);
    setCurrentChatId(null);
    setShowHistory(false);
  };

  const loadChatHistory = (chatId) => {
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (selectedChat && selectedChat.messages) {
      setChat(selectedChat.messages);
    }
    setCurrentChatId(chatId);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#D0D7E1] md:flex-row">
      {/* Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-col w-full p-4 pb-20 md:pb-4">
        <Navbar />
        <h2 className="text-3xl font-light text-[#072D44] mt-6 mb-4 ml-2">"Call me Bat-Bot"</h2>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Chat Section - Mobile First Design */}
          <div className="flex flex-1 rounded-2xl bg-gradient-to-br from-[#5790AB] to-[#9CCDDB] shadow-lg overflow-hidden min-h-[500px] mr-0 md:mr-10 mt-3 border-[#064469] border-[1px]" style={{ boxShadow: '0px 4px 15px 5px rgba(6, 68, 105, 0.3)' }}>
            
            {/* Mobile View - Similar to ChatGPT */}
            <div className="flex w-full md:hidden">
              {!showHistory ? (
                <div className="relative flex flex-col flex-1 bg-white/10">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-[#064469] to-[#072D44] text-white">
                    <button 
                      onClick={() => setShowHistory(true)}
                      className="p-2 text-white transition-all transform rounded-xl hover:bg-white/20 hover:scale-110"
                    >
                      ☰
                    </button>
                    <h3 className="font-bold">BatBot</h3>
                    <button 
                      onClick={startNewChat}
                      className="p-2 text-white transition-all transform rounded-xl hover:bg-white/20 hover:scale-110"
                    >
                      ✏️
                    </button>
                  </div>
                  
                  {/* Messages area */}
                  <div className="flex flex-col justify-end flex-1 p-4 space-y-3 overflow-y-auto">
                    {chat.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <svg width="120" height="120" viewBox="0 0 147 147" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M110.25 4.59375C124.031 13.7812 128.625 27.5625 128.625 36.75C128.625 73.5 128.625 110.25 119.438 142.406L114.844 110.25C101.062 119.438 82.6875 128.625 73.5 128.625C64.3125 128.625 45.9375 119.438 32.1562 110.25L27.5625 142.406C18.375 110.25 18.375 73.5 18.375 36.75C18.375 27.5625 22.9688 13.7812 36.75 4.59375C32.1562 18.375 32.1562 32.1562 36.75 41.3438C55.125 32.1562 91.875 32.1562 110.25 41.3438C114.844 32.1562 114.844 18.375 110.25 4.59375ZM110.25 78.0938C100.574 91.5305 95.3203 94.5164 78.0938 101.062C87.7119 110.25 105.513 107.235 114.844 96.4688C118.892 91.7889 116.796 83.6637 110.25 78.0938ZM36.75 78.0938C30.2039 83.6637 28.108 91.7889 32.1562 96.4688C41.4873 107.235 59.2881 110.25 68.9062 101.062C51.6797 94.5164 46.4256 91.5305 36.75 78.0938Z" fill="#072D44" />
                        </svg>
                        <button 
                          onClick={() => setInput("Bored? Let's mess things up 😏")}
                          className="text-md text-[#072D44] bg-white/60 p-3 px-5 rounded-full mt-6 text-center hover:bg-white/80 transition-all cursor-pointer transform hover:scale-105"
                        >
                          Bored? Let's mess things up 😏
                        </button>
                        <button 
                          onClick={() => setInput("In chef mode? Just ask my lord 🧎‍♂️")}
                          className="text-md text-[#072D44] bg-white/60 p-3 px-5 rounded-full mt-3 text-center hover:bg-white/80 transition-all cursor-pointer transform hover:scale-105"
                        >
                          In chef mode? Just ask my lord 🧎‍♂️
                        </button>
                      </div>
                    ) : (
                      <>
                        {chat.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex mb-3 ${msg.sender === 'batbot' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
                                msg.sender === 'batbot' 
                                  ? 'bg-[#064469] text-white' 
                                  : 'bg-[#072D44] text-white'
                              }`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start mb-3">
                            <div className="bg-[#064469] text-white px-4 py-2 rounded-xl text-sm">
                              🦇 Batman is thinking...
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message input */}
                  <form onSubmit={handleAskBatBot} className="flex items-center w-full px-3 py-2 mx-4 mt-4 mb-4 bg-white border rounded-full shadow-inner border-white/30">
                    <input
                      type="text"
                      placeholder="BatBot at your service 👾..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAskBatBot(e);
                        }
                      }}
                      className="flex-1 outline-none text-sm text-[#072D44] placeholder-gray-500"
                      disabled={isLoading}
                    />
                    <button 
                      type="submit" 
                      disabled={isLoading || !input.trim()}
                      className="ml-2 w-10 h-10 bg-[#5790AB] rounded-full flex items-center justify-center hover:bg-[#064469] transition-all text-white disabled:opacity-50 transform hover:scale-110"
                    >
                      {isLoading ? '...' : '↑'}
                    </button>
                  </form>
                </div>
              ) : (
                // History View
                <div className="w-full bg-gradient-to-b from-[#064469] to-[#072D44] text-white flex flex-col py-4">
                  <div className="flex items-center justify-between px-4 mb-4">
                    <button 
                      onClick={() => setShowHistory(false)}
                      className="p-2 text-white transition-all transform rounded-xl hover:bg-white/20 hover:scale-110"
                    >
                      ←
                    </button>
                    <h3 className="text-lg font-bold text-white">Chat History</h3>
                    <button 
                      onClick={startNewChat}
                      className="px-3 py-1 text-sm transition-all transform rounded-xl bg-white/20 hover:bg-white/30 hover:scale-105"
                    >
                      + New
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 px-2 overflow-y-auto">
                    {chatHistory.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-300">No conversations yet</p>
                    ) : (
                      chatHistory.map((chatItem) => (
                        <div
                          key={chatItem.id}
                          onClick={() => loadChatHistory(chatItem.id)}
                          className={`px-3 py-2 rounded-lg cursor-pointer hover:bg-white/20 transition-colors ${
                            currentChatId === chatItem.id ? 'bg-white/20' : ''
                          }`}
                        >
                          <div className="text-sm font-medium truncate">{chatItem.title}</div>
                          <div className="text-xs text-gray-300 truncate">{chatItem.lastMessage}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop View */}
            <div className="hidden w-full md:flex">
              {/* Compact History Sidebar */}
              <div className="w-1/4 bg-gradient-to-b from-[#064469] to-[#072D44] text-white flex flex-col py-4 rounded-l-2xl">
                <div className="flex items-center justify-between px-3 mb-4">
                  <h3 className="text-sm font-bold text-white">History</h3>
                  <button 
                    onClick={startNewChat}
                    className="px-2 py-1 text-xs transition-all transform rounded-lg bg-white/20 hover:bg-white/30 hover:scale-105"
                  >
                    + New
                  </button>
                </div>
                <div className="flex flex-col gap-1 px-2 overflow-y-auto">
                  {chatHistory.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-gray-300">No chats yet</p>
                  ) : (
                    chatHistory.map((chatItem) => (
                      <div
                        key={chatItem.id}
                        onClick={() => loadChatHistory(chatItem.id)}
                        className={`px-2 py-2 rounded-lg cursor-pointer hover:bg-white/20 transition-colors ${
                          currentChatId === chatItem.id ? 'bg-white/20' : ''
                        }`}
                      >
                        <div className="text-xs font-medium truncate">{chatItem.title}</div>
                        <div className="text-xs text-gray-300 truncate">{chatItem.lastMessage}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="relative flex flex-col flex-1 p-4 bg-white/10">
                {chat.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <svg width="147" height="147" viewBox="0 0 147 147" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M110.25 4.59375C124.031 13.7812 128.625 27.5625 128.625 36.75C128.625 73.5 128.625 110.25 119.438 142.406L114.844 110.25C101.062 119.438 82.6875 128.625 73.5 128.625C64.3125 128.625 45.9375 119.438 32.1562 110.25L27.5625 142.406C18.375 110.25 18.375 73.5 18.375 36.75C18.375 27.5625 22.9688 13.7812 36.75 4.59375C32.1562 18.375 32.1562 32.1562 36.75 41.3438C55.125 32.1562 91.875 32.1562 110.25 41.3438C114.844 32.1562 114.844 18.375 110.25 4.59375ZM110.25 78.0938C100.574 91.5305 95.3203 94.5164 78.0938 101.062C87.7119 110.25 105.513 107.235 114.844 96.4688C118.892 91.7889 116.796 83.6637 110.25 78.0938ZM36.75 78.0938C30.2039 83.6637 28.108 91.7889 32.1562 96.4688C41.4873 107.235 59.2881 110.25 68.9062 101.062C51.6797 94.5164 46.4256 91.5305 36.75 78.0938Z" fill="#072D44" />
                    </svg>
                    <button 
                      onClick={() => setInput("Bored? Let's mess things up 😏")}
                      className="text-md text-[#072D44] bg-white/60 p-3 px-5 rounded-full mt-9 text-center hover:bg-white/80 transition-all cursor-pointer transform hover:scale-105"
                    >
                      Bored? Let's mess things up 😏
                    </button>
                    <button 
                      onClick={() => setInput("In chef mode? Just ask my lord 🧎‍♂️")}
                      className="text-md text-[#072D44] bg-white/60 p-3 px-5 rounded-full mt-3 text-center hover:bg-white/80 transition-all cursor-pointer transform hover:scale-105"
                    >
                      In chef mode? Just ask my lord 🧎‍♂️
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 mb-4 overflow-y-auto">
                    {chat.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex mb-3 ${msg.sender === 'batbot' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
                            msg.sender === 'batbot' 
                              ? 'bg-[#064469] text-white' 
                              : 'bg-[#072D44] text-white'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start mb-3">
                        <div className="bg-[#064469] text-white px-4 py-2 rounded-xl text-sm">
                          🦇 Batman is thinking...
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Input */}
                <form onSubmit={handleAskBatBot} className="flex items-center w-full max-w-sm px-4 py-2 mt-auto bg-white rounded-full shadow-inner">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAskBatBot(e);
                      }
                    }}
                    placeholder="BatBot at your service 👾..." 
                    className="flex-1 outline-none text-sm text-[#072D44] placeholder-gray-500"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="ml-2 w-8 h-8 bg-[#5790AB] rounded-full flex items-center justify-center hover:bg-[#064469] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? '...' : '↑'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatBot;