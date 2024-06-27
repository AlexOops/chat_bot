import fs from 'fs';
import path from 'path';
import { getLogs } from './db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handleLogsCommand = async (ctx) => {
    try {
        const logs = await getLogs(); // Получаем логи из базы данных

        // Создаем файл с логами
        const logFilePath = path.join(__dirname, 'logs.txt');
        fs.writeFileSync(logFilePath, logs);

        // Отправляем файл администратору
        await ctx.replyWithDocument({ source: logFilePath });

        // Удаляем файл после отправки
        fs.unlinkSync(logFilePath);
    } catch (error) {
        console.error('Error while handling logs command:', error.message);
        await ctx.reply('Произошла ошибка при обработке команды /logs.');
    }
};

export const isAdmin = (userId) => {
    const admins = [434661614]; // Ваш Telegram ID
    return admins.includes(userId);
};

export const handleAddAdminCommand = (ctx) => {
    if (!isAdmin(ctx.message.from.id)) {
        return ctx.reply('У вас нет прав для выполнения этой команды.');
    }

    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
        return ctx.reply('Пожалуйста, укажите ID пользователя.');
    }

    const newAdminId = parseInt(parts[1]);
    if (isNaN(newAdminId)) {
        return ctx.reply('Пожалуйста, укажите корректный ID пользователя.');
    }

    addAdmin(newAdminId);
    ctx.reply(`Пользователь с ID ${newAdminId} добавлен в список администраторов.`);
};