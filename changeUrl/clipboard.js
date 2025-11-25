
// 1️⃣ 页面加载后立即告诉 background：我准备好了
chrome.runtime.sendMessage({ type: "ready" });

// 2️⃣ 等待 background 发来读取指令
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "getClipboard") {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById("log1").textContent = "剪贴板内容:\n";
      
      document.getElementById("log2").textContent = text;

      chrome.runtime.sendMessage({
        type: "clipboardData",
        text,
        currentDomain: msg.currentDomain,
      });
    } catch (err) {
      document.getElementById("log").textContent = "读取剪贴板失败:\n" + err;
    }
  }

  if (msg.type === "displayUrls") {
    const container = document.getElementById("urlContainer");
    container.innerHTML = ""; // 先清空

    msg.urls.forEach(url => {
        const a = document.createElement("a");
        a.href = url;
        a.textContent = url;
        a.target = "_blank"; // 新标签打开
        container.appendChild(a);
        container.appendChild(document.createElement("br"));
    });
}

if (msg.type === "errUrls"){
        const errContainer = document.getElementById("errUrlContainer");
        errContainer.innerHTML = ""; // 先清空
        document.getElementById("errUrls_title").textContent = "不是有效URL或纯路径";
        msg.urls.forEach(url => {
            const a = document.createElement("a");
            a.textContent = url;
            errContainer.appendChild(a);
            errContainer.appendChild(document.createElement("br"));
        });
        
  }

});

// =============================
// 🧩 一键复制按钮逻辑
// =============================
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("copyAllBtn");
    const tip = document.getElementById("copyTip");
    if (!btn) return;
  
    btn.addEventListener("click", async () => {
      const urls = [...document.querySelectorAll("#urlContainer a")]
        .map(a => a.href)
        .join("\n");
  
      if (!urls) {
        // alert("没有可复制的 URL！");
        tip.textContent = "没有可复制的 URL！";
        tip.style.color = "red";
        return;
      }
  
      try {
        await navigator.clipboard.writeText(urls);
            // 显示提示
        tip.textContent = "已复制所有 URL";
        tip.style.color = "green";

        // 3 秒后自动清除
        setTimeout(() => {
            tip.textContent = "";
        }, 3000);
        // alert("已复制所有 URL！");
      } catch (err) {
        // alert("复制失败：" + err);
        tip.textContent = "复制失败：" + err;
        tip.style.color = "red";
      }
    });
  });



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