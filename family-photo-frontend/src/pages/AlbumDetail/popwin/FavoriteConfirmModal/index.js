import React, { useState } from "react";
import { Button, Modal, Select } from "antd";

export default function FavoriteConfirmModal(props) {
  const {
    onConfirm,
    onCancel,
    favoriteCfmVisible,
    setFavoriteCfmVisible,
    folders,
  } = props;
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  return (
    <Modal
      title="收藏夹"
      open={favoriteCfmVisible}
      onCancel={() => setFavoriteCfmVisible(false)}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          disabled={!selectedFolderId}
          onClick={() => {
            onConfirm(selectedFolderId);
          }}
        >
          确定
        </Button>,
      ]}
    >
      <Select
        placeholder="请选择收藏夹"
        value={selectedFolderId}
        onChange={(v) => setSelectedFolderId(v)}
        style={{ width: "100%" }}
      >
        {folders.map((f) => (
          <Select.Option key={f.id} value={f.id}>
            {f.folder_name}
          </Select.Option>
        ))}
      </Select>
    </Modal>
  );
}
