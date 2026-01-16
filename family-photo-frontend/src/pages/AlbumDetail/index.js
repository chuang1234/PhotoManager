import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Upload,
  Button,
  Image,
  Modal,
  Input,
  DatePicker,
  Select,
  message,
  Form,
  Popconfirm,
  Spin,
  Pagination,
  Tooltip,
  Dropdown,
} from "antd";
import {
  UploadOutlined,
  LeftOutlined,
  SearchOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  EllipsisOutlined,
  StarFilled,
} from "@ant-design/icons";
import request from "../../utils/request";
import moment from "moment";
import styles from "./index.module.less";
import FilterPopwin from "./popwin/FilterPopwin";
import { formatTime } from "../../utils/dateUtil";

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

  // 表单状态
  const [form] = Form.useForm();
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 弹窗状态
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  const [searchParams, setSearchParams] = useState({});

  // 获取家庭成员
  const fetchMembers = useCallback(() => {
    request.get("/api/members").then((res) => {
      if (res.code === 200) {
        setMembers(res.data);
      }
    });
  }, []);

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
        // 上传后重置为第一页，重新加载
        setCurrentPage(1);
        fetchPhotos(isSearch, searchParams);
      } else if (info.file.status === "error") {
        message.error(
          `${info.file.name} 上传失败：${info.file.error?.msg || "未知错误"}`,
        );
      }
    },
  };

  const getPhotoMenuItems = (photoId) => {
    return [
      {
        key: "delete",
        icon: <DeleteOutlined />,
        danger: true, // 标记危险操作（红色）
        label: (
          <Popconfirm
            title="确定删除这张照片吗？删除后无法恢复！"
            onConfirm={() => handleDeletePhoto(photoId)}
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
        label: <a onClick={() => message.success("收藏成功！")}>收藏照片</a>,
      },
    ];
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
                      <div className={styles.imgContainer}>
                        <Image
                          width="100%"
                          height="100%"
                          src={`/uploads/${photo.file_path}?token=${localStorage.getItem("family_photo_token")}`}
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

        {/* 上传区域（原有逻辑不变） */}
        <div className={styles.albumShowRight}>
          <div className={styles.uploadArea}>
            <h3 className={styles.uploadTitle}>照片上传</h3>
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
          </div>
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
    </div>
  );
};

export default AlbumDetail;
