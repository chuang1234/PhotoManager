/**
 * AI 对话悬浮组件
 * ──────────────────────────────────────────────
 * 功能：
 *  - 悬浮在页面右下角，可拖拽移动
 *  - 点击气泡展开对话框，点击最小化按钮收起
 *  - 自动加载最近三个月聊天记录（按账号隔离）
 *  - 发送消息后自动调用 AI 接口获取回复
 *
 * 定位策略（修复收起后位置偏移的问题）：
 *  - position 表示「当前可见内容」的左上角坐标
 *  - 收起时 position = 气泡左上角
 *  - 展开时 position = 对话框左上角（已被 clamp 保证在屏幕内）
 *  - 收起时：气泡左上角 = 对话框左上角（对话框在哪，气泡就在哪）
 *    如果对话框被拖到离右下角很远的位置，气泡会自动吸附回右下角
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import request from '../../utils/request';
import styles from './index.module.less';

// ── 常量 ────────────────────────────────────────
const BUBBLE_SIZE = 56;     // 气泡宽高
const CHAT_BOX_W  = 380;    // 对话框宽
const CHAT_BOX_H  = 540;    // 对话框高
const EDGE_MARGIN  = 12;     // 距屏幕边缘最小间距
const SNAP_DIST    = 200;    // 收起时，距右下角超过此距离则自动吸回

// 默认气泡位置（右下角）
const getDefaultBubblePos = () => ({
    left: window.innerWidth  - BUBBLE_SIZE - EDGE_MARGIN,
    top:  window.innerHeight - BUBBLE_SIZE - EDGE_MARGIN,
});

// 发送消息的接口超时（AI 可能较慢）
const CHAT_TIMEOUT = 60000;

// 安全 clamp：保证内容完全在屏幕内
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const AiChat = () => {
    // ── 状态 ──────────────────────────────────────
    const [isOpen, setIsOpen]       = useState(false);
    const [messages, setMessages]   = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading]     = useState(false);
    // position = 当前可见内容（气泡 or 对话框）的左上角坐标
    const [position, setPosition]   = useState(null);

    // ── Refs ──────────────────────────────────────
    const wrapperRef    = useRef(null);
    const messagesRef   = useRef(null);
    const draggedRef    = useRef(false);    // 本次是否发生过拖拽（区分 click）
    const dragStartRef  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

    // ── 初始化气泡位置 ────────────────────────────
    useEffect(() => {
        setPosition(getDefaultBubblePos());
    }, []);

    // ── 加载最近三个月聊天记录 ────────────────────
    const loadHistory = useCallback(async () => {
        try {
            const res = await request.get('/api/chat/history', {
                params: { months: 3 },
                timeout: CHAT_TIMEOUT,
            });
            if (res.code === 200) {
                setMessages(res.data || []);
            }
        } catch (err) {
            console.error('加载聊天记录失败：', err);
        }
    }, []);

    // ── 对话框展开时自动加载历史 ──────────────────
    useEffect(() => {
        if (isOpen) loadHistory();
    }, [isOpen, loadHistory]);

    // ── 消息列表变化时自动滚动到底部 ──────────────
    useEffect(() => {
        const el = messagesRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [messages, loading]);

    // ── 发送消息 ──────────────────────────────────
    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || loading) return;

        // 乐观更新：先显示用户消息
        const tempUserMsg = {
            id: `temp_${Date.now()}`,
            role: 'user',
            content: text,
            create_time: formatNow(),
        };
        setMessages(prev => [...prev, tempUserMsg]);
        setInputText('');
        setLoading(true);

        try {
            const res = await request.post('/api/chat/send', { content: text }, {
                timeout: CHAT_TIMEOUT,
            });
            if (res.code === 200) {
                setMessages(prev => {
                    const withoutTemp = prev.filter(m => m.id !== tempUserMsg.id);
                    return [...withoutTemp, res.data.user_message, res.data.ai_message];
                });
            } else {
                setMessages(prev => [
                    ...prev.filter(m => m.id !== tempUserMsg.id),
                    tempUserMsg,
                    {
                        id: `err_${Date.now()}`,
                        role: 'assistant',
                        content: `😅 ${res.msg || '发送失败，请稍后重试～'}`,
                        create_time: formatNow(),
                    },
                ]);
            }
        } catch (err) {
            console.error('发送消息失败：', err);
            setMessages(prev => [
                ...prev.filter(m => m.id !== tempUserMsg.id),
                tempUserMsg,
                {
                    id: `err_${Date.now()}`,
                    role: 'assistant',
                    content: '😅 网络好像开小差了，请稍后再试试～',
                    create_time: formatNow(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // ── 回车发送（Shift+Enter 换行）──────────────
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ─────────────────────────────────────────────────
    //  拖拽：统一处理气泡拖拽和对话框头部拖拽
    // ─────────────────────────────────────────────────
    const startDrag = (e) => {
        if (e.button !== 0) return;
        draggedRef.current = false;
        dragStartRef.current = {
            mx: e.clientX,          // 鼠标起始 X
            my: e.clientY,          // 鼠标起始 Y
            px: position.left,      // position 起始 X
            py: position.top,       // position 起始 Y
        };
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup',   endDrag);
        e.preventDefault(); // 防止文字选中
    };

    const onDrag = (e) => {
        const { mx, my, px, py } = dragStartRef.current;
        const dx = e.clientX - mx;
        const dy = e.clientY - my;

        // 超过 3px 才算真正拖拽（区分 click）
        if (!draggedRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            draggedRef.current = true;
        }
        if (!draggedRef.current) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // 根据当前状态获取可见内容的宽高
        const contentW = isOpen ? CHAT_BOX_W : BUBBLE_SIZE;
        const contentH = isOpen ? CHAT_BOX_H : BUBBLE_SIZE;

        // 新位置 = 原位置 + 偏移，clamp 到屏幕内
        const newLeft = clamp(px + dx, EDGE_MARGIN, vw - contentW - EDGE_MARGIN);
        const newTop  = clamp(py + dy, EDGE_MARGIN, vh - contentH - EDGE_MARGIN);

        setPosition({ left: newLeft, top: newTop });
    };

    const endDrag = () => {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup',   endDrag);
    };

    // ── 气泡点击（只在非拖拽时触发展开）──────────
    const handleBubbleClick = () => {
        if (draggedRef.current) {
            draggedRef.current = false;
            return;
        }
        openChat();
    };

    // ── 展开对话框 ────────────────────────────────
    // 对话框从气泡位置展开，优先向左上方向，保证不超出屏幕
    const openChat = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const bubbleCenterX = position.left + BUBBLE_SIZE / 2;
        const bubbleCenterY = position.top  + BUBBLE_SIZE / 2;

        // 水平方向：气泡在屏幕右半边 → 对话框向左展开；否则向右
        let boxLeft;
        if (bubbleCenterX > vw / 2) {
            // 向左展开：对话框右边对齐气泡右边
            boxLeft = clamp(position.left + BUBBLE_SIZE - CHAT_BOX_W, EDGE_MARGIN, vw - CHAT_BOX_W - EDGE_MARGIN);
        } else {
            // 向右展开：对话框左边对齐气泡左边
            boxLeft = clamp(position.left, EDGE_MARGIN, vw - CHAT_BOX_W - EDGE_MARGIN);
        }

        // 垂直方向：气泡在屏幕下半边 → 对话框向上展开；否则向下
        let boxTop;
        if (bubbleCenterY > vh / 2) {
            // 向上展开：对话框底边对齐气泡底边
            boxTop = clamp(position.top + BUBBLE_SIZE - CHAT_BOX_H, EDGE_MARGIN, vh - CHAT_BOX_H - EDGE_MARGIN);
        } else {
            // 向下展开：对话框顶边对齐气泡顶边
            boxTop = clamp(position.top, EDGE_MARGIN, vh - CHAT_BOX_H - EDGE_MARGIN);
        }

        setPosition({ left: boxLeft, top: boxTop });
        setIsOpen(true);
    };

    // ── 收起对话框 ────────────────────────────────
    // 气泡出现在对话框位置；如果离右下角太远，自动吸回去
    const closeChat = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const defaultPos = getDefaultBubblePos();

        // 计算对话框右下角到默认气泡右下角的距离
        const boxRight = position.left + CHAT_BOX_W;
        const boxBottom = position.top + CHAT_BOX_H;
        const defaultRight = defaultPos.left + BUBBLE_SIZE;
        const defaultBottom = defaultPos.top + BUBBLE_SIZE;
        const dist = Math.sqrt(
            (boxRight - defaultRight) ** 2 + (boxBottom - defaultBottom) ** 2
        );

        if (dist > SNAP_DIST) {
            // 太远 → 气泡吸回右下角
            setPosition(defaultPos);
        } else {
            // 不远 → 气泡出现在对话框左上角（保证在屏幕内）
            setPosition({
                left: clamp(position.left, EDGE_MARGIN, vw - BUBBLE_SIZE - EDGE_MARGIN),
                top:  clamp(position.top,  EDGE_MARGIN, vh - BUBBLE_SIZE - EDGE_MARGIN),
            });
        }
        setIsOpen(false);
    };

    // ── 格式化消息时间（只显示时:分）──────────────
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            const date = new Date(timeStr.replace(' ', 'T'));
            const h = String(date.getHours()).padStart(2, '0');
            const m = String(date.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        } catch {
            return '';
        }
    };

    // ── 当前时间字符串（用于乐观更新）─────────────
    function formatNow() {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // ── 位置未初始化时不渲染（避免闪烁）──────────
    if (!position) return null;

    return (
        <div
            className={styles.chatWrapper}
            ref={wrapperRef}
            style={{
                left: position.left,
                top:  position.top,
            }}
        >
            {/* ════════ 悬浮气泡（收起状态）════════ */}
            {!isOpen && (
                <div
                    className={styles.chatBubble}
                    onMouseDown={startDrag}
                    onClick={handleBubbleClick}
                    title="打开 AI 助手 💬"
                >
                    <span className={styles.bubbleIcon}>💬</span>
                </div>
            )}

            {/* ════════ 对话框（展开状态）═════════ */}
            {isOpen && (
                <div className={styles.chatBox}>
                    {/* ── 头部（可拖拽）── */}
                    <div
                        className={styles.chatHeader}
                        onMouseDown={startDrag}
                    >
                        <div className={styles.headerInfo}>
                            <span className={styles.headerAvatar}>🤖</span>
                            <div>
                                <div className={styles.headerTitle}>AI 小助手</div>
                                <div className={styles.headerSubtitle}>在线 · 随时为你解答 💖</div>
                            </div>
                        </div>
                        <button
                            className={styles.minimizeBtn}
                            onClick={closeChat}
                            title="收起对话框"
                        >
                            ─
                        </button>
                    </div>

                    {/* ── 消息列表区 ─── */}
                    <div className={styles.chatMessages} ref={messagesRef}>
                        {messages.length === 0 && !loading && (
                            <div className={styles.emptyHint}>
                                <span className={styles.emptyIcon}>👋</span>
                                <div>你好呀！我是 AI 小助手～</div>
                                <div>有任何问题都可以问我哦 💖</div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={msg.id || idx}
                                className={`${styles.messageRow} ${
                                    msg.role === 'user' ? styles.userMessage : styles.aiMessage
                                }`}
                            >
                                <div
                                    className={`${styles.msgAvatar} ${
                                        msg.role === 'user' ? styles.userAvatar : styles.aiAvatar
                                    }`}
                                >
                                    {msg.role === 'user' ? '👤' : '🤖'}
                                </div>

                                <div>
                                    <div
                                        className={`${styles.msgBubble} ${
                                            msg.role === 'user' ? styles.userBubble : styles.aiBubble
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                    <div
                                        className={`${styles.msgTime} ${
                                            msg.role === 'user' ? styles.userTime : styles.aiTime
                                        }`}
                                    >
                                        {formatTime(msg.create_time)}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* AI 正在思考的加载动画 */}
                        {loading && (
                            <div className={styles.loadingRow}>
                                <div className={`${styles.msgAvatar} ${styles.aiAvatar}`}>🤖</div>
                                <div className={styles.loadingBubble}>
                                    <span className={styles.loadingDot}></span>
                                    <span className={styles.loadingDot}></span>
                                    <span className={styles.loadingDot}></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 输入区 ───────── */}
                    <div className={styles.chatInput}>
                        <div className={styles.inputWrapper}>
                            <textarea
                                className={styles.chatTextarea}
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="说点什么吧～（Enter 发送，Shift+Enter 换行）"
                                rows={1}
                                maxLength={2000}
                                disabled={loading}
                            />
                        </div>
                        <button
                            className={styles.sendBtn}
                            onClick={handleSend}
                            disabled={!inputText.trim() || loading}
                            title="发送（Enter）"
                        >
                            ➤
                        </button>
                    </div>

                    {/* ── 底部小字提示 ─── */}
                    <div className={styles.chatFooter}>
                        AI 回复仅供参考 · 按账号隔离存储 🔒
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiChat;