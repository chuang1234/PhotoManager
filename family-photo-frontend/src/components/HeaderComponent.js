import { Button, Layout, message } from "antd";
import { useNavigate } from "react-router-dom";
import request from "../utils/request";
import styles from "./HeaderComponent.module.less"; // 引入模块化样式

const { Header, Content } = Layout;

// 头部组件（显示当前登录成员）
const HeaderComponent = () => {
  const navigate = useNavigate();
  // 从本地存储获取成员信息
  const memberStr = localStorage.getItem("family_photo_member");
  const currentMember = memberStr ? JSON.parse(memberStr) : null;

  const handleLogout = async () => {
    try {
      await request.post("/api/logout");
      localStorage.removeItem("family_photo_token");
      localStorage.removeItem("family_photo_member");
      message.success("退出成功啦～👋"); // 温馨提示
      navigate("/login");
    } catch (err) {
      message.error("退出失败啦，再试试～"); // 温馨提示
    }
  };

  return (
    <Header className={styles.headerContainer}>
      {/* 系统名称 - 温馨可爱风格 */}
      <h2 className={styles.systemTitle}>家庭相册 温馨小屋 💖</h2>

      {currentMember && (
        <div className={styles.memberInfoWrapper}>
          {/* 登录成员信息 */}
          <div className={styles.memberInfo}>
            <span className={styles.memberName}>
              👨‍👩‍👧 当前登录：{currentMember.name}
            </span>
            {currentMember.email && (
              <span className={styles.memberEmail}>
                ({currentMember.email})
              </span>
            )}
          </div>
          {/* 退出登录按钮 */}
          <Button className={styles.logoutBtn} onClick={handleLogout}>
            退出登录 👋
          </Button>
        </div>
      )}
    </Header>
  );
};

export default HeaderComponent;
