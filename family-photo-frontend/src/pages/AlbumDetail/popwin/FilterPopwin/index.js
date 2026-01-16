import React from "react";
import { Button, DatePicker, Form, Input, Modal, Select } from "antd";
import styles from "../../index.module.less";

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

  const onSearch = () => {
    const values = searchForm.getFieldsValue();
    setSearchParams(values);
    handleSearch(values);
  };

  const onResetSearch = () => {
    searchForm.resetFields();
    handleResetSearch();
  };

  return (
    <Modal
      title="照片搜索"
      open={searchModalVisible}
      onCancel={() => setSearchModalVisible(false)}
      width={600}
      footer={[
        <Button key="reset" onClick={onResetSearch}>
          重置
        </Button>,
        <Button key="cancel" onClick={() => setSearchModalVisible(false)}>
          取消
        </Button>,
        <Button key="search" type="primary" onClick={onSearch}>
          搜索
        </Button>,
      ]}
    >
      <Form form={searchForm} layout="vertical" className={styles.searchForm}>
        <Form.Item label="照片名称（模糊匹配）" name="name">
          <Input placeholder="输入照片名称关键词" />
        </Form.Item>
        <Form.Item label="归属成员" name="ownerMember">
          <Select placeholder="选择归属成员" style={{ width: "100%" }}>
            {members.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="上传者" name="uploaderMember">
          <Select placeholder="选择上传者" style={{ width: "100%" }}>
            {members.map((m) => (
              <Select.Option key={m.id} value={m.id}>
                {m.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="拍摄日期范围" name="dateRange">
          <DatePicker.RangePicker
            format="YYYY-MM-DD"
            placeholder={["开始日期", "结束日期"]}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default FilterPopwin;
