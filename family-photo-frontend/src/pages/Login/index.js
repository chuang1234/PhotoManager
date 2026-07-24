import { useState } from "react";
import { Form, Input, Button, Card, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.module.less";
import CryptoJS from "crypto-js";

const Login = () => {
  const [loading, setLoading] = useState(false);

  const sha256Encrypt = (password) => {
    const utf8Password = CryptoJS.enc.Utf8.parse(password);
    const sha256Hash = CryptoJS.SHA256(utf8Password);
    return sha256Hash.toString(CryptoJS.enc.Hex);
  };

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const hashedPassword = sha256Encrypt(values.password);
      const res = await request.post("/api/login", {
        username: values.username,
        password: hashedPassword,
      });
      if (res.code === 200) {
        localStorage.setItem("family_photo_token", res.data.token);
        localStorage.setItem(
          "family_photo_member",
          JSON.stringify(res.data.member),
        );
        localStorage.setItem("family_member_id", String(res.data.member.id));
        message.success(`欢迎回家，${res.data.member.name}～💖`); // 温馨提示
        window.location.href = "/";
      } else {
        message.error(res.msg);
      }
    } catch (err) {
      message.error("登录失败啦，请检查账号密码或网络～"); // 温馨提示
      console.error("登录错误：", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      {/* 温馨可爱的登录卡片 */}
      <Card
        title="家庭相册 温馨登录 💖"
        className={styles.loginCard}
        bordered={false}
      >
        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={handleLogin}
          autoComplete="off"
          className={styles.loginForm}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名哦～" }]} // 温馨提示
            className={styles.formItem}
          >
            <Input
              prefix={<UserOutlined className={styles.inputIcon} />}
              placeholder="请输入你的专属用户名～（如father/mother）" // 温馨占位符
              className={styles.loginInput}
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码哦～" }]} // 温馨提示
            className={styles.formItem}
          >
            <Input
              prefix={<LockOutlined className={styles.inputIcon} />}
              type="password"
              placeholder="请输入你的专属密码～（如father123）" // 温馨占位符
              className={styles.loginInput}
              size="large"
            />
          </Form.Item>
          <Form.Item className={styles.btnItem}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className={styles.loginBtn}
            >
              登录 🔑
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
