import { createClient } from 'redis'; 
import { envVars } from '.';

export const bullmqConnectionOptions = {
    username: envVars.REDIS_USERNAME,
    password: envVars.REDIS_PASS,
    host: envVars.REDIS_HOST,
    port: Number(envVars.REDIS_PORT),
};

export const redisClient = createClient({
    username: envVars.REDIS_USERNAME,
    password: envVars.REDIS_PASS,
    socket: { 
        host: envVars.REDIS_HOST,
        port: Number(envVars.REDIS_PORT)
    }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

export const redisConnection = async()=>{
    if(!redisClient.isOpen){
        await redisClient.connect();
    }
}