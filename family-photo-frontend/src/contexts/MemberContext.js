import { createContext, useState, useEffect, useContext } from 'react';
import request from '../utils/request';

// 创建上下文
const MemberContext = createContext();

// 上下文提供者组件
export const MemberProvider = ({ children }) => {
    const [currentMember, setCurrentMember] = useState(null);
    const [loading, setLoading] = useState(true);

    // 初始化：获取当前登录成员信息
    useEffect(() => {
        const fetchCurrentMember = async () => {
            try {
                const res = await request.get('/api/current-member');
                if (res.code === 200) {
                    setCurrentMember(res.data);
                }
            } catch (err) {
                console.error('获取当前成员信息失败：', err);
            } finally {
                setLoading(false);
            }
        };

        // 有Token才获取
        if (localStorage.getItem('family_photo_token')) {
            fetchCurrentMember();
        } else {
            setLoading(false);
        }
    }, []);

    // 退出登录时清空
    const logout = () => {
        setCurrentMember(null);
        localStorage.removeItem('family_photo_token');
        localStorage.removeItem('family_photo_member');
    };

    return (
        <MemberContext.Provider value={{ currentMember, loading, logout }}>
            {children}
        </MemberContext.Provider>
    );
};

// 自定义Hook：获取成员上下文
export const useMember = () => {
    return useContext(MemberContext);
};