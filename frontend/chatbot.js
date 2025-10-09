// chatbot.js

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

// Show typing indicator
function showTyping() {
  const typingDiv = document.createElement("div");
  typingDiv.className = "chat-message bot typing";
  typingDiv.innerText = "Chatbot is typing...";
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
  return typingDiv;
}

// Remove typing indicator
function removeTyping(typingDiv) {
  typingDiv.remove();
}

// Display a message in chatbox
function displayMessage(message, sender = "bot") {
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${sender}`;
  msgDiv.innerText = message;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message to chatbot backend
async function sendMessage(message) {
  if (!message.trim()) return;
  
  // Show user's message
  displayMessage(message, "user");

  // Show typing indicator
  const typingDiv = showTyping();

  // Call backend API
  const response = await chatBotQuery(message);

  // Remove typing indicator
  removeTyping(typingDiv);

  // Show chatbot reply
  if (response && response.reply) {
    displayMessage(response.reply, "bot");
  } else {
    displayMessage("Sorry, I couldn't understand that. 🤔", "bot");
  }
}

// Event listener for chat form
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = chatInput.value;
  sendMessage(message);
  chatInput.value = "";
});
