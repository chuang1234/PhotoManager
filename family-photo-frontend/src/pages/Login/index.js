import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import styles from './index.module.less';

const Login = () => {
    const [loading, setLoading] = useState(false);

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const res = await request.post('/api/login', {
                username: values.username,
                password: values.password
            });
            if (res.code === 200) {
                // 存储Token和成员信息
                localStorage.setItem('family_photo_token', res.data.token);
                localStorage.setItem('family_photo_member', JSON.stringify(res.data.member));
                message.success(`欢迎回来，${res.data.member.name}！`);
                window.location.href = '/';
            } else {
                message.error(res.msg);
            }
        } catch (err) {
            message.error('登录失败，请检查网络或账号密码');
            console.error('登录错误：', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginContainer}>
            <Card title="家庭相册登录" style={{ width: 350 }}>
                <Form
                    name="login_form"
                    initialValues={{ remember: true }}
                    onFinish={handleLogin}
                    autoComplete="off"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名！' }]}
                    >
                        <Input
                            prefix={<UserOutlined className="site-form-item-icon" />}
                            placeholder="请输入成员用户名（如father/mother）"
                        />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码！' }]}
                    >
                        <Input
                            prefix={<LockOutlined className="site-form-item-icon" />}
                            type="password"
                            placeholder="请输入成员密码（如father123）"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            style={{ width: '100%' }}
                        >
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;