import axios from 'axios';
import { message } from 'antd';

const request = axios.create({
    // baseURL: 'http://localhost:5000/api',
    timeout: 10000,
});

// 请求拦截器：携带Token
request.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('family_photo_token');
        if (token) {
            config.headers['Authorization'] = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 响应拦截器：处理登录过期，存储成员信息
request.interceptors.response.use(
    (res) => {
        // 登录成功时存储成员信息
        if (res.data.code === 200 && res.config.url === '/api/login') {
            localStorage.setItem('family_photo_member', JSON.stringify(res.data.data.member));
        }
        // 登录过期
        if (res.data.code === 401) {
            message.error(res.data.msg);
            localStorage.removeItem('family_photo_token');
            localStorage.removeItem('family_photo_member');
            window.location.href = '/login';
        }
        return res.data;
    },
    (err) => {
        console.error('请求失败：', err);
        message.error('请求失败，请稍后重试');
        return Promise.reject(err);
    }
);

export default request;