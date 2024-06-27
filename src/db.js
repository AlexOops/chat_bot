import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, 'bot.db');

// Создание и инициализация базы данных
const initializeDb = async () => {
    await fs.access(dbPath).catch(async () => {
        const db = await open({ filename: dbPath, driver: sqlite3.Database });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                request TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(userId) REFERENCES users(id)
            );
        `);

        await db.close();
    });
};

initializeDb();

// Функция для логирования пользователя
export const logUser = async (id, username) => {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.run('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)', [id, username]);
    await db.close();
};

// Функция для логирования запроса
export const logRequest = async (userId, request) => {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.run('INSERT INTO requests (userId, request) VALUES (?, ?)', [userId, request]);
    await db.close();
};

// Функция для получения логов
export const getLogs = async () => {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });

    // Получаем статистику запросов
    const stats = await db.all(`
        SELECT u.username, COUNT(r.id) as request_count
        FROM requests r
        JOIN users u ON r.userId = u.id
        GROUP BY u.username
        ORDER BY request_count DESC
    `);

    const statsText = stats.map(stat => `${stat.username} - ${stat.request_count} запросов`).join('\n');

    // Получаем все логи
    const logs = await db.all(`
        SELECT u.username, r.request, r.timestamp 
        FROM requests r
        JOIN users u ON r.userId = u.id
        ORDER BY r.timestamp DESC
    `);

    const logsText = logs.map(log => `${log.timestamp} - ${log.username}: ${log.request}`).join('\n');

    await db.close();

    // Объединяем статистику и логи
    return `${statsText}\n\nЛоги запросов:\n${logsText}`;
};