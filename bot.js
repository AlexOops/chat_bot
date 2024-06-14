import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEYS;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!apiKey) {
    console.error('OPENAI_API_KEYS is not set.');
    process.exit(1);
}

if (!telegramBotToken) {
    console.error('TELEGRAM_BOT_TOKEN is not set.');
    process.exit(1);
}

const bot = new Telegraf(telegramBotToken);

bot.start((ctx) => ctx.reply('Привет! Я бот ChatGPT. Задай мне любой вопрос.'));

bot.on('text', async (ctx) => {
    const userMessage = ctx.message.text;

    // Отправляем статус "печатает..."
    await ctx.sendChatAction('typing');

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 150
            })
        });

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            const botReply = data.choices[0].message.content.trim();
            ctx.reply(botReply);
        } else {
            console.error('Unexpected response format:', data);
            ctx.reply('Произошла ошибка при обработке вашего запроса.');
        }
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        ctx.reply('Произошла ошибка при обработке вашего запроса.');
    }
});

bot.launch();

console.log('Bot is running...');