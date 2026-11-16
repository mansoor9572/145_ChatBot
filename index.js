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
    try {
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
                signal: AbortSignal.timeout(45000),
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

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        const processLine = (line) => {
            if (!line.startsWith("data:")) return;

            const data = line.replace(/^data:\s*/, "").trim();
            if (!data || data === "[DONE]") return;

            try {
                const json = JSON.parse(data);
                const content = (json.candidates?.[0]?.content?.parts || [])
                    .map((part) => part.text || "")
                    .join("");

                if (content) {
                    res.write(`data: ${JSON.stringify(content)}\n\n`);
                }
            } catch (error) {
                console.error("Gagal parsing streaming data:", error);
            }
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();

            for (const line of lines) {
                processLine(line.trim());
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) processLine(buffer.trim());

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("Gemini request error:", error);
        const message = error.name === "TimeoutError"
            ? "Gemini tidak merespons dalam 45 detik. Coba lagi."
            : "Terjadi kesalahan saat menghubungi Gemini. Coba lagi.";

        if (!res.headersSent) {
            return res.status(500).json({ error: message });
        }

        res.write(`data: ${JSON.stringify(message)}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
