import { useEffect, useRef, useState } from "react";
import { Button, message, Modal, Spin } from "antd";
import {
  CameraOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import request from "../../../../utils/request";
import styles from "./PhotoCapture.module.less";

const PhotoCapture = ({ albumId, members, reload }) => {
  // 状态管理
  const [visible, setVisible] = useState(false); // 拍摄弹窗是否显示
  const [capturing, setCapturing] = useState(false); // 是否正在调用摄像头
  const [capturedImage, setCapturedImage] = useState(null); // 拍摄后的照片
  const [uploading, setUploading] = useState(false); // 上传中状态
  const [selectedMember, setSelectedMember] = useState(""); // 选择的归属成员

  // 摄像头相关引用
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 打开摄像头
  const startCamera = async () => {
    try {
      setCapturing(true);
      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // 优先调用后置摄像头
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      message.error("无法访问摄像头，请检查权限或设备是否支持");
      console.error("摄像头调用失败：", err);
      setCapturing(false);
      setVisible(false);
    }
  };

  // 关闭摄像头
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCapturing(false);
    setCapturedImage(null);
  };

  // 拍摄照片
  const capturePhoto = () => {
    if (!videoRef.current) return;

    // 创建canvas用于截取视频帧
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // 转为blob格式
    canvas.toBlob((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage({
        url: imageUrl,
        blob: blob,
        name: `拍摄照片_${new Date().getTime()}.png`,
      });
    }, "image/png");
  };

  // 上传拍摄的照片
  const uploadCapturedPhoto = async () => {
    if (!capturedImage || !albumId) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("photo", capturedImage.blob, capturedImage.name);
      formData.append("album_id", albumId);
      if (selectedMember) {
        formData.append("member_id", selectedMember);
      }
      formData.append("operator_id", localStorage.getItem("member_id"));

      // 调用上传接口（和UploadArare使用相同接口）
      const res = await request.post("/api/photos/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.code === 200) {
        message.success("拍摄照片上传成功");
        setVisible(false);
        stopCamera();
        reload(); // 刷新照片列表
      } else {
        message.error(res.msg || "上传失败");
      }
    } catch (err) {
      message.error("上传失败，请重试");
      console.error("拍摄照片上传错误：", err);
    } finally {
      setUploading(false);
    }
  };

  // 弹窗显示/隐藏时的处理
  useEffect(() => {
    if (visible) {
      startCamera();
    } else {
      stopCamera();
      setSelectedMember("");
    }
    // 组件卸载时关闭摄像头
    return () => stopCamera();
  }, [visible]);

  // 取消拍摄（返回预览界面）
  const cancelCapture = () => {
    // 1. 先停止当前的摄像头流（释放资源）
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 2. 重置状态
    setCapturedImage(null);

    // 3. 重新启动摄像头
    startCamera();
  };

  return (
    <>
      {/* 拍摄按钮 */}
      <div className={styles.photoCaptureBtn}>
        <Button
          type="default"
          icon={<CameraOutlined />}
          onClick={() => setVisible(true)}
          block
          className={styles.captureBtn}
        >
          拍摄照片
        </Button>
      </div>

      <Modal
        title="拍摄照片"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={700}
        destroyOnClose // 关闭时销毁组件，释放摄像头
      >
        <div className={styles.captureContainer}>
          {capturing ? (
            <>
              {!capturedImage ? (
                // 摄像头预览界面
                <div className={styles.cameraPreview}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className={styles.videoPlayer}
                  />
                  {capturing && (
                    <div className={styles.cameraLoading}>
                      <Spin size="large" tip="正在启动摄像头..." />
                    </div>
                  )}
                  <div className={styles.cameraControls}>
                    <Button
                      type="primary"
                      shape="circle"
                      size="large"
                      onClick={capturePhoto}
                      className={styles.shootBtn}
                    >
                      <CameraOutlined />
                    </Button>
                  </div>
                </div>
              ) : (
                // 拍摄后预览界面
                <div className={styles.photoPreview}>
                  <img
                    src={capturedImage.url}
                    alt="拍摄预览"
                    className={styles.previewImage}
                  />
                  <div className={styles.previewControls}>
                    <Button
                      icon={<CloseOutlined />}
                      onClick={cancelCapture}
                      className={styles.cancelBtn}
                    >
                      重拍
                    </Button>
                    <Button
                      icon={<CheckOutlined />}
                      type="primary"
                      onClick={uploadCapturedPhoto}
                      loading={uploading}
                      className={styles.confirmBtn}
                    >
                      确认上传
                    </Button>
                  </div>

                  {/* 归属成员选择 */}
                  <div className={styles.memberSelect}>
                    <div className={styles.memberSelectLabel}>
                      选择归属成员：
                      <select
                        value={selectedMember}
                        onChange={(e) => setSelectedMember(e.target.value)}
                        className={styles.memberSelectInput}
                      >
                        <option value="">请选择</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.cameraError}>
              <p>无法启动摄像头，请检查：</p>
              <ul>
                <li>1. 浏览器是否授予摄像头权限</li>
                <li>2. 设备是否有可用的摄像头</li>
                <li>3. 是否在HTTPS环境下（浏览器要求）</li>
              </ul>
              <Button
                type="primary"
                onClick={startCamera}
                className={styles.retryBtn}
              >
                重试
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default PhotoCapture;
