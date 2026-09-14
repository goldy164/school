let username = localStorage.getItem("chat_username") || "";
let oldestMessageId = null;
let lastMaxId = 0;
const chatBox = document.getElementById("chat-box");
const loadMoreBtn = document.getElementById("load-more-btn");
const scrollDownBtn = document.getElementById("scroll-down-btn");

// لو المستخدم دخل صفحة الشات مباشرة من غير تسجيل دخول، يرجعه لصفحة اللوجن
if (!username) {
    window.location.href = "index.html";
} else {
    // بدء تحميل الشات تلقائياً وتحديث الرسائل
    loadInitialMessages();
    setInterval(pollNewMessages, 2000);
}

async function loadInitialMessages() {
    try {
        const res = await fetch('https://VigitoSon.pythonanywhere.com/api/chat/messages?limit=20');
        const messages = await res.json();
        
        if (chatBox) {
            // تفريغ الشاشة مع الحفاظ على زر التحميل القديم أو إضافته بأمان
            chatBox.innerHTML = '';
            if (loadMoreBtn) {
                chatBox.appendChild(loadMoreBtn);
            }

            if (Array.isArray(messages) && messages.length > 0) {
                oldestMessageId = messages[0].id;
                lastMaxId = messages[messages.length - 1].id;
                
                messages.forEach(msg => appendMessage(msg));
                scrollToBottom();
            }
            
            if (loadMoreBtn) {
                loadMoreBtn.style.display = (Array.isArray(messages) && messages.length >= 20) ? "block" : "none";
            }
        }
    } catch (err) {
        console.log("خطأ في التحميل:", err);
    }
}

async function loadOlderMessages() {
    if (!oldestMessageId) return;
    try {
        const res = await fetch(`https://VigitoSon.pythonanywhere.com/api/chat/messages?limit=20&before_id=${oldestMessageId}`);
        const olderMessages = await res.json();

        if (olderMessages.length > 0) {
            oldestMessageId = olderMessages[0].id;
            const prevHeight = chatBox.scrollHeight;

            olderMessages.reverse().forEach(msg => {
                const row = createMessageElement(msg);
                loadMoreBtn.after(row);
            });

            chatBox.scrollTop = chatBox.scrollHeight - prevHeight;
            if (olderMessages.length < 20) loadMoreBtn.style.display = "none";
        } else {
            loadMoreBtn.style.display = "none";
        }
    } catch (err) {
        console.log("خطأ في الرسائل القديمة:", err);
    }
}

async function pollNewMessages() {
    if (!username) return;
    try {
        const res = await fetch(`https://VigitoSon.pythonanywhere.com/api/chat/messages?limit=10`);
        const messages = await res.json();
        if (messages.length > 0) {
            const latest = messages[messages.length - 1];
            if (latest.id > lastMaxId) {
                messages.forEach(msg => {
                    if (msg.id > lastMaxId) {
                        appendMessage(msg);
                        lastMaxId = msg.id;
                    }
                });
                if (chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 150) {
                    scrollToBottom();
                }
            }
        }
    } catch (err) {
        console.log("خطأ في التحديث:", err);
    }
}

async function sendMessage() {
    const inputField = document.getElementById("message-input");
    const message = inputField.value.trim();
    if (!message) return;

    try {
        await fetch('https://VigitoSon.pythonanywhere.com/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, message: message })
        });
        inputField.value = "";
        pollNewMessages();
        setTimeout(scrollToBottom, 200);
    } catch (err) {
        alert("فشل إرسال الرسالة!");
    }
}

// دالة حذف الرسالة لكل المستخدمين مع أنيميشن التلاشي
async function deleteMessage(msgId, rowElement) {
    try {
        const response = await fetch('https://VigitoSon.pythonanywhere.com/api/chat/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: msgId, username: username })
        });

        if (response.ok) {
            // أنيميشن لطيف للاختفاء (تصغير وتلاشي)
            rowElement.style.transition = "all 0.3s ease";
            rowElement.style.transform = "scale(0.8)";
            rowElement.style.opacity = "0";
            setTimeout(() => {
                rowElement.remove();
            }, 300);
        } else {
            alert("فشل مسح الرسالة!");
        }
    } catch (err) {
        alert("خطأ في الاتصال للسيرفر!");
    }
}

function createMessageElement(msg) {
    const isMine = (msg.username === username);
    const row = document.createElement("div");
    row.className = "message-row" + (isMine ? " mine" : "");

    // تحديد شكل الفقاعة حسب اسم المستخدم
    let bubbleStyle = "default-style";
    const nameTrimmed = msg.username ? msg.username.trim() : "";
    
    if (nameTrimmed === "احمد" || nameTrimmed === "أحمد") {
        bubbleStyle = "ahmed-style";
    } else if (nameTrimmed === "محمد") {
        bubbleStyle = "mohamed-style";
    }

    // إضافة زر الحذف لرسائلك أنت فقط
    let deleteBtnHtml = "";
    if (isMine) {
        deleteBtnHtml = `<button class="delete-msg-btn" title="حذف الرسالة" onclick="deleteMessage(${msg.id}, this.closest('.message-row'))">🗑️</button>`;
    }

    // بناء شكل الرسالة مع زر الحذف بجانبها
    row.innerHTML = `
        <div class="message-content">
            <div class="message-username">${msg.username}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
                ${deleteBtnHtml}
                <div class="message-bubble ${bubbleStyle}">${msg.message}</div>
            </div>
        </div>
    `;
    return row;
}

function appendMessage(msg) {
    const row = createMessageElement(msg);
    chatBox.appendChild(row);
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
    scrollDownBtn.style.display = "none";
}

chatBox.addEventListener("scroll", () => {
    if (chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight > 300) {
        scrollDownBtn.style.display = "flex";
    } else {
        scrollDownBtn.style.display = "none";
    }
});

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}
