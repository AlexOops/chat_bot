import { Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import { ogg } from './oggConvertor.js';
import { openaiService } from './openai.js';
import { removeFile } from './utils.js';
import dotenv from 'dotenv';
import { logUser, logRequest } from './db.js';
import { handleLogsCommand, handleAddAdminCommand, isAdmin } from './admin.js';
import { setCommands } from './commands.js';

dotenv.config();

export const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.use(session());

bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION;
    logUser(ctx.message.from.id, ctx.message.from.username);
    await ctx.reply('Привет! Я бот ChatGPT. Задай мне любой вопрос.');
    await setCommands(bot, ctx.message.from.id);  // Устанавливаем команды
});

bot.command('new', async (ctx) => {
    ctx.session = INITIAL_SESSION;
    await ctx.reply('Жду вашего текстовало или голосового сообщения!');
    await setCommands(bot, ctx.message.from.id);  // Устанавливаем команды
});

bot.command('id', async (ctx) => {
    const userId = ctx.message.from.id;
    await ctx.reply(`Ваш Telegram ID: ${userId}`);
});

// Команда для добавления нового администратора
bot.command('addadmin', handleAddAdminCommand);

bot.command('logs', async (ctx) => {
    try {
        if (isAdmin(ctx.message.from.id)) {
            await handleLogsCommand(ctx);
        } else {
            await ctx.reply('У вас нет доступа к этой команде.');
        }
    } catch (e) {
        console.error(`Error while processing logs command`, e.message);
        await ctx.reply('Произошла ошибка при обработке команды /logs.');
    }
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

        ctx.session.messages.push({ role: openaiService.roles.USER, content: text });

        logRequest(ctx.message.from.id, text);  // Логирование запроса

        const response = await openaiService.chat(ctx.session.messages);

        ctx.session.messages.push({ role: openaiService.roles.ASSISTANT, content: response });

        await ctx.reply(response);

    } catch (e) {
        console.error(`Error while processing voice message`, e.message);
        await ctx.reply('Произошла ошибка при обработке голосового сообщения.');
    }
});

bot.on(message('text'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION;

    try {
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'));

        const userId = String(ctx.message.from.id);
        const userQuery = ctx.message.text;

        ctx.session.messages.push({ role: openaiService.roles.USER, content: userQuery });

        logRequest(userId, userQuery);  // Логирование запроса

        const response = await openaiService.chat(ctx.session.messages);

        ctx.session.messages.push({ role: openaiService.roles.ASSISTANT, content: response });

        await ctx.reply(response);

    } catch (e) {
        console.log(`Error while text message`, e.message);
    }
});

bot.launch();

console.log('Bot is running...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));