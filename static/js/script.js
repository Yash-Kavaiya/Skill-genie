document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - Main UI
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const currentChatTitle = document.getElementById('current-chat-title');
    
    // DOM Elements - Voice UI
    const voiceButton = document.getElementById('voice-button');
    const voiceModal = document.getElementById('voice-modal');
    const closeVoiceModal = document.getElementById('close-voice-modal');
    const startRecording = document.getElementById('start-recording');
    const pauseRecording = document.getElementById('pause-recording');
    const resumeRecording = document.getElementById('resume-recording');
    const resetRecording = document.getElementById('reset-recording');
    const sendVoice = document.getElementById('send-voice');
    const transcriptionResult = document.getElementById('transcription-result');
    const recordingIndicator = document.getElementById('recording-indicator');
    const waveformPath = document.getElementById('waveform-svg-path');
    const recordingStatus = document.getElementById('recording-status');
    
    // DOM Elements - Attachment UI
    const attachmentButton = document.getElementById('attachment-button');
    const fileInput = document.getElementById('file-input');
    const attachmentPreview = document.getElementById('attachment-preview');
    const attachmentName = document.getElementById('attachment-name');
    const removeAttachment = document.getElementById('remove-attachment');
    
    // State variables
    let conversations = [];
    let currentConversationId = generateId();
    let isRecording = false;
    let isPaused = false;
    let currentFile = null;
    
    // Speech Recognition Setup
    let recognition = null;
    
    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            transcriptionResult.innerHTML = `
                <span class="font-medium">${finalTranscript}</span>
                <span class="text-gray-400 italic">${interimTranscript}</span>
            `;
            
            if (finalTranscript.trim() !== '' || interimTranscript.trim() !== '') {
                sendVoice.disabled = false;
                recordingStatus.innerHTML = 'Speech detected! <span class="text-accenture-purple">✓</span>';
            } else {
                sendVoice.disabled = true;
            }
        };
        
        recognition.onend = function() {
            if (isRecording && !isPaused) {
                recognition.start();
            } else {
                isRecording = false;
                recordingIndicator.classList.add('hidden');
                startRecording.querySelector('i').className = 'fas fa-microphone';
                updateVoiceControls();
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            isRecording = false;
            recordingIndicator.classList.add('hidden');
            startRecording.querySelector('i').className = 'fas fa-microphone';
            updateVoiceControls();
            
            transcriptionResult.innerHTML = `<span class="text-red-500">Error: ${event.error}. Please try again.</span>`;
        };
    }
    
    // Mobile sidebar toggle
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            
            // Create overlay if it doesn't exist
            let overlay = document.querySelector('.overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'overlay';
                document.body.appendChild(overlay);
                
                overlay.addEventListener('click', function() {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                });
            }
            
            overlay.classList.toggle('active');
        });
    }
    
    // New chat button
    newChatBtn.addEventListener('click', function() {
        startNewConversation();
    });
    
    // Voice button
    voiceButton.addEventListener('click', function() {
        voiceModal.classList.remove('hidden');
        resetVoiceUI();
        recordingStatus.textContent = 'Click the microphone to start recording';
    });
    
    // Close voice modal
    closeVoiceModal.addEventListener('click', function() {
        closeVoiceModalFunc();
    });
    
    // Handle file attachment
    attachmentButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            attachmentName.textContent = currentFile.name;
            attachmentPreview.classList.remove('hidden');
        }
    });
    
    // Remove attachment
    removeAttachment.addEventListener('click', function() {
        currentFile = null;
        fileInput.value = '';
        attachmentPreview.classList.add('hidden');
    });
    
    // Voice Recording Controls
    startRecording.addEventListener('click', function() {
        if (!isRecording) {
            if (recognition) {
                try {
                    recognition.start();
                    isRecording = true;
                    isPaused = false;
                    recordingIndicator.classList.remove('hidden');
                    startRecording.querySelector('i').className = 'fas fa-stop';
                    transcriptionResult.innerHTML = '';
                    sendVoice.disabled = true;
                    
                    if (recordingStatus) {
                        recordingStatus.innerHTML = '<span class="text-red-500 animate-pulse">●</span> Recording... speak now';
                    }
                    
                    animateWaveform(true);
                    updateVoiceControls();
                } catch (e) {
                    console.error('Error starting recognition', e);
                    if (recordingStatus) {
                        recordingStatus.innerHTML = '<span class="text-red-500">Error starting speech recognition. Please try again.</span>';
                        setTimeout(() => {
                            recordingStatus.textContent = 'Click the microphone to start recording';
                        }, 3000);
                    }
                }
            } else {
                if (recordingStatus) {
                    recordingStatus.innerHTML = '<span class="text-red-500">Speech recognition is not supported in your browser.</span>';
                }
            }
        } else {
            stopRecording();
        }
    });
    
    pauseRecording.addEventListener('click', function() {
        if (isRecording && !isPaused && recognition) {
            recognition.stop();
            isPaused = true;
            animateWaveform(false);
            updateVoiceControls();
            
            if (recordingStatus) {
                recordingStatus.innerHTML = '<span class="text-yellow-500">⏸</span> Recording paused';
            }
        }
    });
    
    resumeRecording.addEventListener('click', function() {
        if (isRecording && isPaused && recognition) {
            try {
                recognition.start();
                isPaused = false;
                animateWaveform(true);
                updateVoiceControls();
                
                if (recordingStatus) {
                    recordingStatus.innerHTML = '<span class="text-red-500 animate-pulse">●</span> Recording resumed... speak now';
                }
            } catch (e) {
                console.error('Error resuming recognition', e);
                if (recordingStatus) {
                    recordingStatus.innerHTML = '<span class="text-red-500">Error resuming recording. Please try again.</span>';
                }
            }
        }
    });
    
    resetRecording.addEventListener('click', function() {
        resetVoiceUI();
    });
    
    sendVoice.addEventListener('click', function() {
        const text = transcriptionResult.textContent.trim();
        if (text) {
            sendVoice.disabled = true;
            if (recordingStatus) {
                recordingStatus.innerHTML = '<span class="text-green-500 animate-pulse">↑</span> Sending message...';
            }
            
            setTimeout(() => {
                addMessage('user', text);
                
                transcriptionResult.innerHTML = '';
                voiceModal.classList.add('hidden');
                stopRecording();
                resetVoiceUI();
                
                processMessage(text, null, true);
            }, 500);
        }
    });
    
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Auto-resize textarea and send on Enter (without shift)
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button based on input
        if (this.value.trim() !== '' || currentFile) {
            sendButton.classList.remove('opacity-50');
        } else {
            sendButton.classList.add('opacity-50');
        }
    });
    
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Initialize the chat
    function init() {
        createNewConversation(currentConversationId, 'New Conversation');
        updateChatHistory();
    }
    
    // Function to send message
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message === '' && !currentFile) return;
        
        // Add user message to chat
        addMessage('user', message, currentFile);
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendButton.classList.add('opacity-50');
        
        // Handle the file if any
        let fileData = null;
        if (currentFile) {
            fileData = {
                name: currentFile.name,
                type: currentFile.type,
                size: currentFile.size
            };
            
            // Clear the attachment UI
            currentFile = null;
            fileInput.value = '';
            attachmentPreview.classList.add('hidden');
        }
        
        // Process the message
        processMessage(message, fileData);
    }
    
    // Process the message and get a response
    function processMessage(message, fileData = null, isVoiceInput = false) {
        // Show typing indicator
        showTypingIndicator();
        
        // Prepare the data to send
        const data = {
            message: message || ''
        };
        
        if (fileData) {
            data.attachment = fileData;
        }
        
        // Send to server and get response
        fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(data => {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Add bot response to chat
            setTimeout(() => {
                addMessage('bot', data.response);
                
                // Update conversation title if this is the first exchange
                const messages = document.querySelectorAll('.user-message, .bot-message');
                if (messages.length === 3 && currentChatTitle.textContent === 'New Conversation') {
                    // Extract a title from the first user message
                    const firstUserMessage = message || '';
                    const title = firstUserMessage.length > 20 
                        ? firstUserMessage.substring(0, 20) + '...' 
                        : firstUserMessage;
                    
                    updateConversationTitle(currentConversationId, title || 'New Conversation');
                }
                
                // If input was voice, use speech synthesis for response
                if (isVoiceInput && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(data.response);
                    utterance.lang = 'en-US';
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                    window.speechSynthesis.speak(utterance);
                }
            }, 500);
        })
        .catch(error => {
            console.error('Error:', error);
            removeTypingIndicator();
            addMessage('bot', 'Sorry, there was an error processing your request.');
        });
    }
    
    // Function to add message to chat
    function addMessage(sender, message, attachment = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message flex items-start gap-4 mb-8' : 'bot-message flex items-start gap-4';
        
        let avatar, messageContent;
        
        if (sender === 'user') {
            avatar = `
                <div class="user-avatar w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user text-white"></i>
                </div>
            `;
            
            let attachmentHTML = '';
            if (attachment) {
                attachmentHTML = `
                    <div class="mt-2 flex items-center text-gray-500 text-sm">
                        <i class="fas fa-paperclip mr-2"></i>
                        <span>${escapeHtml(attachment.name || 'Attachment')}</span>
                    </div>
                `;
            }
            
            messageContent = `
                <div class="flex-1">
                    <div class="prose max-w-none">
                        <p>${escapeHtml(message || '')}</p>
                    </div>
                    ${attachmentHTML}
                </div>
            `;
        } else {
            avatar = `
                <div class="avatar-gradient w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white"></i>
                </div>
            `;
            
            // Format code blocks in bot messages
            const formattedMessage = formatBotMessage(message);
            
            messageContent = `
                <div class="flex-1">
                    <div class="prose max-w-none">
                        ${formattedMessage}
                    </div>
                </div>
            `;
        }
        
        messageDiv.innerHTML = avatar + messageContent;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        
        // Add animation class
        messageDiv.classList.add('animate-fade-in');
        
        // Save message to conversation history
        saveMessageToConversation(currentConversationId, {
            sender,
            message,
            timestamp: new Date().toISOString()
        });
    }
    
    // Show typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'bot-message flex items-start gap-4 typing-indicator-container';
        typingDiv.innerHTML = `
            <div class="avatar-gradient w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white"></i>
            </div>
            <div class="flex-1">
                <div class="typing-indicator mt-2">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();
    }
    
    // Remove typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator-container');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    // Format bot messages to handle code blocks and markdown
    function formatBotMessage(message) {
        if (!message) return '';
        
        // Simple markdown-like formatting
        let formattedMessage = escapeHtml(message);
        
        // Handle code blocks with triple backticks
        formattedMessage = formattedMessage.replace(/```([\s\S]*?)```/g, function(match, code) {
            return `<pre><code>${code.trim()}</code></pre>`;
        });
        
        // Handle inline code with single backticks
        formattedMessage = formattedMessage.replace(/`([^`]+)`/g, function(match, code) {
            return `<code>${code}</code>`;
        });
        
        // Handle bold text
        formattedMessage = formattedMessage.replace(/\*\*([^*]+)\*\*/g, function(match, text) {
            return `<strong>${text}</strong>`;
        });
        
        // Handle links
        formattedMessage = formattedMessage.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, text, url) {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        });
        
        // Handle unordered lists
        formattedMessage = formattedMessage.replace(/^\s*-\s+(.*?)$/gm, function(match, item) {
            return `<li>${item}</li>`;
        }).replace(/<li>(.*?)<\/li>\s*<li>/g, '<li>$1</li><li>');
        
        // Wrap text in paragraphs
        formattedMessage = formattedMessage.replace(/^(?!<pre|<code|<strong|<a|<li)(.+)$/gm, function(match, text) {
            return `<p>${text}</p>`;
        });
        
        // Handle consecutive paragraphs
        formattedMessage = formattedMessage.replace(/<\/p>\s*<p>/g, '</p><p>');
        
        return formattedMessage;
    }
    
    // Conversation management functions
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
    
    function createNewConversation(id, title) {
        const conversation = {
            id,
            title,
            messages: [],
            createdAt: new Date().toISOString()
        };
        
        conversations.push(conversation);
        saveConversations();
        
        return conversation;
    }
    
    function saveMessageToConversation(conversationId, message) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.messages.push(message);
            saveConversations();
        }
    }
    
    function updateConversationTitle(conversationId, title) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            conversation.title = title;
            saveConversations();
            currentChatTitle.textContent = title;
            updateChatHistory();
        }
    }
    
    function saveConversations() {
        try {
            localStorage.setItem('accenture-dialogflow-conversations', JSON.stringify(conversations));
        } catch (e) {
            console.error('Error saving conversations to localStorage', e);
        }
    }
    
    function loadConversations() {
        try {
            const saved = localStorage.getItem('accenture-dialogflow-conversations');
            if (saved) {
                conversations = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading conversations from localStorage', e);
            conversations = [];
        }
    }
    
    function updateChatHistory() {
        chatHistory.innerHTML = '';
        
        conversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(conversation => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${conversation.id === currentConversationId ? 'active' : ''}`;
            chatItem.dataset.id = conversation.id;
            chatItem.innerHTML = `
                <i class="fas fa-message mr-3"></i>
                <span class="truncate">${escapeHtml(conversation.title)}</span>
            `;
            
            chatItem.addEventListener('click', function() {
                loadConversation(conversation.id);
            });
            
            chatHistory.appendChild(chatItem);
        });
    }
    
    function loadConversation(conversationId) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        
        currentConversationId = conversationId;
        currentChatTitle.textContent = conversation.title;
        
        // Clear messages container
        messagesContainer.innerHTML = '';
        
        // Add welcome message
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'flex items-start gap-4 bot-message';
        welcomeDiv.innerHTML = `
            <div class="avatar-gradient w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white"></i>
            </div>
            <div class="flex-1">
                <div class="prose max-w-none">
                    <p>Hello! I'm your Accenture AI assistant powered by Google's Dialogflow. How can I help you today?</p>
                </div>
            </div>
        `;
        messagesContainer.appendChild(welcomeDiv);
        
        // Add conversation messages
        conversation.messages.forEach(msg => {
            // Skip empty messages
            if (!msg.message && msg.sender !== 'bot') return;
            
            addMessage(msg.sender, msg.message);
        });
        
        // Update chat history UI
        updateChatHistory();
        
        // Close mobile sidebar if open
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.overlay');
            if (overlay) overlay.classList.remove('active');
        }
    }
    
    function startNewConversation() {
        const newId = generateId();
        createNewConversation(newId, 'New Conversation');
        currentConversationId = newId;
        currentChatTitle.textContent = 'New Conversation';
        
        // Clear messages
        messagesContainer.innerHTML = '';
        
        // Add welcome message
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'flex items-start gap-4 bot-message';
        welcomeDiv.innerHTML = `
            <div class="avatar-gradient w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white"></i>
            </div>
            <div class="flex-1">
                <div class="prose max-w-none">
                    <p>Hello! I'm your Accenture AI assistant powered by Google's Dialogflow. How can I help you today?</p>
                </div>
            </div>
        `;
        messagesContainer.appendChild(welcomeDiv);
        
        // Update chat history UI
        updateChatHistory();
        
        // Focus on input
        messageInput.focus();
    }
    
    // Voice-related functions
    function closeVoiceModalFunc() {
        voiceModal.classList.add('hidden');
        stopRecording();
    }
    
    function updateVoiceControls() {
        if (isRecording) {
            pauseRecording.disabled = isPaused;
            resumeRecording.disabled = !isPaused;
            resetRecording.disabled = false;
        } else {
            pauseRecording.disabled = true;
            resumeRecording.disabled = true;
            resetRecording.disabled = true;
            sendVoice.disabled = transcriptionResult.textContent.trim() === '';
        }
    }
    
    function stopRecording() {
        if (recognition && isRecording) {
            recognition.stop();
            isRecording = false;
            isPaused = false;
            recordingIndicator.classList.add('hidden');
            startRecording.querySelector('i').className = 'fas fa-microphone';
            animateWaveform(false);
            
            if (recordingStatus) {
                if (transcriptionResult.textContent.trim() !== '') {
                    recordingStatus.innerHTML = '<span class="text-accenture-purple">✓</span> Recording complete. You can send or reset.';
                } else {
                    recordingStatus.textContent = 'Recording stopped. Click microphone to try again.';
                }
            }
            
            updateVoiceControls();
        }
    }
    
    function resetVoiceUI() {
        stopRecording();
        transcriptionResult.innerHTML = '';
        sendVoice.disabled = true;
        pauseRecording.disabled = true;
        resumeRecording.disabled = true;
        resetRecording.disabled = true;
        startRecording.querySelector('i').className = 'fas fa-microphone';
        
        if (recordingStatus) {
            recordingStatus.textContent = 'Click the microphone to start recording';
        }
        
        waveformPath.setAttribute('d', 'M0,30 Q25,30 50,30 T100,30 T150,30 T200,30 T250,30 T300,30');
    }
    
    function animateWaveform(active) {
        if (active) {
            let lastValues = Array(20).fill(30);
            
            function updateWaveform() {
                if (!isRecording || isPaused) return;
                
                const points = [];
                const totalPoints = 20;
                
                for (let i = 0; i <= totalPoints; i++) {
                    const x = (i / totalPoints) * 300;
                    
                    if (i === 0 || i === totalPoints) {
                        points.push([x, 30]);
                        continue;
                    }
                    
                    let prevVal = lastValues[i];
                    let amplitude = Math.random() * 18 + 2;
                    
                    if (Math.random() < 0.05) {
                        amplitude += 15;
                    }
                    
                    let targetY = 30 - amplitude + Math.random() * (amplitude/3);
                    let y = prevVal + (targetY - prevVal) * 0.3;
                    
                    lastValues[i] = y;
                    points.push([x, y]);
                }
                
                let pathData = `M${points[0][0]},${points[0][1]}`;
                
                for (let i = 1; i < points.length; i++) {
                    const [x, y] = points[i];
                    const [prevX, prevY] = points[i-1];
                    
                    const cp1x = prevX + (x - prevX) * 0.4;
                    const cp1y = prevY;
                    const cp2x = prevX + (x - prevX) * 0.6;
                    const cp2y = y;
                    
                    pathData += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`;
                }
                
                waveformPath.setAttribute('d', pathData);
                
                if (isRecording && !isPaused) {
                    requestAnimationFrame(updateWaveform);
                }
            }
            
            requestAnimationFrame(updateWaveform);
        } else {
            waveformPath.style.transition = 'd 0.5s ease-out';
            waveformPath.setAttribute('d', 'M0,30 Q25,30 50,30 T100,30 T150,30 T200,30 T250,30 T300,30');
            
            setTimeout(() => {
                waveformPath.style.transition = '';
            }, 500);
        }
    }
    
    // Utility functions
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Add fade-in animation
    document.body.addEventListener('animationend', function(e) {
        if (e.target.classList.contains('animate-fade-in')) {
            e.target.classList.remove('animate-fade-in');
        }
    });
    
    // Handle Escape key for modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !voiceModal.classList.contains('hidden')) {
            closeVoiceModalFunc();
        }
    });
    
    // Handle click outside of modal to close
    voiceModal.addEventListener('click', function(e) {
        if (e.target === voiceModal) {
            closeVoiceModalFunc();
        }
    });
    
    // Initialize the application
    loadConversations();
    if (conversations.length === 0) {
        init();
    } else {
        // Load most recent conversation
        const mostRecent = conversations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        loadConversation(mostRecent.id);
    }
});