import React from "react";
import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import styles from "./FilterPopwin.module.less"; // 新增样式文件

const FilterPopwin = (props) => {
  const {
    members,
    searchModalVisible,
    setSearchModalVisible,
    handleResetSearch,
    handleSearch,
    setSearchParams,
  } = props;
  const [searchForm] = Form.useForm();

  // 搜索提交（优化文案提示）
  const onSearch = () => {
    searchForm
      .validateFields()
      .then((values) => {
        setSearchParams(values);
        handleSearch(values);
        setSearchModalVisible(false); // 搜索后自动关闭弹窗，提升体验
      })
      .catch(() => {
        // 校验失败不处理，antd会自动提示
      });
  };

  // 重置搜索条件
  const onResetSearch = () => {
    searchForm.resetFields();
    handleResetSearch();
  };

  return (
    <Modal
      title="照片搜索 🔍"
      open={searchModalVisible}
      onCancel={() => setSearchModalVisible(false)}
      width={600}
      footer={[
        <Button key="reset" onClick={onResetSearch} className={styles.resetBtn}>
          重置 ✨
        </Button>,
        <Button
          key="cancel"
          onClick={() => setSearchModalVisible(false)}
          className={styles.cancelBtn}
        >
          取消 ❌
        </Button>,
        <Button
          key="search"
          type="primary"
          onClick={onSearch}
          className={styles.searchBtn}
        >
          搜索 📸
        </Button>,
      ]}
      className={styles.searchModal}
      destroyOnClose // 关闭时销毁表单，避免缓存
    >
      <Form
        form={searchForm}
        layout="vertical"
        className={styles.searchForm}
        initialValues={{}} // 初始化表单值
      >
        <Form.Item
          label="照片名称（模糊匹配）✍️"
          name="name"
          className={styles.formItem}
        >
          <Input
            placeholder="输入照片名称关键词～比如“生日”“旅行”"
            className={styles.formInput}
            maxLength={50}
          />
        </Form.Item>

        <Form.Item
          label="归属成员 👨‍👩‍👧"
          name="ownerMember"
          className={styles.formItem}
        >
          <Select
            placeholder="选择归属成员～（可选）"
            style={{ width: "100%" }}
            className={styles.formSelect}
          >
            {members.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="上传者 📤"
          name="uploaderMember"
          className={styles.formItem}
        >
          <Select
            placeholder="选择上传者～（可选）"
            style={{ width: "100%" }}
            className={styles.formSelect}
          >
            {members.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="拍摄日期范围 📅"
          name="dateRange"
          className={styles.formItem}
        >
          <DatePicker.RangePicker
            format="YYYY-MM-DD"
            placeholder={["开始日期～", "结束日期～"]}
            style={{ width: "100%" }}
            className={styles.formPicker}
            disabledDate={(current) => current && current > new Date()} // 禁用未来日期
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default FilterPopwin;
