import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, Card, Typography, message, Upload, Image } from 'antd';
import { LeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import request from '../../utils/request';
import styles from './index.module.less';

const { Title } = Typography;

const CreateAlbum = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    // 封面文件状态：保存上传的封面文件和预览URL
    const [coverFile, setCoverFile] = useState(null);
    const [coverUrl, setCoverUrl] = useState('');

    // 封面上传前校验
    const beforeUpload = (file) => {
        // 校验文件类型
        const isImage = /\.(png|jpg|jpeg|gif|bmp)$/i.test(file.name);
        if (!isImage) {
            message.error('仅支持上传png/jpg/jpeg/gif/bmp格式的封面！');
            return false;
        }
        // 校验文件大小（≤2MB）
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('封面图片大小不能超过2MB！');
            return false;
        }
        // 保存文件到状态，阻止自动上传
        setCoverFile(file);
        // 生成预览URL
        setCoverUrl(URL.createObjectURL(file));
        return false;
    };

    // 移除封面
    const removeCover = () => {
        setCoverFile(null);
        setCoverUrl('');
        // 释放预览URL，避免内存泄漏
        if (coverUrl) URL.revokeObjectURL(coverUrl);
    };

    // 提交创建相册
    const handleSubmit = async () => {
        try {
            // 1. 表单校验（仅校验名称）
            const values = await form.validateFields();
            setLoading(true);

            // 2. 构建FormData（兼容文件+普通参数）
            const formData = new FormData();
            formData.append('name', values.albumName);
            // 如果有封面文件，添加到FormData
            if (coverFile) {
                formData.append('cover', coverFile);
            }

            // 3. 调用后端接口
            const res = await request.post('/api/album/create', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // 关键：指定表单格式
                    Authorization: localStorage.getItem('family_photo_token') || ''
                }
            });

            if (res.code === 200) {
                message.success('相册创建成功！');
                // 跳转回相册列表页
                navigate('/albums');
            } else {
                message.error(res.msg);
            }
        } catch (err) {
            // 表单校验失败或接口报错
            if (err.errorFields) {
                message.warning('请填写必填的相册名称');
            } else {
                message.error('创建失败，请重试');
                console.error('创建相册错误：', err);
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
                    onClick={() => navigate('/albums')}
                    className={styles.backBtn}
                >
                    返回相册列表
                </Button>
            </div>

            {/* 创建表单卡片 */}
            <Card className={styles.createCard}>
                <Title level={3} className={styles.cardTitle}>
                    创建新相册
                </Title>

                <Form
                    form={form}
                    layout="vertical"
                    className={styles.albumForm}
                    initialValues={{ albumName: '' }}
                >
                    {/* 相册名称 */}
                    <Form.Item
                        label="相册名称"
                        name="albumName"
                        rules={[
                            { required: true, message: '请输入相册名称' },
                            { max: 20, message: '相册名称不能超过20个字符' }
                        ]}
                    >
                        <Input
                            placeholder="请输入相册名称（如：2025旅行记录）"
                            size="large"
                            className={styles.nameInput}
                        />
                    </Form.Item>

                    {/* 新增：封面上传 */}
                    <Form.Item
                        label="相册封面（可选）"
                        className={styles.coverUploadItem}
                    >
                        <div className={styles.coverUploadWrapper}>
                            {/* 封面上传组件 */}
                            <Upload
                                name="cover"
                                beforeUpload={beforeUpload}
                                showUploadList={false}
                                className={styles.coverUploadBtn}
                            >
                                <Button
                                    icon={<UploadOutlined />}
                                    size="middle"
                                >
                                    选择封面图片
                                </Button>
                            </Upload>

                            {/* 封面预览 */}
                            {coverUrl && (
                                <div className={styles.coverPreview}>
                                    <Image
                                        width={120}
                                        height={80}
                                        src={coverUrl}
                                        alt="封面预览"
                                        fallback="https://via.placeholder.com/120x80?text=预览图"
                                    />
                                    <Button
                                        size="small"
                                        onClick={removeCover}
                                        className={styles.removeCoverBtn}
                                    >
                                        移除
                                    </Button>
                                </div>
                            )}

                            {/* 提示文字 */}
                            <p className={styles.coverTip}>
                                支持png/jpg/jpeg/gif/bmp格式，大小不超过2MB，不上传则使用默认封面
                            </p>
                        </div>
                    </Form.Item>

                    {/* 提交按钮 */}
                    <Form.Item className={styles.btnGroup}>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={handleSubmit}
                            loading={loading}
                            block
                            size="large"
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