import OpenAI from "openai";
import {createReadStream} from 'fs';
import dotenv from 'dotenv';

dotenv.config();

class OpenAIService {

    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM: 'system',
    }

    constructor(apiKey) {
        if (!apiKey) {
            console.error('API key is not set.');
            throw new Error('API key is required.');
        }

        this.openai = new OpenAI({apiKey});
    }

    async chat(messages) {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: messages,
            });
            if (response.choices && response.choices.length > 0) {
                return response.choices[0].message.content;
            } else {
                console.error('Unexpected response format:', response);
                return null;
            }
        } catch (e) {
            console.log('Error while creating chat completion:', e.message);
            return null;
        }
    }

    async transcription(filepath) {
        try {
            const transcription = await this.openai.audio.transcriptions.create({
                file: createReadStream(filepath),
                model: "whisper-1",
                response_format: "text",
            });

            return transcription;

        } catch (e) {
            console.log('Error while transcription:', e.message);
            return null;
        }
    }
}

const apiKey = process.env.OPENAI_KEY;
export const openaiService = new OpenAIService(apiKey);
