import {Button, Layout, message} from "antd";
import {useNavigate} from 'react-router-dom';
import request from "../utils/request";

const { Header, Content } = Layout;

// 头部组件（显示当前登录成员）
const HeaderComponent = () => {
    const navigate = useNavigate();
    // 从本地存储获取成员信息
    const memberStr = localStorage.getItem('family_photo_member');
    const currentMember = memberStr ? JSON.parse(memberStr) : null;

    const handleLogout = async () => {
        try {
            await request.post('/api/logout');
            localStorage.removeItem('family_photo_token');
            localStorage.removeItem('family_photo_member');
            message.success('退出成功');
            navigate('/login');
        } catch (err) {
            message.error('退出失败');
        }
    };

    return (
        <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
            <h2 style={{ margin: 0, color: '#1890ff' }}>家庭相册管理系统</h2>
            {currentMember && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                        <span>当前登录：{currentMember.name}</span>
                        {currentMember.email && <span style={{ marginLeft: 8 }}>({currentMember.email})</span>}
                    </div>
                    <Button type="primary" danger onClick={handleLogout}>
                        退出登录
                    </Button>
                </div>
            )}
        </Header>
    );
};

export default HeaderComponent;