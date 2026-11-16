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
        let eventName = "message";

        const processLine = (line) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("event:")) {
                eventName = trimmedLine.slice(6).trim();
                return;
            }

            if (!trimmedLine.startsWith("data:")) return;

            const data = trimmedLine.slice(5).trim();
            const currentEvent = eventName;
            eventName = "message";
            if (!data || data === "[DONE]") return;

            let token;
            try {
                token = JSON.parse(data);
            } catch (error) {
                console.error("Gagal membaca token:", error);
                return;
            }

            if (currentEvent === "error") {
                throw new Error(typeof token === "string" ? token : "Gemini stream error");
            }

            if (typeof token !== "string") return;
            botResponse += token;
            botContent.textContent = botResponse;
            chatBox.scrollTop = chatBox.scrollHeight;
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) processLine(line);
        }

        buffer += decoder.decode();
        if (buffer.trim()) processLine(buffer);

        if (!botResponse.trim()) {
            throw new Error("Gemini selesai tanpa mengirim teks. Coba lagi.");
        }

        messages.push({ role: "assistant", content: botResponse });
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
