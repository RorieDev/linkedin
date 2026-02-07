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
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
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

      <header className="mobile-top-bar">
        <button className="mobile-menu-trigger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          <span>Menu</span>
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
          <X size={24} />
        </div>
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles className="text-primary" fill="currentColor" />
          </div>
          <h1>Postly AI</h1>
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

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className={`avatar ${isConnected ? 'active-border' : ''}`}>
              {isConnected ? 'RD' : '?'}
            </div>
            <div className="user-info">
              <p className="user-name">{isConnected ? 'Rorie Devine' : 'Guest'}</p>
              <p className={`user-status ${isConnected ? 'connected' : 'offline'}`}>
                {isConnected ? 'LinkedIn Connected' : 'Not Connected'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-titles">
            <h2>{activeTab === 'creator' ? 'Create New Post' : 'Post History'}</h2>
            <p className="text-muted">Transform your ideas into high-performing LinkedIn posts</p>
          </div>
          <button
            onClick={toggleConnection}
            className={`btn-primary btn-sm ${isConnected ? 'btn-connected' : ''}`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 size={14} />
                Connected
              </>
            ) : (
              <>
                <Linkedin size={14} />
                Connect
              </>
            )}
          </button>
        </header>

        <div className="content-grid">
          {activeTab === 'creator' ? (
            <>
              {/* Creator Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="creator-section"
              >
                <div className="input-group glass-effect rounded-2xl p-6">
                  <div className="source-inputs mb-6">
                    <div className="input-with-icon mb-4">
                      <Globe size={16} className="text-muted" />
                      <input
                        type="url"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="Paste source URL (blog, news, etc.)"
                        className="url-input"
                      />
                    </div>
                    <label>What's on your mind?</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Write a post about why building in public is important for founders..."
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

                <div className="post-editor glass-effect rounded-2xl p-6 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <label>Generated Post</label>
                    <div className="flex gap-2">
                      <button onClick={copyToClipboard} className="btn-icon-label" title="Copy to clipboard">
                        <Copy size={16} />
                        Copy
                      </button>
                      {postContent && (
                        <button
                          onClick={generateImage}
                          disabled={isGeneratingImage}
                          className={`btn-icon-label ${isGeneratingImage ? 'loading' : ''}`}
                          title="Generate image for this post"
                        >
                          {isGeneratingImage ? (
                            <div className="spinner-small"></div>
                          ) : (
                            <ImageIcon size={16} />
                          )}
                          {isGeneratingImage ? 'Generating...' : 'Generate Image'}
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Your generated post will appear here..."
                    className="content-textarea"
                  />
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
                        console.log('Schedule button clicked, isScheduleModalOpen:', isScheduleModalOpen);
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

              {/* Preview Section */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="preview-section"
              >
                <div className="preview-header mb-4">
                  <h3>Preview</h3>
                  <div className="preview-toggle">
                    <button
                      className={previewMode === 'desktop' ? 'active' : ''}
                      onClick={() => setPreviewMode('desktop')}
                    >
                      Desktop
                    </button>
                    <button
                      className={previewMode === 'mobile' ? 'active' : ''}
                      onClick={() => setPreviewMode('mobile')}
                    >
                      Mobile
                    </button>
                  </div>
                </div>

                <div className={`linkedin-mockup ${previewMode}`}>
                  <div className="mockup-header">
                    <div className="mockup-avatar profile">
                      RD
                    </div>
                    <div className="mockup-user">
                      <p className="m-name">Rorie Devine <span className="dropdown">▼</span></p>
                      <p className="m-bio">Post to Anyone</p>
                      <p className="m-time">Just now • 🌐</p>
                    </div>
                    <MoreHorizontal className="mockup-more" />
                  </div>
                  <div className="mockup-content">
                    {postContent ? (
                      <>
                        {postContent.split('\n').map((line, i) => (
                          <p key={i}>{line || <br />}</p>
                        ))}
                        {postImage && (
                          <img src={postImage} alt="Generated post image" className="mockup-image" />
                        )}
                      </>
                    ) : (
                      <p className="text-muted italic">Start generating to see how your post looks on LinkedIn...</p>
                    )}
                  </div>
                  <div className="mockup-stats">
                    <div className="stat-icons">
                      <div className="mini-icon blue"><ThumbsUp size={10} fill="white" /></div>
                      <span>0 engagement</span>
                    </div>
                  </div>
                  <div className="mockup-actions">
                    <button><ThumbsUp size={18} /> Like</button>
                    <button><MessageSquare size={18} /> Comment</button>
                    <button><Repeat2 size={18} /> Repost</button>
                    <button><Send size={18} /> Send</button>
                  </div>
                </div>
              </motion.div>
            </>
          ) : activeTab === 'history' ? (
            <div className="history-list full-width">
              {history.map(item => (
                <div key={item.id} className="history-item glass-effect">
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
                <div className="placeholder-content glass-effect" style={{ textAlign: 'center', padding: '48px' }}>
                  <Calendar size={48} className="text-muted mb-4" />
                  <h3>No scheduled posts</h3>
                  <p className="text-muted">Create a post and click Schedule to plan ahead</p>
                </div>
              ) : (
                scheduledPosts.map(post => (
                  <div key={post.id} className="history-item glass-effect">
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
            <div className="placeholder-content glass-effect full-width">
              <Settings size={48} className="text-muted mb-4" />
              <h3>Tab coming soon</h3>
              <p className="text-muted">We are working on the {activeTab} functionality.</p>
            </div>
          )}
        </div>
      </main>

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
          box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
          z-index: 1000;
          font-weight: 600;
        }

        /* Sidebar */
        .sidebar {
          width: var(--sidebar-width);
          border-right: 1px solid var(--card-border);
          padding: 24px;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          background: #310404;
          z-index: 100;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
        }

        .logo-icon {
          width: 36px;
          height: 36px;
          background: rgba(10, 102, 194, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-container h1 {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
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
          padding: 8px;
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
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
        }

        /* Main Content */
        .main-content {
          margin-left: var(--sidebar-width);
          flex: 1;
          padding: 40px;
          max-width: 1400px;
          width: calc(100% - var(--sidebar-width));
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .main-header h2 {
          font-family: var(--font-display);
          font-size: 28px;
          margin-bottom: 4px;
        }

        .text-muted {
          color: var(--text-muted);
        }

        /* Content Layout */
        .content-grid {
          display: grid;
          grid-template-columns: 480px 1fr;
          gap: 32px;
        }

        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }

        .input-with-icon {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.2);
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
          color: white;
          width: 100%;
          font-size: 14px;
          outline: none;
        }

        .topic-input {
          width: 100%;
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 16px;
          color: white;
          min-height: 100px;
          resize: none;
          font-size: 15px;
          margin-top: 12px;
          transition: border-color 0.2s;
        }

        .topic-input:focus {
          border-color: var(--primary);
        }

        .content-textarea {
          width: 100%;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 16px;
          color: white;
          min-height: 250px;
          resize: vertical;
          font-size: 15px;
          line-height: 1.6;
        }

        /* Buttons */
        .btn-primary {
          background: var(--primary);
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
          background: var(--primary-hover);
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
          background: rgba(255,255,255,0.05);
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--card-border);
        }

        .btn-generate {
          background: linear-gradient(135deg, var(--primary) 0%, #be123c 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3);
          width: 100%;
          justify-content: center;
        }

        .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          background: rgba(255,255,255,0.1);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .publish-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .publish-controls button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .publish-controls .btn-primary {
          flex: 1;
        }

        .publish-controls .btn-secondary {
          width: auto;
          min-width: 120px;
          white-space: nowrap;
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
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
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
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .p-6 { padding: 24px; }
        .mt-4 { margin-top: 16px; }
        .mt-6 { margin-top: 24px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .text-xs { font-size: 12px; }
        .font-medium { font-weight: 500; }
        .flex-1 { flex: 1; }
        .full-width { grid-column: 1 / -1; }

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
          height: 60px;
          background: rgba(49, 4, 4, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--card-border);
          z-index: 1500;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
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
          .preview-section { order: -1; }
        }

        @media (max-width: 850px) {
          .preview-section { display: none; }
          .mobile-top-bar { display: flex; }

          
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            width: 100% !important;
            background: rgba(49, 4, 4, 0.98);
            backdrop-filter: blur(20px);
            justify-content: center;
            align-items: center;
            text-align: center;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-nav {
            justify-content: center;
            align-items: center;
            flex: initial;
          }

          .mobile-close { display: block; }
          
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 80px 20px 40px 20px !important;
            text-align: center;
          }

          .main-header {
            flex-direction: column;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;
          }

          .header-titles {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .btn-primary.btn-sm {
            width: auto;
          }

          .creator-section {
            padding: 0;
          }

          .input-group {
            padding: 16px !important;
          }

          .input-group label, .post-editor label {
            display: block;
            width: 100%;
            text-align: center;
            margin-bottom: 8px;
          }

          .preview-header {
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }

          .publish-controls {
            flex-direction: column;
            width: 100%;
          }

          .publish-controls button {
            width: 100% !important;
          }

          .linkedin-mockup.mobile {
            width: 100%;
          }
          
          .mockup-user {
            text-align: left; /* Keep mockup content looking natural */
          }
        }

      `}</style>
      <PWAPrompt />
    </div>
  );
};


export default App;
