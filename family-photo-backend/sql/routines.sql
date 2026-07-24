DELIMITER //
CREATE PROCEDURE IF NOT EXISTS `cleanup_old_chat_messages`()
BEGIN
    DELETE FROM `ai_chat_message`
    WHERE `create_time` < DATE_SUB(NOW(), INTERVAL 3 MONTH);
END //
DELIMITER ;
