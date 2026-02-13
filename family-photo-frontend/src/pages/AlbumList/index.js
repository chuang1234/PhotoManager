import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Typography,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  HeartOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.module.less";
import { formatTime } from "../../utils/dateUtil";
import ButtonWrapper from "../../components/ButtonWrapper";

const { Title, Text, Paragraph } = Typography;

const AlbumList = () => {
  const navigate = useNavigate();
  // 状态管理
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  // 改名称弹窗
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [currentAlbumId, setCurrentAlbumId] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  // 封面上传
  const [coverUploadLoading, setCoverUploadLoading] = useState(false);

  // 获取相册列表
  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await request.get("/api/albums");
      if (res.code === 200) {
        setAlbums(res.data);
      } else {
        message.error(res.msg);
      }
    } catch (err) {
      message.error("获取相册列表失败，请重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    fetchAlbums();
  }, []);

  // 进入相册详情
  const enterAlbum = (albumId) => {
    navigate(`/album/${albumId}`);
  };

  // 打开改名称弹窗
  const openRenameModal = (albumId, currentName) => {
    setCurrentAlbumId(albumId);
    setNewAlbumName(currentName);
    setRenameModalVisible(true);
  };

  // 确认修改名称
  const confirmRename = async () => {
    if (!newAlbumName.trim()) {
      message.warning("相册名称不能为空");
      return;
    }
    try {
      const res = await request.post("/api/album/rename", {
        album_id: currentAlbumId,
        new_name: newAlbumName.trim(),
      });
      if (res.code === 200) {
        message.success("修改名称成功啦 ✨");
        setRenameModalVisible(false);
        fetchAlbums(); // 刷新列表
      } else {
        message.error(res.msg);
      }
    } catch (err) {
      message.error("修改名称失败，请重试");
      console.error(err);
    }
  };

  // 删除相册
  const deleteAlbum = async (albumId) => {
    try {
      const res = await request.post("/api/album/delete", {
        album_id: albumId,
      });
      if (res.code === 200) {
        message.success("删除相册成功");
        fetchAlbums(); // 刷新列表
      } else {
        message.error(res.msg);
      }
    } catch (err) {
      message.error("删除相册失败，请重试");
      console.error(err);
    }
  };

  // 封面上传配置
  const coverUploadProps = {
    name: "file",
    action: "/api/album/cover/upload",
    headers: {
      Authorization: localStorage.getItem("family_photo_token") || "",
    },
    data: (file) => ({
      album_id: currentAlbumId,
    }),
    beforeUpload: (file) => {
      const isImage = /\.(png|jpg|jpeg|gif|bmp)$/i.test(file.name);
      if (!isImage) {
        message.error("仅支持上传png/jpg/jpeg/gif/bmp格式的图片！");
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error("封面图片大小不能超过10MB！");
        return false;
      }
      return true;
    },
    onChange: (info) => {
      if (info.file.status === "uploading") {
        setCoverUploadLoading(true);
        return;
      }
      if (info.file.status === "done") {
        const res = info.file.response;
        if (res.code === 200) {
          message.success("更换封面成功 ✨");
          // 更新当前相册的封面
          setAlbums((prev) =>
            prev.map((album) => {
              if (album.id === currentAlbumId) {
                return { ...album, cover_url: res.data.cover_url };
              }
              return album;
            }),
          );
        } else {
          message.error(res.msg);
        }
      } else if (info.file.status === "error") {
        message.error("上传封面失败，请重试");
      }
      setCoverUploadLoading(false);
    },
  };

  const openCoverUpload = (albumId) => {
    setCurrentAlbumId(albumId);
    // 找到 Upload 组件的原生文件选择 input
    const uploadInput = document.querySelector(
      `.${styles.hideUploadBtn} input[type="file"]`,
    );
    if (uploadInput) {
      // 清空原有文件（避免重复上传同一文件不触发 onChange）
      uploadInput.value = "";
      uploadInput.click(); // 触发文件选择弹窗
    } else {
      message.error("上传组件加载失败，请刷新页面");
    }
  };

  return (
    <div className={styles.albumListPage}>
      {/* 页面头部 */}
      <div className={styles.pageHeader}>
        <Title level={2} className={styles.pageTitle}>
          <FolderOpenOutlined /> 我的家庭相册
        </Title>
        <ButtonWrapper>
          <Button
            icon={<HeartOutlined />}
            type="primary"
            onClick={() => navigate("/favorite")}
            className={styles.favoriteBtn}
          >
            我的收藏 💖
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate("/create-album")} // 跳转到创建相册页面（可自行实现）
          >
            创建新相册 📝
          </Button>
        </ButtonWrapper>
      </div>

      {/* 相册列表 */}
      <div className={styles.albumCardList}>
        {loading ? (
          <div className={styles.loadingTip}>正在加载美好的回忆...</div>
        ) : albums.length > 0 ? (
          albums.map((album) => (
            <Card
              key={album.id}
              className={styles.albumCard}
              hoverable
              onClick={() => enterAlbum(album.id)}
              cover={
                <div className={styles.albumCover}>
                  <img
                    alt={album.album_name}
                    src={`http://localhost:5000/uploads/covers/${album.cover_url}?token=${localStorage.getItem("family_photo_token")}`}
                    className={styles.coverImg}
                  />
                  <div className={styles.coverMask}>
                    <Space size="small">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止冒泡到Card
                          openRenameModal(album.id, album.name);
                        }}
                        className={styles.coverActionBtn}
                      >
                        重命名
                      </Button>
                      <Button
                        type="text"
                        icon={<UploadOutlined />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止冒泡到Card
                          openCoverUpload(album.id);
                        }}
                        className={styles.coverActionBtn}
                      >
                        换封面
                      </Button>
                      <Popconfirm
                        title="确定删除该相册吗？删除后相册内所有照片也会被删除！"
                        onConfirm={(e) => {
                          e.stopPropagation();
                          deleteAlbum(album.id);
                        }}
                        okText="确认"
                        cancelText="取消"
                        placement="top"
                        okButtonProps={{
                          style: { backgroundColor: "#e57373" },
                        }}
                        cancelButtonProps={{ style: { borderRadius: "8px" } }}
                        onCancel={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          size="small"
                          className={`${styles.coverActionBtn} ${styles.dangerBtn}`}
                          onClick={(e) => e.stopPropagation()} // 阻止冒泡到Card
                        >
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </div>
              }
              actions={[
                <Button
                  type="primary"
                  icon={<FolderOpenOutlined />}
                  onClick={() => enterAlbum(album.id)}
                  style={{
                    borderRadius: "12px",
                    backgroundColor: "#f8ece0",
                    borderColor: "#e8c8a0",
                    color: "#d49999",
                  }}
                >
                  查看照片 📸
                </Button>,
              ]}
            >
              <Card.Meta
                title={
                  <Text strong className={styles.albumName}>
                    {album.album_name}
                  </Text>
                }
                description={
                  <div className={styles.albumMeta}>
                    <Paragraph className={styles.metaItem}>
                      <Text type="secondary">最后上传时间：</Text>
                      {formatTime(album.last_upload_time)}
                    </Paragraph>
                    <Paragraph className={styles.metaItem}>
                      <Text type="secondary">最后上传人：</Text>
                      {album.last_upload_user_name || "暂无"}
                    </Paragraph>
                    <Paragraph className={styles.metaItem}>
                      <Text type="secondary">创建时间：</Text>
                      {formatTime(album.create_time)}
                    </Paragraph>
                  </div>
                }
              />
            </Card>
          ))
        ) : (
          <div className={styles.emptyTip}>暂无相册，快去创建吧~</div>
        )}
      </div>

      {/* 改名称弹窗 */}
      <Modal
        title="修改相册名称 💖"
        open={renameModalVisible}
        onCancel={() => setRenameModalVisible(false)}
        onOk={confirmRename}
        destroyOnClose
        okButtonProps={{
          style: {
            backgroundColor: "#d49999",
            borderColor: "#d49999",
            borderRadius: "8px",
          },
        }}
        cancelButtonProps={{ style: { borderRadius: "8px" } }}
      >
        <Input
          value={newAlbumName}
          onChange={(e) => setNewAlbumName(e.target.value)}
          placeholder="请输入新的相册名称"
          maxLength={20}
          autoFocus
          style={{ borderRadius: "8px", borderColor: "#f0e6d8" }}
        />
      </Modal>

      {/* 封面上传隐藏按钮 */}
      <Upload {...coverUploadProps} className={styles.hideUploadBtn}>
        <Button>上传封面</Button>
      </Upload>
    </div>
  );
};

export default AlbumList;
