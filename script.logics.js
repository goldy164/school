let username = "";
let oldestMessageId = null;
let lastMaxId = 0;
const chatBox = document.getElementById("chat-box");
const loadMoreBtn = document.getElementById("load-more-btn");
const scrollDownBtn = document.getElementById("scroll-down-btn");

async function startChat() {
    const inputUser = document.getElementById("username-input").value.trim();
    const inputPass = document.getElementById("password-input").value.trim();

    if (!inputUser || !inputPass) {
        alert("الرجاء إدخال اسم المستخدم وكلمة المرور!");
        return;
    }

    try {
        const response = await fetch('https://VigitoSon.pythonanywhere.com/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: inputUser, password: inputPass })
        });
        
        const data = await response.json();

        if (response.ok) {
            username = inputUser;
            document.getElementById("login-screen").style.display = "none";
            document.getElementById("chat-screen").style.display = "flex";
            loadInitialMessages();
            setInterval(pollNewMessages, 2000);
        } else {
            alert(data.message || "فشل تسجيل الدخول!");
        }
    } catch (err) {
        alert("حدث خطأ في الاتصال بالسيرفر!");
    }
}

async function loadInitialMessages() {
    try {
        const res = await fetch('https://VigitoSon.pythonanywhere.com/api/chat/messages?limit=20');
        const messages = await res.json();
        
        chatBox.innerHTML = '';
        chatBox.appendChild(loadMoreBtn);

        if (messages.length > 0) {
            oldestMessageId = messages[0].id;
            lastMaxId = messages[messages.length - 1].id;
            
            messages.forEach(msg => appendMessage(msg));
            scrollToBottom();
        }
        
        loadMoreBtn.style.display = messages.length >= 20 ? "block" : "none";
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

function createMessageElement(msg) {
    const isMine = (msg.username === username);
    const row = document.createElement("div");
    row.className = "message-row" + (isMine ? " mine" : "");

    // تحديد شكل الفقاعة بناءً على اسم المستخدم لتبدو متميزة
    let bubbleStyle = "default-style";
    if (msg.username.toLowerCase() === "احمد" || msg.username.toLowerCase() === "أحمد") {
        bubbleStyle = "ahmed-style";
    } else if (msg.username.toLowerCase() === "محمد") {
        bubbleStyle = "mohamed-style";
    }

    // أول حرف من اسم المستخدم للأفاتار
    const firstLetter = msg.username ? msg.username.charAt(0).toUpperCase() : "U";

    row.innerHTML = `
        <div class="avatar">${firstLetter}</div>
        <div class="message-content">
            <div class="message-username">${msg.username}</div>
            <div class="message-bubble ${bubbleStyle}">${msg.message}</div>
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
