import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Dropdown,
  Image,
  message,
  Modal,
  Pagination,
  Popconfirm,
  Spin,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  EllipsisOutlined,
  HeartOutlined,
  LeftOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  StarFilled,
} from "@ant-design/icons";
import request from "../../utils/request";
import moment from "moment";
import styles from "./index.module.less";
import FilterPopwin from "./popwin/FilterPopwin";
import { formatTime } from "../../utils/dateUtil";
import { useMember } from "../../contexts/MemberContext";
import FavoriteConfirmModal from "./popwin/FavoriteConfirmModal";
import UploadArare from "./components/UploadArare";
import PhotoCapture from "./components/PhotoCapture";

const AlbumDetail = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();

  // 分页核心状态（移除滚动相关，保留分页基础）
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [pageSize] = useState(12); // 每页条数（固定12条）
  const [total, setTotal] = useState(0); // 总条数
  const [loading, setLoading] = useState(false); // 当前页加载中

  // 数据状态
  const [photos, setPhotos] = useState([]); // 原始照片列表（当前页）
  const [filteredPhotos, setFilteredPhotos] = useState([]); // 筛选后的列表（当前页）
  const [members, setMembers] = useState([]);
  const [isSearch, setIsSearch] = useState(false); // 是否是搜索状态

  const [deleteLoading, setDeleteLoading] = useState(false);

  // 弹窗状态
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [favoriteCfmVisible, setFavoriteCfmVisible] = useState(false);

  const [searchParams, setSearchParams] = useState({});
  const [folders, setFolders] = useState([]); // 收藏夹列表
  const [favoritePhotoId, setFavoritePhotoId] = useState(null); // 收藏照片ID

  const { currentMember } = useMember();

  // 获取家庭成员
  const fetchMembers = useCallback(() => {
    request.get("/api/members").then((res) => {
      if (res.code === 200) {
        setMembers(res.data);
      }
    });
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await request.get("/api/favorite/folders", {
        params: { member_id: currentMember.member_id },
      });
      if (res.code === 200) {
        setFolders(res.data);
      }
    } catch (err) {
      message.error("获取收藏夹失败，请重试");
      console.error(err);
    }
  };

  // 加载照片（分页版，移除滚动相关逻辑）
  const fetchPhotos = useCallback(
    async (isSearch = false, searchParams = {}) => {
      if (loading) return; // 避免重复加载
      setLoading(true);
      try {
        let url = "";
        let params = {
          page: currentPage,
          page_size: pageSize,
          album_id: albumId,
        };
        // 区分普通加载/搜索加载
        if (isSearch) {
          url = "/api/photos/search";
          // 拼接搜索参数
          params = {
            ...params,
            name_like: searchParams.name || "",
            member_id: searchParams.ownerMember || "",
            operator_id: searchParams.uploaderMember || "",
            start_date: searchParams.dateRange?.[0]
              ? moment(searchParams.dateRange[0]).format("YYYY-MM-DD")
              : "",
            end_date: searchParams.dateRange?.[1]
              ? moment(searchParams.dateRange[1]).format("YYYY-MM-DD")
              : "",
          };
        } else {
          url = `/api/photos/album/${albumId}`;
        }
        // 发起请求
        const res = await request.get(url, { params });
        if (res.code === 200) {
          // 更新当前页数据和总条数
          if (isSearch) {
            setFilteredPhotos(res.data);
          } else {
            setPhotos(res.data);
            setFilteredPhotos(res.data);
          }
          setTotal(res.total); // 保存总条数
        } else {
          message.error(res.msg);
        }
      } catch (err) {
        message.error("加载照片失败，请重试");
        console.error("加载照片错误：", err);
      } finally {
        setLoading(false);
      }
    },
    [albumId, currentPage, loading, pageSize],
  );

  // 初始化加载：仅组件挂载时执行一次
  useEffect(() => {
    fetchMembers();
    fetchPhotos(false); // 加载第一页普通照片
  }, [fetchMembers]); // 依赖仅保留fetchMembers（无频繁变化）

  useEffect(() => {
    if (currentMember) {
      fetchFolders();
    }
  }, [currentMember]);

  // 页码变化时加载对应页数据
  useEffect(() => {
    if (currentPage >= 1) {
      fetchPhotos(isSearch, searchParams);
    }
  }, [currentPage, isSearch]); // 仅页码/搜索状态变化时执行

  // 分页切换回调
  const handlePageChange = (page) => {
    setCurrentPage(page); // 切换页码，触发useEffect加载数据
    // 回到照片列表顶部（可选，提升体验）
    document
      .querySelector(`.${styles.photoList}`)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // 删除照片
  const handleDeletePhoto = async (photoId) => {
    try {
      setDeleteLoading(true);
      const res = await request.post("/api/photos/delete", {
        photo_id: photoId,
      });
      if (res.code === 200) {
        message.success("删除成功");
        // 删除后重置为第一页，重新加载
        setCurrentPage(1);
        fetchPhotos(isSearch, searchParams);
      } else {
        message.error(res.msg);
      }
    } catch (err) {
      message.error("删除失败，请重试");
      console.error("删除错误：", err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // 搜索照片
  const handleSearch = async (values) => {
    try {
      setIsSearch(true); // 标记为搜索状态
      setCurrentPage(1); // 重置为第一页
      await fetchPhotos(true, values); // 加载搜索结果第一页
      setSearchModalVisible(false);
      message.success("搜索完成");
    } catch (err) {
      message.error("搜索失败，请重试");
      console.error("搜索错误：", err);
    }
  };

  // 重置搜索条件
  const handleResetSearch = () => {
    setIsSearch(false); // 取消搜索状态
    setCurrentPage(1); // 重置为第一页
    fetchPhotos(false); // 加载普通照片第一页
    setSearchModalVisible(false);
  };

  const onFavoritePhoto = (photoId) => {
    setFavoritePhotoId(photoId);
    setFavoriteCfmVisible(true);
  };

  const onCancelFavoritePhoto = (photo) => {
    const folder = folders.find(
      (folder) => folder.id === photo.favorite_folder_id,
    );
    Modal.confirm({
      title: `确定从【${folder.folder_name}】取消这张照片的收藏吗？`,
      onOk: () => {
        request
          .delete("/api/favorite/photos", {
            data: { photo_id: photo.id, folder_id: photo.favorite_folder_id },
          })
          .then(() => {
            message.success("取消收藏成功");
            fetchPhotos(isSearch, searchParams);
          });
      },
    });
  };

  const getPhotoMenuItems = (photo) => {
    if (photo.favorite_folder_id) {
      return [
        {
          key: "star",
          icon: <StarFilled style={{ color: "#b7b6b6" }} />,
          label: <a onClick={() => onCancelFavoritePhoto(photo)}>取消收藏</a>,
        },
      ];
    }
    return [
      {
        key: "delete",
        icon: <DeleteOutlined />,
        danger: true, // 标记危险操作（红色）
        label: (
          <Popconfirm
            title="确定删除这张照片吗？删除后无法恢复！"
            onConfirm={() => handleDeletePhoto(photo.is)}
            okText="确认"
            cancelText="取消"
          >
            <span>删除照片</span>
          </Popconfirm>
        ),
      },
      {
        key: "star",
        icon: <StarFilled style={{ color: "#f1b260ba" }} />,
        label: <a onClick={() => onFavoritePhoto(photo.id)}>收藏照片</a>,
      },
    ];
  };

  const onConfirmFavorite = async (folderId) => {
    // 调用加入收藏夹接口
    await request.post("/api/favorite/photos", {
      photo_id: favoritePhotoId,
      folder_id: folderId,
      member_id: currentMember.member_id,
    });
    message.success("加入收藏夹成功");
    setFavoriteCfmVisible(false);
    setFavoritePhotoId(null);
    fetchPhotos(isSearch, searchParams);
  };

  return (
    <div className={styles.albumDetail}>
      {/* 顶部操作栏 */}
      <div className={styles.topBar}>
        <Button
          icon={<LeftOutlined />}
          onClick={() => navigate("/")}
          className={styles.backBtn}
        >
          返回相册列表
        </Button>
        <Button
          icon={<SearchOutlined />}
          type="default"
          className={styles.searchBtn}
          onClick={() => setSearchModalVisible(true)}
        >
          搜索照片
        </Button>
        <Button
          icon={<HeartOutlined />}
          type="primary"
          onClick={() => navigate(`/favorite?fromAlbumId=${albumId}`)}
        >
          我的收藏
        </Button>
      </div>

      {/* 页面标题 */}
      <h2 className={styles.pageTitle}>相册详情</h2>

      <div className={styles.albumShow}>
        {/* 照片列表区域（移除滚动容器，改为普通布局） */}
        <div className={styles.albumShowLeft}>
          {/* Loading 遮罩层（核心修改） */}
          {loading && (
            <div className={styles.loadingMask}>
              <Spin size="large" />
              <span>加载中...</span>
            </div>
          )}

          <div className={styles.photoListContainer}>
            <div className={styles.photoList}>
              {filteredPhotos.length > 0
                ? filteredPhotos.map((photo) => (
                    <div className={styles.photoItem} key={photo.id}>
                      <div className={styles.photoMoreBtn}>
                        <Dropdown
                          menu={{ items: getPhotoMenuItems(photo) }}
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
                      <div className={styles.imgContainer}>
                        <Image
                          width="100%"
                          height="100%"
                          src={`/uploads/photos/${photo.file_path}?token=${localStorage.getItem("family_photo_token")}`}
                          className={styles.photoImg}
                          fallback="https://via.placeholder.com/200x150?text=暂无图片"
                          preview
                        />
                      </div>
                      <div className={styles.photoInfo}>
                        <div
                          className={styles.photoName}
                          title={photo.photo_name}
                        >
                          名称：{photo.photo_name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div className={styles.photoMeta}>
                            上传者：{photo.operator_name || "未知"}
                            {photo.remarks && (
                              <Tooltip title={photo.remarks}>
                                <QuestionCircleOutlined />
                              </Tooltip>
                            )}
                          </div>

                          {photo.member_name && (
                            <div className={styles.photoMeta}>
                              归属：{photo.member_name}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div className={styles.photoMeta}>
                            拍摄时间：{formatTime(photo.shoot_time) || "未知"}
                          </div>

                          <div className={styles.photoMeta}>
                            上传时间：{formatTime(photo.upload_time) || "未知"}
                          </div>
                          {photo.favorite_folder_id && (
                            <div className={styles.photoMeta}>
                              收藏夹：
                              {folders.find(
                                (p) => p.id === photo.favorite_folder_id,
                              )?.folder_name || "未知"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                : !loading && (
                    <div className={styles.emptyTip}>暂无符合条件的照片</div>
                  )}
            </div>
          </div>

          {/* 分页组件（核心新增） */}
          {total > 0 && (
            <div className={styles.pagination}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                onChange={handlePageChange}
                showSizeChanger={false} // 关闭条数切换（固定12条）
                showQuickJumper // 显示快速跳页
                showTotal={(total) => `共 ${total} 张照片`} // 显示总条数
              />
            </div>
          )}
        </div>

        <div className={styles.albumShowRight}>
          <UploadArare
            reload={() => {
              // 上传后重置为第一页，重新加载
              setCurrentPage(1);
              fetchPhotos(isSearch, searchParams);
            }}
            albumId={albumId}
            members={members}
          />
          <PhotoCapture
            albumId={albumId}
            members={members}
            reload={() => {
              setCurrentPage(1);
              fetchPhotos(isSearch, searchParams);
            }}
          />
        </div>
      </div>

      {searchModalVisible && (
        <FilterPopwin
          members={members}
          searchModalVisible={searchModalVisible}
          setSearchModalVisible={setSearchModalVisible}
          handleResetSearch={handleResetSearch}
          handleSearch={handleSearch}
          setSearchParams={setSearchParams}
        />
      )}
      {favoriteCfmVisible && (
        <FavoriteConfirmModal
          favoriteCfmVisible={favoriteCfmVisible}
          setFavoriteCfmVisible={setFavoriteCfmVisible}
          onConfirm={onConfirmFavorite}
          onCancel={() => {
            setFavoriteCfmVisible(false);
            setFavoritePhotoId(null);
          }}
          folders={folders}
        />
      )}
    </div>
  );
};

export default AlbumDetail;
