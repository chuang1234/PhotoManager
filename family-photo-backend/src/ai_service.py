"""
AI 对话服务
──────────
支持多种 AI 提供商，通过环境变量 `AI_PROVIDER` 切换：

  AI_PROVIDER = openai | ollama
  ─────────────────────────────────────────
  【OpenAI 兼容接口】（OpenAI / DeepSeek / 通义千问 等）
    AI_API_KEY       必填  API 密钥（未配置则使用模拟回复）
    AI_API_BASE      可选  接口地址（默认 https://api.openai.com/v1）
    AI_MODEL         可选  模型名称（默认 gpt-3.5-turbo）

  【Ollama 本地部署】（推荐，无需 API Key！）
    AI_API_BASE      可选  Ollama 服务地址（默认 http://localhost:11434）
    AI_MODEL         可选  模型名称（默认 llama3，可通过 /api/chat/models 查询已安装模型）

  【通用】
    AI_TIMEOUT       可选  请求超时秒数（默认 60）

示例：
  # OpenAI / DeepSeek / 通义千问
  set AI_PROVIDER=openai
  set AI_API_KEY=sk-xxx
  set AI_API_BASE=https://api.deepseek.com/v1
  set AI_MODEL=deepseek-chat

  # 本地 Ollama（原生接口，无需 API Key）
  set AI_PROVIDER=ollama
  set AI_MODEL=llama3

  # Ollama 兼容模式（使用 OpenAI SDK 调用 Ollama，可选的备用方案）
  set AI_PROVIDER=openai
  set AI_API_KEY=ollama
  set AI_API_BASE=http://localhost:11434/v1
  set AI_MODEL=llama3
"""

import os
import logging
import random

logger = logging.getLogger('photo_manager')

# ─────────────────────────────────────────
# openai 库可选：未安装则自动回退到模拟回复
# ─────────────────────────────────────────
try:
    from openai import OpenAI
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False
    logger.info('[AI服务] openai 库未安装，将使用模拟回复（pip install openai）')

# ─────────────────────────────────────────
# requests 库可选：Ollama 原生接口需要
# ─────────────────────────────────────────
try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False
    logger.info('[AI服务] requests 库未安装（pip install requests）')

# ─────────────────────────────────────────
# AI 配置（从环境变量读取，按 provider 给合理默认值）
# ─────────────────────────────────────────
AI_PROVIDER = os.environ.get('AI_PROVIDER', 'openai').strip().lower()

if AI_PROVIDER == 'ollama':
    AI_API_KEY   = os.environ.get('AI_API_KEY', '')          # Ollama 不需要 Key
    AI_API_BASE  = os.environ.get('AI_API_BASE', 'http://localhost:11434')
    AI_MODEL     = os.environ.get('AI_MODEL', 'llama3')
else:
    AI_API_KEY   = os.environ.get('AI_API_KEY', '')
    AI_API_BASE  = os.environ.get('AI_API_BASE', 'https://api.openai.com/v1')
    AI_MODEL     = os.environ.get('AI_MODEL', 'gpt-3.5-turbo')

AI_TIMEOUT = int(os.environ.get('AI_TIMEOUT', '60'))


def get_ai_response(messages: list, member_name: str = None) -> str:
    """
    调用 AI 获取回复
    :param messages:     对话历史 [{'role': 'user'|'assistant'|'system', 'content': '...'}]
    :param member_name:  当前用户昵称（用于个性化问候）
    :return:             AI 回复文本
    """
    # ── Ollama 原生接口 ─────────────────────────────────
    logger.info(f'AI_PROVIDER={AI_PROVIDER}')
    logger.info(f'AI_API_KEY={AI_API_KEY}')
    if AI_PROVIDER == 'ollama':
        if not _REQUESTS_AVAILABLE:
            return '🤖 Ollama 服务需要 requests 库，请联系管理员安装（pip install requests）～'
        return _ollama_chat(messages, member_name)

    # ── OpenAI 兼容接口（默认） ─────────────────────────
    # 未配置 API Key → 使用模拟回复
    if not AI_API_KEY:
        return _mock_reply(messages, member_name)

    # openai 库未安装 → 提示并回退
    if not _OPENAI_AVAILABLE:
        return '🤖 AI 服务尚未安装，请联系管理员安装 openai 库（pip install openai）～'

    try:
        client = OpenAI(api_key=AI_API_KEY, base_url=AI_API_BASE)

        # 构建请求消息列表（加入系统提示词）
        request_messages = [
            {'role': 'system', 'content': _build_system_prompt(member_name)}
        ] + messages

        response = client.chat.completions.create(
            model=AI_MODEL,
            messages=request_messages,
            timeout=AI_TIMEOUT,
            temperature=0.7,
            max_tokens=1000,
        )

        content = response.choices[0].message.content
        logger.info(f'[AI服务][{AI_PROVIDER}] 成功获取回复，长度={len(content)}')
        return content

    except Exception as e:
        logger.error(f'[AI服务][{AI_PROVIDER}] API 调用失败：{str(e)}')
        return _mock_reply(messages, member_name)


def _ollama_chat(messages: list, member_name: str = None) -> str:
    """
    调用 Ollama 原生接口（/api/chat）
    文档：https://github.com/ollama/ollama/blob/main/docs/api.md
    """
    url = f'{AI_API_BASE.rstrip("/")}/api/chat'
    ollama_messages = [
        {'role': 'system', 'content': _build_system_prompt(member_name)}
    ] + messages

    try:
        resp = _requests.post(
            url,
            json={
                'model': AI_MODEL,
                'messages': ollama_messages,
                'stream': False,
                'options': {
                    'temperature': 0.7,
                    'num_predict': 1000,
                },
            },
            timeout=AI_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data.get('message', {}).get('content', '')

        if not content:
            logger.warning(f'[AI服务][ollama] 返回内容为空，原始响应：{data}')
            return _mock_reply(messages, member_name)

        logger.info(f'[AI服务][ollama] 成功获取回复，长度={len(content)}')
        return content

    except _requests.exceptions.ConnectionError:
        logger.error(f'[AI服务][ollama] 无法连接到 Ollama 服务（{AI_API_BASE}），请确认 Ollama 已启动')
        return f'🤖 无法连接到本地 Ollama 服务（{AI_API_BASE}），请确认 Ollama 已启动（`ollama serve`）～'
    except _requests.exceptions.Timeout:
        logger.error(f'[AI服务][ollama] 请求超时（{AI_TIMEOUT}秒）')
        return '🤖 Ollama 响应超时，可能是模型推理较慢，请稍后再试～'
    except Exception as e:
        logger.error(f'[AI服务][ollama] 调用失败：{str(e)}')
        return _mock_reply(messages, member_name)


def list_ollama_models() -> list:
    """
    列出 Ollama 本地已安装的模型
    :return: 模型名称列表，例如 ['llama3:latest', 'qwen2:7b', ...]
    """
    if AI_PROVIDER != 'ollama' or not _REQUESTS_AVAILABLE:
        return []
    url = f'{AI_API_BASE.rstrip("/")}/api/tags'
    try:
        resp = _requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        return [m['name'] for m in data.get('models', [])]
    except Exception as e:
        logger.error(f'[AI服务][ollama] 获取模型列表失败：{str(e)}')
        return []


def get_ai_provider_info() -> dict:
    """
    返回当前 AI 提供商信息（供前端展示）
    """
    info = {
        'provider': AI_PROVIDER,
        'model': AI_MODEL,
        'available': False,
        'models': [],
    }
    if AI_PROVIDER == 'ollama':
        if not _REQUESTS_AVAILABLE:
            info['error'] = 'requests 库未安装'
            return info
        # 检查 Ollama 服务是否可达
        try:
            resp = _requests.get(f'{AI_API_BASE.rstrip("/")}/api/tags', timeout=3)
            resp.raise_for_status()
            info['available'] = True
            info['models'] = [m['name'] for m in resp.json().get('models', [])]
        except Exception as e:
            info['error'] = f'Ollama 服务不可达：{str(e)}'
    else:
        info['available'] = bool(AI_API_KEY and _OPENAI_AVAILABLE)
    return info


def _build_system_prompt(member_name: str = None) -> str:
    """构建系统提示词（AI 的角色设定）"""
    greeting = f'当前用户名叫「{member_name}」，请用温馨亲切的语气回复。' if member_name else ''
    return (
        '你是一个温馨友好的家庭相册 AI 助手 📷💖。\n'
        '你可以帮助家人：\n'
        '- 管理照片和相册（上传、整理、收藏）\n'
        '- 回答关于家庭相册使用的问题\n'
        '- 提供摄影小技巧和建议\n'
        '- 分享温馨的家庭互动建议\n'
        '请用中文回答，语气温柔可爱，适当使用 emoji 表情。\n'
        f'{greeting}'
    )


def _mock_reply(messages: list, member_name: str = None) -> str:
    """
    模拟 AI 回复（未配置真实 API 时使用）
    可根据用户问题给出预设回复，让功能在没有 API Key 时仍可体验
    """
    last_msg = ''
    for msg in reversed(messages):
        if msg['role'] == 'user':
            last_msg = msg['content']
            break

    name_prefix = f'{member_name}，' if member_name else ''

    # 根据问题关键词匹配回复
    if not last_msg:
        return '👋 你好呀！有什么可以帮你的吗～'

    keywords_map = [
        (['你是谁', '你叫什么', '介绍自己'],
         f'🤖 我是家庭相册 AI 小助手～可以帮你管理照片、回答相册使用问题，还能提供摄影技巧哦 💖'),

        (['你好', '嗨', 'hi', 'hello', '哈喽'],
         f'{name_prefix}你好呀～今天想聊些什么呢？😊'),

        (['照片', '相册', '上传', '整理'],
         f'💡 小提示：你可以按时间、地点或人物来整理照片哦！建议在相册名称里加上日期，方便日后查找～'),

        (['摄影', '拍照', '拍摄', '技巧'],
         f'📷 摄影小技巧：光线是最好的滤镜！尽量在自然光下拍摄，黄金时段（日出日落前后）效果最佳哦～'),

        (['谢谢', '感谢', 'thanks'],
         f'不客气～能帮到你我很开心 💕 有问题随时来找我哦！'),

        (['再见', '拜拜', 'bye'],
         f'拜拜～下次再来找我聊天呀 👋💖'),
    ]

    for keywords, reply in keywords_map:
        if any(kw in last_msg.lower() for kw in keywords):
            return reply

    # 默认回复池（随机选一条）
    default_replies = [
        f'{name_prefix}这个问题很有趣呢！请告诉我更多细节，我来帮你解答～ 💭',
        f'🤔 让我想想...这个问题我还在学习中，你可以换个方式问我哦～',
        f'💡 收到！作为家庭相册小助手，我最擅长照片管理相关的问题，要不要问问看？',
        f'{name_prefix}感谢你的提问！你可以问我关于相册管理、摄影技巧等方面的问题哦～ 📷',
        f'嗯嗯，我在认真听呢！如果你想了解如何使用家庭相册的功能，尽管问我吧 💖',
    ]
    return random.choice(default_replies)