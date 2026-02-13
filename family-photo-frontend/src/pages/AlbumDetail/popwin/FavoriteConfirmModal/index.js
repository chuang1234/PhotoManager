import React, { useState, useEffect } from "react";
import { Button, Modal, Select } from "antd";
import styles from "./FavoriteConfirmModal.module.less"; // 新增样式文件

export default function FavoriteConfirmModal(props) {
  const {
    onConfirm,
    onCancel,
    favoriteCfmVisible,
    setFavoriteCfmVisible,
    folders,
  } = props;
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  // 优化：默认选中「默认收藏夹」，提升用户体验
  useEffect(() => {
    if (folders && folders.length > 0) {
      const defaultFolder = folders.find((f) => f.is_default);
      if (defaultFolder) {
        setSelectedFolderId(defaultFolder.id);
      } else {
        // 无默认收藏夹则选中第一个
        setSelectedFolderId(folders[0]?.id || null);
      }
    }
  }, [folders, favoriteCfmVisible]); // 弹窗打开时初始化选中

  // 确认收藏逻辑（优化：关闭弹窗+反馈）
  const handleConfirm = () => {
    if (!selectedFolderId) return;
    onConfirm(selectedFolderId);
    setFavoriteCfmVisible(false); // 确认后自动关闭弹窗
  };

  // 取消逻辑（重置选中状态）
  const handleCancel = () => {
    onCancel();
    setSelectedFolderId(null); // 重置选中项
    setFavoriteCfmVisible(false);
  };

  return (
    <Modal
      title="选择收藏夹 💖"
      open={favoriteCfmVisible}
      onCancel={handleCancel}
      width={500} // 适度缩小宽度，更精致
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
          className={styles.cancelBtn}
        >
          取消 ❌
        </Button>,
        <Button
          key="confirm"
          type="primary"
          disabled={!selectedFolderId}
          onClick={handleConfirm}
          className={styles.confirmBtn}
        >
          确认收藏 ✨
        </Button>,
      ]}
      className={styles.favoriteModal}
      destroyOnClose // 关闭时销毁组件，避免缓存
    >
      <div className={styles.selectWrapper}>
        <p className={styles.selectTip}>把这张照片收藏到哪个文件夹里呢～📁</p>
        <Select
          placeholder="请选择收藏夹哦～"
          value={selectedFolderId}
          onChange={(v) => setSelectedFolderId(v)}
          className={styles.folderSelect}
          showArrow // 显示下拉箭头，更直观
          allowClear // 支持清空选择
        >
          {folders.map((f) => (
            <Select.Option
              key={f.id}
              value={f.id}
              className={f.is_default ? styles.defaultOption : ""}
            >
              <span>
                {f.is_default ? "❤️ " : "📁 "}
                {f.folder_name}
                {f.is_default === 1 && (
                  <span className={styles.defaultTag}>默认</span>
                )}
              </span>
            </Select.Option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
