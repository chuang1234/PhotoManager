import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, message } from "antd";
import { HeartOutlined, LeftOutlined, SearchOutlined } from "@ant-design/icons";
import request from "../../utils/request";
import styles from "./index.module.less";
import FilterPopwin from "./popwin/FilterPopwin";
import { useMember } from "../../contexts/MemberContext";
import AlbumPhotoList from "./components/AlbumPhotoList";

const AlbumDetail = () => {
  const { albumId } = useParams();
  const navigate = useNavigate();

  // 数据状态
  const [members, setMembers] = useState([]);
  const [isSearch, setIsSearch] = useState(false);

  // 弹窗状态
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [favoriteCfmVisible, setFavoriteCfmVisible] = useState(false);

  const [searchParams, setSearchParams] = useState({});
  const [favoritePhotoId, setFavoritePhotoId] = useState(null);
  const [activeKey, setActiveKey] = useState("photoList");
  const { currentMember } = useMember();

  const photoListRef = useRef();

  // 获取家庭成员
  const fetchMembers = useCallback(() => {
    request.get("/api/members").then((res) => {
      if (res.code === 200) {
        setMembers(res.data);
      }
    });
  }, []);

  // 初始化加载
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const fetchPhotos = async (isSearch, searchParams) =>
    await photoListRef.current.fetchPhotos(isSearch, searchParams);

  // 搜索照片
  const handleSearch = async (values) => {
    try {
      setIsSearch(true);
      await fetchPhotos(true, values);
      setSearchModalVisible(false);
      message.success("搜索完成啦～🔍");
    } catch (err) {
      message.error("搜索失败啦～再试试✨");
      console.error("搜索错误：", err);
    }
  };

  // 重置搜索条件
  const handleResetSearch = () => {
    setIsSearch(false);
    fetchPhotos(false);
    setSearchModalVisible(false);
  };

  const onConfirmFavorite = async (folderId) => {
    await request.post("/api/favorite/photos", {
      photo_id: favoritePhotoId,
      folder_id: folderId,
      member_id: currentMember.id,
    });
    message.success("加入收藏夹成功啦～⭐");
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
          返回相册列表 🔙
        </Button>
        <Button
          icon={<SearchOutlined />}
          type="default"
          className={styles.searchBtn}
          onClick={() => setSearchModalVisible(true)}
        >
          搜索照片 🔍
        </Button>
        <Button
          icon={<HeartOutlined />}
          type="primary"
          className={styles.favoriteBtn}
          onClick={() => navigate(`/favorite?fromAlbumId=${albumId}`)}
        >
          我的收藏 💖
        </Button>
        <Button
          icon={<HeartOutlined />}
          type={activeKey === "photoList" ? "primary" : "default"}
          className={styles.photoListBtn}
          onClick={() => setActiveKey("photoList")}
        >
          照片详情
        </Button>
        {/*<Button*/}
        {/*  icon={<HeartOutlined />}*/}
        {/*  type={activeKey === "carousel" ? "primary" : "default"}*/}
        {/*  className={styles.carouselBtn}*/}
        {/*  onClick={() => setActiveKey("carousel")}*/}
        {/*>*/}
        {/*  照片轮播*/}
        {/*</Button>*/}
      </div>
      {activeKey === "photoList" && (
        <>
          {/*<h2 className={styles.pageTitle}>相册详情 ✨</h2>*/}
          <AlbumPhotoList ref={photoListRef} isSearch={isSearch} />
        </>
      )}
      {activeKey === "carousel" && (
        <>
          <h2>照片轮播</h2>
          {/*<PhotoCarousel albumId={albumId} />*/}
        </>
      )}

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
