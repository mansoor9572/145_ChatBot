# 145 ChatBot

A small browser chatbot that streams replies from OpenRouter through an Express server. The API key stays on the server and is never sent to the browser.

## Requirements

- Node.js 18 or newer
- An OpenRouter API key

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add your OpenRouter API key.
3. Start the server with `npm start`.
4. Open [http://localhost:3000](http://localhost:3000).

Set `OPENROUTER_MODEL` to change the model (defaults to `openrouter/free`) and `PORT` to change the local server port.

## Security

Keep `.env` private. Do not commit API keys or share them in browser code.
screens
<img width="662" height="892" alt="image" src="https://github.com/user-attachments/assets/f45cb93f-7f54-4863-a2b8-9235b0906e53" />

<img width="851" height="903" alt="image" src="https://github.com/user-attachments/assets/6cd53c33-5e20-4ebe-9843-481ec10bdb20" />

