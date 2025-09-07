(function (window, document) {
    class ChatWidget {
        constructor({ getToken, assistantId, title, baseUrl, theme = "light" }) {
            this.getToken = getToken;
            this.assistantId = assistantId;
            this.baseUrl = baseUrl.replace(/\/+$/, "");
            this.sessionId = null;
            this.token = null;
            this.theme = theme;
            this.title = title || "Chat Assistant";

            this._createLauncher();
            this._createUI();
            this._applyTheme();
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
                this._appendMessage("system", "✅ Session started. You can now chat!");
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

            const res = await fetch(`${this.baseUrl}/client/api/v1/assistants/${this.assistantId}/sessions/${this.sessionId}/chat`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message })
            });

            if (!res.ok) {
                this._appendMessage("system", "❌ Failed to send message.");
                return;
            }

            const messages = await res.json();
            messages.forEach(msg => this._appendMessage(msg.role, msg.content));
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
                        font-family: "Inter", sans-serif;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                        z-index: 9999;
                    }
                    #chat-widget.hidden {
                        display: none !important;
                    }
                    #chat-widget.light { background: #fff; border: 1px solid #ddd; color: #000; }
                    #chat-widget.dark { background: #1e1e1e; border: 1px solid #444; color: #f5f5f5; }

                    #chat-header {
                        padding: 12px 16px;
                        font-weight: 600;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    #chat-widget.light #chat-header { background: #007bff; color: #fff; }
                    #chat-widget.dark #chat-header { background: #333; color: #f5f5f5; }

                    #chat-close {
                        cursor: pointer;
                        font-size: 18px;
                    }
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
                    }
                    .msg.user { background: #007bff; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
                    .msg.assistant { background: #f1f1f1; color: black; align-self: flex-start; border-bottom-left-radius: 2px; }
                    .msg.system { background: #ffeeba; color: #856404; align-self: center; font-style: italic; }
                    .msg.tool { background: #d4edda; color: #155724; align-self: flex-start; font-family: monospace; }

                    #chat-widget.dark .msg.assistant { background: #2c2c2c; color: #f5f5f5; }
                    #chat-widget.dark .msg.system { background: #5a3c00; color: #ffd966; }
                    #chat-widget.dark .msg.tool { background: #234d20; color: #a8e6a3; }

                    #chat-input-area {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        display: flex;
                        border-top: 1px solid #ccc;
                        padding: 8px;
                        gap: 8px;
                        background: inherit; /* so it matches the theme background */
                    }
                    #chat-input {
                        flex: 1;
                        border: none;
                        padding: 8px 10px;
                        border-radius: 20px;
                        font-size: 14px;
                        outline: none;
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
                    }
                    #chat-send:hover { background: #0056b3; }
                </style>
                <div id="chat-header">
                    <span>💬 Assistant</span>
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

        _appendMessage(role, content) {
            const div = document.createElement("div");
            div.classList.add("msg", role);
            div.textContent = content;
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
