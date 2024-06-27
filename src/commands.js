import { isAdmin } from './admin.js';

export const setCommands = async (bot, userId) => {
    if (isAdmin(userId)) {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Начать заново' },
            { command: 'new', description: 'Новое сообщение' },
            { command: 'logs', description: 'Посмотреть логи' }
        ]);
    } else {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Начать заново' },
            { command: 'new', description: 'Новое сообщение' }
        ]);
    }
};
