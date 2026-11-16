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

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            error: "Messages harus berupa array yang tidak kosong"
        });
    }

    return res.status(501).json({
        error: "Gemini chat belum dikonfigurasi"
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
