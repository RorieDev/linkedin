import React, { useState, useEffect } from 'react';
import {
  Send,
  History,
  Settings,
  Plus,
  Sparkles,
  Linkedin,
  Image as ImageIcon,
  Video,
  Calendar,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Share2,
  Trash2,
  Copy,
  CheckCircle2,
  Globe,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PWAPrompt from './components/PWAPrompt';


// API URL - use environment variable in production, localhost in development
const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:4000');

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <motion.div
    whileHover={{ x: 5 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${active ? 'bg-primary text-white' : 'hover:bg-glass text-text-muted hover:text-white'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </motion.div>
);

const ConnectionModal = ({ isOpen, onClose, onConnect }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('rorie.devine@gmail.com');

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    if (step === 2) {
      setTimeout(() => {
        onConnect();
        onClose();
      }, 1500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="linkedin-auth-card"
          >
            <div className="auth-header">
              <Linkedin className="text-primary" size={32} fill="currentColor" />
              <h2>Postly AI wants to access your account</h2>
            </div>

            <div className="auth-content">
              {step === 1 ? (
                <div className="step-1">
                  <p className="auth-desc">Sign in to LinkedIn to continue to <strong>Postly AI</strong></p>
                  <div className="auth-input-group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email or Phone"
                    />
                    <input type="password" placeholder="Password" defaultValue="••••••••" />
                  </div>
                  <button className="auth-btn-primary" onClick={handleNext}>Sign In</button>
                  <div className="auth-divider">or</div>
                  <button className="auth-btn-google">
                    <img src="https://www.google.com/favicon.ico" alt="google" width="16" />
                    Sign in with Google
                  </button>
                </div>
              ) : step === 2 ? (
                <div className="step-2">
                  <div className="permissions-list">
                    <p className="perms-title">Postly AI will be able to:</p>
                    <div className="perm-item">
                      <CheckCircle2 size={16} className="text-accent" />
                      <span>Use your name and photo</span>
                    </div>
                    <div className="perm-item">
                      <CheckCircle2 size={16} className="text-accent" />
                      <span>Create and edit your posts</span>
                    </div>
                    <div className="perm-item">
                      <CheckCircle2 size={16} className="text-accent" />
                      <span>Manage your company pages</span>
                    </div>
                  </div>
                  <div className="auth-actions">
                    <button className="auth-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="auth-btn-primary" onClick={handleNext}>Allow access</button>
                  </div>
                </div>
              ) : (
                <div className="step-3 flex flex-col items-center justify-center p-8">
                  <div className="spinner mb-4" style={{ width: '40px', height: '40px' }}></div>
                  <p className="font-medium">Connecting to LinkedIn...</p>
                </div>
              )}
            </div>

            <p className="auth-footer">
              By clicking Allow, you agree to LinkedIn's <span>User Agreement</span> and <span>Privacy Policy</span>.
            </p>
          </motion.div>
          <style jsx="true">{`
            .modal-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.8);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2000;
              padding: 20px;
            }
            .linkedin-auth-card {
              background: #ffffff;
              width: 100%;
              max-width: 400px;
              border-radius: 12px;
              padding: 32px;
              color: rgba(0,0,0,0.9);
              
            }
            .auth-header {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 16px;
              text-align: center;
              margin-bottom: 24px;
            }
            .auth-header h2 {
              font-size: 20px;
              font-weight: 600;
              line-height: 1.3;
              color: #111;
            }
            .auth-desc {
              font-size: 14px;
              color: #666;
              margin-bottom: 20px;
              text-align: center;
            }
            .auth-input-group {
              display: flex;
              flex-direction: column;
              gap: 12px;
              margin-bottom: 16px;
            }
            .auth-input-group input {
              padding: 12px 16px;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 14px;
              width: 100%;
            }
            .auth-btn-primary {
              background: #0A66C2;
              color: white;
              width: 100%;
              padding: 12px;
              border-radius: 50px;
              font-weight: 600;
              font-size: 14px;
              margin-top: 8px;
            }
            .auth-btn-primary:hover {
              background: #004182;
            }
            .auth-btn-secondary {
              background: transparent;
              color: #666;
              padding: 10px 20px;
              font-weight: 600;
              font-size: 14px;
            }
            .auth-divider {
              display: flex;
              align-items: center;
              gap: 10px;
              margin: 16px 0;
              color: #999;
              font-size: 12px;
            }
            .auth-divider::before, .auth-divider::after {
              content: '';
              flex: 1;
              height: 1px;
              background: #eee;
            }
            .auth-btn-google {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              width: 100%;
              padding: 10px;
              border: 1px solid #ddd;
              border-radius: 50px;
              background: white;
              font-size: 14px;
              font-weight: 600;
              color: #555;
            }
            .permissions-list {
              background: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            .perms-title {
              font-size: 13px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #333;
            }
            .perm-item {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 13px;
              margin-bottom: 8px;
              color: #555;
            }
            .auth-actions {
              display: flex;
              justify-content: flex-end;
              gap: 10px;
              margin-top: 20px;
            }
            .auth-footer {
              margin-top: 24px;
              font-size: 11px;
              color: #999;
              text-align: center;
              line-height: 1.4;
            }
            .auth-footer span {
              color: #0A66C2;
              font-weight: 600;
              cursor: pointer;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('creator');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState('');
  const [topic, setTopic] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [toastMessage, setToastMessage] = useState('Post copied to clipboard!');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('postly_history');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, content: "🚀 Just launched our new AI LinkedIn Poster! Automating your professional presence has never been easier. #AI #SaaS #Growth", date: '2026-02-05' },
      { id: 2, content: "The future of remote work isn't just about tools, it's about the mindset. Here are 5 tips to stay productive... 🧵", date: '2026-02-01' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('postly_history', JSON.stringify(history));
  }, [history]);


  const [previewMode, setPreviewMode] = useState('desktop');
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('linkedin_connected') === 'true';
  });
  const [connectedMemberId, setConnectedMemberId] = useState(() => {
    return localStorage.getItem('linkedin_member_id') || null;
  });

  useEffect(() => {
    localStorage.setItem('linkedin_connected', isConnected);
  }, [isConnected]);

  // Auto-ping server on page load to wake it up from Render sleep
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        await fetch(`${API_URL}/health`, { method: 'GET' });
        console.log('✅ Server pinged successfully');
      } catch (err) {
        console.log('⚠️ Server wake-up ping failed (expected if server is cold starting)');
      }
    };
    wakeUpServer();
  }, []);

  const generatePost = async () => {
    if (!topic && !sourceUrl) return;
    setIsGenerating(true);

    try {
      const textResp = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: topic,
          sourceUrl: sourceUrl || undefined
        })
      });

      if (!textResp.ok) {
        const error = await textResp.json();
        showNotification(`Generation failed: ${error.error}`);
        return;
      }

      const textData = await textResp.json();
      setPostContent(textData.content);
    } catch (err) {
      console.error('Generation error:', err);
      showNotification('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!topic && !sourceUrl) return;
    setIsGeneratingImage(true);

    try {
      const imageResp = await fetch(`${API_URL}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || 'professional LinkedIn post',
          sourceUrl: sourceUrl || undefined
        })
      });

      if (!imageResp.ok) {
        const error = await imageResp.json();
        showNotification(`Image generation failed: ${error.error}`);
        return;
      }

      const imageData = await imageResp.json();
      setPostImage(imageData.imageUrl);
      showNotification('Image generated!');
    } catch (err) {
      console.error('Image generation error:', err);
      showNotification('Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const showNotification = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(postContent);
    showNotification('Post copied to clipboard!');
  };

  const publishPost = () => {
    (async () => {
      if (!postContent || !isConnected) return showNotification('Connect to LinkedIn first');
      console.log('Publishing with:', { memberId: connectedMemberId, messageLength: postContent.length, hasImage: !!postImage });
      setIsPosting(true);
      try {
        const resp = await fetch(`${API_URL}/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: connectedMemberId,
            message: postContent,
            imageUrl: postImage || undefined
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || JSON.stringify(data));
        showNotification('Successfully published to LinkedIn! 🎉');
        setHistory([{ id: Date.now(), content: postContent, date: new Date().toISOString().split('T')[0] }, ...history]);
        setTopic('');
        setSourceUrl('');
        setPostContent('');
        setPostImage('');
      } catch (err) {
        showNotification('Post failed: ' + (err.message || err));
      } finally {
        setIsPosting(false);
      }
    })();
  };

  const schedulePost = () => {
    (async () => {
      if (!postContent || !isConnected) return showNotification('Generate and connect first');
      if (!scheduledTime) return showNotification('Select a date and time');

      setIsPosting(true);
      try {
        const resp = await fetch(`${API_URL}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: connectedMemberId,
            message: postContent,
            imageUrl: postImage || undefined,
            scheduledTime
          })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || JSON.stringify(data));
        showNotification('Post scheduled successfully!');
        setIsScheduleModalOpen(false);
        setScheduledTime('');
        loadScheduledPosts();
      } catch (err) {
        showNotification('Scheduling failed: ' + (err.message || err));
      } finally {
        setIsPosting(false);
      }
    })();
  };

  const loadScheduledPosts = async () => {
    try {
      const resp = await fetch(`${API_URL}/scheduled-posts`);
      const data = await resp.json();
      if (data.success) {
        setScheduledPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load scheduled posts:', err);
    }
  };

  const cancelScheduledPost = async (postId) => {
    try {
      const resp = await fetch(`${API_URL}/scheduled-posts/${postId}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        showNotification('Scheduled post cancelled');
        loadScheduledPosts();
      }
    } catch (err) {
      showNotification('Failed to cancel: ' + err.message);
    }
  };

  const handleConnect = () => {
    // Use a demo member ID for testing
    const demoMemberId = 'demo_user_' + Math.random().toString(36).slice(2, 11);
    setConnectedMemberId(demoMemberId);
    setIsConnected(true);
    localStorage.setItem('linkedin_member_id', demoMemberId);
    showNotification('Connected to LinkedIn successfully!');
  };

  const toggleConnection = () => {
    if (!isConnected) {
      // Try real OAuth, but fallback to demo mode immediately for testing
      const demoMemberId = 'demo_user_' + Math.random().toString(36).slice(2, 11);
      setConnectedMemberId(demoMemberId);
      setIsConnected(true);
      localStorage.setItem('linkedin_connected', 'true');
      localStorage.setItem('linkedin_member_id', demoMemberId);
      showNotification('Connected! (Demo mode - open OAuth window in console if needed)');
      // Still attempt real OAuth in background
      startOAuth();
    } else {
      if (window.confirm('Are you sure you want to disconnect your LinkedIn account?')) {
        setIsConnected(false);
        setConnectedMemberId(null);
        localStorage.removeItem('linkedin_connected');
        localStorage.removeItem('linkedin_member_id');
        showNotification('Disconnected from LinkedIn.');
      }
    }
  };

  // Open backend OAuth endpoint and poll /tokens until a token appears
  const startOAuth = () => {
    const oauthUrl = `${API_URL}/auth/linkedin`;
    const oauthWindow = window.open(oauthUrl, '_blank', 'width=600,height=800');
    const start = Date.now();
    const timeout = 60 * 1000; // 60s
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/tokens`);
        if (!res.ok) return;
        const data = await res.json();
        const ids = Object.keys(data || {});
        if (ids.length > 0) {
          clearInterval(poll);
          const id = ids[0];
          setConnectedMemberId(id);
          setIsConnected(true);
          localStorage.setItem('linkedin_connected', 'true');
          localStorage.setItem('linkedin_member_id', id);
          showNotification('Connected to LinkedIn successfully!');
          try { oauthWindow && oauthWindow.close(); } catch (e) { }
        } else if (Date.now() - start > timeout) {
          clearInterval(poll);
          try { oauthWindow && oauthWindow.close(); } catch (e) { }
          // Fallback: Set a demo member ID for testing
          const demoMemberId = 'demo_user_' + Math.random().toString(36).slice(2, 11);
          setConnectedMemberId(demoMemberId);
          setIsConnected(true);
          localStorage.setItem('linkedin_connected', 'true');
          localStorage.setItem('linkedin_member_id', demoMemberId);
          showNotification('Using demo mode - posts will be in test mode');
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 1000);
  };

  return (
    <div className="app-container">
      <ConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
      />
      {/* Schedule Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: '#ffffff',
                width: '100%',
                maxWidth: '400px',
                borderRadius: '12px',
                padding: '32px',
                color: 'rgba(0,0,0,0.9)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                zIndex: 2001
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="auth-header">
                <Calendar className="text-primary" size={32} />
                <h2>Schedule Post</h2>
              </div>
              <div className="auth-content">
                <div className="auth-input-group">
                  <label>Select date and time:</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button
                    className="auth-btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Modal Schedule button clicked');
                      schedulePost();
                    }}
                    disabled={isPosting || !scheduledTime}
                    style={{ flex: 1 }}
                    type="button"
                  >
                    {isPosting ? 'Scheduling...' : 'Schedule'}
                  </button>
                  <button
                    className="auth-btn-google"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsScheduleModalOpen(false);
                    }}
                    style={{ flex: 1, background: '#eee', color: '#333' }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="toast"
          >
            {toastMessage.includes('published') || toastMessage.includes('Connected') ? (
              <CheckCircle2 size={18} />
            ) : (
              <Copy size={18} />
            )}
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'none' }}>
        <header className="mobile-top-bar">
          <div style={{ width: 80 }}></div> {/* Spacer to balance */}
          <button className="mobile-menu-trigger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            <span>Menu</span>
          </button>
          <div className="flex justify-end" style={{ width: 80, paddingRight: 12 }}>
            <button
              onClick={toggleConnection}
              className={`btn-connection-round ${isConnected ? 'connected' : ''}`}
              title={isConnected ? "LinkedIn Connected" : "Connect LinkedIn"}
            >
              <Linkedin size={18} />
              {isConnected && <div className="connection-badge" />}
            </button>
          </div>
        </header>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sidebar-overlay"
              style={{ zIndex: 1999 }}
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="sidebar open"
              style={{ zIndex: 2000 }}
            >
              <div className="sidebar-header-internal">
                <button className="close-menu" onClick={() => setIsSidebarOpen(false)}>
                  <X size={24} />
                </button>
              </div>

              <nav className="sidebar-nav">
                <SidebarItem
                  icon={Plus}
                  label="Create Post"
                  active={activeTab === 'creator'}
                  onClick={() => {
                    setActiveTab('creator');
                    setIsSidebarOpen(false);
                  }}
                />
                <SidebarItem
                  icon={History}
                  label="History"
                  active={activeTab === 'history'}
                  onClick={() => {
                    setActiveTab('history');
                    setIsSidebarOpen(false);
                  }}
                />
                <SidebarItem
                  icon={Calendar}
                  label="Schedule"
                  active={activeTab === 'schedule'}
                  onClick={() => {
                    setActiveTab('schedule');
                    loadScheduledPosts();
                    setIsSidebarOpen(false);
                  }}
                />
                <SidebarItem
                  icon={Settings}
                  label="Settings"
                  active={activeTab === 'settings'}
                  onClick={() => {
                    setActiveTab('settings');
                    setIsSidebarOpen(false);
                  }}
                />
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="main-content full-width">
        <div className="top-left-controls">
          <div className="top-bar-nav flex items-center gap-5">
            <button
              className="hamburger-trigger"
              onClick={() => setIsSidebarOpen(true)}
              title="Open Menu"
            >
              <Menu size={24} />
            </button>

            <div
              className="user-profile header pointer"
              onClick={toggleConnection}
              title={isConnected ? "Click to disconnect" : "Click to connect LinkedIn"}
            >
              <div className={`avatar ${isConnected ? 'active-border' : ''}`}>
                {isConnected ? 'RD' : '?'}
              </div>
              <div className="user-info">
                <p className="user-name">{isConnected ? 'Rorie Devine' : 'Guest'}</p>
                <p className={`user-status ${isConnected ? 'connected' : 'offline'}`}>
                  {isConnected ? 'LINKEDIN CONNECTED' : 'NOT CONNECTED'}
                </p>
              </div>
            </div>
          </div>

          <div className="header-titles top-bar-titles">
            <h2>{activeTab === 'creator' ? 'Create New Post' : 'Post History'}</h2>
            <p className="text-muted">Transform your ideas into high-performing LinkedIn posts</p>
          </div>
        </div>

        <div className="content-grid">
          {activeTab === 'creator' ? (
            <div className="creator-container">
              {/* Creator Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="creator-section"
              >
                <div className="input-group rounded-2xl p-6">
                  <div className="source-inputs mb-6">
                    <div className="input-with-icon mb-4">
                      <Globe size={16} className="text-muted" />
                      <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="URL"
                        className="url-input"
                      />
                    </div>

                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Write a post about..."
                      className="topic-input"
                    />
                  </div>
                  <div className="editor-controls">
                    <button
                      onClick={generatePost}
                      disabled={isGenerating || (!topic && !sourceUrl)}
                      className={`btn-generate ${isGenerating ? 'loading' : ''}`}
                    >
                      {isGenerating ? (
                        <div className="spinner"></div>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate with AI
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="post-editor rounded-2xl p-6 mt-6">


                  <div className="relative">
                    <textarea
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder=""
                      className="content-textarea pt-12"
                    />
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button onClick={copyToClipboard} className="btn-icon-label glass-button-obvious" title="Copy Post">
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={generateImage}
                        disabled={isGeneratingImage || (!topic && !sourceUrl)}
                        className={`btn-icon-label glass-button-obvious ${isGeneratingImage ? 'loading' : ''}`}
                        title="Generate Image"
                      >
                        {isGeneratingImage ? (
                          <div className="spinner-small"></div>
                        ) : (
                          <ImageIcon size={16} />
                        )}
                      </button>
                      {(postContent || postImage) && (
                        <button
                          onClick={() => {
                            if (window.confirm('Clear all generated content?')) {
                              setPostContent('');
                              setPostImage('');
                            }
                          }}
                          className="btn-icon-label glass-button-obvious text-red-500 hover:bg-red-500/10"
                          title="Clear Content"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {postImage && (
                    <div className="generated-image-preview mt-4 relative group">
                      <img src={postImage} alt="Generated" className="rounded-xl w-full object-cover max-h-[400px]" />
                      <button
                        onClick={() => setPostImage('')}
                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}

                  <div className="publish-controls mt-4">
                    <button
                      className={`btn-primary ${isPosting ? 'loading' : ''}`}
                      disabled={!postContent || !isConnected || isPosting}
                      onClick={publishPost}
                    >
                      {isPosting ? (
                        <div className="spinner"></div>
                      ) : (
                        <>
                          <Send size={18} />
                          Post Now
                        </>
                      )}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsScheduleModalOpen(true);
                      }}
                      disabled={!postContent}
                      type="button"
                    >
                      <Calendar size={18} />
                      Schedule
                    </button>
                  </div>
                  {!isConnected && postContent && (
                    <p className="text-xs text-center mt-2 text-primary">Connect your LinkedIn to post directly</p>
                  )}
                </div>
              </motion.div>
            </div>
          ) : activeTab === 'history' ? (
            <div className="history-list full-width">
              {history.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-content">
                    <div className="history-meta">
                      <span className="history-date">{item.date}</span>
                      <div className="history-actions">
                        <button className="btn-icon" onClick={() => {
                          navigator.clipboard.writeText(item.content);
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 3000);
                        }}><Copy size={16} /></button>
                        <button className="btn-icon text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <p>{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'schedule' ? (
            <div className="history-list full-width">
              {scheduledPosts.length === 0 ? (
                <div className="placeholder-content" style={{ textAlign: 'center', padding: '48px' }}>
                  <Calendar size={48} className="text-muted mb-4" />
                  <h3>No scheduled posts</h3>
                  <p className="text-muted">Create a post and click Schedule to plan ahead</p>
                </div>
              ) : (
                scheduledPosts.map(post => (
                  <div key={post.id} className="history-item">
                    <div className="history-content">
                      <div className="history-meta">
                        <span className="history-date">{new Date(post.scheduledTime).toLocaleString()}</span>
                        <div className="history-actions">
                          <span className={`status-badge ${post.status}`}>{post.status}</span>
                          {post.status === 'scheduled' && (
                            <button className="btn-icon text-red-500" onClick={() => cancelScheduledPost(post.id)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p>{post.message.substring(0, 100)}...</p>
                      {post.imageUrl && <p className="text-xs text-muted mt-2">📸 Image attached</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="placeholder-content full-width">
              <Settings size={48} className="text-muted mb-4" />
              <h3>Tab coming soon</h3>
              <p className="text-muted">We are working on the {activeTab} functionality.</p>
            </div>
          )
          }
        </div >
      </main >

      <style jsx="true">{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-dark);
          color: white;
        }

        /* Toast */
        .toast {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent);
          color: white;
          padding: 12px 24px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 10px;
          
          z-index: 1000;
          font-weight: 600;
        }



        .hamburger-trigger {
          background: transparent;
          color: white;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }

        .hamburger-trigger:hover {
          background: rgba(255,255,255,0.1);
        }

        .user-profile.header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          background: #000000;
          z-index: 2000;
          padding: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 20px 0 50px rgba(0,0,0,0.5);
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1999;
        }

        .sidebar-header-internal {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }

        .close-menu {
          background: transparent;
          color: white;
          padding: 8px;
          cursor: pointer;
        }

        .top-left-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: relative;
        }

        .top-bar-titles {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          width: auto; /* Changed from 100% to auto to avoid overlap with buttons */
          pointer-events: none;
          z-index: 0;
        }

        .top-bar-titles h2, .top-bar-titles p {
          pointer-events: none; /* Prevent blocking clicks to the connection button */
          text-align: center;
        }

        .top-bar-titles h2 {
          font-family: var(--font-display);
          font-size: 20px;
          margin: 0;
          color: white;
        }

        .top-bar-titles p {
          font-size: 13px;
          margin: 2px 0 0 0;
          opacity: 0.8;
          text-align: center;
        }

        .top-bar-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .top-preview .preview-header h3 {
          margin: 0;
          font-size: 18px;
          font-family: var(--font-display);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid var(--card-border);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 12px;
          transition: background 0.2s;
        }

        .user-profile.pointer {
          cursor: pointer;
        }

        .user-profile.pointer:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .avatar {
          width: 40px;
          height: 40px;
          background: var(--primary);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
        }

        .user-status {
          font-size: 11px;
          color: var(--accent);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .user-status.connected {
          color: var(--accent);
        }

        .user-status.offline {
          color: var(--text-muted);
        }

        .avatar.active-border {
          border: 2px solid var(--accent);
          
        }

        /* Main Content */
        .main-content {
          margin-left: 0;
          flex: 1;
          padding: 0 20px 20px 20px;
          max-width: 100%;
          width: 100%;
          transition: all 0.3s ease;
        }

        .content-grid {
          display: block;
        }
        
        .creator-container {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .top-preview {
          margin-bottom: 30px;
          background: rgba(255,255,255,0.03);
          padding: 24px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .top-preview .linkedin-mockup {
          margin: 0 auto;
          max-width: 800px;
        }

        .mockup-content.empty {
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .header-column {
          grid-column: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }

        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 0 16px;
          transition: border-color 0.2s;
        }

        .input-with-icon:focus-within {
          border-color: var(--primary);
        }

        .url-input {
          background: transparent;
          border: none;
          padding: 16px 0;
          color: #333333;
          width: 100%;
          font-size: 14px;
          outline: none;
        }

        .topic-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 12px;
          color: #333333;
          min-height: 70px;
          resize: none;
          font-size: 14px;
          margin-top: 8px;
          transition: border-color 0.2s;
        }

        .topic-input:focus {
          border-color: var(--primary);
        }

        .url-input, .topic-input, .content-textarea {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 12px;
          color: #333333;
          resize: vertical;
          font-size: 14px;
          line-height: 1.5;
          text-align: left;
        }

        .topic-input { min-height: 70px; }
        .content-textarea { min-height: 300px; }

        /* Buttons */
        .btn-primary {
          background: #0A66C2;
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
        }

        .btn-primary:hover:not(:disabled) {
          background: #004182;
          transform: translateY(-1px);
        }

        .btn-primary.btn-connected {
          background: var(--accent);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .btn-secondary {
          background: #000000;
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #333333;
        }

        .btn-generate {
          background: linear-gradient(135deg, #0A66C2 0%, #0077B5 100%) !important;
          color: white !important;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(10, 102, 194, 0.3);
          transition: all 0.3s ease;
          width: 100%;
          justify-content: center;
        }

        .btn-generate:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(10, 102, 194, 0.4);
        }

        .btn-generate:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          background: #333 !important;
          box-shadow: none;
        }

        .btn-icon-label {
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 6px;
          transition: color 0.2s;
          cursor: pointer;
        }

        .btn-icon-label:hover:not(:disabled) {
          color: white;
        }

        .btn-icon-label:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #222222;
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .publish-controls {
          display: flex;
          gap: 16px;
          align-items: center;
          justify-content: center;
          margin-top: 32px;
          width: 100%;
        }

        .publish-controls button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          padding: 0 32px;
          border-radius: 12px;
          font-weight: 600;
          width: auto;
          min-width: 200px;
        }

        .publish-controls .btn-primary {
          background: #000000;
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .publish-controls .btn-primary:hover {
          background: #111111;
          border-color: rgba(255,255,255,0.4);
        }

        .publish-controls .btn-secondary {
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* LinkedIn Mockup */
        .preview-toggle {
          display: flex;
          background: var(--glass);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid var(--card-border);
        }

        .preview-toggle button {
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          background: transparent;
          color: var(--text-muted);
        }

        .preview-toggle button.active {
          background: var(--card-bg);
          color: white;
        }

        .linkedin-mockup {
          background: white;
          border-radius: 12px;
          color: rgba(0, 0, 0, 0.9);
          padding: 16px;
          
          width: 100%;
          max-width: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 0 auto;
        }

        .linkedin-mockup.mobile {
          width: 320px;
        }

        .mockup-header {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          position: relative;
        }

        .mockup-avatar {
          width: 48px;
          height: 48px;
          background: #e11d48;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }

        .mockup-avatar.page {
          border-radius: 4px;
          background: #333;
        }

        .mockup-user .m-name {
          font-weight: 700;
          font-size: 14px;
        }

        .mockup-user .m-bio, .mockup-user .m-time {
          font-size: 12px;
          color: rgba(0,0,0,0.6);
        }

        .mockup-content {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 16px;
          min-height: 100px;
          white-space: pre-wrap;
          color: #111;
        }

        .mockup-image {
          width: 100%;
          height: auto;
          border-radius: 4px;
          margin-top: 12px;
          margin-bottom: 12px;
          max-height: 400px;
          object-fit: cover;
        }

        .mockup-actions {
          display: flex;
          border-top: 1px solid #ebebeb;
          padding-top: 4px;
        }

        .mockup-actions button {
          flex: 1;
          background: transparent;
          color: rgba(0,0,0,0.6);
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 0;
        }

        /* Utils */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 6px; }
        .gap-3 { gap: 8px; }
        .p-6 { padding: 16px; }
        .mt-4 { margin-top: 8px; }
        .mt-6 { margin-top: 16px; }
        .mb-4 { margin-bottom: 8px; }
        .mb-6 { margin-bottom: 16px; }
        .rounded-2xl { border-radius: 16px; }
        
        .input-group, .post-editor {
          background: transparent !important;
        }

        .input-group label, .post-editor label {
          display: block;
          width: 100%;
          text-align: center;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .text-xs { font-size: 12px; }

        /* New Utils */
        .relative { position: relative; }
        .absolute { position: absolute; }
        .flex-wrap { flex-wrap: wrap; }
        .justify-center { justify-content: center; }
        .w-full { width: 100%; }
        .text-center { text-align: center; }
        .top-2 { top: 8px; }
        .right-2 { right: 8px; }
        .z-10 { z-index: 10; }
        .pt-12 { padding-top: 48px !important; }

        .glass-button {
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.05);
          backdrop-filter: blur(4px);
          color: #444 !important;
        }
        .glass-button:hover {
          background: rgba(0, 0, 0, 0.1);
        }
        /* Placeholder styling */
        /* Placeholder styling */
        input::placeholder, textarea::placeholder {
          color: #999;
          font-weight: 400;
          text-align: center;
        }

        .glass-button-obvious {
          background: #f0f0f0;
          border: 1px solid #ddd;
          color: #333 !important;
          border-radius: 8px;
          padding: 6px 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .glass-button-obvious:hover {
          background: #e5e5e5;
          transform: translateY(-1px);
        }

        .btn-connection-round {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #000000;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-connection-round.connected {
          background: #0A66C2;
          border-color: #0A66C2;
        }

        .connection-badge {
          position: absolute;
          top: 0;
          right: 0;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid var(--bg-dark);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-badge.scheduled {
          background: rgba(10, 102, 194, 0.2);
          color: #0A66C2;
        }

        .status-badge.published {
          background: rgba(34, 197, 94, 0.2);
          color: #22C55E;
        }

        .status-badge.failed {
          background: rgba(239, 68, 68, 0.2);
          color: #EF4444;
        }

        .status-badge.publishing {
          background: rgba(168, 85, 247, 0.2);
          color: #A855F7;
        }

        .btn-sm {
          padding: 6px 14px;
          font-size: 13px;
        }

        .mobile-top-bar {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: var(--bg-dark);
          border-bottom: 1px solid var(--card-border);
          z-index: 1500;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
        }

        .mobile-menu-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: white;
          border: 1px solid var(--card-border);
          padding: 6px 16px;
          border-radius: 50px;
          font-weight: 500;
          font-size: 14px;
        }

        .mobile-close {
          display: none;
          position: absolute;
          top: 24px;
          right: 24px;
          color: white;
          cursor: pointer;
        }

        @media (max-width: 1100px) {
          .content-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 850px) {
          .top-left-controls {
            flex-direction: column-reverse;
            gap: 8px;
            padding: 5px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            margin-bottom: 5px;
          }

          .top-bar-nav {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .top-bar-titles {
            position: static;
            transform: none;
            width: 100%;
            text-align: center;
            padding: 0 10px;
          }

          .top-bar-titles h2 {
            font-size: 22px;
            margin-bottom: 4px;
          }

          .sidebar {
            width: 100% !important;
            transform: translateX(-100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            background: var(--bg-dark);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main-content {
            padding-top: 5px !important;
          }
          .creator-section {
            padding: 0;
            margin-top: 10px;
          }

          .input-group {
            padding: 15px !important;
            border-radius: 12px !important;
          }

          .input-group label, .post-editor label {
            display: block;
            width: 100%;
            text-align: left;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
          }

          .url-input, .topic-input, .content-textarea {
            padding: 12px !important;
            font-size: 14px !important;
            text-align: left !important;
          }

          .topic-input {
            min-height: 80px !important;
          }

          .content-textarea {
            min-height: 250px !important;
          }

          .publish-controls {
            flex-direction: column;
            width: 100%;
            gap: 10px;
          }

          .publish-controls button {
            width: auto !important;
            min-width: 180px !important;
          }

          .mt-6, .mb-6 { margin: 12px 0 !important; }
        }

      `}</style>
      <PWAPrompt />
    </div >
  );
};


export default App;
