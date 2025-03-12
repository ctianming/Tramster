// const API_URL = 'https://api.coze.cn/v3/chat';
const API_URL = 'https://api.coze.cn/v1/workflow/run';
const SUPABASE_PASSWORD ='zhao040211zZ!'
const API_TOKEN = 'pat_t7fbnw5lQKPIkBEiSCZ5RaF3UFUlXRkAUHU5tp0IfK4SqrpcKAyc7CvsGSBQvZdi';

interface CozeBotRequest {
    bot_id: string;
    user_id: string;
    content: string;
}

interface CozeWorkflowRequest {
    workflow_id: string;
    user_id: string;
    content: string;
}

export async function sendCozeWorkflowRequestStream(data: CozeWorkflowRequest, onData: (content: string) => void): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: data.workflow_id,
        user_id: data.user_id,
        stream: true,
        auto_save_history: true,
        parameters:{
          user_id : data.user_id,
          content : data.content,
        }
      }),
    });

    if (!response.ok || !response.body) {
      console.error('API 请求失败:', response.statusText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';

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
              // 处理嵌套 JSON 的 `content` 字段
              let contentData = jsonData.content;

              // 检查是否是字符串化的 JSON
              if (contentData.startsWith('{') && contentData.endsWith('}')) {
                try {
                  const nestedData = JSON.parse(contentData);
                  contentData = nestedData?.arguments?.input || ''; // 提取 `input` 内的内容
                } catch {
                  console.warn('无法解析嵌套 JSON:', contentData);
                }
              }

              // 提取 `译文：` 后的内容
              const match = contentData.match(/译文：(.*)/);
              if (match && match[1]) {
                onData(match[1].trim());
              }
            }
          } catch (err) {
            console.warn('解析 JSON 数据时出错:', err, '原始数据:', jsonString);
          }
        }
      }
    }
  } catch (error) {
    console.error('请求出错:', error);
  }
}
export async function sendCozeAgentRequestStream(data: CozeBotRequest, onData: (content: string) => void): Promise<void> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: data.bot_id,
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
              // 处理嵌套 JSON 的 `content` 字段
              let contentData = jsonData.content;

              // 检查是否是字符串化的 JSON
              if (contentData.startsWith('{') && contentData.endsWith('}')) {
                try {
                  const nestedData = JSON.parse(contentData);
                  contentData = nestedData?.arguments?.input || ''; // 提取 `input` 内的内容
                } catch {
                  console.warn('无法解析嵌套 JSON:', contentData);
                }
              }

              // 提取 `译文：` 后的内容
              const match = contentData.match(/译文：(.*)/);
              if (match && match[1]) {
                onData(match[1].trim());
              }
            }
          } catch (err) {
            console.warn('解析 JSON 数据时出错:', err, '原始数据:', jsonString);
          }
        }
      }
    }
  } catch (error) {
    console.error('请求出错:', error);
  }
}
