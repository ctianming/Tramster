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

// 新增接口定义
interface CozeResponse {
  type: 'text' | 'url';
  content: string;
}

// 更新函数签名，添加对URL和文本类型的区分
export async function sendCozeAgentRequestStream(
  data: CozeBotRequest,
  onData: (content: CozeResponse) => void
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

              // 检测是否是URL类型的响应
              const urlRegex = /(https?:\/\/[^\s]+)/g;
              const urls = lastContent.match(urlRegex);

              if (urls && urls.length > 0) {
                // 如果包含URL，则标记为URL类型
                onData({
                  type: 'url',
                  content: urls[0] // 取第一个匹配的URL
                });
              } else {
                // 否则为文本类型
                onData({
                  type: 'text',
                  content: lastContent
                });
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


// 添加下载文件的辅助函数
export async function downloadFileFromUrl(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return await response.blob();
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

/**
 * 批量处理文档页面的函数
 * 改进版本，增加更多错误处理和重试逻辑
 */
export async function processDocumentPages(
  pages: Array<{ pageNumber: number, text: string }>,
  userId: string,
  sourceLang: string,
  targetLang: string,
  onProgress: (pageNumber: number, content: CozeResponse) => void,
  onError: (pageNumber: number, error: string) => void,
  onComplete: () => void
): Promise<void> {
  // 创建一个队列，限制并发请求数
  const concurrencyLimit = 2; // 同时处理2个页面
  let activeRequests = 0;
  let currentPageIndex = 0;
  let completedPages = 0;
  const maxRetries = 2; // 最大重试次数

  return new Promise<void>((resolve) => {
    // 处理下一个页面的函数
    const processNextPage = async () => {
      if (currentPageIndex >= pages.length) {
        // 如果所有页面都已启动处理，检查是否全部完成
        if (activeRequests === 0) {
          onComplete();
          resolve();
        }
        return;
      }

      // 获取当前要处理的页面
      const page = pages[currentPageIndex];
      currentPageIndex++;
      activeRequests++;

      // 处理函数，包含重试逻辑
      const processPageWithRetry = async (retryCount = 0) => {
        try {
          const botRequestData = {
            bot_id: '',
            user_id: userId,
            content: `将以下${sourceLang}文本翻译为${targetLang}:\n${page.text}`,
          };

          await sendCozeAgentRequestStream(
            botRequestData,
            (content) => onProgress(page.pageNumber, content)
          );

          completedPages++;
        } catch (error) {
          // 如果失败并且还有重试次数，则重试
          if (retryCount < maxRetries) {
            console.warn(`页面 ${page.pageNumber} 处理失败，进行第 ${retryCount + 1} 次重试`);
            await new Promise(r => setTimeout(r, 2000)); // 延迟2秒后重试
            return processPageWithRetry(retryCount + 1);
          } else {
            onError(page.pageNumber, (error as Error).message);
          }
        } finally {
          activeRequests--;
          // 处理下一个页面
          processNextPage();
        }
      };

      // 开始处理页面
      processPageWithRetry();
    };

    // 启动初始的并发请求
    for (let i = 0; i < concurrencyLimit && i < pages.length; i++) {
      processNextPage();
    }
  });
}

// 上传并翻译单个页面
export async function translateDocumentPage(page: { pageNumber: number, text: string }, userId: string, sourceLang: string, targetLang: string): Promise<CozeResponse> {
  return new Promise((resolve, reject) => {
    const botRequestData = {
      bot_id: '',
      user_id: userId,
      content: `将以下${sourceLang}文本翻译为${targetLang}:\n${page.text}`,
    };

    let responseData: CozeResponse | null = null;

    sendCozeAgentRequestStream(
      botRequestData,
      (content) => {
        // 只保存最后一个响应
        responseData = content;
      }
    )
      .then(() => {
        if (responseData) {
          resolve(responseData);
        } else {
          reject(new Error('未收到翻译结果'));
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}