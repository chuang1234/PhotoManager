import { Navigate } from 'react-router-dom';

/**
 * 私有路由组件：路由守卫
 * 作用：未登录用户访问时，自动跳转到登录页；已登录用户正常访问目标页面
 * @param {Object} props - 组件属性，children 是需要保护的页面组件
 */
const PrivateRoute = ({ children }) => {
    // 核心逻辑：检查本地存储中是否有登录 Token（判断是否已登录）
    const token = localStorage.getItem('family_photo_token');

    // 未登录：跳转到登录页（replace 避免回退到未登录页面）
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 已登录：正常渲染受保护的页面（children）
    return children;
};

export default PrivateRoute;