import { emit, on, joinRoom } from "../services/socketService";

interface ChatProps {
  roomId: string;
  userId: number;
  username: string;
}

interface ChatMessage {
  id: number;
  content: string;
  userId: number;
  username: string;
  timestamp: string;
  avatar?: string;
  roomId?: string;
}

export function createChat(props: ChatProps): HTMLElement {
  const { roomId, userId, username } = props;

  const container = document.createElement("div");
  container.className = "flex flex-col h-96";

  const header = document.createElement("div");
  header.className = "text-xl font-bold mb-4";
  header.textContent = "Live Chat";

  const messagesContainer = document.createElement("div");
  messagesContainer.className = "flex-1 overflow-y-auto mb-4 space-y-3 pr-2";
  messagesContainer.style.maxHeight = "300px";

  const typingIndicator = document.createElement("div");
  typingIndicator.className = "text-sm text-gray-400 italic hidden";
  typingIndicator.textContent = "";

  const form = document.createElement("form");
  form.className = "flex";

  const input = document.createElement("input");
  input.className = "input flex-1";
  input.type = "text";
  input.placeholder = "Type your message...";

  const button = document.createElement("button");
  button.className = "btn-primary ml-2";
  button.type = "submit";
  button.textContent = "Send";

  form.appendChild(input);
  form.appendChild(button);

  container.appendChild(header);
  container.appendChild(messagesContainer);
  container.appendChild(typingIndicator);
  container.appendChild(form);

  const typingUsers = new Map<number, ReturnType<typeof setTimeout>>();

  initializeChat();

  function initializeChat() {
    console.log(`Joining chat room: ${roomId.replace("game:", "")}`);
    emit("chat:join_room", { roomId: roomId.replace("game:", "") });

    const unsubscribeMessage = on("chat:message", (message: ChatMessage) => {
      console.log("Received chat message:", message);
      if (message.roomId === roomId.replace("chat:", "") || message.roomId === roomId.replace("game:", "")) {
        addMessage(message);

        if (typingUsers.has(message.userId)) {
          clearTimeout(typingUsers.get(message.userId));
          typingUsers.delete(message.userId);
          updateTypingIndicator();
        }
      }
    });

    const unsubscribeHistory = on("chat:history", (data: { roomId: string; messages: ChatMessage[] }) => {
      if (data.roomId === roomId.replace("chat:", "") || data.roomId === roomId.replace("game:", "")) {
        messagesContainer.innerHTML = "";
        data.messages.forEach((message) => addMessage(message));

        scrollToBottom();
      }
    });

    const unsubscribeTyping = on("chat:typing", (data: { userId: number; isTyping: boolean }) => {
      handleTypingIndicator(data.userId, data.isTyping);
    });

    input.addEventListener("input", () => {
      emit("chat:typing", {
        roomId: roomId.replace("chat:", "").replace("game:", ""),
        isTyping: input.value.length > 0,
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const message = input.value.trim();
      if (message) {
        console.log("Sending chat message to room:", roomId.replace("chat:", "").replace("game:", ""));
        const messageData = {
          roomId: roomId.replace("chat:", "").replace("game:", ""),
          content: message,
        };
        console.log("Message data:", messageData);
        emit("chat:message", messageData);

        input.value = "";

        emit("chat:typing", {
          roomId: roomId.replace("chat:", "").replace("game:", ""),
          isTyping: false,
        });
      }
    });

    (container as any).cleanup = () => {
      unsubscribeMessage();
      unsubscribeHistory();
      unsubscribeTyping();
    };
  }

  function addMessage(message: ChatMessage) {
    const messageElement = document.createElement("div");
    messageElement.className = message.userId === userId ? "flex flex-col items-end" : "flex flex-col items-start";

    const bubble = document.createElement("div");
    bubble.className =
      message.userId === userId
        ? "bg-primary text-white rounded-lg py-2 px-3 max-w-[80%]"
        : "bg-background-dark text-white rounded-lg py-2 px-3 max-w-[80%]";

    const content = document.createElement("div");
    content.textContent = message.content;

    const meta = document.createElement("div");
    meta.className = "text-xs text-gray-400 mt-1";

    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    meta.textContent = message.userId === userId ? `${timeString}` : `${message.username} · ${timeString}`;

    bubble.appendChild(content);
    messageElement.appendChild(bubble);
    messageElement.appendChild(meta);
    messagesContainer.appendChild(messageElement);

    scrollToBottom();
  }

  function handleTypingIndicator(typingUserId: number, isTyping: boolean) {
    if (typingUserId === userId) return;

    if (isTyping) {
      if (typingUsers.has(typingUserId)) {
        clearTimeout(typingUsers.get(typingUserId));
      }

      const timeout = setTimeout(() => {
        typingUsers.delete(typingUserId);
        updateTypingIndicator();
      }, 3000);

      typingUsers.set(typingUserId, timeout);
    } else {
      if (typingUsers.has(typingUserId)) {
        clearTimeout(typingUsers.get(typingUserId));
        typingUsers.delete(typingUserId);
      }
    }

    updateTypingIndicator();
  }

  function updateTypingIndicator() {
    if (typingUsers.size === 0) {
      typingIndicator.classList.add("hidden");
      return;
    }

    typingIndicator.classList.remove("hidden");
    typingIndicator.textContent = "Someone is typing...";
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  return container;
}
