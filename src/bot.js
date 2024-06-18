import {Telegraf, session} from 'telegraf';
import {message} from 'telegraf/filters';
import {code} from 'telegraf/format';
import {ogg} from './oggConvertor.js';
import {openaiService} from './openai.js';
import {removeFile} from './utils.js';
import dotenv from 'dotenv';

dotenv.config();

export const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use(session());

bot.telegram.setMyCommands([
    { command: '/start', description: 'Начать заново' },
    { command: '/new', description: 'Новое сообщение' },
]);

bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION;
    await ctx.reply('Привет! Я бот ChatGPT. Задай мне любой вопрос.');
});

bot.command('new', async (ctx) => {
    ctx.session = INITIAL_SESSION;
    await ctx.reply('Жду вашего текстовало или голосового сообщения!');
});

bot.on(message('voice'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION;

    try {
        await ctx.reply(code('Сообщение принял. Ожидайте ответа...'));

        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = String(ctx.message.from.id);

        const oggPath = await ogg.create(link.href, userId);
        const mp3Path = await ogg.toMp3(oggPath, userId);

        await removeFile(oggPath);

        const text = await openaiService.transcription(mp3Path);

        await ctx.reply(code(`Ваш запрос: ${text}`));

        ctx.session.messages.push({role: openaiService.roles.USER, content: text});

        const response = await openaiService.chat(ctx.session.messages);

        ctx.session.messages.push({role: openaiService.roles.ASSISTANT, content: response});

        await ctx.reply(response);

    } catch (e) {
        console.error(`Error while processing voice message`, e.message);
        await ctx.reply('Произошла ошибка при обработке голосового сообщения.');
    }
});

bot.on(message('text'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION;

    try {
        await ctx.reply(code('Сообщение принял. Ожидайте ответа...'));

        ctx.session.messages.push({role: openaiService.roles.USER, content: ctx.message.text});

        const response = await openaiService.chat(ctx.session.messages);

        ctx.session.messages.push({role: openaiService.roles.ASSISTANT, content: response});

        await ctx.reply(response);

    } catch (e) {
        console.log(`Error while text message`, e.message);
    }
});

bot.launch();

console.log('Bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
