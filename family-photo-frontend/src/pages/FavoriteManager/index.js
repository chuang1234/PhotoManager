import { useEffect, useState, useCallback } from "react";
import {
  Button,
  Card,
  List,
  Image,
  Modal,
  Input,
  message,
  Popconfirm,
  Pagination,
  Dropdown,
  Spin,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HeartFilled,
  EllipsisOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import request from "../../utils/request";
import styles from "./index.module.less";

const FavoriteManager = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromAlbumId = searchParams.get("fromAlbumId"); // 获取来源相册ID

  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]); // 收藏夹列表
  const [activeFolderId, setActiveFolderId] = useState(null); // 当前选中的收藏夹ID
  const [photos, setPhotos] = useState([]); // 当前收藏夹的照片列表
  const [total, setTotal] = useState(0); // 照片总条数
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);

  // 弹窗状态
  const [createFolderModal, setCreateFolderModal] = useState(false);
  const [editFolderModal, setEditFolderModal] = useState(false);
  const [folderName, setFolderName] = useState(""); // 收藏夹名称
  const [editFolderId, setEditFolderId] = useState(null); // 待修改的收藏夹ID

  // 当前登录用户ID（实际从登录态获取）
  const memberId = localStorage.getItem("family_member_id") || 1;

  // 1. 获取收藏夹列表
  const fetchFolders = useCallback(async () => {
    try {
      const res = await request.get("/api/favorite/folders", {
        params: { member_id: memberId },
      });
      if (res.code === 200) {
        setFolders(res.data);
        // 默认选中第一个收藏夹（优先默认收藏夹）
        const defaultFolder = res.data.find((f) => f.is_default);
        if (defaultFolder) {
          setActiveFolderId(defaultFolder.id);
        } else if (res.data.length > 0) {
          setActiveFolderId(res.data[0].id);
        }
      }
    } catch (err) {
      message.error("获取收藏夹失败，请重试");
      console.error(err);
    }
  }, [memberId]);

  // 2. 获取当前收藏夹的照片列表
  const fetchFavoritePhotos = useCallback(async () => {
    if (!activeFolderId) return;
    setLoading(true);
    try {
      const res = await request.get(`/api/favorite/photos/${activeFolderId}`, {
        params: {
          member_id: memberId,
          page: currentPage,
          page_size: pageSize,
        },
      });
      if (res.code === 200) {
        setPhotos(res.data);
        setTotal(res.total);
      }
    } catch (err) {
      message.error("获取收藏照片失败，请重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, currentPage, memberId, pageSize]);

  // 初始化加载
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // 切换收藏夹/页码时加载照片
  useEffect(() => {
    fetchFavoritePhotos();
  }, [activeFolderId, currentPage, fetchFavoritePhotos]);

  // 3. 创建收藏夹
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      message.warning("请输入收藏夹名称");
      return;
    }
    try {
      const res = await request.post("/api/favorite/folders", {
        folder_name: folderName.trim(),
        member_id: memberId,
      });
      if (res.code === 200) {
        message.success("收藏夹创建成功");
        setCreateFolderModal(false);
        setFolderName("");
        fetchFolders(); // 刷新收藏夹列表
      }
    } catch (err) {
      message.error("创建收藏夹失败，请重试");
      console.error(err);
    }
  };

  // 4. 修改收藏夹名称
  const handleEditFolder = async () => {
    if (!folderName.trim()) {
      message.warning("请输入收藏夹名称");
      return;
    }
    try {
      const res = await request.put(`/api/favorite/folders/${editFolderId}`, {
        folder_name: folderName.trim(),
      });
      if (res.code === 200) {
        message.success("收藏夹名称修改成功");
        setEditFolderModal(false);
        setFolderName("");
        fetchFolders(); // 刷新收藏夹列表
      }
    } catch (err) {
      message.error("修改收藏夹名称失败，请重试");
      console.error(err);
    }
  };

  // 5. 删除收藏夹
  const handleDeleteFolder = async (folderId) => {
    try {
      const res = await request.delete(`/api/favorite/folders/${folderId}`);
      if (res.code === 200) {
        message.success("收藏夹删除成功");
        fetchFolders(); // 刷新收藏夹列表
        // 若删除的是当前选中的收藏夹，切换到第一个收藏夹
        if (folderId === activeFolderId) {
          const newFolders = folders.filter((f) => f.id !== folderId);
          setActiveFolderId(newFolders.length > 0 ? newFolders[0].id : null);
        }
      }
    } catch (err) {
      message.error("删除收藏夹失败，请重试");
      console.error(err);
    }
  };

  // 6. 照片移出收藏夹
  const handleRemovePhoto = async (photoId) => {
    try {
      const res = await request.delete("/api/favorite/photos", {
        data: { photo_id: photoId, folder_id: activeFolderId },
      });
      if (res.code === 200) {
        message.success("照片已移出收藏夹");
        fetchFavoritePhotos(); // 刷新照片列表
      }
    } catch (err) {
      message.error("移出收藏夹失败，请重试");
      console.error(err);
    }
  };

  // 照片操作菜单
  const getPhotoMenuItems = (photoId) => {
    return [
      {
        key: "remove",
        icon: <DeleteOutlined />,
        danger: true,
        label: (
          <Popconfirm
            title="确定将这张照片移出收藏夹吗？"
            onConfirm={() => handleRemovePhoto(photoId)}
            okText="确认"
            cancelText="取消"
          >
            <span>移出收藏夹</span>
          </Popconfirm>
        ),
      },
    ];
  };

  const handleGoBack = () => {
    if (fromAlbumId) {
      // 有来源相册ID，跳回该相册详情页
      navigate(`/album/${fromAlbumId}`);
    } else {
      // 无来源参数，默认跳回相册列表
      navigate("/");
    }
  };

  return (
    <div className={styles.favoriteManager}>
      {/* 顶部返回+标题 */}
      <div className={styles.topBar}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleGoBack}
          className={styles.backBtn}
        >
          {fromAlbumId ? "返回相册详情" : "返回相册列表"}
        </Button>
        <h2 className={styles.pageTitle}>我的收藏</h2>
      </div>

      <div className={styles.mainContainer}>
        <div className={styles.folderList}>
          <Card title="收藏夹管理" className={styles.folderCard}>
            <Button
              icon={<PlusOutlined />}
              type="dashed"
              block
              onClick={() => setCreateFolderModal(true)}
              className={styles.createFolderBtn}
            >
              创建新收藏夹
            </Button>

            <List
              dataSource={folders}
              renderItem={(folder) => (
                <List.Item
                  className={`${styles.folderItem} ${activeFolderId === folder.id ? styles.active : ""}`}
                  onClick={() => setActiveFolderId(folder.id)}
                >
                  <span className={styles.folderName}>
                    <HeartFilled
                      style={{
                        color: folder.is_default ? "#e74c3c" : "#1677ff",
                        marginRight: 8,
                      }}
                    />
                    {folder.folder_name}
                    {folder.is_default && (
                      <span className={styles.defaultTag}>默认</span>
                    )}
                  </span>

                  {/* 收藏夹操作（非默认收藏夹） */}
                  {!folder.is_default && (
                    <div className={styles.folderActions}>
                      <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止选中收藏夹
                          setEditFolderId(folder.id);
                          setFolderName(folder.folder_name);
                          setEditFolderModal(true);
                        }}
                      />
                      <Popconfirm
                        title="确定删除该收藏夹吗？删除后收藏的照片也会一并移出！"
                        onConfirm={() => handleDeleteFolder(folder.id)}
                        okText="确认"
                        cancelText="取消"
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </div>
                  )}
                </List.Item>
              )}
            />
          </Card>
        </div>

        {/* 右侧收藏照片列表 */}
        <div className={styles.photoListContainer}>
          {!activeFolderId ? (
            <div className={styles.emptyTip}>请选择一个收藏夹</div>
          ) : (
            <>
              <Card
                title={`${folders.find((f) => f.id === activeFolderId)?.folder_name || ""}（共${total}张）`}
                className={styles.photoCard}
              >
                {loading ? (
                  <div className={styles.loading}>
                    <Spin size="large" />
                  </div>
                ) : photos.length > 0 ? (
                  <>
                    <div className={styles.photoGrid}>
                      {photos.map((photo) => (
                        <div className={styles.photoItem} key={photo.id}>
                          {/* 照片操作按钮 */}
                          <div className={styles.photoMoreBtn}>
                            <Dropdown
                              menu={{ items: getPhotoMenuItems(photo.id) }}
                              trigger={["click"]}
                            >
                              <Button
                                shape="circle"
                                icon={<EllipsisOutlined />}
                                size="small"
                                className={styles.moreBtn}
                              />
                            </Dropdown>
                          </div>

                          {/* 照片展示 */}
                          <Image
                            width="100%"
                            height="150px"
                            src={`/uploads/photos/${photo.file_path}?token=${localStorage.getItem("family_photo_token")}`}
                            fallback="https://via.placeholder.com/200x150?text=暂无图片"
                            preview
                            className={styles.photoImg}
                          />

                          {/* 照片信息 */}
                          <div className={styles.photoInfo}>
                            <div
                              className={styles.photoName}
                              title={photo.photo_name}
                            >
                              {photo.photo_name}
                            </div>
                            <div className={styles.photoMeta}>
                              所属相册：{photo.album_name || "未知"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 分页 */}
                    {total > pageSize && (
                      <div className={styles.pagination}>
                        <Pagination
                          current={currentPage}
                          pageSize={pageSize}
                          total={total}
                          onChange={(page) => setCurrentPage(page)}
                          showQuickJumper
                          showTotal={(total) => `共 ${total} 张照片`}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.emptyTip}>该收藏夹暂无照片</div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* 创建收藏夹弹窗 */}
      <Modal
        title="创建收藏夹"
        open={createFolderModal}
        onOk={handleCreateFolder}
        onCancel={() => {
          setCreateFolderModal(false);
          setFolderName("");
        }}
      >
        <Input
          placeholder="请输入收藏夹名称（如：孩子的成长记录）"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          maxLength={50}
        />
      </Modal>

      {/* 修改收藏夹名称弹窗 */}
      <Modal
        title="修改收藏夹名称"
        open={editFolderModal}
        onOk={handleEditFolder}
        onCancel={() => {
          setEditFolderModal(false);
          setFolderName("");
          setEditFolderId(null);
        }}
      >
        <Input
          placeholder="请输入新的收藏夹名称"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          maxLength={50}
        />
      </Modal>
    </div>
  );
};

export default FavoriteManager;
