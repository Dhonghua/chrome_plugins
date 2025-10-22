import { DOMAIN_MAP } from "./domainMap.js";

// background.js
// =========================================================
// 监听插件图标点击事件（整个插件逻辑的入口）
// =========================================================
chrome.action.onClicked.addListener(async () => {

    // 1️⃣ 获取当前活动标签页的 URL（点击图标前所在页面）
    // chrome.tabs.query 返回一个包含所有匹配 tab 的数组
    // { active: true, currentWindow: true } 表示当前窗口中激活的 tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    // 如果未能获取当前 tab 或 URL 无效，则提示错误并中止
    // if (!tab?.url) return alert("无法获取当前页面 URL");
    if (!tab?.url) return console.log("无法获取当前页面 URL");
    // 使用 URL 对象方便解析域名、路径等信息
    const currentUrl = new URL(tab.url);
    const currentDomain = currentUrl.hostname; // 提取当前页面域名（hostname）
  
    // 2️⃣ 打开桥接页（clipboard.html）
    // bridge 页的作用是负责安全地调用 navigator.clipboard.readText()
    // 因为 background.js 无法直接访问剪贴板
    const pageUrl = chrome.runtime.getURL("clipboard.html");
    const bridgeTab = await chrome.tabs.create({ url: pageUrl }); // 在新标签页打开
  
    // 3️⃣ 等待 clipboard.html 加载完成并发送 “ready” 信号
    // background 在收到“ready”后，才向其发送 “getClipboard” 指令
    chrome.runtime.onMessage.addListener(function listener(msg, sender) {
      // 检查消息类型为“ready”，且来源 tab 正是刚才打开的 bridge 页
      if (msg.type === "ready" && sender.tab?.id === bridgeTab.id) {
        // 收到 ready 后立刻移除该临时监听器，防止重复触发
        chrome.runtime.onMessage.removeListener(listener);
  
        // 向 clipboard.html 发送“getClipboard”命令
        // 并附带当前页面的域名（供后续判断逻辑使用）
        chrome.tabs.sendMessage(bridgeTab.id, {
          type: "getClipboard",
          currentDomain,
        });
      }
    });
  });
  
  
  // =========================================================
  // 4️⃣ 接收 clipboard.html 返回的剪贴板内容并处理跳转逻辑
  // =========================================================
  chrome.runtime.onMessage.addListener(async (msg, sender) => {
     // ✅ 先判断消息类型，如果不是剪贴板数据，直接忽略
    if (msg.type !== "clipboardData") return;
    // 从消息中提取当前页面域名
    const currentDomain = msg.currentDomain;
    // 从消息中提取文本内容，按换行符拆分，多条 URL 或路径
    const lines = msg.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    // 用于存储处理后的 URL
    const processedUrls = [];
    const errUrls = [];
    for (const line of lines) {
        // 每条URL或路径，单独处理
        const clipText = line;
    
        // 尝试将剪贴板内容解析为 URL
        // 如果无效（非 URL），则弹窗提示并中止
        let clipUrlObj;
        let clipDomain;
        let clipPath;
        if (isUrl(clipText)){
            clipUrlObj = new URL(clipText);
            // 提取剪贴板 URL 的域名与路径部分
            clipDomain = clipUrlObj.hostname;
            clipPath = clipUrlObj.pathname + clipUrlObj.search + clipUrlObj.hash;
        } else {
            if (isPurePath(clipText)){
                clipDomain = null;
                clipPath = clipText;
            }else {
                console.log("剪贴板不是有效 URL或纯路径")
                errUrls.push(clipText);
                continue;
            }

        }
    
        // =========================================================
        // ✨ 构造最终跳转 URL
        // =========================================================
        // 使用原始协议 + 新域名 + 路径参数
        // const targetUrl = `${clipUrlObj.protocol}//${targetDomain}${clipPath}`;
        const targetDomain = getTargetDomain(currentDomain, clipDomain);
        const targetUrl = `https://${targetDomain}${clipPath}`;
        processedUrls.push(targetUrl);
        // 控制台打印以便调试
        console.log("跳转到:", targetUrl);
    
        // 在当前 bridge 标签页中直接更新 URL，实现无感跳转
        // chrome.tabs.update(sender.tab.id, { url: targetUrl });
        // chrome.tabs.create({ url: targetUrl });

        // 如果总行数不超过10，则直接打开新标签
        if (lines.length <= 10) {
            chrome.tabs.create({ url: targetUrl });
        }
        
    }
    chrome.tabs.sendMessage(sender.tab.id, {
        type: "errUrls",
        urls: errUrls
    });
    
    // 如果超过10行，则发送到 clipboard.html 页面展示
    if (lines.length > 10 && sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
            type: "displayUrls",
            urls: processedUrls
        });
    } else {
        //  删除 bridge 页
        if (sender.tab?.id) chrome.tabs.remove(sender.tab.id);
    }
});
  

// 抽象函数：根据 DOMAIN_MAP 获取目标域名
function getTargetDomain(currentDomain, clipDomain) {
    const knownDomains = Object.keys(DOMAIN_MAP);
    if (!clipDomain) return currentDomain;
    if (knownDomains.includes(currentDomain)) {
        return clipDomain === currentDomain ? DOMAIN_MAP[clipDomain] : currentDomain;
    } else {
        return DOMAIN_MAP[clipDomain] || clipDomain;
    }
}


// =============================
// 🧩 工具函数：判断是否为完整 URL
// =============================
function isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
  
// =============================
// 🧩 工具函数：判断是否为纯路径
// =============================
function isPurePath(str) {
  
    // 去掉首尾空格
    str = str.trim();
  
    // 以 "/" 开头且不含空格、不含协议
    return (
      str.startsWith("/") &&
      !str.includes("://") &&
      !/\s/.test(str)
    );
  }
