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
    const currentPath =  currentUrl.pathname + currentUrl.search + currentUrl.hash; //提取当前页面路径（pathname + search + hash）
  
    // 2️⃣ 打开桥接页（clipboard.html）
    // bridge 页的作用是负责安全地调用 navigator.clipboard.readText()
    // 因为 background.js 无法直接访问剪贴板
    const pageUrl = chrome.runtime.getURL("clipboard.html");
    // const bridgeTab = await chrome.tabs.create({ url: pageUrl }); // 在新标签页打开
    const bridgeTab = await chrome.tabs.create({  //   // ✅ 在当前标签页后打开 bridge 页
        url: pageUrl,
        active: true,
        index: tab.index + 1
    });

  
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
          currentPath,
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
    const currentPath = msg.currentPath;
    const currentKnown = isKnownDomain(currentDomain)
    // 从消息中提取剪切板文本内容，按换行符拆分，多条 URL 或路径
    const lines = msg.text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    // 用于存储处理后的 URL
    const processedUrls = [];
    const errUrls = [];
    for (const line of lines) {
        // 每条URL或路径，单独处理
        let clipUrlObj = null;
        let clipDomain = null;
        let clipPath = "";

        // 尝试将剪贴板内容解析为 URL
        // 如果无效（非 URL），则弹窗提示并中止

        // 给裸域名补 https://
        // const clipText = line.includes("://") ? line : `https://${line}`;
        const clipText = line
        // 判断是否为URL
        if (isUrl(clipText)){
            clipUrlObj = new URL(clipText);
            // 判断是否仅域名（没有路径、查询、哈希）
            if (clipUrlObj.pathname === "/" && clipUrlObj.search === "" && clipUrlObj.hash === ""){
                clipDomain = clipUrlObj.hostname;
                clipPath = ""; // 仅域名，path 为空
            }else {
                // 提取剪贴板 URL 的域名与路径部分
                clipDomain = clipUrlObj.hostname;  //剪贴板 URL域名
                clipPath = clipUrlObj.pathname + clipUrlObj.search + clipUrlObj.hash; //剪贴板 URL路径
            }
        }else if (isPurePath(clipText)){
                // 仅路径
                clipDomain = null;
                clipPath = clipText;
            }else {
                console.log("剪贴板不是有效 URL或纯路径")
                errUrls.push(clipText);
                continue;
            }

        
    
        // =========================================================
        // ✨ 构造最终跳转 URL
        // =========================================================
        // 使用原始协议 + 新域名 + 路径参数
        // const targetDomain = getTargetDomain(currentDomain, clipDomain);
        // const targetUrl = `https://${targetDomain}${clipPath}`;
        // processedUrls.push(targetUrl);

        const targetUrl = buildTargetUrl({ currentDomain,currentPath, clipDomain, clipPath ,currentKnown});

        if (targetUrl) {
            processedUrls.push(targetUrl);
            // 控制台打印以便调试
            console.log("跳转到:", targetUrl);
        }else {
            console.log("剪贴板不是有效 URL或纯路径")
            errUrls.push(clipText);
            continue;
        }
    
        // 在当前 bridge 标签页中直接更新 URL，实现无感跳转
        // chrome.tabs.update(sender.tab.id, { url: targetUrl });
        // chrome.tabs.create({ url: targetUrl });

        // 如果总行数不超过10，则直接打开新标签
        if (lines.length <= 10) {
            chrome.tabs.create({ 
                url: targetUrl, 
                active: true, 
                index: sender.tab.index + 1  // 插入到 bridge 标签页后面
            });
            // chrome.tabs.create({ url: targetUrl });
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
  
// 抽象函数：当前页面域名是否存在
function isKnownDomain(currentDomain) {
    const knownDomains = Object.keys(DOMAIN_MAP);
    return knownDomains.includes(currentDomain)
}



// 抽象函数：根据 DOMAIN_MAP 获取目标域名

// function getTargetDomain(currentDomain, clipDomain) {

//     // 当前页面在映射表中
//     if (isKnownDomain(currentDomain)) {
//         // 如果剪贴板域名与当前域名相同，则跳到对应映射域
//         if (clipDomain === currentDomain) return DOMAIN_MAP[clipDomain];
//         // 否则保持当前域名
//         return currentDomain;
//     }
//     // 当前页面不在映射表中，则按剪贴板域名找映射
//     return DOMAIN_MAP[clipDomain] || clipDomain;
// }

function getTargetDomain(replaceDomain) {
    return DOMAIN_MAP[replaceDomain]
}

// =============================
// 🧩 构建最终跳转 URL
// =============================
/**
 * 构建跳转 URL
 * @param {string|null} currentDomain 当前页面域名
 * @param {string} currentPath 当前页面路径（例如 "/index.html"）
 * @param {string|null} clipDomain 剪贴板域名，如果是纯路径则为 null
 * @param {string} clipPath 剪贴板路径或完整 URL 的路径，如果仅域名则为空
 * @param {boolean} currentKnown 当前页面域名是否已知
 * @param {string} protocol 协议，默认 https
 * @returns {string} 最终跳转 URL
 */
function buildTargetUrl({ currentDomain, currentPath = "/", clipDomain, clipPath, currentKnown = false, protocol = "https:" }) {
    // let targetDomain = getTargetDomain(currentDomain, clipDomain);
    // // let targetDomain = "";
    // let path = "/";

    // if (clipPath) {
    //     // 剪贴板内容包含路径（完整 URL 或仅路径）
    //     path = clipPath;
    // } else if (clipDomain && currentDomain && currentKnown) {
    //     // 剪贴板仅域名 + 当前页面已知 → 使用当前页面路径
    //     path = currentPath || "/";
    // } else {
    //     // 剩余情况（仅域名 + 页面为空或未知） → path 默认 "/"
    //     path = "/";
    // }
    // return `${protocol}//${targetDomain}${path}`;

    const hasPath = !!clipPath;       // 是否有路径
    const hasDomain = !!clipDomain;   // 是否有域名
    const isPurePath = !hasDomain && hasPath;

    if (currentKnown) {
        // 页面已知
        if (hasDomain && hasPath) {
            // 完整 URL → 替换为当前页面域名 + 剪贴板路径
            return `${protocol}//${currentDomain}${clipPath}`;
        } else if (isPurePath) {
            // 仅路径 → 替换为当前页面域名 + 剪贴板路径
            return `${protocol}//${currentDomain}${clipPath}`;
        } else if (hasDomain && !hasPath) {
            // 仅域名 → 替换为剪贴板域名 + 当前页面路径
            if (currentPath !== '/'){
                return `${protocol}//${clipDomain}${currentPath}`;
            }else {
                // 仅域名 + 当前页面路径为空 → 剪切板域名 替换为正式/测试域名，不拼接路径
                const targetDomain = getTargetDomain(clipDomain);
                return `${protocol}//${targetDomain}/`;
            }
        } else {
            // 非法 → 无法跳转
            return false;
        }
    } else {
        // 页面未知
        if (hasDomain && hasPath) {
            // 完整 URL → 剪切板域名 替换为正式/测试域名 + 剪贴板路径
            const targetDomain = getTargetDomain(clipDomain);
            return `${protocol}//${targetDomain}${clipPath}`;
        } else if (isPurePath) {
            // 仅路径 → 无法跳转
            return false;
        } else if (hasDomain && !hasPath) {
            // 仅域名 → 剪切板域名 替换为正式/测试域名，不拼接路径
            const targetDomain = getTargetDomain(clipDomain);
            return `${protocol}//${targetDomain}/`;
        } else {
            // 非法 → 无法跳转
            return false;
        }
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
      str.length > 1 &&
      !str.includes("://") &&
      !/\s/.test(str)
    );
  }
