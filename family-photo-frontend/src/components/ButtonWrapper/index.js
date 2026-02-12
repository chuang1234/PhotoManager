import React from "react";
import styles from "./index.less";

const ButtonWrapper = (props) => {
  const { children, ...rest } = props;

  return (
    <div {...rest} className={styles.buttonWrapper}>
      {children}
    </div>
  );
};

export default ButtonWrapper;
