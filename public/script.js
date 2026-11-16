const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const messages = [];

function addMessage(text, sender) {
    const message = document.createElement("div");
    message.classList.add("message", sender);

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.textContent = text;

    message.appendChild(content);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    return content;
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, "user");
    messages.push({ role: "user", content: text });
    userInput.value = "";
    userInput.disabled = true;

    const button = chatForm.querySelector("button");
    button.disabled = true;
    button.textContent = "Menunggu...";

    const botContent = addMessage("Sedang menunggu jawaban...", "bot");
    let botResponse = "";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const apiError = errorData.error;
            const message = typeof apiError === "string"
                ? apiError
                : apiError?.message || "Terjadi kesalahan saat menghubungi server";
            throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith("data:")) continue;

                const data = trimmedLine.slice(5).trim();
                if (!data || data === "[DONE]") continue;

                try {
                    const token = JSON.parse(data);
                    if (typeof token !== "string") continue;

                    botResponse += token;
                    botContent.textContent = botResponse;
                    chatBox.scrollTop = chatBox.scrollHeight;
                } catch (error) {
                    console.error("Gagal membaca token:", error);
                }
            }
        }

        if (botResponse) {
            messages.push({ role: "assistant", content: botResponse });
        }
    } catch (error) {
        console.error(error);
        botContent.textContent = `Maaf, terjadi kesalahan: ${error.message}`;
    } finally {
        userInput.disabled = false;
        button.disabled = false;
        button.textContent = "Kirim";
        userInput.focus();
    }
});
