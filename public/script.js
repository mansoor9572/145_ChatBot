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

    const message = userInput.value.trim();

    if (!message) {
        return;
    }


    // =========================
    // Tampilkan pesan user
    // =========================

    addMessage(message, "user");


    // Simpan pesan user
    messages.push({
        role: "user",
        content: message
    });


    // Kosongkan input
    userInput.value = "";


    // Disable input sementara
    userInput.disabled = true;

    const button = chatForm.querySelector("button");

    button.disabled = true;
    button.textContent = "Menunggu...";


    // =========================
    // Buat bubble AI kosong
    // =========================

    const botContent = addMessage("Sedang menunggu jawaban...", "bot");

    let botResponse = "";


    try {

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: messages
            })

        });


        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let apiError = errorData.error;
            if (typeof apiError === "string") {
                try {
                    apiError = JSON.parse(apiError);
                } catch {}
            }
            const errorMessage = typeof apiError === "string"
                ? apiError
                : apiError?.message || apiError?.error?.message || apiError?.metadata?.raw || "Terjadi kesalahan saat menghubungi server";

            throw new Error(errorMessage);
        }


        // =========================
        // Baca streaming response
        // =========================

        const reader = response.body.getReader();

        const decoder = new TextDecoder();

        let buffer = "";


        while (true) {

            const { done, value } = await reader.read();


            if (done) {
                break;
            }


            // Decode data
            buffer += decoder.decode(value, {
                stream: true
            });


            // Pisahkan berdasarkan newline
            const lines = buffer.split("\n");


            // Simpan bagian yang belum lengkap
            buffer = lines.pop();


            for (const line of lines) {

                const trimmedLine = line.trim();


                if (!trimmedLine) {
                    continue;
                }


                if (!trimmedLine.startsWith("data:")) {
                    continue;
                }


                const data = trimmedLine
                    .slice(5)
                    .trim();


                if (data === "[DONE]") {
                    continue;
                }


                try {

                    const token = JSON.parse(data);


                    // Tambahkan token
                    botResponse += token;


                    // Update tampilan
                    botContent.textContent = botResponse;


                    // Auto scroll
                    chatBox.scrollTop =
                        chatBox.scrollHeight;


                } catch (error) {

                    console.error(
                        "Gagal membaca token:",
                        error
                    );

                }

            }

        }


        // =========================
        // Simpan response AI
        // =========================

        if (!botResponse.trim()) {
            throw new Error("Gemini selesai tanpa mengirim teks. Coba lagi.");
        }

        messages.push({
            role: "assistant",
            content: botResponse
        });


    } catch (error) {

        console.error(error);

        botContent.textContent =
            "Maaf, terjadi kesalahan: " +
            error.message;

    } finally {

        // Aktifkan kembali input
        userInput.disabled = false;

        button.disabled = false;

        button.textContent = "Kirim";

        userInput.focus();

    }

});
