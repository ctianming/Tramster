const WORKFLOW_URL = import.meta.env.VITE_COZE_WORKFLOW_URL;
const WORKFLOW_ID = import.meta.env.VITE_COZE_WORKFLOW_ID;
const BOT_URL = import.meta.env.VITE_COZE_BOT_URL;
const BOT_ID = import.meta.env.VITE_COZE_BOT_ID;
const API_TOKEN = import.meta.env.VITE_COZE_API_TOKEN;

if (!WORKFLOW_URL || !WORKFLOW_ID || !BOT_URL || !BOT_ID || !API_TOKEN) {
  throw new Error('Missing Coze environment variables');
}

interface CozeBotRequest {
  bot_id: string;
  user_id: string;
  content: string;
}

interface CozeWorkflowRequest {
  workflow_id: string;
  parameters: {
    USER_FILE: string;
    original_lang: string;
    target_lang: string;
  }
}

export async function sendCozeAgentRequestStream(
  data: CozeBotRequest,
  onData: (content: string) => void
): Promise<void> {
  try {
    const response = await fetch(BOT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: BOT_ID,
        user_id: data.user_id,
        stream: true,
        auto_save_history: true,
        additional_messages: [
          {
            role: 'user',
            content: data.content,
            content_type: 'text',
          }
        ]
      }),
    });

    if (!response.ok || !response.body) {
      console.error('API 请求失败:', response.statusText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let lastContent = ''; // 存储最后一条 JSON 的 content

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行分割数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留未完成的 JSON 数据

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonString = line.replace('data:', '').trim();

          if (jsonString === '[DONE]') continue;

          try {
            const jsonData = JSON.parse(jsonString);
            if (jsonData.content) {
              lastContent = jsonData.content.trim(); // 只存储最新的 content
            }
          } catch (err) {
            console.warn('解析 JSON 数据时出错:', err, '原始数据:', jsonString);
          }
        }
      }
    }

    // 读取完所有流数据后，返回最后一条 content
    if (lastContent) {
      onData(lastContent);
    }
  } catch (error) {
    console.error('请求出错:', error);
  }
}

export async function sendCozeWorkflowRequestStream(
  data: CozeWorkflowRequest,
  onData: (content: string) => void
): Promise<void> {
  try {
    const response = await fetch(WORKFLOW_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: WORKFLOW_ID,
        parameters: {
          USER_FILE: data.parameters.USER_FILE,
          original_lang: data.parameters.original_lang,
          target_lang: data.parameters.target_lang,
        },
      }),
    });

    if (!response.ok) {
      console.error("API 请求失败:", response.statusText);
      return;
    }

    // 解析 JSON 响应
    const result = await response.json();
    if (result && result.output) {
      onData(result.output); // 传递 output
    } else {
      console.error("API 响应无 output:", result);
    }
  } catch (error) {
    console.error("请求出错:", error);
  }
}