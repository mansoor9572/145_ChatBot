const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/index.html");
});

app.post("/api/chat", async (req, res) => {
    const messages = req.body?.messages;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            error: "Messages harus berupa array yang tidak kosong"
        });
    }

    if (!apiKey) {
        return res.status(500).json({
            error: "Gemini API key tidak ditemukan. Tambahkan GEMINI_API_KEY ke file .env."
        });
    }

    const contents = messages
        .filter((message) =>
            message &&
            ["user", "assistant", "model"].includes(message.role) &&
            typeof message.content === "string"
        )
        .map((message) => ({
            role: message.role === "assistant" ? "model" : message.role,
            parts: [{ text: message.content }]
        }));

    if (contents.length === 0) {
        return res.status(400).json({
            error: "Tidak ada pesan yang bisa dikirim ke Gemini"
        });
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                }
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
            error: errorData.error?.message || "Terjadi kesalahan saat menghubungi Gemini"
        });
    }

    return res.status(501).json({ error: "Streaming belum diaktifkan" });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
