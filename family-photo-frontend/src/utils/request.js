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
            const member = res.data.data.member;
            localStorage.setItem('family_photo_member', JSON.stringify(member));
            localStorage.setItem('family_member_id', String(member.id));
        }
        // 登录过期（响应体中 code === 401，HTTP 状态仍为 200 的情况）
        if (res.data.code === 401) {
            message.error(res.data.msg || '登录已过期，请重新登录');
            localStorage.removeItem('family_photo_token');
            localStorage.removeItem('family_photo_member');
            localStorage.removeItem('family_member_id');
            window.location.href = '/login';
            return Promise.reject(new Error(res.data.msg));
        }
        return res.data;
    },
    (err) => {
        // 处理 HTTP 状态码为 401 的情况（后端返回 HTTP 401）
        if (err.response && err.response.status === 401) {
            const msg = err.response.data?.msg || '登录已过期，请重新登录';
            message.error(msg);
            localStorage.removeItem('family_photo_token');
            localStorage.removeItem('family_photo_member');
            localStorage.removeItem('family_member_id');
            window.location.href = '/login';
            return Promise.reject(err);
        }
        console.error('请求失败：', err);
        message.error('请求失败，请稍后重试');
        return Promise.reject(err);
    }
);

export default request;