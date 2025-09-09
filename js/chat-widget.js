(function (window, document) {
    class ChatWidget {
        constructor({ getToken, assistantId, title, baseUrl, theme = "light", welcomeMessage }) {
            this.getToken = getToken;
            this.assistantId = assistantId;
            this.baseUrl = baseUrl.replace(/\/+$/, "");
            this.sessionId = null;
            this.token = null;
            this.theme = theme;
            this.title = title || "Chat Assistant";
            this.welcomeMessage = welcomeMessage || "👋 Hi! How can I help you today?";
            this.typingEl = null;

            this._injectFont();
            this._injectMarkdownLib();
            this._createLauncher();
            this._createUI();
            this._applyTheme();
        }

        _injectFont() {
            if (!document.getElementById("lexend-font")) {
                const link = document.createElement("link");
                link.id = "lexend-font";
                link.rel = "stylesheet";
                link.href = "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap";
                document.head.appendChild(link);
            }
        }

        _injectMarkdownLib() {
            if (!document.getElementById("marked-lib")) {
                const script = document.createElement("script");
                script.id = "marked-lib";
                script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
                document.head.appendChild(script);
            }
        }

        async _initSession() {
            try {
                this.token = await this.getToken();
                const res = await fetch(`${this.baseUrl}/client/api/v1/assistants/${this.assistantId}/sessions`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({})
                });

                if (!res.ok) throw new Error("Session creation failed");
                const data = await res.json();
                this.sessionId = data.id;

                this._appendMessage("system", this.welcomeMessage);
            } catch (err) {
                this._appendMessage("system", "❌ Failed to initialize session: " + err.message);
            }
        }

        async _sendMessage(message) {
            if (!this.sessionId) {
                this._appendMessage("system", "⚠️ Please wait, session not ready yet.");
                return;
            }

            this._appendMessage("user", message);
            this._showTyping();

            // 🔒 Disable input while waiting
            this.inputEl.disabled = true;
            this.sendBtn.disabled = true;
            this.sendBtn.style.opacity = "0.6"; // optional styling to show disabled state

            try {
                const res = await fetch(
                    `${this.baseUrl}/client/api/v1/assistants/${this.assistantId}/sessions/${this.sessionId}/chat`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${this.token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ message })
                    }
                );

                this._hideTyping();

                if (!res.ok) {
                    this._appendMessage("system", "❌ Failed to send message.");
                } else {
                    const messages = await res.json();
                    messages.forEach(msg => this._appendMessage(msg.role, msg.content, true));
                }
            } catch (err) {
                this._hideTyping();
                this._appendMessage("system", "❌ Error: " + err.message);
            } finally {
                // 🔓 Re-enable input after server responds
                this.inputEl.disabled = false;
                this.sendBtn.disabled = false;
                this.sendBtn.style.opacity = "1";
                this.inputEl.focus();
            }
        }

        _showTyping() {
            if (this.typingEl) return;
            const div = document.createElement("div");
            div.classList.add("msg", "assistant", "typing");
            div.innerHTML = `
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            `;
            this.messagesEl.appendChild(div);
            this.typingEl = div;

            requestAnimationFrame(() => {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            });
        }

        _hideTyping() {
            if (this.typingEl) {
                this.typingEl.remove();
                this.typingEl = null;
            }
        }

        _createLauncher() {
            const btn = document.createElement("div");
            btn.id = "chat-launcher";
            btn.innerHTML = "💬";
            btn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                font-size: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 9999;
                transition: transform 0.2s;
                font-family: "Lexend", sans-serif;
            `;
            btn.addEventListener("mouseenter", () => btn.style.transform = "scale(1.1)");
            btn.addEventListener("mouseleave", () => btn.style.transform = "scale(1.0)");
            btn.addEventListener("click", () => this._toggleChat());

            document.body.appendChild(btn);
            this.launcher = btn;
        }

        _createUI() {
            const container = document.createElement("div");
            container.id = "chat-widget";
            container.classList.add("hidden");
            container.innerHTML = `
                <style>
                    #chat-widget {
                        position: fixed;
                        bottom: 90px;
                        right: 20px;
                        width: 360px;
                        height: 500px;
                        display: flex;
                        flex-direction: column;
                        font-family: "Lexend", sans-serif;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                        z-index: 9999;
                    }
                    #chat-widget.hidden { display: none !important; }
                    #chat-widget.light { background: #fff; border: 1px solid #ddd; color: #000; }
                    #chat-widget.dark { background: #1e1e1e; border: 1px solid #444; color: #f5f5f5; }

                    #chat-header {
                        padding: 12px 16px;
                        font-weight: 600;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-family: "Lexend", sans-serif;
                    }
                    #chat-widget.light #chat-header { background: #007bff; color: #fff; }
                    #chat-widget.dark #chat-header { background: #333; color: #f5f5f5; }

                    #chat-close { cursor: pointer; font-size: 18px; }
                    #chat-messages {
                        flex: 1;
                        padding: 12px;
                        overflow-y: auto;
                        font-size: 14px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        padding-bottom: 60px;
                        box-sizing: border-box;
                        scroll-behavior: smooth;
                    }
                    .msg {
                        padding: 8px 12px;
                        border-radius: 10px;
                        max-width: 75%;
                        line-height: 1.4;
                        font-family: "Lexend", sans-serif;
                        word-wrap: break-word;
                    }
                    .msg.user { background: #007bff; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
                    .msg.assistant { background: #f1f1f1; color: black; align-self: flex-start; border-bottom-left-radius: 2px; }
                    .msg.system { background: #ffeeba; color: #856404; align-self: center; font-style: italic; }
                    .msg.tool { background: #d4edda; color: #155724; align-self: flex-start; font-family: monospace; }

                    #chat-widget.dark .msg.assistant { background: #2c2c2c; color: #f5f5f5; }
                    #chat-widget.dark .msg.system { background: #5a3c00; color: #ffd966; }
                    #chat-widget.dark .msg.tool { background: #234d20; color: #a8e6a3; }

                    /* Markdown styling */
                    .msg.assistant pre, .msg.assistant code {
                        background: #eee;
                        padding: 2px 4px;
                        border-radius: 4px;
                        font-family: monospace;
                        font-size: 13px;
                    }
                    #chat-widget.dark .msg.assistant pre, 
                    #chat-widget.dark .msg.assistant code {
                        background: #333;
                        color: #f5f5f5;
                    }

                    /* Typing indicator */
                    .msg.typing { display: flex; gap: 4px; align-items: center; }
                    .msg.typing .dot {
                        width: 6px;
                        height: 6px;
                        background: #999;
                        border-radius: 50%;
                        display: inline-block;
                        animation: blink 1.4s infinite both;
                    }
                    .msg.typing .dot:nth-child(2) { animation-delay: 0.2s; }
                    .msg.typing .dot:nth-child(3) { animation-delay: 0.4s; }
                    @keyframes blink {
                        0% { opacity: .2; }
                        20% { opacity: 1; }
                        100% { opacity: .2; }
                    }

                    #chat-input-area {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        display: flex;
                        border-top: 1px solid #ccc;
                        padding: 8px;
                        gap: 8px;
                        background: inherit;
                        font-family: "Lexend", sans-serif;
                    }
                    #chat-input {
                        flex: 1;
                        border: none;
                        padding: 8px 10px;
                        border-radius: 20px;
                        font-size: 14px;
                        outline: none;
                        font-family: "Lexend", sans-serif;
                    }
                    #chat-widget.light #chat-input { background: #f9f9f9; color: #000; }
                    #chat-widget.dark #chat-input { background: #2c2c2c; color: #f5f5f5; }

                    #chat-send {
                        border: none;
                        background: #007bff;
                        color: white;
                        padding: 0 16px;
                        border-radius: 20px;
                        cursor: pointer;
                        transition: background 0.2s;
                        font-family: "Lexend", sans-serif;
                    }
                    #chat-send:hover { background: #0056b3; }
                </style>
                <div id="chat-header">
                    <span id="chat-title">💬 ${this.title}</span>
                    <span id="chat-close">&times;</span>
                </div>
                <div id="chat-messages"></div>
                <div id="chat-input-area">
                    <input id="chat-input" type="text" placeholder="Type a message..." />
                    <button id="chat-send">➤</button>
                </div>
            `;

            document.body.appendChild(container);

            this.container = container;
            this.messagesEl = container.querySelector("#chat-messages");
            this.inputEl = container.querySelector("#chat-input");
            this.sendBtn = container.querySelector("#chat-send");

            this.container.querySelector("#chat-close").addEventListener("click", () => this._toggleChat(false));
            this.sendBtn.addEventListener("click", () => this._handleSend());
            this.inputEl.addEventListener("keypress", (e) => {
                if (e.key === "Enter") this._handleSend();
            });
        }

        _toggleChat(forceOpen) {
            const isOpen = !this.container.classList.contains("hidden");
            if (forceOpen === false || isOpen) {
                this.container.classList.add("hidden");
            } else {
                this.container.classList.remove("hidden");
                if (!this.sessionId) this._initSession();
            }
        }

        _handleSend() {
            const message = this.inputEl.value.trim();
            if (!message) return;
            this.inputEl.value = "";
            this._sendMessage(message);
        }

        _appendMessage(role, content, renderMarkdown = false) {
            const div = document.createElement("div");
            div.classList.add("msg", role);

            if (renderMarkdown && role === "assistant" && window.marked) {
                div.innerHTML = marked.parse(content);
            } else {
                div.textContent = content;
            }

            this.messagesEl.appendChild(div);

            requestAnimationFrame(() => {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            });
        }

        _applyTheme() {
            this.container.classList.add(this.theme);
        }
    }

    window.initChatWidget = function (config) {
        return new ChatWidget(config);
    };
})(window, document);
