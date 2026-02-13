import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Form,
  Input,
  Card,
  Typography,
  message,
  Upload,
  Image,
  Space,
} from "antd";
import { LeftOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.module.less";

const { Title, Text } = Typography;

const CreateAlbum = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [coverFile, setCoverFile] = useState(null);
  const [coverUrl, setCoverUrl] = useState("");

  // 封面上传前校验
  const beforeUpload = (file) => {
    const isImage = /\.(png|jpg|jpeg|gif|bmp)$/i.test(file.name);
    if (!isImage) {
      message.error("仅支持上传png/jpg/jpeg/gif/bmp格式的封面！");
      return false;
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error("封面图片大小不能超过10MB！");
      return false;
    }
    setCoverFile(file);
    setCoverUrl(URL.createObjectURL(file));
    return false;
  };

  // 移除封面
  const removeCover = () => {
    setCoverFile(null);
    setCoverUrl("");
    if (coverUrl) URL.revokeObjectURL(coverUrl);
  };

  // 提交创建相册
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = new FormData();
      formData.append("name", values.albumName);
      if (coverFile) {
        formData.append("cover", coverFile);
      }

      const res = await request.post("/api/album/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: localStorage.getItem("family_photo_token") || "",
        },
      });

      if (res.code === 200) {
        message.success("相册创建成功！");
        navigate("/albums");
      } else {
        message.error(res.msg);
      }
    } catch (err) {
      if (err.errorFields) {
        message.warning("请填写必填的相册名称");
      } else {
        message.error("创建失败，请重试");
        console.error("创建相册错误：", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.createAlbumPage}>
      {/* 顶部返回栏 */}
      <div className={styles.header}>
        <Button
          icon={<LeftOutlined />}
          onClick={() => navigate("/albums")}
          className={styles.backBtn}
          size="middle"
        >
          返回相册列表
        </Button>
      </div>

      {/* 创建表单卡片 */}
      <Card className={styles.createCard} bordered={false}>
        <Title level={3} className={styles.cardTitle}>
          创建新相册
        </Title>

        <Form
          form={form}
          layout="vertical"
          className={styles.albumForm}
          initialValues={{ albumName: "" }}
        >
          {/* 相册名称 */}
          <Form.Item
            label="相册名称"
            name="albumName"
            rules={[
              { required: true, message: "请输入相册名称" },
              { max: 20, message: "相册名称不能超过20个字符" },
            ]}
            className={styles.formItem}
          >
            <Input
              placeholder="请输入相册名称（如：2025旅行记录）"
              size="large"
              className={styles.nameInput}
              autoComplete="off"
            />
          </Form.Item>

          {/* 封面上传 */}
          <Form.Item
            label="相册封面（可选）"
            className={`${styles.formItem} ${styles.coverUploadItem}`}
          >
            <div className={styles.coverUploadWrapper}>
              {/* 封面上传按钮 */}
              <Upload
                name="cover"
                beforeUpload={beforeUpload}
                showUploadList={false}
                className={styles.coverUploadBtn}
              >
                <Button icon={<UploadOutlined />} size="middle" type="default">
                  选择封面图片
                </Button>
              </Upload>

              {/* 封面预览 */}
              {coverUrl && (
                <div className={styles.coverPreview}>
                  <Image
                    width={160}
                    height={100}
                    src={coverUrl}
                    alt="封面预览"
                    fallback="https://via.placeholder.com/160x100?text=封面预览"
                    preview={false}
                    className={styles.previewImage}
                  />
                  <Button
                    size="small"
                    onClick={removeCover}
                    className={styles.removeCoverBtn}
                    type="text"
                  >
                    移除
                  </Button>
                </div>
              )}

              {/* 提示文字 */}
              <Text className={styles.coverTip}>
                支持png/jpg/jpeg/gif/bmp格式，大小不超过10MB，不上传则使用默认封面
              </Text>
            </div>
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item className={styles.submitFormItem}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={loading}
              block
              size="large"
              className={styles.submitBtn}
            >
              确认创建
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateAlbum;
