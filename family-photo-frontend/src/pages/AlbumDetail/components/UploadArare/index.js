import React, { useState } from "react";
import styles from "../../index.module.less";
import { DownOutlined, UploadOutlined, UpOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, Input, message, Select, Upload } from "antd";
import moment from "moment/moment";

export default function UploadArare(props) {
  const { albumId, reload, members } = props;
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // 表单状态
  const [form] = Form.useForm();

  // 上传配置（原有逻辑不变）
  const uploadProps = {
    name: "photo",
    action: "/api/photos/upload",
    withCredentials: true,
    multiple: true,
    headers: {
      Authorization: localStorage.getItem("family_photo_token") || "",
    },
    showUploadList: false,
    data: (file) => {
      const values = form.getFieldsValue();
      const userShootTime = values.shootTime
        ? moment(values.shootTime).format("YYYY-MM-DD HH:mm:ss")
        : null;
      const defaultShootTime =
        userShootTime ||
        (file?.lastModified
          ? moment(file.lastModified).format("YYYY-MM-DD HH:mm:ss")
          : "");
      return {
        album_id: albumId,
        photo_name: values.photoName || file.name,
        shoot_time: defaultShootTime,
        member_id: values.memberId || "",
        remarks: values.remarks || "",
      };
    },
    beforeUpload: (file) => {
      const isImage = /\.(png|jpg|jpeg|gif|bmp)$/i.test(file.name);
      if (!isImage) {
        message.error("仅支持上传png/jpg/jpeg/gif/bmp格式的照片！");
        return false;
      }
      const isLt16M = file.size / 1024 / 1024 < 16;
      if (!isLt16M) {
        message.error("照片大小不能超过16MB！");
        return false;
      }
      return true;
    },
    onChange: (info) => {
      if (info.file.status === "done") {
        if (info.file.response?.code !== 200) {
          message.error(info.file.response?.msg);
          return;
        }
        message.success(`${info.file.name} 上传成功`);
        reload();
      } else if (info.file.status === "error") {
        message.error(
          `${info.file.name} 上传失败：${info.file.error?.msg || "未知错误"}`,
        );
      }
    },
  };

  return (
    <div className={styles.uploadArea}>
      {!showUpload && (
        <div
          className={styles.uploadSimpleTitle}
          onClick={() => setShowUpload(true)}
        >
          <span>上传照片</span>
          <DownOutlined />
        </div>
      )}
      {showUpload && (
        <>
          <div
            className={styles.uploadTitle}
            onClick={() => setShowUpload(false)}
          >
            <span>上传照片</span>
            <UpOutlined />
          </div>
          <Form form={form} layout="vertical">
            <Form.Item label="照片名称" name="photoName">
              <Input placeholder="可选，默认使用文件名" />
            </Form.Item>
            <Form.Item label="拍摄时间" name="shootTime">
              <DatePicker
                placeholder="可选，默认使用文件修改时间"
                format="YYYY-MM-DD"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              label="归属成员"
              name="memberId"
              rules={[{ required: true, message: "请选择归属人！" }]}
            >
              <Select
                placeholder="必选（该照片属于哪位成员）"
                onChange={(e) => setSelectedMember(e)}
                style={{ width: "100%" }}
              >
                {members.map((m) => (
                  <Select.Option key={m.id} value={m.id}>
                    {m.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="备注" name="remarks">
              <Input.TextArea placeholder="可选，比如照片场景描述" rows={4} />
            </Form.Item>
            <Form.Item>
              <Upload {...uploadProps}>
                <Button
                  icon={<UploadOutlined />}
                  type="primary"
                  disabled={selectedMember === null}
                  className={styles.uploadBtn}
                >
                  选择照片上传
                </Button>
              </Upload>
            </Form.Item>
          </Form>
        </>
      )}
    </div>
  );
}
